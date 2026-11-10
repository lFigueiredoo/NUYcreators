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

export type RankingRow = {
  position: number;
  earnedPoints: number;
  /** Nome público da projeção sanitizada; rótulo neutro quando não há. */
  displayName: string;
  isViewer: boolean;
};

export type RankingView = {
  campaignId: string | null;
  campaignName: string | null;
  periodKey: string;
  periodLabel: string;
  campaigns: Array<{ id: string; name: string; startsAt: string; endsAt: string }>;
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

function isTestAccount(displayName: string) {
  return displayName.toLocaleLowerCase('pt-BR').includes('teste');
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
  selectedCampaignId?: string | null,
  now: Date = new Date(),
): Promise<RankingView> {
  const campaigns = await listSession(secret, SCOPE, 'campaigns', (document) => ({
    id: text(document.$id),
    name: text(document.name),
    startsAt: text(document.startsAt),
    endsAt: text(document.endsAt),
  }), {
    queries: [
      Query.equal('status', ['published', 'active']),
      Query.orderDesc('startsAt'),
    ],
    limit: 100,
  });
  const options = campaigns.state === 'ok' ? campaigns.items : [];
  const campaign = options.find((item) => item.id === selectedCampaignId) ?? options[0] ?? null;
  const key = periodKey(now);
  if (!campaign)
    return {
      campaignId: null,
      campaignName: null,
      periodKey: key,
      periodLabel: periodLabel(key),
      campaigns: [],
      entries: loaded([]),
      own: null,
    };
  const entries = await listSession(secret, SCOPE, 'ranking_entries', mapEntry, {
    queries: [Query.equal('campaignId', campaign.id), Query.orderDesc('earnedPoints')],
    limit: 100,
    paged: true,
  });
  if (entries.state !== 'ok')
    return {
      periodKey: key,
      periodLabel: periodLabel(key),
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaigns: options,
      entries: unavailable<RankingRow>(),
      own: null,
    };

  const profiles = await listSession(secret, SCOPE, 'public_creator_profiles', mapPublic, {
    queries: [],
    limit: 100,
    paged: true,
  });
  if (profiles.state !== 'ok')
    return {
      periodKey: key,
      periodLabel: periodLabel(key),
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaigns: options,
      entries: unavailable<RankingRow>(),
      own: null,
    };

  const eligibleProfiles = profiles.items.filter(
    (profile) => profile.userId && profile.displayName.trim() && !isTestAccount(profile.displayName),
  );
  const pointsByUser = new Map(entries.items.map((entry) => [entry.userId, entry]));
  const mergedEntries: RankingEntry[] = eligibleProfiles.map((profile) => {
    const entry = pointsByUser.get(profile.userId);
    return entry ?? {
      id: `zero:${profile.userId}`,
      userId: profile.userId,
      earnedPoints: 0,
      lastEarnedAt: null,
    };
  });
  const ranked = rankEntries(mergedEntries);
  // `own` já está decidido aqui: depende só de `ranked`, não do nome público.
  // Saber disso agora deixa a busca de quem está FORA da janela correr em paralelo
  // com a leitura dos perfis, em vez de depois dela — e ela só é disparada quando
  // faz falta: dentro da janela, `positionOf` já respondeu e a leitura extra seria
  // desperdício. As consultas são as mesmas duas; o que muda é a ordem no tempo.
  const own = positionOf(ranked, userId);
  const foraDaJanela = own ? null : ownOutsideWindow(secret, campaign.id, userId);
  const names = new Map<string, string>();
  for (const profile of eligibleProfiles) names.set(profile.userId, profile.displayName);

  return {
    periodKey: key,
    periodLabel: periodLabel(key),
    campaignId: campaign.id,
    campaignName: campaign.name,
    campaigns: options,
    entries: loaded(
      ranked.map((entry) => ({
        position: entry.position,
        earnedPoints: entry.earnedPoints,
        displayName: names.get(entry.userId) || 'Creator NUY',
        isViewer: entry.userId === userId,
      })),
    ),
    own: own
      ? { position: own.position, earnedPoints: own.earnedPoints }
      : await foraDaJanela,
  };
}

/**
 * Sem entrada no ciclo a usuária ainda não pontuou — devolvemos `null`. Se ela
 * tiver entrada fora da janela exibida, mostramos os pontos sem inventar
 * posição: para saber a posição exata seria preciso contar o restante do ciclo.
 */
async function ownOutsideWindow(secret: string, campaignId: string, userId: string) {
  const result = await listSession(secret, SCOPE, 'ranking_entries', mapEntry, {
    queries: [Query.equal('campaignId', campaignId), Query.equal('userId', userId)],
    limit: 1,
  });
  const entry = result.state === 'ok' ? (result.items[0] ?? null) : null;
  return entry ? { position: null, earnedPoints: entry.earnedPoints } : null;
}
