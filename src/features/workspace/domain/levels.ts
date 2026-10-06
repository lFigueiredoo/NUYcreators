/**
 * Níveis NUY — matemática pura.
 *
 * Os nomes e as faixas NÃO moram aqui: vêm da coleção `creator_levels`, que o
 * provisionamento cria com `read(any)` (infra/appwrite/provision.ts). A UI nunca
 * duplica threshold; este módulo só calcula posição/progresso a partir do que
 * foi lido.
 *
 * A régua de referência do produto é 0–500, 501–1500, 1501–3000, 3001–5000,
 * 5001+ — mas o cálculo é feito por `minPoints` do PRÓXIMO nível, não por
 * `maxPoints`, para não depender da convenção de faixa fechada do seed.
 */
export type Level = {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  order: number;
};

export type LevelProgress = {
  current: Level;
  next: Level | null;
  /** Pontos que faltam para o próximo nível. `null` no nível mais alto. */
  remaining: number | null;
  /** 0–1 dentro da faixa atual. No nível mais alto, `1`. */
  ratio: number;
  /** Percentual inteiro, para exibição. */
  percent: number;
};

function byOrder(a: Level, b: Level) {
  return a.order - b.order || a.minPoints - b.minPoints;
}

/** Nível cuja faixa contém os pontos. Sem níveis cadastrados, devolve `null`. */
export function levelFor(points: number, levels: Level[]): Level | null {
  const ordered = [...levels].sort(byOrder);
  let found: Level | null = null;
  for (const level of ordered) if (level.minPoints <= points) found = level;
  return found ?? ordered[0] ?? null;
}

/**
 * Progresso até o próximo nível.
 *
 * Recebe `qualifyingPoints` (pontos de jornada) — nunca o saldo disponível:
 * resgatar recompensa gasta saldo e não pode mexer no nível.
 */
export function levelProgress(
  points: number,
  levels: Level[],
  /** `point_accounts.levelId` é a palavra final do backend, quando existir. */
  levelId?: string | null,
): LevelProgress | null {
  const byId = levelId ? (levels.find((level) => level.id === levelId) ?? null) : null;
  const current = byId ?? levelFor(points, levels);
  if (!current) return null;
  const ordered = [...levels].sort(byOrder);
  const index = ordered.findIndex((level) => level.id === current.id);
  const next = ordered[index + 1] ?? null;
  if (!next) return { current, next: null, remaining: null, ratio: 1, percent: 100 };
  const span = next.minPoints - current.minPoints;
  const walked = points - current.minPoints;
  const ratio = span > 0 ? Math.min(1, Math.max(0, walked / span)) : 0;
  return {
    current,
    next,
    remaining: Math.max(0, next.minPoints - points),
    ratio,
    percent: Math.round(ratio * 100),
  };
}
