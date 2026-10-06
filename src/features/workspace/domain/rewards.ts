/**
 * Elegibilidade de recompensa — só com o que o catálogo realmente informa.
 *
 * Não existe regra de estoque "inventada" aqui: usamos janela, estoque e limite
 * por pessoa, os campos do documento (docs/database.md). O resgate em si é
 * backend transacional e não é decidido no cliente.
 */
export type RewardWindow = {
  startsAt: string;
  endsAt: string;
  pointsCost: number;
  stock: number;
  perUserLimit: number;
};

export type RewardEligibility = {
  eligible: boolean;
  /** Motivo curto e verificável quando não está elegível. */
  reason: string | null;
};

function instant(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function rewardEligibility(
  reward: RewardWindow,
  context: { now: Date; balance: number; redeemed: number },
): RewardEligibility {
  const starts = instant(reward.startsAt);
  const ends = instant(reward.endsAt);
  if (starts && starts.getTime() > context.now.getTime())
    return { eligible: false, reason: 'Em breve' };
  if (ends && ends.getTime() < context.now.getTime())
    return { eligible: false, reason: 'Encerrado' };
  if (reward.stock <= 0) return { eligible: false, reason: 'Esgotado' };
  if (reward.perUserLimit > 0 && context.redeemed >= reward.perUserLimit)
    return { eligible: false, reason: 'Limite atingido' };
  if (context.balance < reward.pointsCost)
    return { eligible: false, reason: 'Pontos insuficientes' };
  return { eligible: true, reason: null };
}
