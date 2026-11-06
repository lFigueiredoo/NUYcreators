import { describe, expect, it } from 'vitest';
import {
  moderateSubmission,
  rowId,
  submitContent,
  type CoreContext,
} from '../../src/features/workspace/core';

type Row = Record<string, unknown> & { $id: string };
type Store = Map<string, Map<string, Row>>;
type Params = { tableId: string; rowId: string; transactionId?: string };

/** Dublê com unicidade de id e isolamento: uma recusa descarta toda a mudança. */
function memoryTables(seed: Record<string, Row[]>) {
  let committed: Store = new Map(
    Object.entries(seed).map(([id, rows]) => [id, new Map(rows.map((row) => [row.$id, row]))]),
  );
  const transactions = new Map<string, Store>();
  let sequence = 0;
  const store = (transactionId?: string) =>
    transactionId ? transactions.get(transactionId)! : committed;
  const table = (tableId: string, transactionId?: string) => {
    const current = store(transactionId);
    if (!current.has(tableId)) current.set(tableId, new Map());
    return current.get(tableId)!;
  };
  const api = {
    createTransaction: async () => {
      const id = `tx-${++sequence}`;
      transactions.set(id, structuredClone(committed));
      return { $id: id };
    },
    updateTransaction: async ({
      transactionId,
      commit,
    }: {
      transactionId: string;
      commit?: boolean;
    }) => {
      if (commit) committed = transactions.get(transactionId)!;
      return {};
    },
    deleteTransaction: async ({ transactionId }: { transactionId: string }) => {
      transactions.delete(transactionId);
      return {};
    },
    getRow: async ({ tableId, rowId: id, transactionId }: Params) => {
      const row = table(tableId, transactionId).get(id);
      if (!row) throw Object.assign(new Error('not found'), { code: 404 });
      return row;
    },
    createRow: async ({
      tableId,
      rowId: id,
      transactionId,
      data,
    }: Params & { data: Record<string, unknown> }) => {
      const rows = table(tableId, transactionId);
      if (rows.has(id)) throw Object.assign(new Error('duplicate'), { code: 409 });
      const row = { ...data, $id: id };
      rows.set(id, row);
      return row;
    },
    updateRow: async ({
      tableId,
      rowId: id,
      transactionId,
      data,
    }: Params & { data: Record<string, unknown> }) => {
      const rows = table(tableId, transactionId);
      const row = { ...rows.get(id)!, ...data };
      rows.set(id, row);
      return row;
    },
    listRows: async ({
      tableId,
      transactionId,
      queries = [],
    }: {
      tableId: string;
      transactionId?: string;
      queries?: string[];
    }) => {
      const parsed = queries.map(
        (query) => JSON.parse(query) as { method: string; attribute?: string; values?: unknown[] },
      );
      const rows = [...table(tableId, transactionId).values()].filter((row) =>
        parsed.every(
          (query) =>
            query.method !== 'equal' || (query.values ?? []).includes(row[query.attribute!]),
        ),
      );
      return { rows, total: rows.length };
    },
  };
  return {
    api: api as unknown as CoreContext['tables'],
    rows: (tableId: string) => [...table(tableId).values()],
  };
}

describe('moderação de revisões sucessivas', () => {
  it('permite pedir um segundo ajuste no mesmo link sem colidir com o primeiro evento', async () => {
    const userId = 'creator-1';
    const challengeId = 'challenge-1';
    const db = memoryTables({
      challenges: [{ $id: challengeId, status: 'published', points: 10 }],
      challenge_participants: [{ $id: rowId('join', challengeId, userId), userId, challengeId }],
    });
    const creator: CoreContext = {
      tables: db.api,
      databaseId: 'nuy-creators',
      actor: { userId, roles: [] },
      now: new Date('2026-11-06T12:00:00.000Z'),
      correlationId: 'revision-regression',
    };
    const moderator: CoreContext = {
      ...creator,
      actor: { userId: 'moderator-1', roles: ['moderator'] },
    };
    const content = { challengeId, url: 'https://www.instagram.com/p/NUY-REVISAO/' };
    const first = await submitContent(creator, content);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const submissionId = first.value.submissionId;

    expect(
      await moderateSubmission(moderator, {
        submissionId,
        decision: 'request_revision',
        reason: 'Inclua a marca na legenda.',
        expectedRevision: 1,
      }),
    ).toMatchObject({ ok: true, value: { status: 'revision_requested' } });

    expect(await submitContent(creator, content)).toMatchObject({
      ok: true,
      value: { submissionId, revision: 2, created: false },
    });
    expect(
      await moderateSubmission(moderator, {
        submissionId,
        decision: 'request_revision',
        reason: 'Corrija também a hashtag.',
        expectedRevision: 2,
      }),
    ).toMatchObject({ ok: true, value: { status: 'revision_requested' } });

    expect(db.rows('challenge_submissions')).toMatchObject([
      {
        $id: submissionId,
        revision: 2,
        status: 'revision_requested',
        moderationReason: 'Corrija também a hashtag.',
      },
    ]);
    expect(
      db
        .rows('outbox_events')
        .filter((row) => row.type === 'submission.revision_requested')
        .map((row) => row.eventKey),
    ).toEqual([
      `submission.revision_requested:${submissionId}:r1`,
      `submission.revision_requested:${submissionId}:r2`,
    ]);
    expect(db.rows('submission_history')).toHaveLength(4);
  });
});
