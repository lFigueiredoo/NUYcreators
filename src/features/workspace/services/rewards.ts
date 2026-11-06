import 'server-only';
import { Query } from 'node-appwrite';
import { functionsOnline } from './commands';
import { isVisibleToCreators } from '../domain/catalog';
import { rewardEligibility, type RewardEligibility } from '../domain/rewards';
import {
  countSession,
  integer,
  listSession,
  optionalText,
  text,
  unavailable,
  type Document,
  type Loaded,
} from './read';
import type { JourneyView } from './journey';

const SCOPE = 'recompensas';

export type Reward = {
  id: string;
  name: string;
  type: string;
  description: string;
  imageFileId: string | null;
  pointsCost: number;
  stock: number;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type Redemption = {
  id: string;
  rewardId: string;
  cost: number;
  status: string;
  requestedAt: string;
};

export type RewardView = Reward & {
  redemption: Redemption | null;
  eligibility: RewardEligibility;
};

function mapReward(document: Document): Reward {
  return {
    id: text(document.$id),
    name: text(document.name),
    type: text(document.type),
    description: text(document.description),
    imageFileId: optionalText(document.imageFileId),
    pointsCost: integer(document.pointsCost),
    stock: integer(document.stock),
    perUserLimit: integer(document.perUserLimit),
    startsAt: text(document.startsAt),
    endsAt: text(document.endsAt),
    status: text(document.status),
  };
}

function mapRedemption(document: Document): Redemption {
  return {
    id: text(document.$id),
    rewardId: text(document.rewardId),
    cost: integer(document.pointsCostSnapshot),
    status: text(document.status),
    requestedAt: text(document.requestedAt),
  };
}

/**
 * O resgate real depende da Function `redeem-reward` publicada: o débito de
 * saldo e a baixa de estoque são transacionais, decididos no commit pelo
 * servidor (medido: a corrida pela última unidade deixa passar um resgate só).
 * Sem a Function ligada, a interface informa o estado real — nenhum resgate é
 * simulado e nenhum saldo é debitado no cliente.
 */
export function redemptionEnabled(): boolean {
  return functionsOnline();
}

export type CatalogView = {
  /** Estado da conta de pontos: distingue "sem conta" de "não pudemos ler". */
  accountState: JourneyView['accountState'];
  /** Existe conta de pontos? Quem não tem saldo nenhum não vê "0" como saldo. */
  hasAccount: boolean;
  /** Saldo disponível real (`availableBalance`), a base do "Seu saldo". */
  balance: number;
  rewards: Loaded<RewardView>;
  redemptions: Loaded<Redemption>;
};

const COUNT_BATCH = 10;

/**
 * Contagens exatas para os limites por pessoa. O cartão não pode concluir que
 * ainda há resgate disponível olhando apenas a página recente do histórico:
 * o backend decide pelo `total` completo. Só recompensas com limite precisam
 * da contagem, e as consultas são feitas em lotes para não abrir dezenas de
 * conexões simultâneas.
 */
export async function exactRedemptionCounts(
  rewards: readonly Pick<Reward, 'id' | 'perUserLimit'>[],
  count: (rewardId: string) => Promise<number | null>,
): Promise<Map<string, number> | null> {
  const ids = [
    ...new Set(
      rewards.filter((reward) => reward.perUserLimit > 0).map((reward) => reward.id),
    ),
  ];
  const result = new Map<string, number>();
  for (let offset = 0; offset < ids.length; offset += COUNT_BATCH) {
    const batch = ids.slice(offset, offset + COUNT_BATCH);
    const totals = await Promise.all(batch.map(async (id) => [id, await count(id)] as const));
    for (const [id, total] of totals) {
      if (total === null) return null;
      result.set(id, total);
    }
  }
  return result;
}

/**
 * Catálogo operacional + resgates da própria usuária.
 *
 * O CTA de resgate só fica disponível com backend validado: a function
 * `redeem-reward` está declarada como não implementada no provisionamento, então
 * `redemptionEnabled` é `false` e a tela informa isso em vez de simular sucesso.
 *
 * `journeySource` aceita a jornada já resolvida OU a promessa dela: as duas
 * leituras daqui (`rewards`, `reward_redemptions`) não dependem da jornada — só a
 * elegibilidade calculada depois depende, e ela usa `journey.summary`. Quem já
 * tem a promessa em mãos passa a promessa, e as três leituras viram UMA onda em
 * vez de duas (medido no journal: eram os estágios 4 e 5 do painel).
 */
export async function loadCatalog(
  secret: string,
  userId: string,
  now: Date,
  journeySource: JourneyView | Promise<JourneyView>,
): Promise<CatalogView> {
  const [rewards, redemptions, journey] = await Promise.all([
    listSession(secret, SCOPE, 'rewards', mapReward, { limit: 100 }),
    listSession(secret, SCOPE, 'reward_redemptions', mapRedemption, {
      queries: [Query.equal('userId', userId), Query.orderDesc('requestedAt')],
      limit: 50,
      paged: true,
    }),
    journeySource,
  ]);
  if (rewards.state !== 'ok' || redemptions.state !== 'ok')
    return {
      accountState: journey.accountState,
      hasAccount: journey.summary.hasAccount,
      balance: journey.summary.availableBalance,
      rewards: unavailable<RewardView>(),
      redemptions,
    };

  const counts = await exactRedemptionCounts(rewards.items, (rewardId) =>
    countSession(secret, SCOPE, 'reward_redemptions', [
      Query.equal('userId', userId),
      Query.equal('rewardId', rewardId),
    ]),
  );
  if (!counts)
    return {
      accountState: journey.accountState,
      hasAccount: journey.summary.hasAccount,
      balance: journey.summary.availableBalance,
      rewards: unavailable<RewardView>(),
      redemptions,
    };

  const latest = new Map<string, Redemption>();
  for (const redemption of redemptions.items) {
    if (!latest.has(redemption.rewardId)) latest.set(redemption.rewardId, redemption);
  }

  return {
    accountState: journey.accountState,
    hasAccount: journey.summary.hasAccount,
    balance: journey.summary.availableBalance,
    rewards: {
      state: 'ok',
      items: rewards.items
        // Rascunho de recompensa não está no catálogo. A permissão da linha já o
        // esconde (`draft` nasce com `permissions: []`); o filtro é a segunda
        // tranca, e vale mesmo se a configuração remota mudar.
        .filter((reward) => isVisibleToCreators(reward.status))
        .map((reward) => ({
          ...reward,
          redemption: latest.get(reward.id) ?? null,
          eligibility: rewardEligibility(reward, {
            now,
            balance: journey.summary.availableBalance,
            redeemed: counts.get(reward.id) ?? 0,
          }),
        })),
    },
    redemptions,
  };
}
