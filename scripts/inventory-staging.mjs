/**
 * Inventário real do staging contra o manifesto: conta tables, colunas, índices,
 * buckets, functions e seeds, e diz o que falta e o que sobra. Só lê. Não
 * imprime endpoint, projeto, chave nem corpo de resposta.
 */
import { Client, Functions, Query, Storage, TablesDB } from 'node-appwrite';
import { tables, buckets, functionDefinitions, levelSeed } from '../infra/appwrite/schema.ts';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const db = new TablesDB(client);
const all = [Query.limit(500)];

const listed = await db.listTables({ databaseId, queries: all });
console.log(`tables: manifesto=${tables.length} servidor=${listed.total}`);
let columnCount = 0;
let indexCount = 0;
const problems = [];
for (const definition of tables) {
  const columns = await db.listColumns({ databaseId, tableId: definition.id });
  const indexes = await db.listIndexes({ databaseId, tableId: definition.id });
  columnCount += columns.total;
  indexCount += indexes.total;
  const missing = definition.columns.filter(
    (c) => !columns.columns.some((found) => found.key === c.key),
  );
  const pending = columns.columns.filter((c) => c.status !== 'available').map((c) => c.key);
  const expectedIndexes = definition.unique.length + definition.indexes.length;
  if (missing.length)
    problems.push(`${definition.id}: colunas ausentes ${missing.map((c) => c.key).join(',')}`);
  if (pending.length) problems.push(`${definition.id}: colunas pendentes ${pending.join(',')}`);
  if (indexes.total !== expectedIndexes)
    problems.push(`${definition.id}: índices ${indexes.total} ≠ ${expectedIndexes}`);
  if (indexes.indexes.some((i) => i.status !== 'available'))
    problems.push(`${definition.id}: índice não disponível`);
  const total = columns.columns
    .filter((c) => c.type === 'varchar')
    .reduce((sum, c) => sum + (c.size ?? 0), 0);
  if (total > 16108) problems.push(`${definition.id}: orçamento de colunas estourado (${total})`);
}
console.log(
  `colunas: manifesto=${tables.reduce((t, x) => t + x.columns.length, 0)} servidor=${columnCount}`,
);
console.log(
  `índices: manifesto=${tables.reduce((t, x) => t + x.unique.length + x.indexes.length, 0)} servidor=${indexCount}`,
);

const storage = new Storage(client);
const bucketList = await storage.listBuckets({ queries: all });
console.log(`buckets: manifesto=${buckets.length} servidor=${bucketList.total}`);
for (const bucket of buckets) {
  const found = await storage.getBucket({ bucketId: bucket.id });
  if (found.$permissions.length || !found.fileSecurity || !found.encryption || !found.antivirus)
    problems.push(`${bucket.id}: regras de proteção divergentes`);
}

const functions = new Functions(client);
const functionList = await functions.list({ queries: all });
console.log(`functions: manifesto=${functionDefinitions.length} servidor=${functionList.total}`);
for (const definition of functionDefinitions) {
  const found = await functions.get({ functionId: definition.id });
  if (found.enabled || found.execute.length)
    problems.push(`${definition.id}: habilitada ou executável publicamente`);
}

const seeds = await db.listRows({ databaseId, tableId: 'creator_levels', queries: all });
console.log(`níveis (seed): manifesto=${levelSeed.length} servidor=${seeds.total}`);

const marker = await db.listRows({
  databaseId,
  tableId: 'platform_settings',
  queries: [Query.equal('key', 'applicationId')],
});
console.log(`marker de identidade: ${marker.total === 1 ? 'presente' : 'AUSENTE'}`);
if (marker.total !== 1) problems.push('marker de identidade ausente ou duplicado');

console.log(
  problems.length
    ? `\nPROBLEMAS:\n- ${problems.join('\n- ')}`
    : '\nInventário confere com o manifesto.',
);
process.exitCode = problems.length ? 1 : 0;
