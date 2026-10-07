import { redeemReward } from '../../src/features/workspace/core';
import { hosted, integer, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `redeem-reward` — resgate de recompensa.
 *
 * Uma transação: baixa de estoque com piso em zero e débito do saldo DISPONÍVEL
 * (nunca dos pontos de jornada). Corrida em estoque unitário tem um único
 * commit; a perdedora recebe `out_of_stock`. A chave de intenção devolve o MESMO
 * pedido em caso de repetição — não existe resgate pago duas vezes.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true });
  if (!run.ready) return run.response;
  const result = await redeemReward(run.ctx, {
    rewardId: text(run.body.rewardId),
    idempotencyKey: text(run.body.idempotencyKey),
    expectedCost: integer(run.body.expectedCost),
    shippingAddressId: text(run.body.shippingAddressId) || null,
  });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, result.value.created ? 201 : 200);
}
