import { expect, it } from 'vitest';
import type { Storage, TablesDB } from 'node-appwrite';
import { academyMigrationPreflight } from '../../infra/appwrite/academy-preflight';
import { academyTablesProposal } from '../../infra/appwrite/academy-schema';
import { indexKey } from '../../infra/appwrite/plan';
import { tables } from '../../infra/appwrite/schema';

function readers(extra: Record<string, unknown>[] = [], total = tables.length + extra.length) {
  const rows = [...tables.map((item) => ({ $id: item.id,
    rowSecurity: true, $permissions: [] })), ...extra];
  const db = {
    get: async () => ({ $id: 'nuy-creators' }),
    listTables: async () => ({ total, tables: rows }),
    getTable: async ({ tableId }: { tableId: string }) => tableId === 'notifications'
      ? { rowSecurity: true, $permissions: [], columns: [], indexes: [
        { key: 'u_eventKey_userId', status: 'available' },
        { key: 'i_userId_createdAt', status: 'available' },
      ] }
      : { rowSecurity: false, $permissions: ['read("any")'], columns: [], indexes: [] },
  } as unknown as TablesDB;
  const storage = { listBuckets: async () => ({ total: 4, buckets: [
    { $id: 'avatars' }, { $id: 'brand-assets' },
    { $id: 'community-media' }, { $id: 'submission-media' },
  ] }) } as unknown as Storage;
  return { db, storage };
}

it('preflight só lê, identifica dez tabelas e bucket pendentes sem tocar nas 31 existentes', async () => {
  const { db, storage } = readers();
  const report = await academyMigrationPreflight(db, storage, 'nuy-creators');
  expect(report.ready).toBe(true);
  expect(report.protectedTableCount).toBe(tables.length);
  expect(report.missing).toEqual([...academyTablesProposal.map((table) => table.id), 'academy-media']);
  expect(report.existing).toEqual([]);
});

it('preflight bloqueia colisão de tabela e inventário parcial', async () => {
  const { db, storage } = readers([{ $id: 'academy_materials' }], tables.length + 2);
  const report = await academyMigrationPreflight(db, storage, 'nuy-creators');
  expect(report.ready).toBe(false);
  expect(report.conflicts).toContain('Inventário paginado incompleto; preflight recusado.');
  expect(report.conflicts).toContain('academy_materials: ACL de tabela insegura.');
});

it('preflight refuses an Academy index that has not become available', async () => {
  const proposed = academyTablesProposal.find((table) => table.id === 'academy_categories')!;
  const { storage } = readers();
  const db = {
    get: async () => ({ $id: 'nuy-creators' }),
    listTables: async () => ({ total: tables.length + 1,
      tables: [...tables.map((item) => ({ $id: item.id,
        rowSecurity: true, $permissions: [] })),
      { $id: proposed.id, rowSecurity: true, $permissions: [] }] }),
    getTable: async ({ tableId }: { tableId: string }) => tableId === proposed.id
      ? { rowSecurity: true, $permissions: [], columns: proposed.columns,
        indexes: [
          ...proposed.unique.map((columns) => ({ key: indexKey(true, columns),
            type: 'unique', columns, status: 'available' })),
          ...proposed.indexes.map((columns, index) => ({ key: indexKey(false, columns),
            type: 'key', columns, status: index ? 'available' : 'processing' })),
        ] }
      : { rowSecurity: true, $permissions: [], columns: [], indexes: [
        { key: 'u_eventKey_userId', status: 'available' },
        { key: 'i_userId_createdAt', status: 'available' },
      ] },
  } as unknown as TablesDB;
  const report = await academyMigrationPreflight(db, storage, 'nuy-creators');
  expect(report.ready).toBe(false);
  expect(report.conflicts.some((item) => item.includes(indexKey(false, proposed.indexes[0]))))
    .toBe(true);
});
