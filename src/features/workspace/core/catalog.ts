import { Permission, Query, Role } from 'node-appwrite';
import {
  createTableRow,
  getTableRow,
  isAbsent,
  listTableRows,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { done, failure, requiresStaff, type CoreContext, type CoreResult } from './context';
import { digest, rowId } from './ids';
import { recordAudit } from './record';
import { inTransaction } from './transaction';
import {
  campaignIssues,
  challengeIssues,
  rewardIssues,
  type CampaignDraft,
  type ChallengeDraft,
  type RewardDraft,
} from '../domain/catalog';

/**
 * Catálogo — desafios, recompensas e campanhas, do lado de quem administra.
 *
 * Três decisões que valem para tudo aqui:
 *
 *  1. **Permissão de linha é a barreira de leitura.** Rascunho nasce com
 *     `permissions: []`: nenhuma sessão o enxerga, nem por engano de tela. Só
 *     quando o item é PUBLICADO a linha ganha `read("any")` e passa a existir para
 *     as creators. Esconder rascunho num filtro de tela não bastaria — a sessão
 *     continuaria conseguindo ler a linha.
 *  2. **Versão é o controle de concorrência.** `expectedVersion` vem da tela e é
 *     conferida no banco dentro da transação: duas pessoas editando o mesmo
 *     desafio não sobrescrevem uma à outra em silêncio.
 *  3. **Auditoria é diff, não despejo.** O log guarda só os campos que MUDARAM,
 *     com o antes e o depois; texto livre grande vira comprimento + hash em vez de
 *     derramar 10.000 caracteres em cada edição (o registro diz o que omitiu).
 *
 * Nada aqui lê `process.env` nem constrói cliente: o host injeta `ctx.tables`,
 * como no resto do núcleo. O papel `manage-catalog` vem de membership confirmada
 * (`nuy-admins`), nunca do payload.
 */
const PUBLIC_READ = [Permission.read(Role.any())];

/** Rascunho é da equipe: nem a sessão da própria criadora lê a linha. */
function permissionsFor(status: string): string[] {
  return status === 'draft' ? [] : PUBLIC_READ;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 0;
}

/** Id opcional: vazio vira ausente, e o schema do Appwrite valida o formato. */
function optionalId(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Instante UTC a partir do que a operação digitou.
 *
 * O formulário manda `AAAA-MM-DDTHH:mm` (hora de parede, sem fuso). Interpretar
 * isso no fuso do SERVIDOR daria janelas deslocadas sempre que o host não é
 * brasileiro, e o calendário do produto é o de São Paulo (`rankingTimeZone`).
 * Valor com fuso explícito (`Z` ou `±hh:mm`) é respeitado como veio.
 */
export function instantIn(local: string, timeZone: string): string | null {
  const value = local.trim();
  if (value === '') return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const explicit = new Date(value);
    return Number.isNaN(explicit.getTime()) ? null : explicit.toISOString();
  }
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!parts) return null;
  const [, year, month, day, hour, minute] = parts.map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Deslocamento do fuso NO INSTANTE: usar o de hoje erraria em horário de verão.
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(wall));
  const field = (type: string) => Number(formatted.find((part) => part.type === type)?.value ?? 0);
  const offset =
    Date.UTC(
      field('year'),
      field('month') - 1,
      field('day'),
      field('hour'),
      field('minute'),
      field('second'),
    ) - wall;
  return new Date(wall - offset).toISOString();
}

export type ChallengeResult = {
  challengeId: string;
  slug: string;
  status: string;
  version: number;
  created: boolean;
};

export type RewardResult = {
  rewardId: string;
  status: string;
  version: number;
  created: boolean;
  stock: number;
};

export type CampaignResult = { campaignId: string; status: string; created: boolean };

