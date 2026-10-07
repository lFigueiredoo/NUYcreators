import { Query } from 'node-appwrite';
import { countTableRows, listTableRows, type Row } from '../../../lib/appwrite/data/contract';
import { rankingTimeZone } from '../domain/ranking';
import { instantIn } from './catalog';
import { done, requiresStaff, type CoreContext, type CoreResult } from './context';

/**
 * Leituras da administração.
 *
 * Todas passam pela mesma porta: capacidade apurada de membership confirmada. A
 * diferença para as leituras da criadora é o que se lê — aqui entram linhas que a
 * sessão NUNCA enxerga (`challenge_submissions` é do dono, `audit_logs` não tem
 * permissão nenhuma, rascunho não tem permissão nenhuma). Por isso a equipe lê por
 * uma Function com a chave do próprio runtime, e não relaxando a permissão das
 * linhas: quem lê é o PAPEL, não a sessão de quem clicou.
 *
 * Duas regras de honestidade nestas leituras:
 *  - contagem exata usa o `total` do banco (`countTableRows`), nunca `length` de
 *    uma página;
 *  - agregação em memória (pontos por período, por exemplo) declara quando
 *    truncou (`truncated`), e a tela mostra "≥" em vez de fingir precisão.
 */
const PAGE = 100;
/** Teto de linhas agregadas em memória por leitura — declarado, nunca silencioso. */
const ROOF = 1000;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 0;
}

function instant(value: unknown): string {
  const raw = text(value);
  return raw;
}

/** Página única, ordenada pelo banco. Para listas de tela que já têm filtro. */
async function page(
  ctx: CoreContext,
  tableId: string,
  queries: string[],
  limit = PAGE,
): Promise<Row[]> {
  const result = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId,
    queries: [...queries, Query.limit(Math.min(Math.max(limit, 1), PAGE))],
  });
  return result.rows;
}

/** Percorre páginas até o teto. `truncated` diz se ainda havia mais. */
async function listAll(
  ctx: CoreContext,
  tableId: string,
  queries: string[],
  roof = ROOF,
): Promise<{ rows: Row[]; truncated: boolean }> {
  const rows: Row[] = [];
  let offset = 0;
  for (;;) {
    const result = await listTableRows(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId,
      queries: [...queries, Query.limit(PAGE), Query.offset(offset)],
    });
    rows.push(...result.rows);
    offset += result.rows.length;
    if (rows.length >= roof)
      return {
        rows: rows.slice(0, roof),
        truncated: result.total > roof || result.rows.length === PAGE,
      };
    if (result.rows.length < PAGE || offset >= result.total) return { rows, truncated: false };
  }
}

async function count(ctx: CoreContext, tableId: string, queries: string[]): Promise<number> {
  return countTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId,
    queries: [...queries, Query.limit(1)],
  });
}

/** No ar: as duas palavras que `join`/`submit`/`redeem` aceitam. */
const LIVE = ['published', 'active'];

/**
 * Filtro por DIA, não por instante.
 *
 * A tela pergunta "enviados a partir de 01/10" e a resposta certa começa à meia-noite
 * de Brasília — não à meia-noite UTC, e não no fuso do servidor. Comparar a colinha
 * `AAAA-MM-DD`, como o formulário manda, excluiria o próprio dia escolhido no limite
 * final (o instante gravado é maior que a data nua). Valor que já vem com instante é
 * respeitado como veio.
 */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayStart(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (!DAY.test(raw)) return raw;
  return instantIn(`${raw}T00:00`, rankingTimeZone);
}

function dayEnd(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (!DAY.test(raw)) return raw;
  return instantIn(`${raw}T23:59`, rankingTimeZone);
}

export type CatalogChallenge = {
  challengeId: string;
  slug: string;
  name: string;
  platform: string;
  status: string;
  startsAt: string;
  endsAt: string;
  points: number;
  participantCount: number;
  participantLimit: number | null;
  version: number;
  campaignId: string;
  campaignName: string;
  updatedAt: string;
};

export type CatalogChallengeDetail = CatalogChallenge & {
  description: string;
  hashtags: string;
  mentions: string;
  imageFileId: string;
  requiredLevelId: string;
  productId: string;
  requirements: Array<{
    id: string;
    type: string;
    configJson: string;
    order: number;
    required: boolean;
  }>;
  history: AuditEntry[];
};

