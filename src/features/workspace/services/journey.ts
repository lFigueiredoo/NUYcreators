import 'server-only';
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

/**
 * Jornada de pontos da própria usuária.
 *
 * Os dois números nunca se misturam: `availableBalance` é gastável e
 * `qualifyingPoints` define o nível (docs/database.md §Pontos). O progresso é
 * calculado com os pontos de jornada, e `levelId` — quando o backend já gravou
 * — tem a palavra final sobre o nível exibido.
 */
export async function loadJourney(secret: string, userId: string): Promise<JourneyView> {
  const [account, transactions, levels] = await Promise.all([
    listSession(secret, SCOPE, 'point_accounts', mapAccount, {
      queries: [Query.equal('userId', userId)],
      limit: 1,
    }),
    listSession(secret, SCOPE, 'point_transactions', mapTransaction, {
      // Extrato em ordem real de lançamento; o índice userId+createdAt sustenta
      // a ordenação e a paginação.
      queries: [Query.equal('userId', userId), Query.orderDesc('createdAt')],
      limit: 30,
      paged: true,
    }),
    loadLevels(secret),
  ]);
  const own = first(account);
  const summary = journeySummary(own);
  return {
    accountState: account.state,
    summary,
    levels,
    progress: own ? levelProgress(own.qualifyingPoints, levels, own.levelId) : null,
    transactions,
  };
}
