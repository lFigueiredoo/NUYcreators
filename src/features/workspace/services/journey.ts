import 'server-only';
import { cache } from 'react';
import { Query } from 'node-appwrite';
import { levelProgress, type Level, type LevelProgress } from '../domain/levels';
import {
  journeySummary,
  type JourneySummary,
  type PointAccount,
  type Transaction,
} from '../domain/points';
import {
  first,
  integer,
  listSession,
  optionalText,
  text,
  type Document,
  type Loaded,
} from './read';
import { loadLevels } from './levels';

const SCOPE = 'pontos';

function mapAccount(document: Document): PointAccount {
  return {
    availableBalance: integer(document.availableBalance),
    qualifyingPoints: integer(document.qualifyingPoints),
    levelId: optionalText(document.levelId),
  };
}

function mapTransaction(document: Document): Transaction {
  return {
    id: text(document.$id),
    type: text(document.type),
    amount: integer(document.amount),
    description: text(document.description),
    createdAt: text(document.createdAt),
    referenceType: optionalText(document.referenceType),
  };
}

export type JourneyView = {
  accountState: Loaded<PointAccount>['state'];
  summary: JourneySummary;
  levels: Level[];
  progress: LevelProgress | null;
  transactions: Loaded<Transaction>;
};

/*
 * As duas leituras que o cabeçalho e o painel compartilham.
 *
 * O nível aparece no header em todas as telas, e o painel também precisa da
 * conta e dos níveis: sem `cache` do React seriam quatro leituras idênticas na
 * mesma requisição. Com ele, a segunda chamada é a mesma promessa — medido em
 * `/app`, zero leitura a mais; nas outras telas, exatamente as duas que o nível
 * do header exige. Nenhuma regra muda aqui: os mesmos mapeadores, as mesmas
 * tabelas, os mesmos escopos de sessão.
 */
const account = cache(async (secret: string, userId: string): Promise<Loaded<PointAccount>> =>
  listSession(secret, SCOPE, 'point_accounts', mapAccount, {
    queries: [Query.equal('userId', userId)],
    limit: 1,
  }),
);

const levels = cache(async (secret: string): Promise<Level[]> => loadLevels(secret));

/**
 * Nome do nível para o cabeçalho — `null` quando não há conta ou níveis.
 *
 * Lê `qualifyingPoints` (jornada), nunca o saldo: é a mesma fonte da faixa do
 * painel, e `levelId` continua tendo a palavra final quando existir.
 */
export const loadLevelName = cache(
  async (secret: string, userId: string): Promise<string | null> => {
    const [own, published] = await Promise.all([account(secret, userId), levels(secret)]);
    const row = first(own);
    if (!row) return null;
    return levelProgress(row.qualifyingPoints, published, row.levelId)?.current.name ?? null;
  },
);

/**
 * Jornada de pontos da própria usuária.
 *
 * Os dois números nunca se misturam: `availableBalance` é gastável e
 * `qualifyingPoints` define o nível (docs/database.md §Pontos). O progresso é
 * calculado com os pontos de jornada, e `levelId` — quando o backend já gravou
 * — tem a palavra final sobre o nível exibido.
 */
export async function loadJourney(secret: string, userId: string): Promise<JourneyView> {
  const [ownAccount, transactions, published] = await Promise.all([
    account(secret, userId),
    listSession(secret, SCOPE, 'point_transactions', mapTransaction, {
      // Extrato em ordem real de lançamento; o índice userId+createdAt sustenta
      // a ordenação e a paginação.
      queries: [Query.equal('userId', userId), Query.orderDesc('createdAt')],
      limit: 30,
      paged: true,
    }),
    levels(secret),
  ]);
  const own = first(ownAccount);
  const summary = journeySummary(own);
  return {
    accountState: ownAccount.state,
    summary,
    levels: published,
    progress: own ? levelProgress(own.qualifyingPoints, published, own.levelId) : null,
    transactions,
  };
}