/** `null` quando uma data não é interpretável — quem chama recusa, não adivinha. */
function challengeData(draft: ChallengeDraft, timeZone: string) {
  const startsAt = instantIn(draft.startsAt, timeZone);
  const endsAt = instantIn(draft.endsAt, timeZone);
  if (!startsAt || !endsAt) return null;
  return {
    slug: draft.slug.trim().toLowerCase(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    platform: draft.platform.trim(),
    startsAt,
    endsAt,
    points: draft.points,
    participantLimit: draft.participantLimit,
    hashtags: draft.hashtags.trim(),
    mentions: draft.mentions.trim(),
    imageFileId: optionalId(draft.imageFileId),
    requiredLevelId: optionalId(draft.requiredLevelId),
    productId: optionalId(draft.productId),
    campaignId: optionalId(draft.campaignId),
  };
}

function rewardData(draft: RewardDraft, timeZone: string) {
  const startsAt = instantIn(draft.startsAt, timeZone);
  const endsAt = instantIn(draft.endsAt, timeZone);
  if (!startsAt || !endsAt) return null;
  return {
    name: draft.name.trim(),
    type: draft.type.trim(),
    description: draft.description.trim(),
    pointsCost: draft.pointsCost,
    stock: draft.stock,
    perUserLimit: draft.perUserLimit,
    startsAt,
    endsAt,
    imageFileId: optionalId(draft.imageFileId),
  };
}

const FREE_TEXT_LIMIT = 2000;

/**
 * Diff auditável: só o que mudou, e texto gigante vira tamanho + hash.
 *
 * O snapshot de auditoria comporta 10.000 caracteres por lado e a descrição de um
 * desafio pode ter exatamente 10.000 sozinha — despejada em cada edição, ela
 * estouraria o registro e a auditoria passaria a FALHAR justamente depois de uma
 * edição grande. Omitir em silêncio seria pior: o campo sai com o tamanho e o
 * hash, então dá para provar depois se o texto é o mesmo.
 */
function auditDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  for (const [key, next] of Object.entries(after)) {
    const previous = before[key] ?? null;
    if (JSON.stringify(previous ?? null) === JSON.stringify(next ?? null)) continue;
    changedBefore[key] = summarize(previous);
    changedAfter[key] = summarize(next);
  }
  return { before: changedBefore, after: changedAfter };
}

function summarize(value: unknown): unknown {
  if (typeof value !== 'string' || value.length <= FREE_TEXT_LIMIT) return value ?? null;
  return `${value.length} caracteres · sha256:${digest(value)}`;
}

/**
 * Requisitos do desafio: substituídos por posição.
 *
 * O id sai de (desafio, ordem), então reeditar sem mexer no requisito reescreve a
 * MESMA linha — não há duplicata nem perda de ordem. Requisito removido da tela é
 * apagado de verdade; deixá-lo para trás faria a criadora cumprir exigência que a
 * equipe já retirou.
 */
async function syncRequirements(
  ctx: CoreContext,
  tx: { transactionId: string | undefined },
  challengeId: string,
  status: string,
  requirements: ChallengeDraft['requirements'],
): Promise<void> {
  const permissions = permissionsFor(status);
  const existing = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'challenge_requirements',
    queries: [Query.equal('challengeId', challengeId), Query.limit(100)],
    transactionId: tx.transactionId,
  });
  const keep = new Set<string>();
  for (const [index, requirement] of requirements.entries()) {
    const id = rowId('requirement', challengeId, index);
    keep.add(id);
    const data = {
      challengeId,
      type: requirement.type.trim(),
      configJson: requirement.configJson.trim(),
      order: index,
      required: requirement.required,
    };
    if (existing.rows.some((row) => String(row.$id) === id))
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_requirements',
        rowId: id,
        data,
        permissions,
        transactionId: tx.transactionId,
      });
    else
      await createTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenge_requirements',
        rowId: id,
        data,
        permissions,
        transactionId: tx.transactionId,
      });
  }
  for (const row of existing.rows) {
    const id = String(row.$id);
    if (keep.has(id)) continue;
    await deleteRequirement(ctx, id, tx.transactionId);
  }
}

