import { allows, rebuildRanking } from '../../src/features/workspace/core';
import {
  asService,
  hosted,
  machineAuthorized,
  refuse,
  text,
  type FunctionEvent,
} from '../shared/host';

/**
 * `rebuild-ranking` — reconstrução do ranking a partir do EXTRATO.
 *
 * O ranking é derivado: quem manda no número é `point_transactions`, e a
 * reconstrução reescreve a projeção do período a partir dele — nunca o
 * contrário. Só créditos elegíveis entram (`rankingDelta > 0`); empate é
 * desempatado por quem chegou primeiro.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { roles: true });
  if (!run.ready) return run.response;
  const byMachine = !run.ctx.actor.userId && machineAuthorized(event);
  const byStaff = Boolean(run.ctx.actor.userId) && allows(run.ctx, 'manage-catalog');
  if (!byMachine && !byStaff) return event.res.json({ error: 'forbidden' }, 403);
  const ctx = byMachine ? asService(run.ctx, 'rebuild-ranking') : run.ctx;
  const result = await rebuildRanking(ctx, { period: text(run.body.period) || undefined });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, 200);
}
