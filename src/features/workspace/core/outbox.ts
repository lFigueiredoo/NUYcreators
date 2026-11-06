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
  /** Falhas terminais incluídas em `failed`, retiradas da fila de retry. */
  deadLettered: number;
};

/** Teto por execução: o job é idempotente, então rodar de novo continua de onde parou. */
const BATCH = 50;
/** Depois desta quantidade de falhas o evento exige intervenção, não retry infinito. */
export const OUTBOX_MAX_ATTEMPTS = 5;

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

/**
 * Título e corpo da notificação por tipo de evento — só o que o evento prova.
 *
 * O título é a MENSAGEM; o chip da central é a CATEGORIA do evento
 * (`domain/status.ts` §NOTIFICATION). São registros diferentes de propósito: o
 * chip diz de que família é o aviso, o título diz o que aconteceu.
 */
export function message(
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
      // A copy antiga mandava "ver o motivo na lista de conteúdos" — e o motivo
      // não é exibido lá: nota e quem avaliou são registro interno da equipe
      // (`contents-screen.tsx`). O aviso diz o que a creator pode conferir.
      return {
        title: 'Conteúdo não aprovado',
        body: 'Seu envio está em "Meus conteúdos", com o estado da avaliação.',
      };
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
      Query.lessThanEqual('nextAttemptAt', ctx.now.toISOString()),
      Query.orderAsc('nextAttemptAt'),
      Query.limit(limit),
    ],
  });
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let deadLettered = 0;
  for (const event of pending.rows) {
    const id = String(event.$id);
    const type = text(event.type);
    const eventKey = text(event.eventKey);
    const payload = payloadOf(event);
    const userId = text(payload.userId);
    const copy = message(type, payload);
    const attempts = Math.max(0, Math.trunc(Number(event.attempts) || 0));
    // Compatibilidade com eventos que já chegaram ao teto antes desta versão.
    if (attempts >= OUTBOX_MAX_ATTEMPTS) {
      await settle(ctx, id, 'dead_letter', attempts);
      failed += 1;
      deadLettered += 1;
      continue;
    }
    if (!copy || !userId) {
      // Evento sem destinatário ou sem texto conhecido: marcado como processado
      // para não travar a fila, mas contado como ignorado — não fingimos entrega.
      await settle(ctx, id, 'processed', attempts);
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
      await settle(ctx, id, 'processed', attempts);
      processed += 1;
    } catch {
      const nextAttempts = attempts + 1;
      const exhausted = nextAttempts >= OUTBOX_MAX_ATTEMPTS;
      const settled = await settle(ctx, id, exhausted ? 'dead_letter' : 'pending', nextAttempts)
        .then(() => true)
        .catch(() => false);
      failed += 1;
      // Só anuncia dead-letter quando a transição foi realmente persistida.
      if (exhausted && settled) deadLettered += 1;
    }
  }
  return done({ processed, failed, skipped, deadLettered });
}

/** Fecha o evento. A espera cresce com as tentativas — falha não vira laço quente. */
async function settle(
  ctx: CoreContext,
  id: string,
  status: 'pending' | 'processed' | 'dead_letter',
  attempts: number,
): Promise<void> {
  await updateTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'outbox_events',
    rowId: id,
    data: {
      status,
      attempts,
      nextAttemptAt:
        status === 'pending'
          ? new Date(ctx.now.getTime() + attempts * 60_000).toISOString()
          : ctx.now.toISOString(),
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