async function deleteRequirement(
  ctx: CoreContext,
  rowIdToDelete: string,
  transactionId: string | undefined,
): Promise<void> {
  try {
    await ctx.tables.deleteRow({
      databaseId: ctx.databaseId,
      tableId: 'challenge_requirements',
      rowId: rowIdToDelete,
      transactionId,
    });
  } catch (error) {
    if (!isAbsent(error)) throw error;
  }
}

/**
 * Publicar/encerrar muda a VISIBILIDADE do desafio, e a dos requisitos junto.
 *
 * Só a permissão muda aqui: o conteúdo dos requisitos não é tocado (quem publica
 * não reescreve o que a equipe redigiu).
 */
async function refreshRequirementPermissions(
  ctx: CoreContext,
  tx: { transactionId: string | undefined },
  challengeId: string,
  status: string,
): Promise<void> {
  const permissions = permissionsFor(status);
  const existing = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'challenge_requirements',
    queries: [Query.equal('challengeId', challengeId), Query.limit(100)],
    transactionId: tx.transactionId,
  });
  for (const row of existing.rows)
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'challenge_requirements',
      rowId: String(row.$id),
      permissions,
      transactionId: tx.transactionId,
    });
}

/**
 * Criar ou editar desafio. `publish` decide rascunho × no ar — e a permissão da
 * linha acompanha o estado no mesmo commit.
 */
export async function saveChallenge(
  ctx: CoreContext,
  input: {
    draft: ChallengeDraft;
    publish: boolean;
    expectedVersion?: number | null;
    timeZone: string;
  },
): Promise<CoreResult<ChallengeResult>> {
  const blocked = requiresStaff<ChallengeResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  if (challengeIssues(input.draft).length) return failure('invalid');
  const data = challengeData(input.draft, input.timeZone);
  if (!data) return failure('invalid');
  // O slug é a chave pública do desafio (a URL da criadora): nasce com o desafio
  // e não muda depois — mudar o slug mudaria o endereço de quem já participa.
  const challengeId = rowId('challenge', data.slug);

  return inTransaction<ChallengeResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'challenges', challengeId, tx.transactionId);
      if (!existing && input.expectedVersion != null) return failure('not_found');
      if (existing) {
        if (input.expectedVersion == null || input.expectedVersion !== integer(existing.version))
          return failure('conflict');
      }
      const status = existing
        ? input.publish
          ? 'published'
          : text(existing.status)
        : input.publish
          ? 'published'
          : 'draft';
      const version = existing ? integer(existing.version) + 1 : 1;
      const permissions = permissionsFor(status);
      // `status` e `version` vão no MESMO patch da edição. Escrever só os campos
      // do formulário congelava a versão da linha: a segunda edição de duas
      // pessoas com a tela aberta passava no `expectedVersion` (que ninguém
      // avançou) e a última digitação vencia em silêncio — e publicar um
      // rascunho existente dava permissão de leitura à linha sem trocar o
      // estado, deixando permissão e estado discordando no banco.
      if (existing)
        await updateTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenges',
          rowId: challengeId,
          data: { ...data, status, version },
          permissions,
          transactionId: tx.transactionId,
        });
      else
        await createTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'challenges',
          rowId: challengeId,
          // `participantCount` nasce zerado e é do contador de participação: a
          // edição nunca o reescreve.
          data: { ...data, participantCount: 0, status, version },
          permissions,
          transactionId: tx.transactionId,
        });
      await syncRequirements(ctx, tx, challengeId, status, input.draft.requirements);
      const diff = auditDiff(existing ?? {}, { ...data, status, version });
      await recordAudit(ctx, tx, {
        action: existing ? 'challenge.updated' : 'challenge.created',
        entityType: 'challenges',
        entityId: challengeId,
        before: diff.before,
        after: diff.after,
      });
      return done({ challengeId, slug: data.slug, status, version, created: !existing });
    },
    { conflict: 'conflict' },
  );
}

