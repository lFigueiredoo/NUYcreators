import { Query } from 'node-appwrite';
import {
  createTableRow,
  getTableRow,
  incrementColumn,
  isAbsent,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { done, failure, type CoreContext, type CoreResult } from './context';
import { rowId } from './ids';
import { readAccount } from './ledger';
import { recordAudit, recordOutbox } from './record';
import { inTransaction } from './transaction';

/**
 * Entrar em um desafio.
 *
 * Uma transação, três invariantes:
 *  1. participação única por (desafio, usuária) — o `$id` é derivado do par e a
 *     coluna `[challengeId, userId]` também é única: repetir devolve a MESMA
 *     participação em vez de criar a segunda;
 *  2. contador de vagas conferido pelo banco — `incrementRowColumn` com `max`
 *     faz o commit da perdedora voltar 400 `attribute_limit_exceeded`, então em
 *     corrida a vaga não é vendida duas vezes;
 *  3. janela e nível são lidos na própria transação, do dado real do desafio —
 *     nunca do payload.
 *
 * `status` publicado: `active` ou `published` são as palavras do catálogo
 * (docs/database.md §Permissões, "público apenas em documentos publicados"). Os
 * demais estados são recusados por nome, e a janela de datas é o segundo
 * cadeado — os dois precisam estar abertos.
 */
const PUBLISHED = ['active', 'published'];

export type JoinResult = {
  participationId: string;
  challengeId: string;
  /** `false` quando a participação já existia — repetição não é erro. */
  created: boolean;
};

function instant(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function joinChallenge(
  ctx: CoreContext,
  input: { challengeId: string },
): Promise<CoreResult<JoinResult>> {
  const challengeId = input.challengeId.trim();
  if (!challengeId || challengeId.length > 36) return failure('invalid');
  if (!ctx.actor.userId) return failure('unauthenticated');

  return inTransaction<JoinResult>(
    ctx,
    async (tx) => {
      let challenge: Row;
      try {
        challenge = await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenges',
          rowId: challengeId,
          transactionId: tx.transactionId,
        });
      } catch (error) {
        if (isAbsent(error)) return failure('not_found');
        throw error;
      }
      const status = String(challenge.status ?? '');
      if (!PUBLISHED.includes(status)) return failure('not_published');
      const starts = instant(challenge.startsAt);
      const ends = instant(challenge.endsAt);
      if (starts && starts.getTime() > ctx.now.getTime()) return failure('window_closed');
      if (ends && ends.getTime() < ctx.now.getTime()) return failure('window_closed');

      const participationId = rowId('join', challengeId, ctx.actor.userId);
      const existing = await getTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_participants',
        rowId: participationId,
        transactionId: tx.transactionId,
      }).catch((error: unknown) => {
        if (isAbsent(error)) return null;
        throw error;
      });
      if (existing) return done({ participationId, challengeId, created: false });

      const requiredLevelId = String(challenge.requiredLevelId ?? '');
      if (requiredLevelId) {
        const account = await readAccount(ctx, tx, ctx.actor.userId);
        const points = typeof account?.qualifyingPoints === 'number' ? account.qualifyingPoints : 0;
        const level = await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'creator_levels',
          rowId: requiredLevelId,
          transactionId: tx.transactionId,
        }).catch((error: unknown) => {
          if (isAbsent(error)) return null;
          throw error;
        });
        const minimum = typeof level?.minPoints === 'number' ? level.minPoints : null;
        // Nível exigido que não existe na configuração publicada não é "livre
        // passagem": sem faixa cadastrada, o requisito não pode ser conferido.
        if (minimum === null || points < minimum) return failure('level_required');
      }

      const limit =
        typeof challenge.participantLimit === 'number' ? challenge.participantLimit : null;
      if (limit !== null) {
        const taken = await ctx.tables.listRows({
          databaseId: ctx.databaseId,
          tableId: 'challenge_participants',
          queries: [Query.equal('challengeId', challengeId), Query.limit(1)],
          transactionId: tx.transactionId,
        });
        if (typeof taken.total === 'number' && taken.total >= limit)
          return failure('capacity_full');
      }
      await incrementColumn(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenges',
        rowId: challengeId,
        column: 'participantCount',
        value: 1,
        // Corrida: o contador do desafio é a barreira final, conferida no commit.
        ...(limit !== null ? { max: limit } : {}),
        transactionId: tx.transactionId,
      });

      await createTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_participants',
        rowId: participationId,
        data: {
          challengeId,
          userId: ctx.actor.userId,
          joinedAt: ctx.now.toISOString(),
          status: 'joined',
        },
        permissions: [`read("user:${ctx.actor.userId}")`],
        transactionId: tx.transactionId,
      });
      await recordOutbox(ctx, tx, {
        eventKey: `challenge.joined:${challengeId}:${ctx.actor.userId}`,
        type: 'challenge.joined',
        aggregateId: challengeId,
        payload: { userId: ctx.actor.userId, challengeId },
      });
      await recordAudit(ctx, tx, {
        action: 'challenge.joined',
        entityType: 'challenge_participants',
        entityId: participationId,
        affectedUserId: ctx.actor.userId,
      });

      return done({ participationId, challengeId, created: true });
    },
    { conflict: 'conflict', bound: 'capacity_full' },
  );
}
