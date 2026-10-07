import { allows, processOutbox } from '../../src/features/workspace/core';
import { asService, hosted, machineAuthorized, refuse, type FunctionEvent } from '../shared/host';

/**
 * `process-outbox` — esvazia a fila de eventos e entrega as notificações.
 *
 * Roda por AGENDAMENTO (segredo de implantação) ou por uma pessoa com papel de
 * gestão. Evento sem destinatário ou sem copy é liquidado como processado e
 * contado como ignorado: a fila não finge entrega que não houve.
 *
 * Implantação: `execute` restrito a autenticadas (a chamada agendada do
 * Appwrite não passa por aí) e `NUY_OPS_TOKEN` definido — sem ele o caminho de
 * máquina fica fechado.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { roles: true });
  if (!run.ready) return run.response;
  const byMachine = !run.ctx.actor.userId && machineAuthorized(event);
  const byStaff = Boolean(run.ctx.actor.userId) && allows(run.ctx, 'manage-catalog');
  if (!byMachine && !byStaff) return event.res.json({ error: 'forbidden' }, 403);
  const ctx = byMachine ? asService(run.ctx, 'process-outbox') : run.ctx;
  const result = await processOutbox(ctx, {});
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, 200);
}
