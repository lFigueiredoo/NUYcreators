/**
 * Ciclo de vida do catálogo — desafios, recompensas e campanhas.
 *
 * As colunas `challenges.status` e `rewards.status` são string livre no schema;
 * o que existia até aqui era a regra de QUEM pode ser consumido: `join`,
 * `submit` e `redeem` aceitam `active` ou `published` e recusam qualquer outra
 * palavra (medido em `core/join.ts`, `core/submit.ts`, `core/redeem.ts`).
 *
 * Este módulo dá nome aos TRÊS estados que a operação precisa distinguir, sem
 * criar uma segunda palavra para "no ar":
 *
 *  - `draft`     — existe só para a equipe; a criadora não vê nem consome;
 *  - `published` — no ar para a criadora, sempre dentro da janela de datas;
 *  - `closed`    — encerrado: não aceita novas participações, envios ou resgates.
 *
 * `active` continua sendo ACEITO na leitura, porque já é palavra do catálogo no
 * código publicado — mas nada novo é escrito com ela: a operação grava
 * `published`. Duas palavras para o mesmo estado seriam uma armadilha para quem
 * for ler o banco depois.
 */
import type { Tone } from './status';

export const catalogStatuses = ['draft', 'published', 'closed'] as const;
export type CatalogStatus = (typeof catalogStatuses)[number];

export const catalogStatusView: Record<CatalogStatus, { label: string; tone: Tone; hint: string }> =
  {
    draft: {
      label: 'Rascunho',
      tone: 'muted',
      hint: 'Visível só para a equipe. Não aparece no aplicativo.',
    },
    published: {
      label: 'Publicado',
      tone: 'success',
      hint: 'No ar para as creators dentro do período informado.',
    },
    closed: {
      label: 'Encerrado',
      tone: 'neutral',
      hint: 'Não aceita novas participações, envios nem resgates.',
    },
  };

export function isCatalogStatus(value: string): value is CatalogStatus {
  return (catalogStatuses as readonly string[]).includes(value);
}

/** Rótulo do estado; palavra desconhecida aparece crua, nunca traduzida no chute. */
export function catalogView(value: string | null | undefined) {
  if (value && isCatalogStatus(value)) return catalogStatusView[value];
  if (value === 'archived')
    return {
      label: 'Arquivado',
      tone: 'muted' as Tone,
      hint: 'Preservado para auditoria e indisponível para creators.',
    };
  if (value === 'active')
    return { label: 'Publicado', tone: 'success' as Tone, hint: catalogStatusView.published.hint };
  return { label: value || 'Sem estado', tone: 'neutral' as Tone, hint: '' };
}

/**
 * O estado está no ar? É a MESMA lista que `join`/`submit`/`redeem` usam para
 * decidir se podem consumir — duplicar aqui outra noção de "publicado" criaria
 * uma tela dizendo "publicado" e um comando recusando por `not_published`.
 */
const LIVE = ['published', 'active'];

export function isLive(status: string) {
  return LIVE.includes(status);
}

/**
 * Estado em que a criadora pode ver o item no catálogo. `draft` fica fora, e
 * `closed` continua visível quando já houve participação — quem participou
 * precisa reencontrar o desafio para ver o próprio histórico.
 */
export function isVisibleToCreators(status: string) {
  return isLive(status) || status === 'closed';
}

/** Plataformas já usadas pelo produto (onboarding, envio e atribuição de link). */
export const catalogPlatforms = ['instagram', 'tiktok', 'youtube', 'live'] as const;

