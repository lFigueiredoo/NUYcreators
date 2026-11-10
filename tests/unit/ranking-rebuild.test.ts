import { describe, expect, it } from 'vitest';
import { rebuildRanking, rowId, type CoreContext } from '../../src/features/workspace/core';

type Row = Record<string, unknown> & { $id: string };
type ParsedQuery = { method: string; attribute?: string; values?: unknown[] };

function memoryTables(seed: Record<string, Row[]>) {
  const store = new Map(
    Object.entries(seed).map(([table, rows]) => [
      table,
      new Map(rows.map((row) => [row.$id, { ...row }])),
    ]),
  );
  const table = (id: string) => {
    let found = store.get(id);
    if (!found) {
      found = new Map();
      store.set(id, found);
    }
    return found;
  };
  const api = {
    listRows: async ({ tableId, queries = [] }: { tableId: string; queries?: string[] }) => {
      const parsed = queries.map((query) => JSON.parse(query) as ParsedQuery);
      const limit = Number(parsed.find((query) => query.method === 'limit')?.values?.[0] ?? 25);
      let rows = [...table(tableId).values()];
      const order = parsed.find((query) => query.method === 'orderAsc');
      if (order?.attribute)
        rows = rows.sort((left, right) =>
          String(left[order.attribute!] ?? '').localeCompare(String(right[order.attribute!] ?? '')),
        );
      const cursor = String(
        parsed.find((query) => query.method === 'cursorAfter')?.values?.[0] ?? '',
      );
      const start = cursor ? rows.findIndex((row) => row.$id === cursor) + 1 : 0;
      return { total: rows.length, rows: rows.slice(start, start + limit) };
    },
    createRow: async ({
      tableId,
      rowId: id,
      data,
    }: {
      tableId: string;
      rowId: string;
      data: Row;
    }) => {
      const row = { ...data, $id: id };
      table(tableId).set(id, row);
      return row;
    },
    updateRow: async ({
      tableId,
      rowId: id,
      data,
    }: {
      tableId: string;
      rowId: string;
      data: Row;
    }) => {
      const row = { ...(table(tableId).get(id) ?? { $id: id }), ...data } as Row;
      table(tableId).set(id, row);
      return row;
    },
    deleteRow: async ({ tableId, rowId: id }: { tableId: string; rowId: string }) => {
      table(tableId).delete(id);
    },
    createTransaction: async () => ({ $id: 'ranking-rebuild-transaction' }),
    updateTransaction: async () => ({ $id: 'ranking-rebuild-transaction' }),
    deleteTransaction: async () => ({}),
  };
  return {
    api: api as never,
    row: (tableId: string, id: string) => table(tableId).get(id),
  };
}

function context(tables: unknown): CoreContext {
  return {
    tables: tables as CoreContext['tables'],
    databaseId: 'nuy-creators',
    actor: { userId: 'staff', roles: ['admin'] },
    now: new Date('2026-11-04T12:00:00.000Z'),
    correlationId: 'unit-ranking-rebuild',
  };
}

describe('rebuild completo do ranking', () => {
  it('pagina além de 2.000 lançamentos, usa o último crédito e remove órfãos', async () => {
    const period = '2026-10';
    const userId = 'creator-a';
    const transactions = Array.from({ length: 2001 }, (_, index) => ({
      $id: `ptx-${String(index).padStart(4, '0')}`,
      userId,
      rankingDelta: 1,
      createdAt: new Date(Date.UTC(2026, 9, 1, 12, 0, index)).toISOString(),
    }));
    const targetId = rowId('rank', period, userId);
    const orphanId = rowId('rank', period, 'creator-sem-ledger');
    const duplicateId = 'legacy-duplicate';
    const db = memoryTables({
      point_transactions: transactions,
      ranking_entries: [
        {
          $id: targetId,
          periodKey: period,
          userId,
          earnedPoints: 999,
          lastEarnedAt: '2026-10-01T00:00:00.000Z',
        },
        {
          $id: orphanId,
          periodKey: period,
          userId: 'creator-sem-ledger',
          earnedPoints: 500,
          lastEarnedAt: '2026-10-01T00:00:00.000Z',
        },
        {
          $id: duplicateId,
          periodKey: period,
          userId,
          earnedPoints: 123,
          lastEarnedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    });

    const rebuilt = await rebuildRanking(context(db.api), { period });

    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    expect(rebuilt.value).toMatchObject({ scanned: 2001, truncated: false });
    expect(rebuilt.value.periods).toEqual([{ periodKey: period, entries: 1, earnedPoints: 2001 }]);
    expect(db.row('ranking_entries', targetId)).toMatchObject({
      earnedPoints: 2001,
      lastEarnedAt: transactions.at(-1)?.createdAt,
    });
    expect(db.row('ranking_entries', orphanId)).toBeUndefined();
    expect(db.row('ranking_entries', duplicateId)).toBeUndefined();
  });

  it('reconcilia um período explícito vazio removendo toda pontuação fantasma', async () => {
    const period = '2026-09';
    const orphanId = rowId('rank', period, 'creator-orfa');
    const db = memoryTables({
      point_transactions: [],
      ranking_entries: [
        {
          $id: orphanId,
          periodKey: period,
          userId: 'creator-orfa',
          earnedPoints: 80,
          lastEarnedAt: '2026-09-10T12:00:00.000Z',
        },
      ],
    });

    const rebuilt = await rebuildRanking(context(db.api), { period });

    expect(rebuilt.ok && rebuilt.value.periods).toEqual([
      { periodKey: period, entries: 0, earnedPoints: 0 },
    ]);
    expect(db.row('ranking_entries', orphanId)).toBeUndefined();
  });

  it('associa créditos antigos à campanha pelo envio aprovado e pelo desafio', async () => {
    const campaignId = 'campaign-legacy';
    const userId = 'creator-legacy';
    const transaction = {
      $id: 'ptx-legacy',
      userId,
      rankingDelta: 25,
      referenceType: 'challenge_submission',
      referenceId: 'submission-legacy',
      createdAt: '2026-10-12T12:00:00.000Z',
    };
    const db = memoryTables({
      point_transactions: [transaction],
      challenge_submissions: [
        { $id: 'submission-legacy', challengeId: 'challenge-legacy' },
      ],
      challenges: [
        { $id: 'challenge-legacy', campaignId },
      ],
      profiles: [
        { $id: userId, userId, name: 'Creator Legacy', onboardingCompletedAt: '2026-10-01T12:00:00.000Z' },
      ],
      ranking_entries: [],
    });

    const rebuilt = await rebuildRanking(context(db.api));

    expect(rebuilt.ok).toBe(true);
    expect(db.row('ranking_entries', rowId('rank', campaignId, userId))).toMatchObject({
      campaignId,
      userId,
      earnedPoints: 25,
    });
    expect(db.row('public_creator_profiles', userId)).toMatchObject({
      userId,
      displayName: 'Creator Legacy',
    });
  });
});