/** Publicar: sai do rascunho e passa a existir para as creators. */
export async function publishChallenge(
  ctx: CoreContext,
  input: { challengeId: string; expectedVersion?: number | null },
): Promise<CoreResult<ChallengeResult>> {
  return transitionChallenge(ctx, input, 'published');
}

/** Encerrar: para de aceitar participação e envio; quem já participou continua vendo. */
export async function closeChallenge(
  ctx: CoreContext,
  input: { challengeId: string; expectedVersion?: number | null },
): Promise<CoreResult<ChallengeResult>> {
  return transitionChallenge(ctx, input, 'closed');
}

async function transitionChallenge(
  ctx: CoreContext,
  input: { challengeId: string; expectedVersion?: number | null },
  nextStatus: 'published' | 'closed',
): Promise<CoreResult<ChallengeResult>> {
  const blocked = requiresStaff<ChallengeResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const challengeId = input.challengeId.trim();
  if (!challengeId) return failure('invalid');
  return inTransaction<ChallengeResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'challenges', challengeId, tx.transactionId);
      if (!existing) return failure('not_found');
      const status = text(existing.status);
      if (status === nextStatus) return failure('conflict');
      if (input.expectedVersion != null && input.expectedVersion !== integer(existing.version))
        return failure('conflict');
      const version = integer(existing.version) + 1;
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'challenges',
        rowId: challengeId,
        data: { status: nextStatus, version },
        permissions: permissionsFor(nextStatus),
        transactionId: tx.transactionId,
      });
      await refreshRequirementPermissions(ctx, tx, challengeId, nextStatus);
      await recordAudit(ctx, tx, {
        action: nextStatus === 'published' ? 'challenge.published' : 'challenge.closed',
        entityType: 'challenges',
        entityId: challengeId,
        before: { status, version: integer(existing.version) },
        after: { status: nextStatus, version },
      });
      return done({
        challengeId,
        slug: text(existing.slug),
        status: nextStatus,
        version,
        created: false,
      });
    },
    { conflict: 'conflict' },
  );
}

/**
 * Criar ou editar recompensa.
 *
 * `key` é a chave de criação que a tela sorteia no clique: repetir o envio do
 * formulário esbarra no id determinístico em vez de criar a recompensa duas
 * vezes. Recompensa não tem chave natural (o nome pode repetir), então a
 * idempotência vem daqui.
 */
export async function saveReward(
  ctx: CoreContext,
  input: {
    key: string;
    rewardId?: string | null;
    draft: RewardDraft;
    publish: boolean;
    expectedVersion?: number | null;
    timeZone: string;
  },
): Promise<CoreResult<RewardResult>> {
  const blocked = requiresStaff<RewardResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  if (rewardIssues(input.draft).length) return failure('invalid');
  const data = rewardData(input.draft, input.timeZone);
  if (!data) return failure('invalid');
  const editing = Boolean(input.rewardId);
  const key = input.key.trim();
  if (!editing && (key.length < 8 || key.length > 120)) return failure('invalid');
  const rewardId = editing ? input.rewardId!.trim() : rowId('reward', key);

  return inTransaction<RewardResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'rewards', rewardId, tx.transactionId);
      if (existing && !editing) {
        // Mesma chave, mesmo id: a recompensa já nasceu. Devolve o que existe em
        // vez de gravar por cima — repetição de envio não é edição.
        return done({
          rewardId,
          status: text(existing.status),
          version: integer(existing.version),
          created: false,
          stock: integer(existing.stock),
        });
      }
      if (!existing && editing) return failure('not_found');
      if (existing) {
        if (input.expectedVersion == null || input.expectedVersion !== integer(existing.version))
          return failure('conflict');
      }
      const status = existing
        ? input.publish
          ? 'published'
          : text(existing.status)
        : input.publish
          ? 'published'
          : 'draft';
      const version = existing ? integer(existing.version) + 1 : 1;
      // Mesma regra do desafio: a edição leva `status` e `version` no patch —
      // sem isso a versão da linha congelava e o `expectedVersion` parava de
      // barrar a segunda edição concorrente.
      if (existing)
        await updateTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'rewards',
          rowId: rewardId,
          data: { ...data, status, version },
          permissions: permissionsFor(status),
          transactionId: tx.transactionId,
        });
      else
        await createTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'rewards',
          rowId: rewardId,
          data: { ...data, status, version },
          permissions: permissionsFor(status),
          transactionId: tx.transactionId,
        });
      const diff = auditDiff(existing ?? {}, { ...data, status, version });
      await recordAudit(ctx, tx, {
        action: existing ? 'reward.updated' : 'reward.created',
        entityType: 'rewards',
        entityId: rewardId,
        before: diff.before,
        after: diff.after,
      });
      return done({
        rewardId,
        status,
        version,
        created: !existing,
        stock: integer(data.stock),
      });
    },
    { conflict: 'conflict' },
  );
}

