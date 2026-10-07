import { Query } from 'node-appwrite';
import {
  createTableRow,
  getTableRow,
  isAbsent,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { ownerReadPermissions } from '../../../lib/security/permissions';
import { done, failure, type CoreContext, type CoreResult } from './context';
import { canonicalUrl, digest, platformFromUrl, rowId } from './ids';
import { recordAudit, recordOutbox, recordSubmissionHistory } from './record';
import { inTransaction } from './transaction';

/**
 * Enviar conteúdo para um desafio.
 *
 * O que a submissão garante:
 *  - só participa quem entrou (`challenge_participants` derivado do par);
 *  - o ciclo é o de docs/flows.md: `pending -> approved|rejected|revision_requested`
 *    e `revision_requested -> pending` após reenvio. Rejeição é terminal por aqui:
 *    reabrir exige comando administrativo explícito e auditado;
 *  - link é canonizado (host minúsculo, sem rastreio, ordem estável) e o
 *    fingerprint único bloqueia o MESMO conteúdo duas vezes — a unicidade é
 *    cobrada no commit, não por consulta otimista;
 *  - reenvio do mesmo conteúdo após revisão reaproveita a linha (mesmo id
 *    lógico) e incrementa `revision`, preservando o conteúdo anterior no
 *    histórico append-only.
 *
 * Requisito cadastrado que não dá para conferir com o que a submissão traz
 * (duração, número de slides) NÃO é dado como cumprido: fica para a moderação,
 * que é quem olha a mídia. Só o requisito de link é conferido aqui, porque é o
 * único que o dado enviado prova.
 */
const OPEN = ['active', 'published'];

export type SubmitInput = {
  challengeId: string;
  /** Link da publicação, como a usuária digitou. */
  url?: string | null;
  /** Mídia já enviada ao bucket privado. */
  fileId?: string | null;
  platform?: string | null;
};

export type SubmitResult = {
  submissionId: string;
  challengeId: string;
  revision: number;
  /** `false` quando o mesmo conteúdo já estava registrado — repetição não é erro. */
  created: boolean;
  status: string;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function submitContent(
  ctx: CoreContext,
  input: SubmitInput,
): Promise<CoreResult<SubmitResult>> {
  const challengeId = (input.challengeId ?? '').trim();
  if (!challengeId || challengeId.length > 36) return failure('invalid');
  if (!ctx.actor.userId) return failure('unauthenticated');
  const fileId = (input.fileId ?? '').trim();
  const canonical = input.url ? canonicalUrl(input.url) : null;
  // Link informado que não canoniza é link inválido, não "sem link".
  if (input.url && input.url.trim() !== '' && !canonical) return failure('invalid');
  if (!canonical && !fileId) return failure('invalid');

  return inTransaction<SubmitResult>(
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
      if (!OPEN.includes(text(challenge.status))) return failure('not_published');
      const ends = challenge.endsAt ? new Date(text(challenge.endsAt)) : null;
      if (ends && !Number.isNaN(ends.getTime()) && ends.getTime() < ctx.now.getTime())
        return failure('window_closed');

      const participationId = rowId('join', challengeId, ctx.actor.userId);
      const participation = await getTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_participants',
        rowId: participationId,
        transactionId: tx.transactionId,
      }).catch((error: unknown) => {
        if (isAbsent(error)) return null;
        throw error;
      });
      if (!participation) return failure('not_participant');

      const requirements = await ctx.tables.listRows({
        databaseId: ctx.databaseId,
        tableId: 'challenge_requirements',
        queries: [Query.equal('challengeId', challengeId), Query.limit(100)],
        transactionId: tx.transactionId,
      });
      const needsLink = requirements.rows.some(
        (row) => row.required === true && text(row.type) === 'link',
      );
      if (needsLink && !canonical) return failure('invalid');

      const fingerprint = digest(challengeId, ctx.actor.userId, canonical ?? `file:${fileId}`);
      const submissionId = rowId('sub', challengeId, ctx.actor.userId, fingerprint);

      const mine = await ctx.tables.listRows({
        databaseId: ctx.databaseId,
        tableId: 'challenge_submissions',
        queries: [
          Query.equal('challengeId', challengeId),
          Query.equal('userId', ctx.actor.userId),
          Query.orderDesc('revision'),
          Query.limit(100),
        ],
        transactionId: tx.transactionId,
      });
      const latest = mine.rows[0] ?? null;
      const current = text(latest?.status);
      const revision = mine.rows.reduce(
        (highest, row) => Math.max(highest, typeof row.revision === 'number' ? row.revision : 0),
        0,
      );
      const data = {
        challengeId,
        participantId: participationId,
        userId: ctx.actor.userId,
        platform: text(input.platform) || (canonical ? platformFromUrl(canonical) : 'upload'),
        canonicalUrl: canonical ?? '',
        contentFingerprint: fingerprint,
        fileId,
        status: 'pending',
        submittedAt: ctx.now.toISOString(),
        moderationReason: '',
      };

      if (current === 'pending') {
        const same = mine.rows.find((row) => row.$id === submissionId);
        if (same)
          return done({
            submissionId,
            challengeId,
            revision: typeof same.revision === 'number' ? same.revision : revision,
            created: false,
            status: 'pending',
          });
        // Já existe conteúdo em análise: o ciclo só sai de `pending` pela moderação.
        return failure('conflict');
      }
      if (current === 'approved' || current === 'rejected') return failure('conflict');

      let created = true;
      const sameContent = mine.rows.find((row) => row.$id === submissionId);
      if (sameContent && current === 'revision_requested') {
        // Mesmo id lógico, revisão nova: o conteúdo anterior fica no histórico.
        created = false;
        await updateTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenge_submissions',
          rowId: submissionId,
          data: { ...data, revision: revision + 1 },
          transactionId: tx.transactionId,
        });
      } else {
        await createTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenge_submissions',
          rowId: submissionId,
          data: { ...data, revision: revision + 1 },
          permissions: ownerReadPermissions(ctx.actor.userId),
          transactionId: tx.transactionId,
        });
      }

      await recordSubmissionHistory(ctx, tx, {
        submissionId,
        userId: ctx.actor.userId,
        revision: revision + 1,
        previousStatus: current || null,
        nextStatus: 'pending',
        payload: { url: canonical ?? '', fileId },
      });
      await recordOutbox(ctx, tx, {
        eventKey: `submission.created:${submissionId}:r${revision + 1}`,
        type: 'submission.created',
        aggregateId: submissionId,
        payload: { userId: ctx.actor.userId, challengeId, submissionId },
      });
      await recordAudit(ctx, tx, {
        action: 'submission.created',
        entityType: 'challenge_submissions',
        entityId: submissionId,
        affectedUserId: ctx.actor.userId,
        ...(current ? { before: { status: current } } : {}),
        after: { status: 'pending', revision: revision + 1 },
      });

      return done({
        submissionId,
        challengeId,
        revision: revision + 1,
        created,
        status: 'pending',
      });
    },
    { conflict: 'duplicate_content' },
  );
}
