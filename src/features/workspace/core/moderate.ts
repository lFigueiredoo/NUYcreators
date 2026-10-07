import { Query } from 'node-appwrite';
import {
  getTableRow,
  isAbsent,
  listTableRows,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { done, failure, requiresStaff, type CoreContext, type CoreResult } from './context';
import { periodKey } from './ids';
import { creditPoints } from './ledger';
import { recordAudit, recordOutbox, recordSubmissionHistory } from './record';
import { inTransaction } from './transaction';
import { rankingTimeZone } from '../domain/ranking';

/**
 * Moderação de submissão — aprovar, recusar ou pedir revisão.
 *
 * Só quem tem o papel `moderate` (apurado de membership CONFIRMADA na equipe
 * `nuy-admins`) passa daqui; o papel nunca vem do cliente.
 *
 * Aprovar credita pontos UMA vez:
 *  - o valor creditado é `challenges.points` lido na transação — o cliente não
 *    informa quanto vale a aprovação;
 *  - a chave é determinística (`submission.approved:<id>`), então uma segunda
 *    aprovação do mesmo envio esbarra na unicidade do ledger em vez de creditar
 *    de novo. Os pontos ganhos também alimentam o ranking do ciclo no mesmo
 *    commit;
 *  - recusar e pedir revisão não geram pontos: escrevem estado, histórico,
 *    auditoria e evento, e nada mais.
 *
 * `expectedRevision` é o controle de versão: a equipe decide sobre a revisão que
 * VIU. Se a criadora reenviou no meio do caminho, o comando é recusado em vez de
 * aprovar conteúdo que ninguém leu.
 */
export type ModerationDecision = 'approve' | 'reject' | 'request_revision';

export type ModerateInput = {
  submissionId: string;
  decision: ModerationDecision;
  reason?: string | null;
  /** Revisão que a equipe está julgando — vem da tela, conferida no banco. */
  expectedRevision?: number | null;
};

export type ModerateResult = {
  submissionId: string;
  status: string;
  /** Pontos creditados nesta decisão; `0` quando não houve crédito. */
  pointsAwarded: number;
  /** `false` quando o crédito já existia (repetição da mesma aprovação). */
  credited: boolean;
};

const NEXT: Record<ModerationDecision, string> = {
  approve: 'approved',
  reject: 'rejected',
  request_revision: 'revision_requested',
};

/** Item da fila de moderação — o que a equipe precisa para decidir. */
export type QueueItem = {
  submissionId: string;
  challengeId: string;
  challengeName: string;
  userId: string;
  url: string;
  platform: string;
  revision: number;
  submittedAt: string;
};

/**
 * Fila de análise: envios em `pending`, mais antigos primeiro.
 *
 * A linha de `challenge_submissions` é legível só pelo DONO, por permissão de
 * linha. A equipe lê a fila por AQUI, e não relaxando a permissão de cada envio:
 * quem enxerga é a chave da function, e só depois de o papel `moderate` ser
 * apurado. Ampliar a permissão da linha daria leitura a qualquer membro da
 * equipe; esta porta exige a CAPACIDADE.
 */
export async function moderationQueue(
  ctx: CoreContext,
  input: { limit?: number } = {},
): Promise<CoreResult<{ items: QueueItem[] }>> {
  const staff = requiresStaff<{ items: QueueItem[] }>(ctx, 'moderate');
  if (staff) return staff;
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const page = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'challenge_submissions',
    queries: [Query.equal('status', 'pending'), Query.orderAsc('submittedAt'), Query.limit(limit)],
  });
  const items: QueueItem[] = [];
  for (const row of page.rows) {
    const challengeId = text(row.challengeId);
    // O nome do desafio é contexto de leitura. Não podendo ler, a fila mostra o
    // identificador em vez de inventar um título.
    const challenge = challengeId
      ? await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenges',
          rowId: challengeId,
        }).catch(() => null)
      : null;
    items.push({
      submissionId: String(row.$id),
      challengeId,
      challengeName: text(challenge?.name) || challengeId,
      userId: text(row.userId),
      url: text(row.canonicalUrl),
      platform: text(row.platform),
      revision: typeof row.revision === 'number' ? row.revision : 1,
      submittedAt: text(row.submittedAt),
    });
  }
  return done({ items });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function moderateSubmission(
  ctx: CoreContext,
  input: ModerateInput,
): Promise<CoreResult<ModerateResult>> {
  const blocked = requiresStaff<ModerateResult>(ctx, 'moderate');
  if (blocked) return blocked;
  const submissionId = (input.submissionId ?? '').trim();
  const nextStatus = NEXT[input.decision];
  if (!submissionId || submissionId.length > 36 || !nextStatus) return failure('invalid');
  const reason = (input.reason ?? '').trim();
  // Recusar e pedir revisão são decisões que a criadora precisa entender; aprovar
  // não exige justificativa, mas aceita nota interna.
  if (input.decision !== 'approve' && reason.length < 3) return failure('invalid');

  return inTransaction<ModerateResult>(
    ctx,
    async (tx) => {
      let submission: Row;
      try {
        submission = await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenge_submissions',
          rowId: submissionId,
          transactionId: tx.transactionId,
        });
      } catch (error) {
        if (isAbsent(error)) return failure('not_found');
        throw error;
      }
      const status = text(submission.status);
      const revision = typeof submission.revision === 'number' ? submission.revision : 0;
      if (status !== 'pending') return failure('conflict');
      if (typeof input.expectedRevision === 'number' && input.expectedRevision !== revision)
        return failure('conflict');

      const ownerId = text(submission.userId);
      const challengeId = text(submission.challengeId);
      let challenge: Row | null = null;
      try {
        challenge = await getTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenges',
          rowId: challengeId,
          transactionId: tx.transactionId,
        });
      } catch (error) {
        if (!isAbsent(error)) throw error;
      }

      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_submissions',
        rowId: submissionId,
        data: {
          status: nextStatus,
          reviewedBy: ctx.actor.userId,
          reviewedAt: ctx.now.toISOString(),
          moderationReason: reason.slice(0, 2000),
        },
        transactionId: tx.transactionId,
      });

      let pointsAwarded = 0;
      let credited = false;
      if (input.decision === 'approve') {
        const points = typeof challenge?.points === 'number' ? challenge.points : 0;
        if (points > 0) {
          credited = await creditPoints(
            ctx,
            tx,
            {
              userId: ownerId,
              amount: points,
              type: 'earn',
              referenceId: submissionId,
              referenceType: 'challenge_submission',
              description: `Aprovação — ${text(challenge?.name) || challengeId}`,
              idempotencyKey: `submission.approved:${submissionId}`,
              // Crédito de aprovação é conquista: conta para nível e ranking.
              qualifies: true,
            },
            { periodKey: periodKey(ctx.now, rankingTimeZone), delta: points },
          );
          if (credited) pointsAwarded = points;
        }
      }

      await recordSubmissionHistory(ctx, tx, {
        submissionId,
        userId: ownerId,
        revision,
        previousStatus: status,
        nextStatus,
        reason: reason || null,
      });
      await recordOutbox(ctx, tx, {
        eventKey: `submission.${nextStatus}:${submissionId}`,
        type: `submission.${nextStatus}`,
        aggregateId: submissionId,
        payload: {
          userId: ownerId,
          challengeId,
          submissionId,
          points: pointsAwarded,
          reason: reason || null,
        },
      });
      await recordAudit(ctx, tx, {
        action: `submission.${nextStatus}`,
        entityType: 'challenge_submissions',
        entityId: submissionId,
        affectedUserId: ownerId,
        reason: reason || null,
        before: { status, revision },
        after: { status: nextStatus, points: pointsAwarded },
      });

      return done({ submissionId, status: nextStatus, pointsAwarded, credited });
    },
    { conflict: 'conflict' },
  );
}
