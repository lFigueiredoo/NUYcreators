/** C2-only Academy schema writer. No legacy tables, buckets, functions or data. */
import { Client, TablesDB, TablesDBIndexType } from 'node-appwrite';
import { academyFulltextIndexesProposal, academyTablesProposal } from './academy-schema';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';
import { indexKey } from './plan';
import { tables as baseTables, type Column, type Table } from './schema';

const databaseId = 'nuy-creators';
const apply = process.argv.includes('--apply');
const challengeFixtures = process.argv.includes('--challenge-fixtures');
const operation = challengeFixtures ? 'provision-challenge-tests'
  : apply ? 'provision-academy' : 'inspect-academy';
const env = process.env;
const challengeDependencies = new Set([
  'challenges', 'challenge_requirements', 'notifications',
  'audit_logs', 'audit_log_snapshots',
]);

function codeOf(error: unknown) {
  return (error as { code?: unknown })?.code;
}
async function optional<T>(run: () => Promise<T>): Promise<T | null> {
  try { return await run(); }
  catch (error) { if (codeOf(error) === 404) return null; throw error; }
}
async function waitFor(
  label: string, read: () => Promise<{ status?: string }>,
) {
  for (let i = 0; i < 90; i++) {
    const result = await read();
    if (result.status === 'available') return;
    if (result.status === 'failed') throw new Error(`C2: ${label} falhou no servidor.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`C2: timeout de ${label}.`);
}
function columnMatches(remote: { type: string; required: boolean; size?: number }, expected: Column) {
  return (remote.type === expected.type ||
    (remote.type === 'string' && expected.type === 'varchar')) &&
    remote.required === expected.required &&
    (expected.type !== 'varchar' || remote.size === (expected.size ?? 255));
}
async function createColumn(db: TablesDB, tableId: string, column: Column) {
  const common = { databaseId, tableId, key: column.key, required: column.required };
  if (column.type === 'integer') return db.createIntegerColumn(common);
  if (column.type === 'boolean') return db.createBooleanColumn(common);
  if (column.type === 'datetime') return db.createDatetimeColumn(common);
  return db.createVarcharColumn({ ...common, size: column.size ?? 255 });
}

async function reconcileTable(db: TablesDB, table: Table) {
  const tableId = table.id;
  let remote = await optional(() => db.getTable({ databaseId, tableId }));
  if (!remote) {
    console.log(`C2_PLAN CREATE table ${tableId}`);
    if (!apply) return;
    remote = await db.createTable({ databaseId, tableId, name: tableId,
      permissions: [], rowSecurity: true });
  }
  if (!remote.rowSecurity || remote.$permissions.length !== 0)
    throw new Error(`C2: ACL insegura em ${tableId}; nenhuma correção automática.`);
  const expectedColumns = new Set(table.columns.map((column) => column.key));
  if (remote.columns.some((column) => !expectedColumns.has(column.key)))
    throw new Error(`C2: coluna extra em ${tableId}; revisão manual.`);
  for (const column of table.columns) {
    const found = remote.columns.find((item) => item.key === column.key);
    if (found && !columnMatches(found, column))
      throw new Error(`C2: coluna divergente ${tableId}.${column.key}.`);
    if (!found) {
      console.log(`C2_PLAN CREATE column ${tableId}.${column.key}`);
      if (!apply) continue;
      await createColumn(db, tableId, column);
    }
    if (apply) await waitFor(`${tableId}.${column.key}`,
      () => db.getColumn({ databaseId, tableId, key: column.key }));
  }
  const expectedIndexes = [
    ...table.unique.map((columns) => ({ key: indexKey(true, columns),
      type: TablesDBIndexType.Unique, columns })),
    ...table.indexes.map((columns) => ({ key: indexKey(false, columns),
      type: TablesDBIndexType.Key, columns })),
    ...academyFulltextIndexesProposal.filter((index) => index.tableId === tableId)
      .map((index) => ({ key: index.key, type: TablesDBIndexType.Fulltext,
        columns: [...index.attributes] })),
  ];
  const expectedKeys = new Set(expectedIndexes.map((index) => index.key));
  if (remote.indexes.some((index) => !expectedKeys.has(index.key)))
    throw new Error(`C2: índice extra em ${tableId}; revisão manual.`);
  for (const index of expectedIndexes) {
    const found = remote.indexes.find((item) => item.key === index.key);
    if (found && (found.type !== index.type ||
      JSON.stringify(found.columns) !== JSON.stringify(index.columns)))
      throw new Error(`C2: índice divergente ${tableId}.${index.key}.`);
    if (!found) {
      console.log(`C2_PLAN CREATE index ${tableId}.${index.key}`);
      if (!apply) continue;
      await db.createIndex({ databaseId, tableId, ...index });
    }
    if (apply) await waitFor(`${tableId}.${index.key}`,
      () => db.getIndex({ databaseId, tableId, key: index.key }));
  }
  if (apply) {
    const checked = await db.getTable({ databaseId, tableId });
    if (!checked.rowSecurity || checked.$permissions.length ||
      checked.columns.length !== table.columns.length ||
      checked.indexes.length !== expectedIndexes.length ||
      checked.columns.some((column) => column.status !== 'available') ||
      checked.indexes.some((index) => index.status !== 'available'))
      throw new Error(`C2: validação final incompleta em ${tableId}.`);
    console.log(`C2_VERIFIED table ${tableId}`);
  }
}

try {
  await verifyC2WriteTarget(env, operation);
  const client = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(env.APPWRITE_C2_SCHEMA_API_KEY!);
  const db = new TablesDB(client);
  const existing = await optional(() => db.get({ databaseId }));
  if (!existing) {
    console.log(`C2_PLAN CREATE database ${databaseId}`);
    if (apply) await db.create({ databaseId, name: databaseId });
  }
  const proposed = challengeFixtures ? [
    ...academyTablesProposal,
    ...baseTables.filter((table) => challengeDependencies.has(table.id)),
  ] : academyTablesProposal;
  for (const table of proposed) await reconcileTable(db, table);
  console.log(apply ? 'C2_SCHEMA_APPLY_COMPLETE' : 'C2_SCHEMA_PLAN_COMPLETE');
} catch (error) {
  // SDK errors may contain response bodies or headers. Print only a safe code.
  const code = codeOf(error);
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? error.message
    : `C2: schema interrompido${typeof code === 'number' ? ` (HTTP ${code})` : ''}.`);
  process.exitCode = 1;
}
