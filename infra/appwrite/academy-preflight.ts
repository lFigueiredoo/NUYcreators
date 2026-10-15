/** Read-only Academy migration preflight. This file has no apply path. */
import { Client, Query, Storage, TablesDB } from 'node-appwrite';
import { academyBucketProposal, academyFulltextIndexesProposal,
  academyTablesProposal } from './academy-schema';
import { indexKey } from './plan';
import { tables as protectedTables } from './schema';

type Reader = Pick<TablesDB, 'get' | 'listTables' | 'getTable'>;
type BucketReader = Pick<Storage, 'listBuckets'>;
export type AcademyPreflight = {
  ready: boolean;
  protectedTableCount: number;
  missing: string[];
  existing: string[];
  conflicts: string[];
};

export async function academyMigrationPreflight(
  db: Reader, storage: BucketReader, databaseId: string,
): Promise<AcademyPreflight> {
  await db.get({ databaseId });
  const [listed, buckets] = await Promise.all([
    db.listTables({ databaseId, queries: [Query.limit(500)] }),
    storage.listBuckets({ queries: [Query.limit(500)] }),
  ]);
  const conflicts: string[] = [];
  if (listed.total > listed.tables.length || buckets.total > buckets.buckets.length)
    conflicts.push('Inventário paginado incompleto; preflight recusado.');
  const byId = new Map(listed.tables.map((row) => [row.$id, row]));
  const protectedPresent = protectedTables.filter((table) => byId.has(table.id)).length;
  if (protectedPresent !== protectedTables.length)
    conflicts.push(`Inventário protegido incompleto: ${protectedPresent}/${protectedTables.length} tabelas.`);
  for (const table of protectedTables) {
    const found = byId.get(table.id);
    if (found && (found.rowSecurity !== true || found.$permissions.length !== 0))
      conflicts.push(`${table.id}: ACL protegida divergente; nenhuma tabela existente será alterada.`);
  }
  const notifications = byId.has('notifications')
    ? await db.getTable({ databaseId, tableId: 'notifications' }) : null;
  if (notifications) {
    for (const key of ['u_eventKey_userId', 'i_userId_createdAt']) {
      if (!notifications.indexes.some((index) => index.key === key && index.status === 'available'))
        conflicts.push(`notifications: índice ${key} ausente ou indisponível.`);
    }
  }
  const missing: string[] = [];
  const existing: string[] = [];
  for (const expected of academyTablesProposal) {
    if (!byId.has(expected.id)) { missing.push(expected.id); continue; }
    existing.push(expected.id);
    const remote = await db.getTable({ databaseId, tableId: expected.id });
    if (!remote.rowSecurity || remote.$permissions.length)
      conflicts.push(`${expected.id}: ACL de tabela insegura.`);
    const columns = new Map(remote.columns.map((column) => [column.key, column]));
    for (const column of expected.columns) {
      const found = columns.get(column.key);
      if (!found || (found.type !== column.type && !(found.type === 'string' && column.type === 'varchar')) ||
          found.required !== column.required ||
          (column.type === 'varchar' && (!('size' in found) || found.size !== column.size)))
        conflicts.push(`${expected.id}.${column.key}: coluna ausente ou divergente.`);
    }
    if (remote.columns.some((column) => !expected.columns.some((item) => item.key === column.key)))
      conflicts.push(`${expected.id}: coluna extra requer revisão manual.`);
    const indexes = new Map(remote.indexes.map((index) => [index.key, index]));
    for (const [unique, groups] of [[true, expected.unique], [false, expected.indexes]] as const) {
      for (const attributes of groups) {
        const found = indexes.get(indexKey(unique, attributes));
        if (!found || found.status !== 'available' || found.type !== (unique ? 'unique' : 'key') ||
            JSON.stringify(found.columns) !== JSON.stringify(attributes))
          conflicts.push(`${expected.id}: índice ${indexKey(unique, attributes)} ausente ou divergente.`);
      }
    }
    for (const fulltext of academyFulltextIndexesProposal.filter((item) => item.tableId === expected.id)) {
      const found = indexes.get(fulltext.key);
      if (!found || found.status !== 'available' || found.type !== 'fulltext' ||
          JSON.stringify(found.columns) !== JSON.stringify(fulltext.attributes))
        conflicts.push(`${expected.id}: índice FULLTEXT ausente ou divergente.`);
    }
    const expectedIndexKeys = new Set([
      ...expected.unique.map((attributes) => indexKey(true, attributes)),
      ...expected.indexes.map((attributes) => indexKey(false, attributes)),
      ...academyFulltextIndexesProposal.filter((item) => item.tableId === expected.id)
        .map((item) => item.key),
    ]);
    if (remote.indexes.some((index) => !expectedIndexKeys.has(index.key)))
      conflicts.push(`${expected.id}: índice extra requer revisão manual.`);
  }
  const bucket = buckets.buckets.find((item) => item.$id === academyBucketProposal.id);
  if (bucket && (bucket.enabled === false || bucket.fileSecurity !== true ||
      bucket.$permissions.length ||
      JSON.stringify([...bucket.allowedFileExtensions].sort()) !==
        JSON.stringify([...academyBucketProposal.allowedFileExtensions].sort())))
    conflicts.push('academy-media: bucket existente com acesso inseguro ou desabilitado.');
  if (bucket) existing.push(academyBucketProposal.id);
  else missing.push(academyBucketProposal.id);
  return { ready: conflicts.length === 0, protectedTableCount: protectedPresent,
    missing, existing, conflicts };
}

const direct = process.argv[1]?.replace(/\\/g, '/').endsWith('infra/appwrite/academy-preflight.ts');
if (direct) {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  if (!endpoint || !projectId || !key || !databaseId) {
    console.error('Configure endpoint, projeto, database e chave de leitura. Nenhuma requisição foi feita.');
    process.exitCode = 1;
  } else {
    try {
      const base = new URL(endpoint);
      if (base.protocol !== 'https:') throw new Error('Endpoint não HTTPS.');
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/project`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-Key': key },
      });
      const project = await response.json() as { $id?: string };
      if (!response.ok || project.$id !== projectId) throw new Error('Identidade divergente.');
      const versionResponse = await fetch(`${endpoint.replace(/\/$/, '')}/health/version`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'X-Appwrite-Project': projectId },
      });
      const version = await versionResponse.json() as { version?: string };
      if (!versionResponse.ok || version.version !== '2.2.0')
        throw new Error('Versão Appwrite diferente da homologada na C0.');
      const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(key);
      const report = await academyMigrationPreflight(new TablesDB(client), new Storage(client), databaseId);
      console.log(JSON.stringify(report, null, 2));
      if (!report.ready) process.exitCode = 1;
    } catch {
      console.error('Preflight de leitura falhou; confira identidade e escopos no Console.');
      process.exitCode = 1;
    }
  }
}
