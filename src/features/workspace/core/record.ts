import { createTableRow, splitAuditLog, type Row } from '../../../lib/appwrite/data/contract';
import { ownerReadPermissions } from '../../../lib/security/permissions';
import { rowId } from './ids';
import type { CoreContext } from './context';

/**
 * Uma operação de negócio = uma transação. Todo registro abaixo é estagiado nela.
 *
 * `transactionId` ausente é leitura fora de transação (o SDK omite o parâmetro
 * quando ele é `undefined` — conferido em `node_modules/node-appwrite`).
 */
export type Staged = { transactionId: string | undefined };

/**
 * Trilha de auditoria, outbox e históricos.
 *
 * Tudo o que a operação precisa contar depois — quem fez, o que mudou, qual
 * evento entrega — é escrito DENTRO da mesma transação da mudança de estado.
 * Não existe auditoria "depois, se der tempo": se o commit não passa, o log
 * também não existe, e por isso não há como um crédito ficar sem rastro.
 */
export async function recordAudit(
  ctx: CoreContext,
  tx: Staged,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    affectedUserId?: string | null;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<string> {
  // Id derivado da transação: a mesma operação não gera dois logs, e uma
  // repetição (nova transação) tem id novo — o log é do fato, não da tentativa.
  const id = rowId('audit', tx.transactionId, entry.action, entry.entityId);
  const { log, snapshots } = splitAuditLog({
    $id: id,
    actorId: ctx.actor.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    affectedUserId: entry.affectedUserId ?? '',
    reason: entry.reason ?? '',
    occurredAt: ctx.now.toISOString(),
    correlationId: ctx.correlationId,
    beforeJson: entry.before,
    afterJson: entry.after,
  });
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'audit_logs',
    rowId: id,
    data: log as Record<string, unknown>,
    permissions: [], // auditoria é da equipe: lida com chave, nunca pela sessão
    transactionId: tx.transactionId,
  });
  for (const snapshot of snapshots)
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'audit_log_snapshots',
      rowId: String(snapshot.$id),
      data: { ...snapshot, occurredAt: ctx.now.toISOString() },
      permissions: [],
      transactionId: tx.transactionId,
    });
  return id;
}

/**
 * Evento durável para entrega posterior (notificação, projeção).
 *
 * `eventKey` é o nome do FATO (`submission.approved:<id>`), e a unicidade
 * garante que uma repetição não gera segunda entrega. A entrega acontece depois
 * do commit, nunca antes: o consumidor só vê o que já é verdade.
 */
export async function recordOutbox(
  ctx: CoreContext,
  tx: Staged,
  event: { eventKey: string; type: string; aggregateId: string; payload: Row },
): Promise<string> {
  const id = rowId('outbox', event.eventKey);
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'outbox_events',
    rowId: id,
    data: {
      eventKey: event.eventKey,
      type: event.type,
      aggregateId: event.aggregateId,
      payloadJson: JSON.stringify(event.payload),
      status: 'pending',
      attempts: 0,
      nextAttemptAt: ctx.now.toISOString(),
    },
    permissions: [],
    transactionId: tx.transactionId,
  });
  return id;
}

/** Histórico de transição de submissão — append-only, um por mudança de estado. */
export async function recordSubmissionHistory(
  ctx: CoreContext,
  tx: Staged,
  entry: {
    submissionId: string;
    /** Dono da submissão — quem lê o histórico, mesmo quando quem agiu foi a equipe. */
    userId: string;
    revision: number;
    previousStatus: string | null;
    nextStatus: string;
    reason?: string | null;
    payload?: unknown;
  },
): Promise<void> {
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'submission_history',
    rowId: rowId('shistory', tx.transactionId, entry.submissionId, entry.nextStatus),
    data: {
      submissionId: entry.submissionId,
      revision: entry.revision,
      previousStatus: entry.previousStatus ?? '',
      nextStatus: entry.nextStatus,
      actorId: ctx.actor.userId,
      reason: entry.reason ?? '',
      payloadSnapshotJson: entry.payload === undefined ? '' : JSON.stringify(entry.payload),
      occurredAt: ctx.now.toISOString(),
    },
    permissions: ownerReadPermissions(entry.userId),
    transactionId: tx.transactionId,
  });
}

/** Histórico de transição de resgate — mesmo contrato do de submissão. */
export async function recordRedemptionHistory(
  ctx: CoreContext,
  tx: Staged,
  entry: {
    redemptionId: string;
    /** Dono do pedido — fulfillment age, mas quem lê o histórico é a usuária. */
    userId: string;
    previousStatus: string | null;
    nextStatus: string;
    reason?: string | null;
  },
): Promise<void> {
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'redemption_history',
    rowId: rowId('rhistory', tx.transactionId, entry.redemptionId, entry.nextStatus),
    data: {
      redemptionId: entry.redemptionId,
      previousStatus: entry.previousStatus ?? '',
      nextStatus: entry.nextStatus,
      actorId: ctx.actor.userId,
      reason: entry.reason ?? '',
      occurredAt: ctx.now.toISOString(),
    },
    permissions: ownerReadPermissions(entry.userId),
    transactionId: tx.transactionId,
  });
}
