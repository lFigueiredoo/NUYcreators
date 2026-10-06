import 'server-only';
import { Query } from 'node-appwrite';
import { challengeBucket, type ChallengeTab } from '../domain/status';
import { parseRequirementConfig, type RequirementConfig } from '../domain/requirements';
import {
  first,
  flag,
  integer,
  listSession,
  loaded,
  optionalInteger,
  optionalText,
  text,
  unavailable,
  type Document,
  type Loaded,
} from './read';

const SCOPE = 'desafios';

export type Challenge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageFileId: string | null;
  platform: string;
  startsAt: string;
  endsAt: string;
  points: number;
  status: string;
  requiredLevelId: string | null;
  participantLimit: number | null;
  participantCount: number;
  hashtags: string | null;
  mentions: string | null;
};

export type Participation = { id: string; challengeId: string; status: string; joinedAt: string };

export type Submission = {
  id: string;
  challengeId: string;
  status: string;
  submittedAt: string;
  revision: number;
  url: string | null;
  fileId: string | null;
  platform: string;
};

export type Requirement = {
  id: string;
  type: string;
  required: boolean;
  config: RequirementConfig | null;
};

export type ChallengeView = Challenge & {
  participation: Participation | null;
  submission: Submission | null;
  bucket: ChallengeTab;
};

function mapChallenge(document: Document): Challenge {
  return {
    id: text(document.$id),
    slug: text(document.slug),
    name: text(document.name),
    description: text(document.description),
    imageFileId: optionalText(document.imageFileId),
    platform: text(document.platform),
    startsAt: text(document.startsAt),
    endsAt: text(document.endsAt),
    points: integer(document.points),
    status: text(document.status),
    requiredLevelId: optionalText(document.requiredLevelId),
    participantLimit: optionalInteger(document.participantLimit),
    participantCount: integer(document.participantCount),
    hashtags: optionalText(document.hashtags),
    mentions: optionalText(document.mentions),
  };
}

function mapParticipation(document: Document): Participation {
  return {
    id: text(document.$id),
    challengeId: text(document.challengeId),
    status: text(document.status),
    joinedAt: text(document.joinedAt),
  };
}

export function mapSubmission(document: Document): Submission {
  return {
    id: text(document.$id),
    challengeId: text(document.challengeId),
    status: text(document.status),
    submittedAt: text(document.submittedAt),
    revision: integer(document.revision),
    url: optionalText(document.canonicalUrl),
    fileId: optionalText(document.fileId),
    platform: text(document.platform),
  };
}

function mapRequirement(document: Document): Requirement {
  return {
    id: text(document.$id),
    type: text(document.type),
    required: flag(document.required),
    config: parseRequirementConfig(document.configJson),
  };
}

/** Catálogo publicado. Sem ordenação no servidor: ordenamos em memória. */
async function catalog(secret: string) {
  return listSession(secret, SCOPE, 'challenges', mapChallenge);
}

function byStart(a: Challenge, b: Challenge) {
  return (b.startsAt || '').localeCompare(a.startsAt || '');
}

/** Participações da própria usuária (escopo sempre da sessão). */
async function participations(secret: string, userId: string) {
  return listSession(secret, SCOPE, 'challenge_participants', mapParticipation, {
    queries: [Query.equal('userId', userId), Query.orderDesc('joinedAt')],
    limit: 100,
    paged: true,
  });
}

/** Submissões da própria usuária, mais recentes primeiro. */
async function submissions(secret: string, userId: string) {
  return listSession(secret, SCOPE, 'challenge_submissions', mapSubmission, {
    queries: [Query.equal('userId', userId), Query.orderDesc('submittedAt')],
    limit: 100,
    paged: true,
  });
}

function join(
  challenge: Challenge,
  participation: Participation | null,
  submission: Submission | null,
): ChallengeView {
  return {
    ...challenge,
    participation,
    submission,
    bucket: challengeBucket({ participation, submission }),
  };
}

/**
 * Desafios com a participação real da usuária.
 *
 * Se qualquer uma das três leituras falhar, a tela mostra "indisponível" em vez
 * de um catálogo incompleto — um desafio marcado como "disponível" quando a
 * participação não pôde ser lida seria mentira.
 */
export async function loadChallenges(
  secret: string,
  userId: string,
): Promise<Loaded<ChallengeView>> {
  const [catalogResult, participationResult, submissionResult] = await Promise.all([
    catalog(secret),
    participations(secret, userId),
    submissions(secret, userId),
  ]);
  if (
    catalogResult.state !== 'ok' ||
    participationResult.state !== 'ok' ||
    submissionResult.state !== 'ok'
  )
    return unavailable<ChallengeView>();

  // Mais recente por desafio: a submissão atual é a de maior revision.
  const latest = new Map<string, Submission>();
  for (const submission of submissionResult.items) {
    const current = latest.get(submission.challengeId);
    if (!current || submission.revision >= current.revision)
      latest.set(submission.challengeId, submission);
  }
  const byChallenge = new Map<string, Participation>();
  for (const entry of participationResult.items) byChallenge.set(entry.challengeId, entry);

  return loaded(
    [...catalogResult.items]
      .sort(byStart)
      .map((challenge) =>
        join(challenge, byChallenge.get(challenge.id) ?? null, latest.get(challenge.id) ?? null),
      ),
  );
}

export type ChallengeDetail = {
  challenge: Loaded<ChallengeView>;
  requirements: Loaded<Requirement>;
};

/**
 * Entrar em um desafio depende da function `join-challenge`, declarada como não
 * implementada (`implemented: false` em infra/appwrite/schema.ts) e sem papel de
 * execução. Sem comando transacional no servidor não existe botão de participar:
 * a tela explica o estado real em vez de simular uma entrada que não grava nada.
 */
export const participationEnabled = false;

/**
 * Detalhe por slug. `challenge_requirements` é lido só quando o desafio existe,
 * e o requisito exibido é exatamente o cadastrado — nada é inferido do briefing.
 */
export async function loadChallengeDetail(
  secret: string,
  userId: string,
  slug: string,
): Promise<ChallengeDetail> {
  const found = await listSession(secret, SCOPE, 'challenges', mapChallenge, {
    queries: [Query.equal('slug', slug)],
    limit: 1,
  });
  if (found.state !== 'ok')
    return { challenge: unavailable<ChallengeView>(), requirements: loaded([]) };
  const challenge = found.items[0];
  if (!challenge)
    return { challenge: loaded<ChallengeView>([]), requirements: loaded<Requirement>([]) };

  const [participation, submission, requirements] = await Promise.all([
    listSession(secret, SCOPE, 'challenge_participants', mapParticipation, {
      queries: [Query.equal('challengeId', challenge.id), Query.equal('userId', userId)],
      limit: 1,
    }),
    listSession(secret, SCOPE, 'challenge_submissions', mapSubmission, {
      queries: [Query.equal('challengeId', challenge.id), Query.equal('userId', userId)],
      limit: 100,
    }),
    listSession(secret, SCOPE, 'challenge_requirements', mapRequirement, {
      queries: [Query.equal('challengeId', challenge.id), Query.orderAsc('order')],
      limit: 100,
    }),
  ]);
  if (participation.state !== 'ok' || submission.state !== 'ok')
    return { challenge: unavailable<ChallengeView>(), requirements };

  // Revisão mais alta = submissão atual; o histórico fica no backend.
  const current = submission.items.reduce<Submission | null>(
    (latest, entry) => (!latest || entry.revision >= latest.revision ? entry : latest),
    null,
  );
  return { challenge: loaded([join(challenge, first(participation), current)]), requirements };
}
