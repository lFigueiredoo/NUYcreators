import 'server-only';
import { Query } from 'node-appwrite';
import { functionsOnline } from './commands';
import { rewardEligibility, type RewardEligibility } from '../domain/rewards';
import {
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

/**
 * Catálogo operacional + resgates da própria usuária.
 *
 * O CTA de resgate só fica disponível com backend validado: a function
 * `redeem-reward` está declarada como não implementada no provisionamento, então
 * `redemptionEnabled` é `false` e a tela informa isso em vez de simular sucesso.
 */
export async function loadCatalog(
  secret: string,
  userId: string,
  now: Date,
  journey: JourneyView,
): Promise<CatalogView> {
  const [rewards, redemptions] = await Promise.all([
    listSession(secret, SCOPE, 'rewards', mapReward, { limit: 100 }),
    listSession(secret, SCOPE, 'reward_redemptions', mapRedemption, {
      queries: [Query.equal('userId', userId), Query.orderDesc('requestedAt')],
      limit: 50,
      paged: true,
    }),
  ]);
  if (rewards.state !== 'ok' || redemptions.state !== 'ok')
    return {
      accountState: journey.accountState,
      hasAccount: journey.summary.hasAccount,
      balance: journey.summary.availableBalance,
      rewards: unavailable<RewardView>(),
      redemptions,
    };

  const latest = new Map<string, Redemption>();
  const counts = new Map<string, number>();
  for (const redemption of redemptions.items) {
    counts.set(redemption.rewardId, (counts.get(redemption.rewardId) ?? 0) + 1);
    if (!latest.has(redemption.rewardId)) latest.set(redemption.rewardId, redemption);
  }

  return {
    accountState: journey.accountState,
    hasAccount: journey.summary.hasAccount,
    balance: journey.summary.availableBalance,
    rewards: {
      state: 'ok',
      items: rewards.items.map((reward) => ({
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
