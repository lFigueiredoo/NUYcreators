import { done, failure, requiresStaff, type CoreContext, type CoreResult } from './context';
import { creditPoints, debitAvailableBalance, readAccount } from './ledger';
import { recordAudit, recordOutbox } from './record';
import { inTransaction } from './transaction';

/**
 * Ajuste administrativo de saldo.
 *
 * Papel `adjust-points` (admin), motivo obrigatório e chave de operação: ajuste
 * sem motivo é o que a arquitetura proíbe, e a chave protege contra o clique
 * repetido. Débito que deixaria o saldo negativo é recusado pela barreira do
 * banco (`min: 0`), não por leitura otimista.
 *
 * Ajuste NÃO conta para nível nem para ranking (`qualifies: false`,
 * `rankingDelta: 0`): docs/database.md diz que `qualifyingPoints` vem de
 * créditos elegíveis e estornos, e que ajuste não elegível não pode inflar
 * ranking. O que o ajuste move é o saldo gastável.
 */
export type AdjustInput = {
  userId: string;
  /** Inteiro diferente de zero; positivo credita, negativo debita. */
  amount: number;
  reason: string;
  /** Referência da operação (ticket, decisão) — fica no extrato. */
  referenceId: string;
  /** Chave de intenção da equipe; repetir devolve o mesmo resultado. */
  key: string;
};

export type AdjustResult = {
  userId: string;
  availableBalance: number;
  applied: boolean;
};

export async function adjustPoints(
  ctx: CoreContext,
  input: AdjustInput,
): Promise<CoreResult<AdjustResult>> {
  const blocked = requiresStaff<AdjustResult>(ctx, 'adjust-points');
  if (blocked) return blocked;
  const userId = (input.userId ?? '').trim();
  const reason = (input.reason ?? '').trim();
  const referenceId = (input.referenceId ?? '').trim();
  const key = (input.key ?? '').trim();
  if (!userId || userId.length > 36 || !key || key.length > 120) return failure('invalid');
  if (!Number.isInteger(input.amount) || input.amount === 0) return failure('invalid');
  if (reason.length < 3 || !referenceId) return failure('invalid');

  return inTransaction<AdjustResult>(
    ctx,
    async (tx) => {
      const before = await readAccount(ctx, tx, userId);
      const availableBalance =
        typeof before?.availableBalance === 'number' ? before.availableBalance : 0;
      const idempotencyKey = `points.adjusted:${key}`;

      const applied =
        input.amount > 0
          ? await creditPoints(
              ctx,
              tx,
              {
                userId,
                amount: input.amount,
                type: 'adjust',
                referenceId,
                referenceType: 'admin_adjustment',
                description: reason,
                idempotencyKey,
                qualifies: false,
              },
              { periodKey: '', delta: 0 },
            )
          : await debitAvailableBalance(ctx, tx, {
              userId,
              amount: -input.amount,
              referenceId,
              referenceType: 'admin_adjustment',
              description: reason,
              idempotencyKey,
            });
      if (!applied) return failure('conflict');

      await recordOutbox(ctx, tx, {
        eventKey: `points.adjusted:${key}`,
        type: 'points.adjusted',
        aggregateId: userId,
        payload: { userId, amount: input.amount, reason },
      });
      await recordAudit(ctx, tx, {
        action: input.amount > 0 ? 'points.credited' : 'points.debited',
        entityType: 'point_accounts',
        entityId: userId,
        affectedUserId: userId,
        reason,
        before: { availableBalance },
        after: { availableBalance: availableBalance + input.amount },
      });

      return done({ userId, availableBalance: availableBalance + input.amount, applied: true });
    },
    { conflict: 'conflict', bound: 'insufficient_points' },
  );
}