export function catalogPlatformLabel(platform: string): string {
  if (platform === 'live') return 'Live';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * Rascunhos do catálogo — o que a tela preenche e o núcleo grava.
 *
 * Os limites são os do SCHEMA (`infra/appwrite/schema.ts`), não uma política
 * nova: `description` de desafio e recompensa tem 10.000, `hashtags`/`mentions`
 * 2.000, `name` 255. A validação existe para a operação ver o problema ANTES de
 * gravar; o núcleo valida de novo, porque quem chama nunca é de confiança.
 */
export type RequirementDraft = {
  type: string;
  required: boolean;
  /** JSON livre do schema; vazio é aceito, JSON inválido não. */
  configJson: string;
};

export type ChallengeDraft = {
  slug: string;
  name: string;
  description: string;
  platform: string;
  /** Hora de parede (`AAAA-MM-DDTHH:mm`) no fuso do produto, ou ISO com fuso. */
  startsAt: string;
  endsAt: string;
  points: number;
  imageFileId: string;
  requiredLevelId: string;
  participantLimit: number | null;
  campaignId: string;
  productId: string;
  hashtags: string;
  mentions: string;
  requirements: RequirementDraft[];
};

export function withLiveRequirement(draft: ChallengeDraft): ChallengeDraft {
  if (draft.platform.trim().toLowerCase() !== 'live') return draft;
  if (draft.requirements.some((requirement) => requirement.type.trim() === 'link')) return draft;
  return {
    ...draft,
    requirements: [
      ...draft.requirements,
      { type: 'link', required: true, configJson: '' },
    ],
  };
}

export type RewardDraft = {
  name: string;
  /** Texto livre no schema — sem vocabulário fechado publicado, sem tradução inventada. */
  type: string;
  description: string;
  pointsCost: number;
  stock: number;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  imageFileId: string;
};

export type CampaignDraft = {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: CatalogStatus;
};

const ID_PATTERN = /^[A-Za-z0-9_.-]{1,36}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Teto técnico de requisitos por desafio: a tela os apresenta em lista única. */
export const REQUIREMENT_LIMIT = 20;

export type CivilDateTime = {
  source: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  /** `null` é hora de parede; os demais valores são um instante ISO explícito. */
  zone: string | null;
};

const CIVIL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Partes civis validadas sem deixar o `Date` normalizar 31/02 para março.
 *
 * O regex é deliberadamente ancorado: `datetime-local` não manda sufixo, e uma
 * chamada direta à Action não pode esconder lixo depois de um prefixo válido.
 */
export function parseCivilDateTime(value: string): CivilDateTime | null {
  const source = value.trim();
  const match = CIVIL_DATE_TIME.exec(source);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, msText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? 0);
  const millisecond = Number((msText ?? '').padEnd(3, '0') || 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return null;
  // `Date` também valida o deslocamento explícito (por exemplo, recusa +99:00).
  if (zone && Number.isNaN(new Date(source).getTime())) return null;
  return {
    source,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    zone: zone ?? null,
  };
}

function utcDate(parts: CivilDateTime): Date {
  // `Date.UTC(1, ...)` trata 1 como 1901. `setUTCFullYear` preserva o ano civil.
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
  return date;
}

function wallClock(value: string): Date | null {
  const parts = parseCivilDateTime(value);
  if (!parts) return null;
  if (parts.zone) return new Date(parts.source);
  // Comparação de JANELA não precisa de fuso: as duas pontas usam a mesma
  // convenção, e o que importa é a ordem entre elas.
  return utcDate(parts);
}

/**
 * Caminho INVERSO de `wallClock`, para o formulário de edição.
 *
 * O instante gravado (UTC) volta a ser hora de parede no fuso do produto, de
 * modo que reabrir o editor mostre exatamente o que a operação digitou. Formatar
 * no fuso do servidor faria a janela andar a cada leitura — e o calendário do
 * produto é o de São Paulo. Vazio quando não há instante legível; a tela mostra
 * campo em branco em vez de inventar data.
 */
export function wallClockValue(instant: string | null | undefined, timeZone: string): string {
  if (!instant) return '';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const field = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const year = field('year');
  const month = field('month');
  const day = field('day');
  const hour = field('hour');
  const minute = field('minute');
  if (!year || !month || !day || !hour || !minute) return '';
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function windowIssues(
  startsAt: string,
  endsAt: string,
  problems: string[],
): { startsAt: Date; endsAt: Date } | null {
  const start = wallClock(startsAt);
  const end = wallClock(endsAt);
  if (!start) problems.push('Informe a data de início no formato AAAA-MM-DDTHH:mm.');
  if (!end) problems.push('Informe a data de término no formato AAAA-MM-DDTHH:mm.');
  if (!start || !end) return null;
  if (end.getTime() <= start.getTime()) problems.push('O término precisa ser depois do início.');
  return { startsAt: start, endsAt: end };
}

function optionalIdIssue(value: string, label: string, problems: string[]): void {
  const trimmed = value.trim();
  if (trimmed !== '' && !ID_PATTERN.test(trimmed))
    problems.push(
      `${label}: use um identificador de até 36 caracteres (letras, números, ponto, hífen).`,
    );
}

export function challengeIssues(draft: ChallengeDraft): string[] {
  const problems: string[] = [];
  const slug = draft.slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug) || slug.length > 60)
    problems.push(
      'O identificador do desafio usa apenas letras minúsculas, números e hífen (ex.: reels-de-vera).',
    );
  if (draft.name.trim().length < 2 || draft.name.trim().length > 255)
    problems.push('O nome precisa ter entre 2 e 255 caracteres.');
  if (draft.description.trim().length < 1 || draft.description.trim().length > 10000)
    problems.push('A descrição precisa ter entre 1 e 10.000 caracteres.');
  if (!draft.platform.trim()) problems.push('Escolha a plataforma do desafio.');
  windowIssues(draft.startsAt, draft.endsAt, problems);
  if (!Number.isInteger(draft.points) || draft.points < 0)
    problems.push('Os pontos precisam ser um número inteiro maior ou igual a zero.');
  if (
    draft.participantLimit !== null &&
    (!Number.isInteger(draft.participantLimit) || draft.participantLimit < 1)
  )
    problems.push(
      'O limite de participantes precisa ser um inteiro maior ou igual a 1, ou ficar em branco.',
    );
  if (draft.hashtags.trim().length > 2000) problems.push('As hashtags passam de 2.000 caracteres.');
  if (draft.mentions.trim().length > 2000)
    problems.push('As marcações passam de 2.000 caracteres.');
  optionalIdIssue(draft.imageFileId, 'Imagem', problems);
  optionalIdIssue(draft.requiredLevelId, 'Nível exigido', problems);
  optionalIdIssue(draft.campaignId, 'Campanha', problems);
  optionalIdIssue(draft.productId, 'Produto', problems);
  if (draft.requirements.length > REQUIREMENT_LIMIT)
    problems.push(`Um desafio comporta no máximo ${REQUIREMENT_LIMIT} requisitos.`);
  for (const [index, requirement] of draft.requirements.entries()) {
    const position = index + 1;
    if (!requirement.type.trim()) problems.push(`Requisito ${position}: informe o tipo.`);
    if (requirement.type.trim().length > 64)
      problems.push(`Requisito ${position}: o tipo passa de 64 caracteres.`);
    const config = requirement.configJson.trim();
    if (config !== '') {
      try {
        const parsed: unknown = JSON.parse(config);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          problems.push(`Requisito ${position}: a configuração precisa ser um objeto JSON.`);
      } catch {
        problems.push(`Requisito ${position}: a configuração não é JSON válido.`);
      }
    }
    if (config.length > 10000)
      problems.push(`Requisito ${position}: a configuração passa de 10.000 caracteres.`);
  }
  return problems;
}

