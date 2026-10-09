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

/**
 * Desafio publicado cuja janela ainda não abriu.
 *
 * Não é estado de participação — não há participação nenhuma. É o relógio da
 * linha lido contra o instante da tela (`notStarted`, em `domain/format`), e
 * existe para a tela não oferecer uma entrada que o servidor recusa: `core/join`
 * devolve `window_closed` enquanto a janela não abre.
 */
export const COMING_VIEW: StatusView = { label: 'Em breve', tone: 'progress' };

/** `requested -> processing -> shipped -> delivered` (docs/flows.md §Resgate). */
const REDEMPTION: Record<string, StatusView> = {
  requested: { label: 'Solicitado', tone: 'progress' },
  processing: { label: 'Em preparação', tone: 'progress' },
  shipped: { label: 'Enviado', tone: 'progress' },
  delivered: { label: 'Entregue', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
  refunded: { label: 'Estornado', tone: 'attention' },
};

/**
 * `notifications.type` guarda o **tipo do evento** — `challenge.joined`,
 * `submission.approved`, `points.adjusted` —, não a categoria. O mapa já esteve
 * chaveado por categoria e a busca errava SEMPRE: o código interno virava o
 * rótulo do chip, na cara da creator (P1-1 da revisão visual).
 *
 * As chaves passam a ser o tipo do evento; os VALORES continuam sendo as
 * categorias. Chip e título dizem coisas diferentes de propósito: o chip é a
 * família do aviso ("Conteúdo"), o título é o que aconteceu ("Conteúdo
 * aprovado"). Pôr o título no chip repetia a mesma frase duas vezes na linha e
 * ainda quebrava a asserção por texto de quem lê a tela (dois elementos com o
 * mesmo texto) — medido no E2E de staging.
 */
const NOTIFICATION: Record<string, StatusView> = {
  'challenge.joined': { label: 'Desafio', tone: 'progress' },
  'submission.approved': { label: 'Conteúdo', tone: 'neutral' },
  'submission.rejected': { label: 'Conteúdo', tone: 'neutral' },
  'submission.revision_requested': { label: 'Conteúdo', tone: 'neutral' },
  'reward.redeemed': { label: 'Recompensa', tone: 'attention' },
  'points.adjusted': { label: 'Pontos', tone: 'success' },
};

/** A aba de "Meus conteúdos" em que o desfecho do evento aparece. */
const SUBMISSION_TAB_OF_EVENT: Record<string, SubmissionTab> = {
  'submission.approved': 'approved',
  'submission.rejected': 'rejected',
  'submission.revision_requested': 'revision_requested',
};

/**
 * Para onde o aviso leva — só quando existe entidade de verdade atrás do evento.
 *
 * `submission.*` guarda o id da submissão em `referenceId`, e a tela de conteúdos
 * mostra a linha com esse id (a lista traz tudo e a aba só filtra): o destino é a
 * linha exata, não uma lista genérica. `reward.redeemed` e `points.adjusted` não
 * têm linha própria na tela — o destino é a tela onde o fato aparece.
 *
 * `challenge.joined` fica SEM link: o evento guarda o id do desafio e a rota usa
 * o slug. Sem slug confiável no dado, é melhor não ter caminho do que inventar um
 * endereço que pode dar em "Desafio não encontrado".
 */
export function notificationLink(item: {
  type: string;
  referenceId?: string | null;
}): { href: string; label: string } | null {
  const tab = SUBMISSION_TAB_OF_EVENT[item.type];
  if (tab) {
    const anchor = item.referenceId ? `#${item.referenceId}` : '';
    return { href: `/app/conteudos?aba=${tab}${anchor}`, label: 'Ver este conteúdo' };
  }
  if (item.type === 'reward.redeemed')
    return { href: '/app/recompensas', label: 'Ver meus resgates' };
  if (item.type === 'points.adjusted') return { href: '/app/pontos', label: 'Ver extrato' };
  return null;
}

function view(map: Record<string, StatusView>, value: string | null | undefined): StatusView {
  if (!value) return { label: 'Sem estado', tone: 'muted' };
  return map[value] ?? { label: value, tone: 'neutral' };
}

export const submissionView = (value?: string | null) => view(SUBMISSION, value);
export const participationView = (value?: string | null) => view(PARTICIPATION, value);
export const redemptionView = (value?: string | null) => view(REDEMPTION, value);
export const notificationView = (value?: string | null) => notificationType(value);

/**
 * Rótulo do aviso. Tipo de evento sem tradução (evento novo, criado depois desta
 * versão) NÃO mostra o código interno: o chip é uma categoria, e quem diz o que
 * aconteceu é o título e o corpo da própria notificação, escritos pelo servidor.
 * O código cru continua no banco e na auditoria — não na tela da creator.
 */
export function notificationType(value?: string | null): StatusView {
  if (!value) return { label: 'Aviso', tone: 'neutral' };
  return NOTIFICATION[value] ?? { label: 'Aviso', tone: 'neutral' };
}

/**
 * O que o botão do aviso PEDE, na forma em que o formulário manda.
 *
 * O rótulo do botão descreve a AÇÃO ("Marcar como lida" quando o aviso está não
 * lido), e o servidor lê o campo como o estado PEDIDO. Enquanto o campo carregava
 * o estado ATUAL, o botão "Marcar como lida" mandava "não lida": o servidor
 * regravava `readAt = null` e o aviso não saía do lugar — enquanto o botão do
 * aviso JÁ lido mandava "lida" e o marcava como lido, o inverso do que ele dizia.
 * Nenhuma das duas telas parecia quebrada: as duas respondiam "Aviso marcado
 * como…". Medido no ambiente real, com a chave de operação instalada.
 */
export function notificationReadTarget(read: boolean): 'true' | 'false' {
  return read ? 'false' : 'true';
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