export type CatalogReward = {
  rewardId: string;
  name: string;
  type: string;
  description: string;
  pointsCost: number;
  stock: number;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  status: string;
  imageFileId: string;
  version: number;
  redeemed: number;
};

export type CatalogCampaign = {
  campaignId: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
  challenges: number;
};

export type AdminSubmission = {
  submissionId: string;
  challengeId: string;
  challengeName: string;
  userId: string;
  creatorName: string;
  platform: string;
  url: string;
  status: string;
  revision: number;
  submittedAt: string;
  reviewedAt: string;
  reviewedBy: string;
  moderationReason: string;
};

export type AdminSubmissionDetail = AdminSubmission & {
  contentFingerprint: string;
  fileId: string;
  challengePoints: number;
  history: Array<{
    id: string;
    previousStatus: string;
    nextStatus: string;
    revision: number;
    actorId: string;
    reason: string;
    occurredAt: string;
  }>;
};

export type CreatorSummary = {
  userId: string;
  name: string;
  levelName: string;
  availablePoints: number;
  journeyPoints: number;
  status: string;
  onboardingCompletedAt: string;
  city: string;
  state: string;
  niche: string;
  participations: number;
  submissions: number;
};

export type CreatorDetail = CreatorSummary & {
  phone: string;
  birthDate: string;
  creatorType: string;
  publicProfile: boolean;
  socials: Array<{ platform: string; canonicalUrl: string; verificationStatus: string }>;
  redemptions: Array<{
    redemptionId: string;
    rewardName: string;
    points: number;
    status: string;
    requestedAt: string;
  }>;
  ledger: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
    referenceId: string;
  }>;
};

export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  affectedUserId: string;
  reason: string;
  occurredAt: string;
  correlationId: string;
  before: unknown;
  after: unknown;
};

export type ReportSummary = {
  days: number;
  from: string;
  creators: { total: number; onboardedInPeriod: number };
  activeCreators: { sampled: boolean; total: number };
  challenges: { live: number; startedInPeriod: number; closed: number };
  participations: { inPeriod: number };
  submissions: {
    inPeriod: number;
    approved: number;
    rejected: number;
    pending: number;
    revisionRequested: number;
    sampleTruncated: boolean;
  };
  approvalRate: number | null;
  points: { granted: number; redeemed: number; truncated: boolean };
  redemptions: { inPeriod: number; requested: number; processing: number; delivered: number };
  weeks: Array<{ label: string; submissions: number }>;
};

/** Visão geral: só contagem exata do banco. Zero é resposta, não vazio. */
export async function adminOverview(ctx: CoreContext): Promise<CoreResult<Record<string, number>>> {
  const blocked = requiresStaff<Record<string, number>>(ctx, 'view-audit');
  if (blocked) return blocked;
  const [
    challengesLive,
    challengesDraft,
    challengesClosed,
    submissionsPending,
    submissionsRevision,
    creators,
    rewardsLive,
    rewardsDraft,
    redemptionsRequested,
    redemptionsProcessing,
    campaigns,
  ] = await Promise.all([
    count(ctx, 'challenges', [Query.equal('status', LIVE)]),
    count(ctx, 'challenges', [Query.equal('status', 'draft')]),
    count(ctx, 'challenges', [Query.equal('status', 'closed')]),
    count(ctx, 'challenge_submissions', [Query.equal('status', 'pending')]),
    count(ctx, 'challenge_submissions', [Query.equal('status', 'revision_requested')]),
    count(ctx, 'profiles', [Query.isNotNull('onboardingCompletedAt')]),
    count(ctx, 'rewards', [Query.equal('status', LIVE)]),
    count(ctx, 'rewards', [Query.equal('status', 'draft')]),
    count(ctx, 'reward_redemptions', [Query.equal('status', 'requested')]),
    count(ctx, 'reward_redemptions', [Query.equal('status', 'processing')]),
    count(ctx, 'campaigns', []),
  ]);
  return done({
    challengesLive,
    challengesDraft,
    challengesClosed,
    submissionsPending,
    submissionsRevision,
    creators,
    rewardsLive,
    rewardsDraft,
    redemptionsRequested,
    redemptionsProcessing,
    campaigns,
  });
}

