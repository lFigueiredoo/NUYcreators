/**
 * Estados do domínio — rótulo e tom.
 *
 * Os valores vêm das coleções (`challenge_submissions.status`,
 * `reward_redemptions.status`, `notifications.type`), que são string livre no
 * schema. O mapa cobre os estados conhecidos; qualquer valor desconhecido cai
 * no rótulo neutro com o texto cru — nunca inventamos um estado.
 */
export type Tone = 'neutral' | 'progress' | 'success' | 'attention' | 'muted';

export type StatusView = { label: string; tone: Tone };

/** `pending -> approved/rejected/revision_requested` (docs/flows.md §Submissão). */
const SUBMISSION: Record<string, StatusView> = {
  pending: { label: 'Em análise', tone: 'progress' },
  approved: { label: 'Aprovado', tone: 'success' },
  revision_requested: { label: 'Revisão solicitada', tone: 'attention' },
  rejected: { label: 'Rejeitado', tone: 'muted' },
};

/** Participação não tem enum publicado; só o estado inicial está documentado. */
const PARTICIPATION: Record<string, StatusView> = {
  joined: { label: 'Participando', tone: 'progress' },
};

/** `requested -> processing -> shipped -> delivered` (docs/flows.md §Resgate). */
const REDEMPTION: Record<string, StatusView> = {
  requested: { label: 'Solicitado', tone: 'progress' },
  processing: { label: 'Em preparação', tone: 'progress' },
  shipped: { label: 'Enviado', tone: 'progress' },
  delivered: { label: 'Entregue', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
  refunded: { label: 'Estornado', tone: 'attention' },
};

const NOTIFICATION: Record<string, { label: string; tone: Tone }> = {
  challenge: { label: 'Desafio', tone: 'progress' },
  content: { label: 'Conteúdo', tone: 'neutral' },
  points: { label: 'Pontos', tone: 'success' },
  reward: { label: 'Recompensa', tone: 'attention' },
  system: { label: 'Sistema', tone: 'muted' },
};

function view(map: Record<string, StatusView>, value: string | null | undefined): StatusView {
  if (!value) return { label: 'Sem estado', tone: 'muted' };
  return map[value] ?? { label: value, tone: 'neutral' };
}

export const submissionView = (value?: string | null) => view(SUBMISSION, value);
export const participationView = (value?: string | null) => view(PARTICIPATION, value);
export const redemptionView = (value?: string | null) => view(REDEMPTION, value);
export const notificationView = (value?: string | null) => notificationType(value);

/** Categoria da notificação; usa o rótulo cru quando o tipo é novo. */
export function notificationType(value?: string | null): { label: string; tone: Tone } {
  if (!value) return { label: 'Aviso', tone: 'neutral' };
  return NOTIFICATION[value] ?? { label: value, tone: 'neutral' };
}

/** Abas de "Meus conteúdos" — a ordem é a do ciclo de vida real da submissão. */
export const submissionTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Em análise' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'revision_requested', label: 'Revisão solicitada' },
  { id: 'rejected', label: 'Rejeitados' },
] as const;

/** Abas de desafios — participação, não status de catálogo. */
export const challengeTabs = [
  { id: 'available', label: 'Disponíveis' },
  { id: 'joined', label: 'Participando' },
  { id: 'in_review', label: 'Em análise' },
  { id: 'done', label: 'Concluídos' },
] as const;

export type SubmissionTab = (typeof submissionTabs)[number]['id'];
export type ChallengeTab = (typeof challengeTabs)[number]['id'];

export function matchesSubmissionTab(status: string, tab: SubmissionTab) {
  if (tab === 'all') return true;
  return status === tab;
}

/**
 * Em qual aba de Desafios a participação aparece. A aba vem do que existe:
 * participação e submissão são lidas, nunca presumidas.
 *
 * `rejected` fecha o ciclo — reabrir rejeição exige comando administrativo
 * explícito (docs/flows.md), então não fica pendurado em "Participando".
 */
export function challengeBucket(value: {
  participation: { status: string } | null;
  submission: { status: string } | null;
}): ChallengeTab {
  const submitted = value.submission?.status ?? null;
  if (submitted === 'approved' || value.participation?.status === 'approved') return 'done';
  if (submitted === 'pending') return 'in_review';
  if (submitted === 'rejected') return 'done';
  if (value.participation || submitted) return 'joined';
  return 'available';
}
