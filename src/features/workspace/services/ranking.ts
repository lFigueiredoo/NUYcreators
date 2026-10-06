import 'server-only';
import { Query } from 'node-appwrite';
import {
  periodKey,
  periodLabel,
  positionOf,
  rankEntries,
  type RankingEntry,
} from '../domain/ranking';
import {
  integer,
  listSession,
  loaded,
  optionalText,
  text,
  unavailable,
  type Document,
  type Loaded,
} from './read';

const SCOPE = 'ranking';

/** Quantas posições a lista mostra — o resto continua no backend. */
const WINDOW = 50;

export type RankingRow = {
  position: number;
  earnedPoints: number;
  /** Nome público da projeção sanitizada; rótulo neutro quando não há. */
  displayName: string;
  isViewer: boolean;
};

export type RankingView = {
  periodKey: string;
  periodLabel: string;
  entries: Loaded<RankingRow>;
  /** Posição e pontos da própria usuária no ciclo; `null` sem entrada. */
  own: { position: number | null; earnedPoints: number } | null;
};

function mapEntry(document: Document): RankingEntry {
  return {
    id: text(document.$id),
    userId: text(document.userId),
    earnedPoints: integer(document.earnedPoints),
    lastEarnedAt: optionalText(document.lastEarnedAt),
  };
}

function mapPublic(document: Document) {
  return { userId: text(document.userId), displayName: text(document.displayName) };
}

/**
 * Ranking do ciclo — sempre por pontos GANHOS no período (`earnedPoints`), nunca
 * pelo saldo: resgatar recompensa não derruba posição (docs/database.md §Pontos).
 *
 * Nomes vêm só de `public_creator_profiles`, a projeção sanitizada aprovada
 * para leitura pública. Nada de `profiles` (PII) entra aqui: nem e-mail, nem
 * telefone, nem cidade, nem handle declarado.
 */
export async function loadRanking(
  secret: string,
  userId: string,
  now: Date = new Date(),
): Promise<RankingView> {
  const key = periodKey(now);
  const entries = await listSession(secret, SCOPE, 'ranking_entries', mapEntry, {
    // Índice periodKey+earnedPoints sustenta a ordenação e a paginação.
    queries: [Query.equal('periodKey', key), Query.orderDesc('earnedPoints')],
    limit: 100,
    paged: true,
  });
  if (entries.state !== 'ok')
    return {
      periodKey: key,
      periodLabel: periodLabel(key),
      entries: unavailable<RankingRow>(),
      own: null,
    };

  const ranked = rankEntries(entries.items);
  const window = ranked.slice(0, WINDOW);
  const names = new Map<string, string>();
  if (window.length > 0) {
    const profiles = await listSession(secret, SCOPE, 'public_creator_profiles', mapPublic, {
      queries: [
        Query.equal(
          'userId',
          window.map((entry) => entry.userId),
        ),
      ],
      limit: 100,
    });
    if (profiles.state === 'ok')
      for (const profile of profiles.items) names.set(profile.userId, profile.displayName);
  }

  const own = positionOf(ranked, userId);
  return {
    periodKey: key,
    periodLabel: periodLabel(key),
    entries: loaded(
      window.map((entry) => ({
        position: entry.position,
        earnedPoints: entry.earnedPoints,
        displayName: names.get(entry.userId) || 'Creator NUY',
        isViewer: entry.userId === userId,
      })),
    ),
    own: own
      ? { position: own.position, earnedPoints: own.earnedPoints }
      : await ownOutsideWindow(secret, key, userId),
  };
}

/**
 * Sem entrada no ciclo a usuária ainda não pontuou — devolvemos `null`. Se ela
 * tiver entrada fora da janela exibida, mostramos os pontos sem inventar
 * posição: para saber a posição exata seria preciso contar o restante do ciclo.
 */
async function ownOutsideWindow(secret: string, key: string, userId: string) {
  const result = await listSession(secret, SCOPE, 'ranking_entries', mapEntry, {
    queries: [Query.equal('periodKey', key), Query.equal('userId', userId)],
    limit: 1,
  });
  const entry = result.state === 'ok' ? (result.items[0] ?? null) : null;
  return entry ? { position: null, earnedPoints: entry.earnedPoints } : null;
}