function challengeFrom(row: Row, campaigns: Map<string, string>): CatalogChallenge {
  const campaignId = text(row.campaignId);
  return {
    challengeId: String(row.$id),
    slug: text(row.slug),
    name: text(row.name),
    platform: text(row.platform),
    status: text(row.status),
    startsAt: instant(row.startsAt),
    endsAt: instant(row.endsAt),
    points: integer(row.points),
    participantCount: integer(row.participantCount),
    participantLimit: typeof row.participantLimit === 'number' ? row.participantLimit : null,
    version: integer(row.version),
    campaignId,
    campaignName: campaigns.get(campaignId) ?? '',
    updatedAt: text(row.$updatedAt),
  };
}

export async function adminChallenges(
  ctx: CoreContext,
  input: { status?: string | null; limit?: number } = {},
): Promise<CoreResult<{ items: CatalogChallenge[] }>> {
  const blocked = requiresStaff<{ items: CatalogChallenge[] }>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const status = (input.status ?? '').trim();
  const queries = [
    ...(status === '' ? [] : [Query.equal('status', status === 'live' ? LIVE : status)]),
    Query.orderDesc('startsAt'),
  ];
  const rows = await page(ctx, 'challenges', queries, input.limit ?? PAGE);
  const campaigns = await page(ctx, 'campaigns', [], PAGE);
  const names = new Map(campaigns.map((row) => [String(row.$id), text(row.name)]));
  return done({ items: rows.map((row) => challengeFrom(row, names)) });
}

export async function adminChallenge(
  ctx: CoreContext,
  input: { challengeId: string },
): Promise<CoreResult<CatalogChallengeDetail | null>> {
  const blocked = requiresStaff<CatalogChallengeDetail | null>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const challengeId = (input.challengeId ?? '').trim();
  if (!challengeId) return done(null);
  const rows = await page(ctx, 'challenges', [Query.equal('$id', challengeId)], 1);
  const row = rows[0];
  if (!row) return done(null);
  const campaigns = await page(ctx, 'campaigns', [], PAGE);
  const names = new Map(campaigns.map((item) => [String(item.$id), text(item.name)]));
  const requirements = await page(
    ctx,
    'challenge_requirements',
    [Query.equal('challengeId', challengeId), Query.orderAsc('order')],
    PAGE,
  );
  const history = await adminAudit(ctx, {
    entityType: 'challenges',
    entityId: challengeId,
    limit: 20,
  });
  return done({
    ...challengeFrom(row, names),
    description: text(row.description),
    hashtags: text(row.hashtags),
    mentions: text(row.mentions),
    imageFileId: text(row.imageFileId),
    requiredLevelId: text(row.requiredLevelId),
    productId: text(row.productId),
    requirements: requirements.map((requirement) => ({
      id: String(requirement.$id),
      type: text(requirement.type),
      configJson: text(requirement.configJson),
      order: integer(requirement.order),
      required: requirement.required === true,
    })),
    history: history.ok ? history.value.items : [],
  });
}

export async function adminRewards(
  ctx: CoreContext,
  input: { status?: string | null; limit?: number } = {},
): Promise<CoreResult<{ items: CatalogReward[] }>> {
  const blocked = requiresStaff<{ items: CatalogReward[] }>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const status = (input.status ?? '').trim();
  const rows = await page(
    ctx,
    'rewards',
    [
      ...(status === '' ? [] : [Query.equal('status', status === 'live' ? LIVE : status)]),
      Query.orderAsc('name'),
    ],
    input.limit ?? PAGE,
  );
  const items: CatalogReward[] = [];
  for (const row of rows) {
    const rewardId = String(row.$id);
    // Contagem exata por recompensa: o `total` do banco, não o tamanho da página.
    const redeemed = await count(ctx, 'reward_redemptions', [
      Query.equal('rewardId', rewardId),
      Query.notEqual('status', 'cancelled'),
    ]);
    items.push({
      rewardId,
      name: text(row.name),
      type: text(row.type),
      description: text(row.description),
      pointsCost: integer(row.pointsCost),
      stock: integer(row.stock),
      perUserLimit: integer(row.perUserLimit),
      startsAt: instant(row.startsAt),
      endsAt: instant(row.endsAt),
      status: text(row.status),
      imageFileId: text(row.imageFileId),
      version: integer(row.version),
      redeemed,
    });
  }
  return done({ items });
}

