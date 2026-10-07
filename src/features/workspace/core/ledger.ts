import {
  createTableRow,
  decrementColumn,
  getTableRow,
  incrementColumn,
  isAbsent,
  isConflict,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { Permission, Query, Role } from 'node-appwrite';
import { ownerReadPermissions } from '../../../lib/security/permissions';
import { levelFor, type Level } from '../domain/levels';
import { rowId } from './ids';
import type { CoreContext } from './context';
import type { Staged } from './record';

/**
 * Ledger de pontos — a única porta por onde saldo, nível e ranking mudam.
 *
 * Regras que este módulo garante (docs/database.md §Pontos):
 *  - `availableBalance` é o gastável e NUNCA fica negativo (débito é conferido
 *    pelo banco com `min: 0`, não por leitura otimista);
 *  - `qualifyingPoints` é o que define nível e é tocado só por crédito elegível
 *    e estorno — resgate gasta saldo e não rebaixa ninguém;
 *  - `rankingDelta` é explícito: resgate e ajuste entram com zero e por isso não
 *    mexem na posição do ciclo;
 *  - crédito tem chave determinística por operação de negócio (`idempotencyKey`
 *    única + `$id` derivado dela), então aprovar duas vezes não credita duas.
 *
 * O `$id` derivado é a barreira final: em repetição o `createRow` volta 409 e a
 * operação inteira é considerada já aplicada, sem incrementar nada.
 */

export type CreditInput = {
  userId: string;
  /** Sempre positivo aqui; débito é `debitAvailableBalance`. */
  amount: number;
  type: 'earn' | 'adjust' | 'reversal' | string;
  referenceId: string;
  referenceType: string;
  description: string;
  /** Chave determinística da operação de negócio (ex.: `submission.approved:<id>`). */
  idempotencyKey: string;
  /** Créditos elegíveis contam para nível e ranking; ajuste administrativo não. */
  qualifies: boolean;
};

function ledgerRowId(idempotencyKey: string) {
  return rowId('ptx', idempotencyKey);
}

/** Conta de pontos da usuária lida dentro da transação (`null` se ainda não existe). */
export async function readAccount(
  ctx: CoreContext,
  tx: Staged,
  userId: string,
): Promise<Row | null> {
  try {
    return await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_accounts',
      rowId: userId,
      transactionId: tx.transactionId,
    });
  } catch (error) {
    if (isAbsent(error)) return null;
    throw error;
  }
}

async function readLevels(ctx: CoreContext, tx: Staged): Promise<Level[]> {
  const result = await ctx.tables.listRows({
    databaseId: ctx.databaseId,
    tableId: 'creator_levels',
    queries: [Query.equal('active', true)],
    transactionId: tx.transactionId,
  });
  return result.rows.map((row) => ({
    id: String(row.$id),
    name: String(row.name ?? ''),
    minPoints: Number(row.minPoints ?? 0),
    maxPoints: typeof row.maxPoints === 'number' ? row.maxPoints : null,
    order: Number(row.order ?? 0),
  }));
}

/**
 * Credita pontos e mantém a projeção de ranking no mesmo commit.
 *
 * Devolve `false` quando a operação já tinha sido aplicada (mesma
 * `idempotencyKey`): quem chamou NÃO deve tratar isso como erro — é a repetição
 * da mesma intenção, e o resultado é o mesmo.
 */
export async function creditPoints(
  ctx: CoreContext,
  tx: Staged,
  input: CreditInput,
  ranking: { periodKey: string; delta: number },
): Promise<boolean> {
  const id = ledgerRowId(input.idempotencyKey);
  try {
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_transactions',
      rowId: id,
      data: {
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        description: input.description.slice(0, 2000),
        createdAt: ctx.now.toISOString(),
        idempotencyKey: input.idempotencyKey,
        rankingDelta: ranking.delta,
        actorId: ctx.actor.userId,
      },
      permissions: ownerReadPermissions(input.userId),
      transactionId: tx.transactionId,
    });
  } catch (error) {
    // Unicidade cobrada no commit/inserção: já existe crédito para esta operação.
    if (isConflict(error)) return false;
    throw error;
  }

  const account = await readAccount(ctx, tx, input.userId);
  const qualifying = input.qualifies ? input.amount : 0;
  if (!account) {
    const levels = await readLevels(ctx, tx);
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_accounts',
      rowId: input.userId,
      data: {
        userId: input.userId,
        availableBalance: input.amount,
        qualifyingPoints: qualifying,
        levelId: levelFor(qualifying, levels)?.id ?? '',
        version: 1,
        lastTransactionId: id,
      },
      permissions: ownerReadPermissions(input.userId),
      transactionId: tx.transactionId,
    });
  } else {
    await incrementColumn(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_accounts',
      rowId: input.userId,
      column: 'availableBalance',
      value: input.amount,
      transactionId: tx.transactionId,
    });
    if (qualifying > 0)
      await incrementColumn(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'point_accounts',
        rowId: input.userId,
        column: 'qualifyingPoints',
        value: qualifying,
        transactionId: tx.transactionId,
      });
    await refreshLevel(ctx, tx, input.userId, account, qualifying);
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_accounts',
      rowId: input.userId,
      data: { lastTransactionId: id },
      transactionId: tx.transactionId,
    });
  }

  if (ranking.delta > 0) await projectRanking(ctx, tx, input.userId, ranking);
  return true;
}

