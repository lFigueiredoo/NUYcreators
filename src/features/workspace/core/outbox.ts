import { Query } from 'node-appwrite';
import { listTableRows, updateTableRow, type Row } from '../../../lib/appwrite/data/contract';
import { done, failure, type CoreContext, type CoreResult } from './context';
import { deliverNotification } from './notify';

/**
 * Consumidor de outbox.
 *
 * O evento é gravado na MESMA transação do fato (crédito, aprovação, resgate) e
 * entregue depois: quem consome só vê o que já é verdade commitada. Cada evento
 * carrega `eventKey`, e a notificação é criada com id determinístico por
 * (eventKey, userId) — reprocessar não duplica entrega.
 *
 * A projeção de ranking NÃO é feita aqui: ela é atualizada na transação do
 * crédito, porque saldo e posição precisam ser consistentes no mesmo commit.
 * Este consumidor cuida do que é entrega: hoje, notificação.
 *
 * Falha de um evento não derruba os outros: o evento volta para `pending` com
 * `attempts` incrementado e nova tentativa agendada — o job é reprocessável.
 */
export type OutboxOutcome = {
  processed: number;
  failed: number;
  skipped: number;
};

/** Teto por execução: o job é idempotente, então rodar de novo continua de onde parou. */
const BATCH = 50;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function payloadOf(row: Row): Record<string, unknown> {
  const raw = text(row.payloadJson);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Título e corpo da notificação por tipo de evento — só o que o evento prova. */
function message(
  type: string,
  payload: Record<string, unknown>,
): { title: string; body: string } | null {
  const points = typeof payload.points === 'number' ? payload.points : 0;
  switch (type) {
    case 'submission.approved':
      return {
        title: 'Conteúdo aprovado',
        body: points > 0 ? `Você ganhou ${points} pontos.` : 'Seu conteúdo foi aprovado.',
      };
    case 'submission.rejected':
      return { title: 'Conteúdo recusado', body: 'Veja o motivo na sua lista de conteúdos.' };
    case 'submission.revision_requested':
      return { title: 'Revisão solicitada', body: 'A equipe pediu um ajuste no seu conteúdo.' };
    case 'challenge.joined':
      return { title: 'Participação confirmada', body: 'Você está participando do desafio.' };
    case 'reward.redeemed':
      return {
        title: 'Resgate solicitado',
        body: 'Seu pedido foi registrado e está em preparação.',
      };
    case 'points.adjusted':
      return { title: 'Seu saldo foi ajustado', body: 'A equipe ajustou seus pontos.' };
    default:
      return null;
  }
}

export async function processOutbox(
  ctx: CoreContext,
  input: { limit?: number } = {},
): Promise<CoreResult<OutboxOutcome>> {
  const limit = Math.min(Math.max(input.limit ?? BATCH, 1), BATCH);
  const pending = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'outbox_events',
    queries: [
      Query.equal('status', 'pending'),
      Query.orderAsc('nextAttemptAt'),
      Query.limit(limit),
    ],
  });
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  for (const event of pending.rows) {
    const id = String(event.$id);
    const type = text(event.type);
    const eventKey = text(event.eventKey);
    const payload = payloadOf(event);
    const userId = text(payload.userId);
    const copy = message(type, payload);
    if (!copy || !userId) {
      // Evento sem destinatário ou sem texto conhecido: marcado como processado
      // para não travar a fila, mas contado como ignorado — não fingimos entrega.
      await settle(ctx, id, 'processed', Number(event.attempts ?? 0));
      skipped += 1;
      continue;
    }
    try {
      await deliverNotification(ctx, {
        userId,
        eventKey,
        type: text(payload.type) || type,
        title: copy.title,
        body: copy.body,
        referenceId: text(payload.submissionId) || text(payload.redemptionId) || null,
      });
      await settle(ctx, id, 'processed', Number(event.attempts ?? 0));
      processed += 1;
    } catch {
      await settle(ctx, id, 'pending', Number(event.attempts ?? 0) + 1).catch(() => undefined);
      failed += 1;
    }
  }
  return done({ processed, failed, skipped });
}

/** Fecha o evento. A espera cresce com as tentativas — falha não vira laço quente. */
async function settle(
  ctx: CoreContext,
  id: string,
  status: 'pending' | 'processed',
  attempts: number,
): Promise<void> {
  await updateTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'outbox_events',
    rowId: id,
    data: {
      status,
      attempts,
      nextAttemptAt: new Date(ctx.now.getTime() + attempts * 60_000).toISOString(),
    },
  });
}

/** Recusa explícita quando não há evento para processar — o host mostra o número real. */
export async function outboxPending(ctx: CoreContext): Promise<CoreResult<{ pending: number }>> {
  const rows = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'outbox_events',
    queries: [Query.equal('status', 'pending'), Query.limit(1)],
  });
  if (!Number.isFinite(rows.total)) return failure('unavailable', true);
  return done({ pending: rows.total });
}