export async function adminReward(
  ctx: CoreContext,
  input: { rewardId: string },
): Promise<CoreResult<(CatalogReward & { history: AuditEntry[] }) | null>> {
  const blocked = requiresStaff<(CatalogReward & { history: AuditEntry[] }) | null>(
    ctx,
    'manage-catalog',
  );
  if (blocked) return blocked;
  const rewardId = (input.rewardId ?? '').trim();
  if (!rewardId) return done(null);
  const rows = await page(ctx, 'rewards', [Query.equal('$id', rewardId)], 1);
  const row = rows[0];
  if (!row) return done(null);
  const redeemed = await count(ctx, 'reward_redemptions', [
    Query.equal('rewardId', rewardId),
    Query.notEqual('status', 'cancelled'),
  ]);
  const history = await adminAudit(ctx, { entityType: 'rewards', entityId: rewardId, limit: 20 });
  return done({
    rewardId,
    name: text(row.name),
    type: text(row.type),
    description: text(row.description),
    pointsCost: integer(row.pointsCost),
    stock: integer(row.stock),
    perUserLimit: integer(row.perUserLimit),
    startsAt: instant(row.startsAt),
    endsAt: instant(row.endsAt),
    status: text(row.status),
    imageFileId: text(row.imageFileId),
    version: integer(row.version),
    redeemed,
    history: history.ok ? history.value.items : [],
  });
}

export async function adminCampaigns(
  ctx: CoreContext,
): Promise<CoreResult<{ items: CatalogCampaign[] }>> {
  const blocked = requiresStaff<{ items: CatalogCampaign[] }>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const rows = await page(ctx, 'campaigns', [Query.orderDesc('startsAt')], PAGE);
  const challenges = await page(ctx, 'challenges', [], PAGE);
  const grouped = new Map<string, number>();
  for (const challenge of challenges) {
    const campaignId = text(challenge.campaignId);
    if (campaignId) grouped.set(campaignId, (grouped.get(campaignId) ?? 0) + 1);
  }
  return done({
    items: rows.map((row) => ({
      campaignId: String(row.$id),
      name: text(row.name),
      description: text(row.description),
      startsAt: instant(row.startsAt),
      endsAt: instant(row.endsAt),
      status: text(row.status),
      challenges: grouped.get(String(row.$id)) ?? 0,
    })),
  });
}

export type CatalogOptions = {
  levels: Array<{ levelId: string; name: string; minPoints: number }>;
  campaigns: Array<{ campaignId: string; name: string; status: string }>;
  products: Array<{ productId: string; name: string; status: string }>;
};

/**
 * Opções dos formulários do catálogo: nível, campanha e produto por NOME.
 *
 * Sem isto, quem opera teria de digitar o id de uma campanha que só existe no
 * Console — exatamente a dependência que a administração veio remover. É leitura
 * das tabelas que já existem (`creator_levels`, `campaigns`, `products`), sem
 * coluna nova, sem permissão nova: a escolha continua sendo gravada como o id do
 * registro, e o que entra no banco é o mesmo que entraria digitado à mão.
 */
export async function adminOptions(ctx: CoreContext): Promise<CoreResult<CatalogOptions>> {
  const blocked = requiresStaff<CatalogOptions>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const [levels, campaigns, products] = await Promise.all([
    page(ctx, 'creator_levels', [Query.equal('active', true), Query.orderAsc('order')], PAGE),
    page(ctx, 'campaigns', [Query.orderDesc('startsAt')], PAGE),
    page(ctx, 'products', [Query.orderAsc('name')], PAGE),
  ]);
  return done({
    levels: levels.map((row) => ({
      levelId: String(row.$id),
      name: text(row.name),
      minPoints: integer(row.minPoints),
    })),
    campaigns: campaigns.map((row) => ({
      campaignId: String(row.$id),
      name: text(row.name),
      status: text(row.status),
    })),
    products: products.map((row) => ({
      productId: String(row.$id),
      name: text(row.name),
      status: text(row.status),
    })),
  });
}

