import { adjustPoints } from '../../src/features/workspace/core';
import { hosted, integer, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `adjust-points` — ajuste administrativo de saldo.
 *
 * Papel `adjust-points`, motivo e referência obrigatórios, chave de operação
 * obrigatória. Ajuste não entra em nível nem em ranking: move o saldo gastável.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true, roles: true });
  if (!run.ready) return run.response;
  const amount = integer(run.body.amount);
  if (amount === null || amount === 0) return event.res.json({ error: 'invalid' }, 400);
  const result = await adjustPoints(run.ctx, {
    userId: text(run.body.userId),
    amount,
    reason: text(run.body.reason),
    referenceId: text(run.body.referenceId),
    key: text(run.body.key),
  });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, 200);
}
