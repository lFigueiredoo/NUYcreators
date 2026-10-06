/**
 * Pontos NUY — os dois números são coisas diferentes e a UI nunca os mistura.
 *
 * `availableBalance` é o que pode ser gasto em recompensas; `qualifyingPoints`
 * é o que define o nível e não diminui quando há resgate. Um único lugar monta
 * esse resumo, para que nenhuma tela derive nível de saldo por conta própria.
 */
export type PointAccount = {
  availableBalance: number;
  qualifyingPoints: number;
  levelId: string | null;
};

export type JourneySummary = {
  availableBalance: number;
  qualifyingPoints: number;
  hasAccount: boolean;
};

/** Resumo de jornada a partir da conta de pontos real. Conta ausente = sem jornada. */
export function journeySummary(account: PointAccount | null): JourneySummary {
  return {
    availableBalance: account?.availableBalance ?? 0,
    qualifyingPoints: account?.qualifyingPoints ?? 0,
    hasAccount: account !== null,
  };
}

export type PointType = 'earn' | 'redeem' | 'adjust' | 'reversal' | (string & {});

export type Transaction = {
  id: string;
  type: PointType;
  amount: number;
  description: string;
  createdAt: string;
  referenceType: string | null;
};

/** Sinal exibido no extrato. `adjust` pode vir negativo — o sinal vem do dado. */
export function transactionSign(amount: number) {
  return amount > 0 ? 'credit' : amount < 0 ? 'debit' : 'neutral';
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}
