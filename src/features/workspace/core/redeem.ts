import { Query } from 'node-appwrite';
import {
  createTableRow,
  decrementColumn,
  getTableRow,
  isAbsent,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { done, failure, type CoreContext, type CoreResult } from './context';
import { rowId } from './ids';
import { debitAvailableBalance, readAccount } from './ledger';
import { recordAudit, recordOutbox, recordRedemptionHistory } from './record';
import { inTransaction } from './transaction';

/**
 * Resgatar recompensa.
 *
 * As três disputas do resgate são resolvidas pelo banco, não por leitura
 * otimista (medido em staging: quem perde a corrida de uma escrita limitada
 * recebe 400 `attribute_limit_exceeded` no commit):
 *  - estoque: `decrementRowColumn` com `min: 0` — com uma unidade só, um commit
 *    passa e o outro é recusado;
 *  - saldo: o mesmo para `availableBalance`, que nunca fica negativo;
 *  - limite por pessoa: contado na transação sobre os pedidos da própria
 *    usuária.
 *
 * O preço é lido AGORA e comparado com o que a usuária confirmou na tela: se
 * mudou, a resposta é `price_changed` em vez de cobrar em silêncio um valor que
 * ela não aceitou (docs/flows.md §Resgate). O snapshot da recompensa e do custo
 * fica no pedido para que o fulfillment saiba o que foi prometido.
 *
 * `rankingDelta` do débito é zero e `qualifyingPoints` não é tocado: gastar
 * saldo não rebaixa nível nem posição (docs/database.md §Pontos).
 */
export type RedeemInput = {
  rewardId: string;
  /** Chave de intenção gerada no servidor; repetir devolve o MESMO pedido. */
  idempotencyKey: string;
  /** Custo que a usuária viu na tela. */
  expectedCost?: number | null;
  shippingAddressId?: string | null;
};

export type RedeemResult = {
  redemptionId: string;
  rewardId: string;
  cost: number;
  status: string;
  /** `false` quando a mesma intenção já tinha sido aplicada. */
  created: boolean;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function instant(value: unknown): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function redeemReward(
  ctx: CoreContext,
  input: RedeemInput,
): Promise<CoreResult<RedeemResult>> {
  if (!ctx.actor.userId) return failure('unauthenticated');
  const rewardId = (input.rewardId ?? '').trim();
  const key = (input.idempotencyKey ?? '').trim();
  if (!rewardId || rewardId.length > 36 || !key || key.length > 120) return failure('invalid');

  const result = await inTransaction<RedeemResult>(
    ctx,
    async (tx) => {
      const redemptionId = rowId('redeem', ctx.actor.userId, key);
      const existing = await getTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'reward_redemptions',
        rowId: redemptionId,
        transactionId: tx.transactionId,
      }).catch((error: unknown) => {
        if (isAbsent(error)) return null;
        throw error;
      });
      if (existing)
        return done({
          redemptionId,
          rewardId: text(existing.rewardId) || rewardId,
          cost: typeof existing.pointsCostSnapshot === 'number' ? existing.pointsCostSnapshot : 0,
          status: text(existing.status),
          created: false,
        });

      let reward: Row;
      try {
        reward = await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'rewards',
          rowId: rewardId,
          transactionId: tx.transactionId,
        });
      } catch (error) {
        if (isAbsent(error)) return failure('not_found');
        throw error;
      }
      const status = text(reward.status);
      if (!['active', 'published'].includes(status)) return failure('not_published');
      const ends = instant(reward.endsAt);
      if (ends && ends.getTime() < ctx.now.getTime()) return failure('window_closed');
      const starts = instant(reward.startsAt);
      if (starts && starts.getTime() > ctx.now.getTime()) return failure('window_closed');

      const cost = typeof reward.pointsCost === 'number' ? reward.pointsCost : 0;
      if (typeof input.expectedCost === 'number' && input.expectedCost !== cost)
        return failure('price_changed');
      if (typeof reward.stock === 'number' && reward.stock <= 0) return failure('out_of_stock');

      const perUserLimit = typeof reward.perUserLimit === 'number' ? reward.perUserLimit : 0;
      if (perUserLimit > 0) {
        const mine = await ctx.tables.listRows({
          databaseId: ctx.databaseId,
          tableId: 'reward_redemptions',
          queries: [
            Query.equal('userId', ctx.actor.userId),
            Query.equal('rewardId', rewardId),
            Query.limit(1),
          ],
          transactionId: tx.transactionId,
        });
        if (typeof mine.total === 'number' && mine.total >= perUserLimit)
          return failure('limit_reached');
      }

      const account = await readAccount(ctx, tx, ctx.actor.userId);
      const balance = typeof account?.availableBalance === 'number' ? account.availableBalance : 0;
      if (!account || balance < cost) return failure('insufficient_points');

      // Estoque primeiro: é a escrita limitada que decide a corrida. Se perder,
      // nada mais foi gravado e o pedido não existe.
      await decrementColumn(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'rewards',
        rowId: rewardId,
        column: 'stock',
        value: 1,
        min: 0,
        transactionId: tx.transactionId,
      });
      const debited = await debitAvailableBalance(ctx, tx, {
        userId: ctx.actor.userId,
        amount: cost,
        referenceId: redemptionId,
        referenceType: 'reward_redemption',
        description: `Resgate — ${text(reward.name) || rewardId}`,
        idempotencyKey: `reward.redeemed:${key}`,
      });
      if (!debited) return failure('conflict');

      await createTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'reward_redemptions',
        rowId: redemptionId,
        data: {
          userId: ctx.actor.userId,
          rewardId,
          pointsCostSnapshot: cost,
          // Snapshot do que foi prometido: o catálogo pode mudar depois.
          rewardSnapshotJson: JSON.stringify({
            id: rewardId,
            name: text(reward.name),
            type: text(reward.type),
            pointsCost: cost,
          }),
          status: 'requested',
          idempotencyKey: key,
          requestedAt: ctx.now.toISOString(),
          shippingAddressId: text(input.shippingAddressId),
        },
        permissions: [`read("user:${ctx.actor.userId}")`],
        transactionId: tx.transactionId,
      });
      await recordRedemptionHistory(ctx, tx, {
        redemptionId,
        userId: ctx.actor.userId,
        previousStatus: null,
        nextStatus: 'requested',
      });
      await recordOutbox(ctx, tx, {
        eventKey: `reward.redeemed:${redemptionId}`,
        type: 'reward.redeemed',
        aggregateId: redemptionId,
        payload: { userId: ctx.actor.userId, rewardId, redemptionId, cost },
      });
      await recordAudit(ctx, tx, {
        action: 'reward.redeemed',
        entityType: 'reward_redemptions',
        entityId: redemptionId,
        affectedUserId: ctx.actor.userId,
        before: { stock: reward.stock, pointsCost: cost, availableBalance: balance },
        after: { availableBalance: balance - cost, redemptionId },
      });

      return done({ redemptionId, rewardId, cost, status: 'requested', created: true });
    },
    { conflict: 'conflict', bound: 'conflict' },
  );
  // Perdeu uma escrita limitada (estoque ou saldo). O commit não gravou nada, e
  // o motivo real está no estado já commitado pela vencedora — então relemos em
  // vez de adivinhar: "esgotado" e "sem saldo" são recados diferentes.
  if (!result.ok && result.failure.code === 'conflict')
    return refine(ctx, rewardId, input.expectedCost);
  return result;
}

async function refine(
  ctx: CoreContext,
  rewardId: string,
  expectedCost: number | null | undefined,
): Promise<CoreResult<RedeemResult>> {
  try {
    const reward = await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'rewards',
      rowId: rewardId,
    });
    if (typeof reward.stock === 'number' && reward.stock <= 0) return failure('out_of_stock');
    const account = await readAccount(ctx, { transactionId: undefined }, ctx.actor.userId);
    const cost = typeof expectedCost === 'number' ? expectedCost : Number(reward.pointsCost ?? 0);
    const balance = typeof account?.availableBalance === 'number' ? account.availableBalance : 0;
    if (balance < cost) return failure('insufficient_points');
  } catch {
    // Se nem a releitura passou, o código genérico é a resposta honesta.
  }
  return failure('conflict');
}