/** Submissões consolidadas: a fila da moderação, agora com filtro e histórico. */
export async function adminSubmissions(
  ctx: CoreContext,
  input: {
    status?: string | null;
    challengeId?: string | null;
    userId?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
  } = {},
): Promise<CoreResult<{ items: AdminSubmission[] }>> {
  const blocked = requiresStaff<{ items: AdminSubmission[] }>(ctx, 'moderate');
  if (blocked) return blocked;
  const queries: string[] = [];
  const status = (input.status ?? '').trim();
  if (status !== '' && status !== 'all') queries.push(Query.equal('status', status));
  const challengeId = (input.challengeId ?? '').trim();
  if (challengeId) queries.push(Query.equal('challengeId', challengeId));
  const userId = (input.userId ?? '').trim();
  if (userId) queries.push(Query.equal('userId', userId));
  const from = dayStart(input.from);
  if (from) queries.push(Query.greaterThanEqual('submittedAt', from));
  const to = dayEnd(input.to);
  if (to) queries.push(Query.lessThanEqual('submittedAt', to));
  queries.push(Query.orderDesc('submittedAt'));
  const rows = await page(ctx, 'challenge_submissions', queries, input.limit ?? PAGE);
  return done({ items: await describe(ctx, rows) });
}

/** Nome do desafio e da criadora: contexto para decidir, sem inventar título. */
async function describe(ctx: CoreContext, rows: Row[]): Promise<AdminSubmission[]> {
  const challenges = new Map<string, { name: string; points: number }>();
  const creators = new Map<string, string>();
  const challengeIds = [...new Set(rows.map((row) => text(row.challengeId)).filter(Boolean))];
  const userIds = [...new Set(rows.map((row) => text(row.userId)).filter(Boolean))];
  if (challengeIds.length) {
    const found = await page(ctx, 'challenges', [Query.equal('$id', challengeIds)], PAGE);
    for (const row of found)
      challenges.set(String(row.$id), { name: text(row.name), points: integer(row.points) });
  }
  if (userIds.length) {
    const found = await page(ctx, 'profiles', [Query.equal('userId', userIds)], PAGE);
    for (const row of found) creators.set(text(row.userId), text(row.name));
  }
  return rows.map((row) => {
    const challengeId = text(row.challengeId);
    return {
      submissionId: String(row.$id),
      challengeId,
      challengeName: challenges.get(challengeId)?.name ?? challengeId,
      userId: text(row.userId),
      creatorName: creators.get(text(row.userId)) ?? text(row.userId),
      platform: text(row.platform),
      url: text(row.canonicalUrl),
      status: text(row.status),
      revision: integer(row.revision),
      submittedAt: instant(row.submittedAt),
      reviewedAt: instant(row.reviewedAt),
      reviewedBy: text(row.reviewedBy),
      moderationReason: text(row.moderationReason),
    };
  });
}

export async function adminSubmission(
  ctx: CoreContext,
  input: { submissionId: string },
): Promise<CoreResult<AdminSubmissionDetail | null>> {
  const blocked = requiresStaff<AdminSubmissionDetail | null>(ctx, 'moderate');
  if (blocked) return blocked;
  const submissionId = (input.submissionId ?? '').trim();
  if (!submissionId) return done(null);
  const rows = await page(ctx, 'challenge_submissions', [Query.equal('$id', submissionId)], 1);
  const row = rows[0];
  if (!row) return done(null);
  const [described] = await describe(ctx, [row]);
  const challenge = await page(ctx, 'challenges', [Query.equal('$id', text(row.challengeId))], 1);
  const history = await page(
    ctx,
    'submission_history',
    [Query.equal('submissionId', submissionId), Query.orderDesc('occurredAt')],
    PAGE,
  );
  return done({
    ...described,
    contentFingerprint: text(row.contentFingerprint),
    fileId: text(row.fileId),
    challengePoints: integer(challenge[0]?.points),
    history: history.map((entry) => ({
      id: String(entry.$id),
      previousStatus: text(entry.previousStatus),
      nextStatus: text(entry.nextStatus),
      revision: integer(entry.revision),
      actorId: text(entry.actorId),
      reason: text(entry.reason),
      occurredAt: instant(entry.occurredAt),
    })),
  });
}

