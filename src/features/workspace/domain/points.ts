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

/**
 * Rótulo do tipo de movimentação.
 *
 * O extrato imprimia o valor CRU do enum ao lado da data — `08 out · redeem` —
 * em inglês, numa tela em português (P2-2 da revisão visual). Tipo sem tradução
 * conhecida não é impresso: a linha já tem descrição e valor, e nome de enum não
 * é informação para a creator.
 */
const POINT_TYPE: Record<string, string> = {
  earn: 'Pontos ganhos',
  redeem: 'Resgate',
  adjust: 'Ajuste de pontos',
  reversal: 'Estorno da movimentação',
};

export function pointTypeLabel(type: string | null | undefined): string {
  return type ? (POINT_TYPE[type] ?? '') : '';
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}
