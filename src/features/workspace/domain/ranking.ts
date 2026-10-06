/**
 * Ranking mensal — período e posições.
 *
 * A chave do período é a mesma convenção usada pela coleção `ranking_entries`
 * (`periodKey`): mês calendário em UTC, `AAAA-MM`. O ranking é sempre por
 * PONTOS GANHOS no período (`earnedPoints`), nunca pelo saldo disponível — quem
 * resgata recompensa não cai de posição.
 */
export type RankingEntry = {
  id: string;
  userId: string;
  earnedPoints: number;
  lastEarnedAt: string | null;
};

export type RankedEntry = RankingEntry & { position: number };

/**
 * Fuso do ciclo — `America/Sao_Paulo`, o inicialmente proposto em
 * docs/database.md §Pontos, níveis e ranking. Quando `platform_settings`
 * publicar outro fuso, esta constante é o único ponto a trocar.
 */
export const rankingTimeZone = 'America/Sao_Paulo';

const monthParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: rankingTimeZone,
  year: 'numeric',
  month: '2-digit',
});

/** `AAAA-MM` do mês do instante informado, no fuso do ciclo. */
export function periodKey(date: Date) {
  const parts = monthParts.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

/** Mês anterior ao informado — usado para citar o ciclo que acabou. */
export function previousPeriodKey(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function periodLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Ordena por pontos ganhos (desc) e atribui posições.
 * Empate divide a mesma posição e a seguinte é pulada (1, 2, 2, 4).
 */
export function rankEntries(entries: RankingEntry[]): RankedEntry[] {
  const ordered = [...entries].sort(
    (a, b) =>
      b.earnedPoints - a.earnedPoints ||
      (a.lastEarnedAt ?? '').localeCompare(b.lastEarnedAt ?? '') ||
      a.userId.localeCompare(b.userId),
  );
  let lastPoints: number | null = null;
  let lastPosition = 0;
  return ordered.map((entry, index) => {
    const position =
      lastPoints !== null && entry.earnedPoints === lastPoints ? lastPosition : index + 1;
    lastPoints = entry.earnedPoints;
    lastPosition = position;
    return { ...entry, position };
  });
}

export function positionOf(entries: RankedEntry[], userId: string) {
  return entries.find((entry) => entry.userId === userId) ?? null;
}