export async function publishReward(
  ctx: CoreContext,
  input: { rewardId: string; expectedVersion?: number | null },
): Promise<CoreResult<RewardResult>> {
  return transitionReward(ctx, input, 'published');
}

/** Desativar: sai do ar sem apagar histórico — resgates já feitos continuam válidos. */
export async function closeReward(
  ctx: CoreContext,
  input: { rewardId: string; expectedVersion?: number | null },
): Promise<CoreResult<RewardResult>> {
  return transitionReward(ctx, input, 'closed');
}

async function transitionReward(
  ctx: CoreContext,
  input: { rewardId: string; expectedVersion?: number | null },
  nextStatus: 'published' | 'closed',
): Promise<CoreResult<RewardResult>> {
  const blocked = requiresStaff<RewardResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const rewardId = input.rewardId.trim();
  if (!rewardId) return failure('invalid');
  return inTransaction<RewardResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'rewards', rewardId, tx.transactionId);
      if (!existing) return failure('not_found');
      const status = text(existing.status);
      if (status === nextStatus) return failure('conflict');
      if (input.expectedVersion != null && input.expectedVersion !== integer(existing.version))
        return failure('conflict');
      const version = integer(existing.version) + 1;
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'rewards',
        rowId: rewardId,
        data: { status: nextStatus, version },
        permissions: permissionsFor(nextStatus),
        transactionId: tx.transactionId,
      });
      await recordAudit(ctx, tx, {
        action: nextStatus === 'published' ? 'reward.published' : 'reward.closed',
        entityType: 'rewards',
        entityId: rewardId,
        before: { status, version: integer(existing.version) },
        after: { status: nextStatus, version },
      });
      return done({
        rewardId,
        status: nextStatus,
        version,
        created: false,
        stock: integer(existing.stock),
      });
    },
    { conflict: 'conflict' },
  );
}

/**
 * Estoque: alvo absoluto, não delta.
 *
 * A tela diz "o estoque é 12", e é isso que fica. Repetir o envio não soma duas
 * vezes — diferente de um crédito de pontos, aqui não há o que idempotentizar por
 * chave: o mesmo valor aplicado duas vezes é o mesmo valor. O motivo é obrigatório
 * porque "por que o estoque mudou?" é a primeira pergunta que se faz depois.
 *
 * A baixa em si continua sendo do resgate (`redeem-reward`), com decremento
 * atômico e `min: 0` — o admin não reserva estoque, ele corrige o número.
 */
