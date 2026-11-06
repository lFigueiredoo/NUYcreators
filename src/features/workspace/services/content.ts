import 'server-only';
import { Query } from 'node-appwrite';
import { mapSubmission, type Submission } from './challenges';
import {
  integer,
  listSession,
  loaded,
  text,
  unavailable,
  type Document,
  type Loaded,
} from './read';

const SCOPE = 'conteudos';

/** Contexto público do desafio relacionado — nome, slug e pontuação. */
export type SubmissionContext = {
  challengeId: string;
  challengeName: string;
  challengeSlug: string;
  challengePoints: number;
};

export type ContentEntry = Submission &
  SubmissionContext & {
    /** Crédito efetivo do extrato; null quando ainda não há lançamento. */
    awardedPoints: number | null;
  };

function mapContext(document: Document): SubmissionContext {
  return {
    challengeId: text(document.$id),
    challengeName: text(document.name),
    challengeSlug: text(document.slug),
    challengePoints: integer(document.points),
  };
}

/**
 * Meus conteúdos — as submissões da própria usuária.
 *
 * O motivo de recusa/ajuste orienta a creator; notas de aprovação e identidade
 * da revisora continuam internas. Pontos creditados vêm do extrato, pois o
 * valor atual do desafio pode ter mudado depois da aprovação.
 */
export async function loadContents(secret: string, userId: string): Promise<Loaded<ContentEntry>> {
  const [submissionResult, contextResult] = await Promise.all([
    listSession(secret, SCOPE, 'challenge_submissions', mapSubmission, {
      queries: [Query.equal('userId', userId), Query.orderDesc('submittedAt')],
      limit: 100,
      paged: true,
    }),
    listSession(secret, SCOPE, 'challenges', mapContext, { limit: 100 }),
  ]);
  if (submissionResult.state !== 'ok' || contextResult.state !== 'ok')
    return unavailable<ContentEntry>();

  const approvedIds = submissionResult.items
    .filter((submission) => submission.status === 'approved')
    .map((submission) => submission.id);
  // Um crédito por aprovação. Restringir aos envios exibidos evita que ajustes
  // ou resgates antigos ocupem a página e escondam créditos recentes.
  const credits = approvedIds.length
    ? await listSession(
        secret,
        SCOPE,
        'point_transactions',
        (document) => ({
          submissionId: text(document.referenceId),
          amount: integer(document.amount),
          type: text(document.type),
          referenceType: text(document.referenceType),
        }),
        {
          queries: [
            Query.equal('userId', userId),
            Query.equal('referenceType', 'challenge_submission'),
            Query.equal('referenceId', approvedIds),
            Query.equal('type', 'earn'),
          ],
          limit: 100,
        },
      )
    : loaded([]);
  if (credits.state !== 'ok') return unavailable<ContentEntry>();

  const byChallenge = new Map(contextResult.items.map((entry) => [entry.challengeId, entry]));
  const bySubmission = new Map<string, number>();
  for (const credit of credits.items) {
    if (credit.type !== 'earn' || credit.referenceType !== 'challenge_submission') continue;
    bySubmission.set(
      credit.submissionId,
      (bySubmission.get(credit.submissionId) ?? 0) + credit.amount,
    );
  }
  return loaded(
    submissionResult.items.map((submission) => ({
      ...submission,
      awardedPoints: bySubmission.get(submission.id) ?? null,
      ...(byChallenge.get(submission.challengeId) ?? {
        challengeId: submission.challengeId,
        challengeName: '',
        challengeSlug: '',
        challengePoints: 0,
      }),
    })),
  );
}
