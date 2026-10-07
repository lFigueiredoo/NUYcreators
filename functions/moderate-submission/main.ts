import {
  moderateSubmission,
  moderationQueue,
  type ModerationDecision,
} from '../../src/features/workspace/core';
import { hosted, integer, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `moderate-submission` — a superfície da moderação.
 *
 * `action: 'queue'`  lê a fila de análise: envios em `pending`. A linha de
 *                    `challenge_submissions` é legível só pelo dono, então a
 *                    equipe lê pela chave da function DEPOIS de o papel
 *                    `moderate` ser apurado — a alternativa seria abrir a
 *                    permissão de cada envio para a equipe inteira.
 * decisão            aprovar, recusar ou pedir revisão. Aprovar credita os
 *                    pontos do desafio UMA vez: a chave de idempotência é
 *                    determinística, então a segunda aprovação esbarra na
 *                    unicidade do ledger em vez de pagar de novo.
 *
 * O papel exige `teams.read` na chave dinâmica e nunca vem do payload.
 */
const DECISIONS: ModerationDecision[] = ['approve', 'reject', 'request_revision'];

export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true, roles: true });
  if (!run.ready) return run.response;
  if (text(run.body.action) === 'queue') {
    const queue = await moderationQueue(run.ctx, { limit: integer(run.body.limit) ?? 50 });
    const refusedQueue = refuse(event, queue);
    if (refusedQueue) return refusedQueue;
    if (queue.ok) return event.res.json(queue.value, 200);
    return event.res.json({ error: 'unavailable' }, 503);
  }
  const decision = text(run.body.decision) as ModerationDecision;
  if (!DECISIONS.includes(decision)) return event.res.json({ error: 'invalid' }, 400);
  const result = await moderateSubmission(run.ctx, {
    submissionId: text(run.body.submissionId),
    decision,
    reason: text(run.body.reason),
    expectedRevision: integer(run.body.expectedRevision),
  });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, 200);
}