/** Diretório de creators: perfil + saldo + nível. Nunca senha, token ou sessão. */
export async function adminCreators(
  ctx: CoreContext,
  input: { search?: string | null; limit?: number } = {},
): Promise<CoreResult<{ items: CreatorSummary[]; sampled: boolean }>> {
  const blocked = requiresStaff<{ items: CreatorSummary[]; sampled: boolean }>(ctx, 'view-audit');
  if (blocked) return blocked;
  const search = (input.search ?? '').trim().toLowerCase();
  const profiles = await page(
    ctx,
    'profiles',
    [Query.isNotNull('onboardingCompletedAt'), Query.orderDesc('onboardingCompletedAt')],
    input.limit ?? PAGE,
  );
  const levels = await page(ctx, 'creator_levels', [], PAGE);
  const levelNames = new Map(levels.map((row) => [String(row.$id), text(row.name)]));
  const accounts = await page(ctx, 'point_accounts', [], PAGE);
  const byUser = new Map(accounts.map((row) => [text(row.userId), row]));
  const userIds = profiles.map((row) => text(row.userId)).filter(Boolean);
  const participations = userIds.length
    ? await listAll(ctx, 'challenge_participants', [Query.equal('userId', userIds)], ROOF)
    : { rows: [], truncated: false };
  const submissions = userIds.length
    ? await listAll(ctx, 'challenge_submissions', [Query.equal('userId', userIds)], ROOF)
    : { rows: [], truncated: false };
  const counts = (rows: Row[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const userId = text(row.userId);
      map.set(userId, (map.get(userId) ?? 0) + 1);
    }
    return map;
  };
  const participationCount = counts(participations.rows);
  const submissionCount = counts(submissions.rows);
  const items = profiles
    .filter((row) => {
      if (!search) return true;
      const haystack = `${text(row.name)} ${text(row.city)} ${text(row.niche)}`.toLowerCase();
      return haystack.includes(search);
    })
    .map((row) => {
      const userId = text(row.userId);
      const account = byUser.get(userId);
      return {
        userId,
        name: text(row.name),
        levelName: levelNames.get(text(account?.levelId)) ?? '',
        // A coluna é `availableBalance`/`qualifyingPoints`; a TELA chama as duas
        // de "pontos". Ler o nome da tela como se fosse o nome da coluna devolve
        // `undefined`, que `integer()` transforma em 0 — um número errado com
        // cara de resposta, e zero aqui é informação, não ausência.
        availablePoints: integer(account?.availableBalance),
        journeyPoints: integer(account?.qualifyingPoints),
        status: text(row.onboardingCompletedAt) ? 'active' : 'pending',
        onboardingCompletedAt: instant(row.onboardingCompletedAt),
        city: text(row.city),
        state: text(row.state),
        niche: text(row.niche),
        participations: participationCount.get(userId) ?? 0,
        submissions: submissionCount.get(userId) ?? 0,
      };
    });
  return done({ items, sampled: participations.truncated || submissions.truncated });
}

/** Detalhe da creator: o que a equipe precisa para responder um chamado. */
export async function adminCreator(
  ctx: CoreContext,
  input: { userId: string },
): Promise<CoreResult<CreatorDetail | null>> {
  const blocked = requiresStaff<CreatorDetail | null>(ctx, 'view-audit');
  if (blocked) return blocked;
  const userId = (input.userId ?? '').trim();
  if (!userId) return done(null);
  const profiles = await page(ctx, 'profiles', [Query.equal('userId', userId)], 1);
  const profile = profiles[0];
  if (!profile) return done(null);
  const [accounts, levels, socials, participations, submissions, redemptions, ledger] =
    await Promise.all([
      page(ctx, 'point_accounts', [Query.equal('userId', userId)], 1),
      page(ctx, 'creator_levels', [], PAGE),
      page(ctx, 'social_accounts', [Query.equal('userId', userId)], PAGE),
      count(ctx, 'challenge_participants', [Query.equal('userId', userId)]),
      count(ctx, 'challenge_submissions', [Query.equal('userId', userId)]),
      page(
        ctx,
        'reward_redemptions',
        [Query.equal('userId', userId), Query.orderDesc('requestedAt')],
        PAGE,
      ),
      page(
        ctx,
        'point_transactions',
        [Query.equal('userId', userId), Query.orderDesc('createdAt')],
        PAGE,
      ),
    ]);
  const account = accounts[0];
  const levelNames = new Map(levels.map((row) => [String(row.$id), text(row.name)]));
  const rewardIds = [...new Set(redemptions.map((row) => text(row.rewardId)).filter(Boolean))];
  const rewards = rewardIds.length
    ? await page(ctx, 'rewards', [Query.equal('$id', rewardIds)], PAGE)
    : [];
  const rewardNames = new Map(rewards.map((row) => [String(row.$id), text(row.name)]));
  return done({
    userId,
    name: text(profile.name),
    levelName: levelNames.get(text(account?.levelId)) ?? '',
    // Mesma tradução do resumo: coluna do schema → vocabulário da tela.
    availablePoints: integer(account?.availableBalance),
    journeyPoints: integer(account?.qualifyingPoints),
    status: text(profile.onboardingCompletedAt) ? 'active' : 'pending',
    onboardingCompletedAt: instant(profile.onboardingCompletedAt),
    city: text(profile.city),
    state: text(profile.state),
    niche: text(profile.niche),
    participations,
    submissions,
    phone: text(profile.phone),
    birthDate: instant(profile.birthDate),
    creatorType: text(profile.creatorType),
    publicProfile: profile.publicProfile === true,
    socials: socials.map((row) => ({
      platform: text(row.platform),
      canonicalUrl: text(row.canonicalUrl),
      verificationStatus: text(row.verificationStatus),
    })),
    redemptions: redemptions.map((row) => ({
      redemptionId: String(row.$id),
      rewardName: rewardNames.get(text(row.rewardId)) ?? text(row.rewardId),
      points: integer(row.pointsCostSnapshot),
      status: text(row.status),
      requestedAt: instant(row.requestedAt),
    })),
    ledger: ledger.map((row) => ({
      id: String(row.$id),
      type: text(row.type),
      amount: integer(row.amount),
      description: text(row.description),
      createdAt: instant(row.createdAt),
      referenceId: text(row.referenceId),
    })),
  });
}