export async function setRewardStock(
  ctx: CoreContext,
  input: { rewardId: string; stock: number; reason: string; expectedVersion?: number | null },
): Promise<CoreResult<RewardResult>> {
  const blocked = requiresStaff<RewardResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  const rewardId = input.rewardId.trim();
  const stock = input.stock;
  const reason = (input.reason ?? '').trim();
  if (!rewardId || !Number.isInteger(stock) || stock < 0 || reason.length < 3)
    return failure('invalid');
  return inTransaction<RewardResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'rewards', rewardId, tx.transactionId);
      if (!existing) return failure('not_found');
      if (input.expectedVersion != null && input.expectedVersion !== integer(existing.version))
        return failure('conflict');
      const current = integer(existing.stock);
      if (stock === current)
        return done({
          rewardId,
          status: text(existing.status),
          version: integer(existing.version),
          created: false,
          stock,
        });
      const base = {
        databaseId: ctx.databaseId,
        tableId: 'rewards',
        rowId: rewardId,
        column: 'stock',
        transactionId: tx.transactionId,
      };
      if (stock > current) await ctx.tables.incrementRowColumn({ ...base, value: stock - current });
      else await ctx.tables.decrementRowColumn({ ...base, value: current - stock, min: 0 });
      // A versão avança: quem está com a tela aberta precisa recarregar antes de
      // editar o resto da recompensa.
      const version = integer(existing.version) + 1;
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'rewards',
        rowId: rewardId,
        data: { version },
        transactionId: tx.transactionId,
      });
      await recordAudit(ctx, tx, {
        action: 'reward.stock_changed',
        entityType: 'rewards',
        entityId: rewardId,
        reason,
        before: { stock: current, version: integer(existing.version) },
        after: { stock, version },
      });
      return done({
        rewardId,
        status: text(existing.status),
        version,
        created: false,
        stock,
      });
    },
    { conflict: 'conflict' },
  );
}

/**
 * Campanha — CRUD básico, sem semântica de negócio.
 *
 * O schema tem a tabela e nada mais: não há regra publicada sobre o que uma
 * campanha FAZ (bônus, agrupamento de desafios, período de pontos). Por isso aqui
 * só se grava o que a operação informar, e a tela diz exatamente isso. Campanha
 * não é lida por sessão nenhuma: a linha fica sem permissão e é assunto da equipe.
 */
export async function saveCampaign(
  ctx: CoreContext,
  input: {
    key: string;
    campaignId?: string | null;
    draft: CampaignDraft;
    timeZone: string;
  },
): Promise<CoreResult<CampaignResult>> {
  const blocked = requiresStaff<CampaignResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;
  if (campaignIssues(input.draft).length) return failure('invalid');
  const startsAt = instantIn(input.draft.startsAt, input.timeZone);
  const endsAt = instantIn(input.draft.endsAt, input.timeZone);
  if (!startsAt || !endsAt) return failure('invalid');
  const editing = Boolean(input.campaignId);
  const key = input.key.trim();
  if (!editing && (key.length < 8 || key.length > 120)) return failure('invalid');
  const campaignId = editing ? input.campaignId!.trim() : rowId('campaign', key);
  const data = {
    name: input.draft.name.trim(),
    description: input.draft.description.trim(),
    startsAt,
    endsAt,
    status: input.draft.status,
  };
  return inTransaction<CampaignResult>(
    ctx,
    async (tx) => {
      const existing = await read(ctx, 'campaigns', campaignId, tx.transactionId);
      if (existing && !editing)
        return done({ campaignId, status: text(existing.status), created: false });
      if (!existing && editing) return failure('not_found');
      if (existing)
        await updateTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'campaigns',
          rowId: campaignId,
          data,
          transactionId: tx.transactionId,
        });
      else
        await createTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'campaigns',
          rowId: campaignId,
          data,
          // Campanha é da equipe: nenhuma sessão de criadora lê esta linha.
          permissions: [],
          transactionId: tx.transactionId,
        });
      const diff = auditDiff(existing ?? {}, data);
      await recordAudit(ctx, tx, {
        action: existing ? 'campaign.updated' : 'campaign.created',
        entityType: 'campaigns',
        entityId: campaignId,
        before: diff.before,
        after: diff.after,
      });
      return done({ campaignId, status: data.status, created: !existing });
    },
    { conflict: 'conflict' },
  );
}

async function read(
  ctx: CoreContext,
  tableId: string,
  rowIdValue: string,
  transactionId: string | undefined,
): Promise<Row | null> {
  try {
    return await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId,
      rowId: rowIdValue,
      transactionId,
    });
  } catch (error) {
    if (isAbsent(error)) return null;
    throw error;
  }
}