export function rewardIssues(draft: RewardDraft): string[] {
  const problems: string[] = [];
  if (draft.name.trim().length < 2 || draft.name.trim().length > 255)
    problems.push('O nome precisa ter entre 2 e 255 caracteres.');
  if (!draft.type.trim()) problems.push('Informe o tipo da recompensa.');
  if (draft.type.trim().length > 255) problems.push('O tipo passa de 255 caracteres.');
  if (draft.description.trim().length < 1 || draft.description.trim().length > 10000)
    problems.push('A descrição precisa ter entre 1 e 10.000 caracteres.');
  if (!Number.isInteger(draft.pointsCost) || draft.pointsCost < 0)
    problems.push('O custo em pontos precisa ser um inteiro maior ou igual a zero.');
  if (!Number.isInteger(draft.stock) || draft.stock < 0)
    problems.push('O estoque precisa ser um inteiro maior ou igual a zero.');
  if (!Number.isInteger(draft.perUserLimit) || draft.perUserLimit < 1)
    problems.push('O limite por creator precisa ser um inteiro maior ou igual a 1.');
  windowIssues(draft.startsAt, draft.endsAt, problems);
  optionalIdIssue(draft.imageFileId, 'Imagem', problems);
  return problems;
}

export function campaignIssues(draft: CampaignDraft): string[] {
  const problems: string[] = [];
  if (draft.name.trim().length < 2 || draft.name.trim().length > 255)
    problems.push('O nome precisa ter entre 2 e 255 caracteres.');
  if (draft.description.trim().length < 1 || draft.description.trim().length > 10000)
    problems.push('A descrição precisa ter entre 1 e 10.000 caracteres.');
  windowIssues(draft.startsAt, draft.endsAt, problems);
  if (!isCatalogStatus(draft.status)) problems.push('Escolha o estado da campanha.');
  return problems;
}