/**
 * Nível derivado da configuração publicada, gravado no mesmo commit do crédito.
 *
 * A base é `qualifyingPoints` lido na transação mais o que ESTA operação
 * acrescenta. Numa corrida de dois créditos simultâneos o nível pode ficar uma
 * escrita atrás; ele nunca fica abaixo do anterior, porque nenhuma operação
 * deste módulo reduz `qualifyingPoints` — e a próxima escrita recompõe.
 */
async function refreshLevel(
  ctx: CoreContext,
  tx: Staged,
  userId: string,
  account: Row,
  delta: number,
): Promise<void> {
  const base = typeof account.qualifyingPoints === 'number' ? account.qualifyingPoints : 0;
  const levels = await readLevels(ctx, tx);
  const next = levelFor(base + delta, levels)?.id ?? '';
  if (next && next !== account.levelId)
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_accounts',
      rowId: userId,
      data: { levelId: next },
      transactionId: tx.transactionId,
    });
  await incrementColumn(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'point_accounts',
    rowId: userId,
    column: 'version',
    value: 1,
    transactionId: tx.transactionId,
  });
}

/**
 * Débito de saldo gastável, com limite conferido pelo banco.
 *
 * `min: 0` é do Appwrite, não nosso: se a corrida perder (duas compras com o
 * mesmo saldo), o commit devolve 400 `attribute_limit_exceeded` e o saldo não
 * fica negativo. Quem chama decide a mensagem.
 */
export async function debitAvailableBalance(
  ctx: CoreContext,
  tx: Staged,
  input: {
    userId: string;
    amount: number;
    referenceId: string;
    referenceType: string;
    description: string;
    idempotencyKey: string;
  },
): Promise<boolean> {
  const id = ledgerRowId(input.idempotencyKey);
  try {
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_transactions',
      rowId: id,
      data: {
        userId: input.userId,
        type: 'redeem',
        amount: -input.amount,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        description: input.description.slice(0, 2000),
        createdAt: ctx.now.toISOString(),
        idempotencyKey: input.idempotencyKey,
        // Resgate não é conquista: zero explícito, ranking intacto.
        rankingDelta: 0,
        actorId: ctx.actor.userId,
      },
      permissions: ownerReadPermissions(input.userId),
      transactionId: tx.transactionId,
    });
  } catch (error) {
    if (isConflict(error)) return false;
    throw error;
  }
  await decrementColumn(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'point_accounts',
    rowId: input.userId,
    column: 'availableBalance',
    value: input.amount,
    min: 0,
    transactionId: tx.transactionId,
  });
  await incrementColumn(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'point_accounts',
    rowId: input.userId,
    column: 'version',
    value: 1,
    transactionId: tx.transactionId,
  });
  return true;
}

/**
 * Projeção do ranking do ciclo: soma `rankingDelta` elegível, nunca saldo.
 *
 * A linha é lida ANTES de escrever (medido, não presumido): um incremento
 * estagiado contra linha inexistente é aceito na hora e só explode no commit —
 * `404 document_not_found` que derruba a operação inteira e volta como um 503
 * sem causa. Ler primeiro separa "criar a entrada do ciclo" de "somar na entrada
 * existente" e o erro deixa de existir.
 */
async function projectRanking(
  ctx: CoreContext,
  tx: Staged,
  userId: string,
  ranking: { periodKey: string; delta: number },
): Promise<void> {
  const id = rowId('rank', ranking.periodKey, userId);
  const existing = await readRankingEntry(ctx, tx, id);
  if (existing) {
    await incrementColumn(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'ranking_entries',
      rowId: id,
      column: 'earnedPoints',
      value: ranking.delta,
      transactionId: tx.transactionId,
    });
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'ranking_entries',
      rowId: id,
      data: { lastEarnedAt: ctx.now.toISOString() },
      transactionId: tx.transactionId,
    });
    return;
  }
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'ranking_entries',
    rowId: id,
    data: {
      periodKey: ranking.periodKey,
      userId,
      earnedPoints: ranking.delta,
      lastEarnedAt: ctx.now.toISOString(),
    },
    // Ranking é projeção pública sanitizada (docs/database.md §Permissões):
    // leitura para qualquer usuária autenticada, escrita só pelo backend.
    permissions: [Permission.read(Role.users())],
    transactionId: tx.transactionId,
  });
}

/** Entrada do ciclo lida na transação (`null` quando a usuária ainda não pontuou). */
async function readRankingEntry(ctx: CoreContext, tx: Staged, id: string): Promise<Row | null> {
  try {
    return await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'ranking_entries',
      rowId: id,
      transactionId: tx.transactionId,
    });
  } catch (error) {
    if (isAbsent(error)) return null;
    throw error;
  }
}
