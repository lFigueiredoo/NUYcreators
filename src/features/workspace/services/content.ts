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

export type ContentEntry = Submission & SubmissionContext;

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
 * `moderationReason`, `reviewedBy` e `reviewedAt` existem no documento mas não
 * são mapeados aqui: nota interna de moderação não é conteúdo de creator. O que
 * aparece é o estado público da submissão e os pontos concedidos na aprovação
 * (via extrato), nunca a avaliação da equipe.
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

  const byChallenge = new Map(contextResult.items.map((entry) => [entry.challengeId, entry]));
  return loaded(
    submissionResult.items.map((submission) => ({
      ...submission,
      ...(byChallenge.get(submission.challengeId) ?? {
        challengeId: submission.challengeId,
        challengeName: '',
        challengeSlug: '',
        challengePoints: 0,
      }),
    })),
  );
}