/** Trilha de auditoria de um registro — quem fez, o quê, quando, com que motivo. */
export async function adminAudit(
  ctx: CoreContext,
  input: { entityType: string; entityId: string; limit?: number },
): Promise<CoreResult<{ items: AuditEntry[] }>> {
  const blocked = requiresStaff<{ items: AuditEntry[] }>(ctx, 'view-audit');
  if (blocked) return blocked;
  const rows = await page(
    ctx,
    'audit_logs',
    [
      Query.equal('entityType', input.entityType),
      Query.equal('entityId', input.entityId),
      Query.orderDesc('occurredAt'),
    ],
    Math.min(input.limit ?? 20, PAGE),
  );
  const snapshots = rows.length
    ? await page(
        ctx,
        'audit_log_snapshots',
        [
          Query.equal(
            'auditLogId',
            rows.map((row) => String(row.$id)),
          ),
        ],
        PAGE,
      )
    : [];
  return done({ items: rows.map((row) => compose(row, snapshots)) });
}

export async function adminRecentAudit(
  ctx: CoreContext,
  input: { limit?: number } = {},
): Promise<CoreResult<{ items: AuditEntry[] }>> {
  const blocked = requiresStaff<{ items: AuditEntry[] }>(ctx, 'view-audit');
  if (blocked) return blocked;
  const rows = await page(
    ctx,
    'audit_logs',
    [Query.orderDesc('occurredAt')],
    Math.min(input.limit ?? 20, PAGE),
  );
  const snapshots = rows.length
    ? await page(
        ctx,
        'audit_log_snapshots',
        [
          Query.equal(
            'auditLogId',
            rows.map((row) => String(row.$id)),
          ),
        ],
        PAGE,
      )
    : [];
  return done({ items: rows.map((row) => compose(row, snapshots)) });
}

function compose(row: Row, snapshots: Row[]): AuditEntry {
  const id = String(row.$id);
  const side = (wanted: string) => {
    const found = snapshots.find(
      (snapshot) => text(snapshot.auditLogId) === id && text(snapshot.side) === wanted,
    );
    const payload = text(found?.payloadJson);
    if (!payload) return null;
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  };
  return {
    id,
    actorId: text(row.actorId),
    action: text(row.action),
    entityType: text(row.entityType),
    entityId: text(row.entityId),
    affectedUserId: text(row.affectedUserId),
    reason: text(row.reason),
    occurredAt: instant(row.occurredAt),
    correlationId: text(row.correlationId),
    before: side('before'),
    after: side('after'),
  };
}

/**
 * Relatórios do período.
 *
 * A janela é em DIAS contados do agora (o schema não tem "período" como conceito):
 * `days = 0` significa tudo. Taxa de aprovação é definida aqui, e a tela repete a
 * definição: aprovados ÷ (aprovados + recusados) no período — pedido de revisão
 * ainda não é decisão final e por isso não entra no divisor.
 */
