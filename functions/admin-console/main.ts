import {
  adminCampaigns,
  adminChallenge,
  adminOptions,
  adminChallenges,
  adminCreator,
  adminCreators,
  adminOverview,
  adminRecentAudit,
  adminReport,
  adminReward,
  adminRewards,
  adminSubmission,
  adminSubmissions,
  archiveChallenge,
  closeChallenge,
  closeReward,
  publishChallenge,
  publishReward,
  saveCampaign,
  saveChallenge,
  saveReward,
  setRewardStock,
  type CoreResult,
} from '../../src/features/workspace/core';
import type {
  CampaignDraft,
  ChallengeDraft,
  RewardDraft,
} from '../../src/features/workspace/domain/catalog';
import { hosted, integer, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `admin-console` — a porta da administração.
 *
 * Por que uma Function, e não a chave de operação no servidor Next: a chave
 * `APPWRITE_OPS_API_KEY` **não existe** neste projeto e não é criável por aqui
 * (medido: a rota de gestão de chaves responde 404 no endpoint da API — é ato de
 * Console). Sem ela, a alternativa seria abrir permissão de linha nos registros
 * privados para a sessão da equipe, e isso espalharia leitura privilegiada por
 * toda a base em vez de concentrá-la numa porta com papel.
 *
 * Então a leitura administrativa acontece aqui, com a chave do PRÓPRIO runtime, e
 * a plataforma fecha a execução antes do container: `execute` é
 * `team:nuy-admins`, e creator comum leva 401 da plataforma. Dentro do container
 * a capacidade é apurada DE NOVO (`manage-catalog`, `moderate`, `view-audit`) de
 * membership confirmada — as duas barreiras, não uma.
 *
 * Nenhuma entrada aceita identidade do corpo: quem age é sempre quem o Appwrite
 * autenticou (ver `shared/host.ts`).
 */
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function flag(value: unknown): boolean {
  return value === true;
}

/**
 * Fuso do produto para interpretar hora de parede. O valor vem do app, então é
 * validado antes de entrar no `Intl` — fuso inválido não pode derrubar a leitura.
 */
function timeZone(value: unknown): string {
  const candidate = text(value);
  return /^[A-Za-z]+\/[A-Za-z_+-]{2,}$/.test(candidate) ? candidate : 'America/Sao_Paulo';
}

function challengeDraft(value: unknown): ChallengeDraft {
  const source = record(value);
  return {
    slug: text(source.slug),
    name: text(source.name),
    description: text(source.description),
    platform: text(source.platform),
    startsAt: text(source.startsAt),
    endsAt: text(source.endsAt),
    points: integer(source.points) ?? 0,
    imageFileId: text(source.imageFileId),
    requiredLevelId: text(source.requiredLevelId),
    participantLimit: integer(source.participantLimit),
    campaignId: text(source.campaignId),
    productId: text(source.productId),
    hashtags: text(source.hashtags),
    mentions: text(source.mentions),
    requirements: list(source.requirements)
      .slice(0, 50)
      .map((item) => {
        const entry = record(item);
        return {
          type: text(entry.type),
          required: flag(entry.required),
          configJson: text(entry.configJson),
        };
      }),
  };
}

function rewardDraft(value: unknown): RewardDraft {
  const source = record(value);
  return {
    name: text(source.name),
    type: text(source.type),
    description: text(source.description),
    pointsCost: integer(source.pointsCost) ?? 0,
    stock: integer(source.stock) ?? 0,
    perUserLimit: integer(source.perUserLimit) ?? 0,
    startsAt: text(source.startsAt),
    endsAt: text(source.endsAt),
    imageFileId: text(source.imageFileId),
  };
}

function campaignDraft(value: unknown): CampaignDraft {
  const source = record(value);
  return {
    name: text(source.name),
    description: text(source.description),
    startsAt: text(source.startsAt),
    endsAt: text(source.endsAt),
    status: text(source.status) as CampaignDraft['status'],
  };
}

export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true, roles: true });
  if (!run.ready) return run.response;
  const { ctx, body } = run;
  const action = text(body.action);

  /** Leitura: responde 200 com o que existe — inclusive lista vazia. */
  const read = async <T>(
    work: Promise<CoreResult<T>>,
    wrap: (value: T) => unknown = (value) => value,
  ) => {
    const result = await work;
    if (result.ok) return event.res.json(wrap(result.value), 200);
    const refused = refuse(event, result);
    return refused ?? event.res.json({ error: 'unavailable' }, 503);
  };

  /** Escrita: recusa de negócio vira status do núcleo; sucesso devolve o valor. */
  const write = async <T>(work: Promise<CoreResult<T>>) => {
    const result = await work;
    const refused = refuse(event, result);
    if (refused) return refused;
    if (result.ok) return event.res.json(result.value, 200);
    return event.res.json({ error: 'unavailable' }, 503);
  };

  switch (action) {
    // ---------- visão geral e relatórios ----------
    case 'overview':
      return read(adminOverview(ctx));
    case 'report':
      return read(adminReport(ctx, { days: integer(body.days) ?? 30 }));
    case 'audit.recent':
      return read(adminRecentAudit(ctx, { limit: integer(body.limit) ?? 20 }));

    // ---------- desafios ----------
    case 'challenges.list':
      return read(adminChallenges(ctx, { status: text(body.status) || null }));
    case 'challenges.get':
      return read(adminChallenge(ctx, { challengeId: text(body.challengeId) }), (value) => ({
        item: value,
      }));
    case 'challenge.save':
      return write(
        saveChallenge(ctx, {
          draft: challengeDraft(body.draft),
          publish: flag(body.publish),
          expectedVersion: integer(body.expectedVersion),
          timeZone: timeZone(body.timeZone),
        }),
      );
    case 'challenge.publish':
      return write(
        publishChallenge(ctx, {
          challengeId: text(body.challengeId),
          expectedVersion: integer(body.expectedVersion),
        }),
      );
    case 'challenge.close':
      return write(
        closeChallenge(ctx, {
          challengeId: text(body.challengeId),
          expectedVersion: integer(body.expectedVersion),
        }),
      );
    case 'challenge.archive':
      return write(
        archiveChallenge(ctx, {
          challengeId: text(body.challengeId),
          expectedVersion: integer(body.expectedVersion),
        }),
      );

    // ---------- recompensas ----------
    case 'rewards.list':
      return read(adminRewards(ctx, { status: text(body.status) || null }));
    case 'rewards.get':
      return read(adminReward(ctx, { rewardId: text(body.rewardId) }), (value) => ({
        item: value,
      }));
    case 'reward.save':
      return write(
        saveReward(ctx, {
          key: text(body.key),
          rewardId: text(body.rewardId) || null,
          draft: rewardDraft(body.draft),
          publish: flag(body.publish),
          expectedVersion: integer(body.expectedVersion),
          timeZone: timeZone(body.timeZone),
        }),
      );
    case 'reward.publish':
      return write(
        publishReward(ctx, {
          rewardId: text(body.rewardId),
          expectedVersion: integer(body.expectedVersion),
        }),
      );
    case 'reward.close':
      return write(
        closeReward(ctx, {
          rewardId: text(body.rewardId),
          expectedVersion: integer(body.expectedVersion),
        }),
      );
    case 'reward.stock':
      return write(
        setRewardStock(ctx, {
          rewardId: text(body.rewardId),
          stock: integer(body.stock) ?? -1,
          reason: text(body.reason),
          expectedVersion: integer(body.expectedVersion),
        }),
      );

    // ---------- campanhas ----------
    case 'catalog.options':
      return read(adminOptions(ctx));
    case 'campaigns.list':
      return read(adminCampaigns(ctx));
    case 'campaign.save':
      return write(
        saveCampaign(ctx, {
          key: text(body.key),
          campaignId: text(body.campaignId) || null,
          draft: campaignDraft(body.draft),
          timeZone: timeZone(body.timeZone),
        }),
      );

    // ---------- submissões ----------
    case 'submissions.list':
      return read(
        adminSubmissions(ctx, {
          status: text(body.status) || null,
          challengeId: text(body.challengeId) || null,
          userId: text(body.userId) || null,
          from: text(body.from) || null,
          to: text(body.to) || null,
        }),
      );
    case 'submissions.get':
      return read(adminSubmission(ctx, { submissionId: text(body.submissionId) }), (value) => ({
        item: value,
      }));

    // ---------- creators ----------
    case 'creators.list':
      return read(adminCreators(ctx, { search: text(body.search) || null }));
    case 'creators.get':
      return read(adminCreator(ctx, { userId: text(body.userId) }), (value) => ({ item: value }));

    default:
      return event.res.json({ error: 'invalid' }, 400);
  }
}
