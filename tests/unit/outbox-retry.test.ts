import { describe, expect, it } from 'vitest';
import type { CoreContext } from '../../src/features/workspace/core';
import { OUTBOX_MAX_ATTEMPTS, processOutbox } from '../../src/features/workspace/core/outbox';

type Row = Record<string, unknown> & { $id: string };
type ParsedQuery = { method: string; attribute?: string; values?: unknown[] };

function event(overrides: Partial<Row> = {}): Row {
  return {
    $id: 'outbox-event',
    eventKey: 'submission.approved:submission-1',
    type: 'submission.approved',
    aggregateId: 'submission-1',
    payloadJson: JSON.stringify({ userId: 'creator-1', points: 50 }),
    status: 'pending',
    attempts: 0,
    nextAttemptAt: '2026-11-04T11:59:00.000Z',
    ...overrides,
  };
}

function memoryTables(rows: Row[], failDelivery = false) {
  const store = new Map<string, Map<string, Row>>([
    ['outbox_events', new Map(rows.map((row) => [row.$id, { ...row }]))],
    ['notifications', new Map()],
  ]);
  const table = (id: string) => store.get(id) ?? new Map<string, Row>();
  const api = {
    listRows: async ({ tableId, queries = [] }: { tableId: string; queries?: string[] }) => {
      const parsed = queries.map((query) => JSON.parse(query) as ParsedQuery);
      const limit = Number(parsed.find((query) => query.method === 'limit')?.values?.[0] ?? 25);
      let selected = [...table(tableId).values()].filter((row) =>
        parsed.every((query) => {
          if (!query.attribute) return true;
          const value = row[query.attribute];
          if (query.method === 'equal') return (query.values ?? []).includes(value);
          if (query.method === 'lessThanEqual') return String(value) <= String(query.values?.[0]);
          return true;
        }),
      );
      const order = parsed.find((query) => query.method === 'orderAsc');
      if (order?.attribute)
        selected = selected.sort((left, right) =>
          String(left[order.attribute!] ?? '').localeCompare(String(right[order.attribute!] ?? '')),
        );
      return { total: selected.length, rows: selected.slice(0, limit) };
    },
    getRow: async ({ tableId, rowId: id }: { tableId: string; rowId: string }) => {
      const found = table(tableId).get(id);
      if (!found) throw Object.assign(new Error('not found'), { code: 404 });
      return found;
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
      if (tableId === 'notifications' && failDelivery) throw new Error('delivery failed');
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
  };
  return {
    api: api as never,
    row: (tableId: string, id: string) => table(tableId).get(id),
    count: (tableId: string) => table(tableId).size,
  };
}

const NOW = new Date('2026-11-04T12:00:00.000Z');
function context(tables: unknown): CoreContext {
  return {
    tables: tables as CoreContext['tables'],
    databaseId: 'nuy-creators',
    actor: { userId: 'machine', roles: ['admin'] },
    now: NOW,
    correlationId: 'unit-outbox-retry',
  };
}

describe('retry e dead-letter do outbox', () => {
  it('não processa evento antes de nextAttemptAt', async () => {
    const future = event({ nextAttemptAt: '2026-11-04T12:01:00.000Z' });
    const db = memoryTables([future]);

    const result = await processOutbox(context(db.api));

    expect(result.ok && result.value).toEqual({
      processed: 0,
      failed: 0,
      skipped: 0,
      deadLettered: 0,
    });
    expect(db.row('outbox_events', future.$id)).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('agenda nova tentativa enquanto ainda há orçamento', async () => {
    const pending = event({ attempts: 1 });
    const db = memoryTables([pending], true);

    const result = await processOutbox(context(db.api));

    expect(result.ok && result.value).toMatchObject({ failed: 1, deadLettered: 0 });
    expect(db.row('outbox_events', pending.$id)).toMatchObject({
      status: 'pending',
      attempts: 2,
      nextAttemptAt: '2026-11-04T12:02:00.000Z',
    });
  });

  it('move a falha terminal para dead-letter e não a seleciona novamente', async () => {
    const pending = event({ attempts: OUTBOX_MAX_ATTEMPTS - 1 });
    const db = memoryTables([pending], true);

    const first = await processOutbox(context(db.api));

    expect(first.ok && first.value).toMatchObject({ failed: 1, deadLettered: 1 });
    expect(db.row('outbox_events', pending.$id)).toMatchObject({
      status: 'dead_letter',
      attempts: OUTBOX_MAX_ATTEMPTS,
    });
    const second = await processOutbox(context(db.api));
    expect(second.ok && second.value).toEqual({
      processed: 0,
      failed: 0,
      skipped: 0,
      deadLettered: 0,
    });
    expect(db.count('notifications')).toBe(0);
  });

  it('conta como falha um evento antigo que já chegou ao teto', async () => {
    const exhausted = event({ attempts: OUTBOX_MAX_ATTEMPTS });
    const db = memoryTables([exhausted]);

    const result = await processOutbox(context(db.api));

    expect(result.ok && result.value).toMatchObject({ failed: 1, deadLettered: 1 });
    expect(db.row('outbox_events', exhausted.$id)).toMatchObject({
      status: 'dead_letter',
      attempts: OUTBOX_MAX_ATTEMPTS,
    });
  });
});