export async function adminReport(
  ctx: CoreContext,
  input: { days?: number } = {},
): Promise<CoreResult<ReportSummary>> {
  const blocked = requiresStaff<ReportSummary>(ctx, 'view-audit');
  if (blocked) return blocked;
  const days = Math.max(0, Math.min(input.days ?? 30, 365));
  const from = days > 0 ? new Date(ctx.now.getTime() - days * 86_400_000) : null;
  const fromIso = from ? from.toISOString() : '';
  const period = (column: string) => (from ? [Query.greaterThanEqual(column, fromIso)] : []);

  const [
    creatorsTotal,
    onboardedInPeriod,
    challengesLive,
    challengesStarted,
    challengesClosed,
    redemptionsRequested,
    redemptionsProcessing,
    redemptionsDelivered,
  ] = await Promise.all([
    count(ctx, 'profiles', [Query.isNotNull('onboardingCompletedAt')]),
    count(ctx, 'profiles', [
      Query.isNotNull('onboardingCompletedAt'),
      ...period('onboardingCompletedAt'),
    ]),
    count(ctx, 'challenges', [Query.equal('status', LIVE)]),
    count(ctx, 'challenges', period('startsAt')),
    // Encerrados não têm data própria no schema (não há `closedAt`): o número é
    // do acervo inteiro, e é assim que a tela o rotula.
    count(ctx, 'challenges', [Query.equal('status', 'closed')]),
    count(ctx, 'reward_redemptions', [Query.equal('status', 'requested')]),
    count(ctx, 'reward_redemptions', [Query.equal('status', 'processing')]),
    count(ctx, 'reward_redemptions', [
      Query.equal('status', 'delivered'),
      ...period('requestedAt'),
    ]),
  ]);

  const submissions = await listAll(ctx, 'challenge_submissions', period('submittedAt'));
  const participations = await count(ctx, 'challenge_participants', period('joinedAt'));
  const redemptionsInPeriod = await count(ctx, 'reward_redemptions', period('requestedAt'));
  const ledger = await listAll(ctx, 'point_transactions', period('createdAt'));

  const byStatus = new Map<string, number>();
  const activeUsers = new Set<string>();
  const weeks = new Map<number, number>();
  const buckets = Math.min(days > 0 ? Math.ceil(days / 7) : 8, 12);
  for (const row of submissions.rows) {
    const status = text(row.status);
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    const userId = text(row.userId);
    if (userId) activeUsers.add(userId);
    const submittedAt = Date.parse(text(row.submittedAt));
    if (!Number.isNaN(submittedAt)) {
      const bucket = Math.floor((ctx.now.getTime() - submittedAt) / (7 * 86_400_000));
      weeks.set(bucket, (weeks.get(bucket) ?? 0) + 1);
    }
  }
  const approved = byStatus.get('approved') ?? 0;
  const rejected = byStatus.get('rejected') ?? 0;
  const decided = approved + rejected;

  let granted = 0;
  let redeemed = 0;
  for (const row of ledger.rows) {
    const amount = integer(row.amount);
    if (amount > 0) granted += amount;
    else redeemed += -amount;
  }

  const weekRows: ReportSummary['weeks'] = [];
  for (let index = buckets - 1; index >= 0; index -= 1)
    weekRows.push({
      label: index === 0 ? 'Últimos 7 dias' : `${index * 7}–${index * 7 + 7} dias atrás`,
      submissions: weeks.get(index) ?? 0,
    });

  return done({
    days,
    from: fromIso,
    creators: { total: creatorsTotal, onboardedInPeriod },
    activeCreators: { sampled: submissions.truncated, total: activeUsers.size },
    challenges: {
      live: challengesLive,
      startedInPeriod: challengesStarted,
      closed: challengesClosed,
    },
    participations: { inPeriod: participations },
    submissions: {
      inPeriod: submissions.rows.length,
      approved,
      rejected,
      pending: byStatus.get('pending') ?? 0,
      revisionRequested: byStatus.get('revision_requested') ?? 0,
      sampleTruncated: submissions.truncated,
    },
    approvalRate: decided > 0 ? approved / decided : null,
    points: { granted, redeemed, truncated: ledger.truncated },
    redemptions: {
      inPeriod: redemptionsInPeriod,
      requested: redemptionsRequested,
      processing: redemptionsProcessing,
      delivered: redemptionsDelivered,
    },
    weeks: weekRows,
  });
}
