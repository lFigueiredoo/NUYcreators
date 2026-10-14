/**
 * Preflight de capacidades da chave de provisionamento (Sprint 6, TablesDB).
 *
 * Responde uma pergunta só: **esta chave pode provisionar o NUY Creators?** — antes
 * de qualquer escrita, e sem criar recurso nenhum para descobrir.
 *
 * Como se mede um escopo de escrita sem escrever: autorização é avaliada ANTES
 * da validação do corpo. Então um POST com corpo vazio volta `400` (chegou na
 * validação: escopo presente) ou `401 general_unauthorized_scope` (barrado no
 * escopo). Nenhuma table, coluna, índice ou row nasce daqui.
 *
 * O outro truque é a ordem de resolução nas rotas de leitura: um id inexistente
 * responde `404` sem exigir escopo, então `404` não prova nada. A ordem depende
 * da rota: um id vazio faz o roteador responder 404 antes do escopo (OK falso),
 * enquanto um id nomeado faz a autorização vir primeiro. Por isso as sondas usam
 * recurso nomeado e corpo inválido, nunca id vazio.
 *
 * Nunca imprime a chave, o corpo da resposta ou cabeçalhos — só o nome do
 * escopo que falta.
 */
import { Client, Functions, Storage, TablesDB, TablesDBIndexType, Teams } from 'node-appwrite';
import { parseEnvironment } from '../../src/lib/env/schema';
import { assertDedicatedProject } from './safety';

/** Id que não existe de propósito: a sonda mede escopo, não recurso. */
const PROBE_TABLE = 'zz-probe-nao-usar';

type Capability = {
  /** O que a rodada precisa que a chave consiga fazer. */
  need: string;
  /** Rota exercida: a mesma que o SDK usa de verdade. */
  calls: (client: Client, databaseId: string) => Promise<unknown>;
};

/**
 * Cada item chama a rota real. O veredito sai do status/código do erro, nunca
 * do conteúdo — o SDK não devolve corpo nos casos de escopo negado.
 */
const CAPABILITIES: Capability[] = [
  {
    need: 'databases.read',
    calls: (client) => new TablesDB(client).list(),
  },
  {
    need: 'databases.write',
    // O apply cria o banco do zero; corpo vazio só mede a autorização.
    calls: (client) => new TablesDB(client).create({ databaseId: '', name: '' }),
  },
  {
    need: 'tables.read',
    calls: (client, databaseId) => new TablesDB(client).listTables({ databaseId }),
  },
  {
    need: 'tables.write',
    calls: (client, databaseId) =>
      new TablesDB(client).createTable({ databaseId, tableId: '', name: '' }),
  },
  {
    need: 'columns.read',
    calls: (client, databaseId) =>
      new TablesDB(client).listColumns({ databaseId, tableId: PROBE_TABLE }),
  },
  {
    need: 'columns.write',
    calls: (client, databaseId) =>
      new TablesDB(client).createVarcharColumn({
        databaseId,
        tableId: PROBE_TABLE,
        key: '',
        size: 1,
        required: false,
      }),
  },
  {
    need: 'indexes.read',
    calls: (client, databaseId) =>
      new TablesDB(client).listIndexes({ databaseId, tableId: PROBE_TABLE }),
  },
  {
    need: 'indexes.write',
    calls: (client, databaseId) =>
      new TablesDB(client).createIndex({
        databaseId,
        tableId: PROBE_TABLE,
        key: '',
        type: TablesDBIndexType.Key,
        columns: [],
      }),
  },
  {
    need: 'rows.read',
    calls: (client, databaseId) =>
      new TablesDB(client).listRows({ databaseId, tableId: PROBE_TABLE }),
  },
  {
    need: 'rows.write',
    // `rowId` nomeado e dados vazios: nada é gravado, só se mede o escopo.
    calls: (client, databaseId) =>
      new TablesDB(client).createRow({
        databaseId,
        tableId: PROBE_TABLE,
        rowId: PROBE_TABLE,
        data: {},
      }),
  },
  {
    need: 'storage.read',
    calls: (client) => new Storage(client).listBuckets(),
  },
  {
    need: 'storage.write',
    calls: (client) =>
      new Storage(client).createBucket({
        bucketId: '',
        name: '',
        permissions: [],
        fileSecurity: true,
        encryption: true,
        antivirus: true,
        maximumFileSize: 1,
        allowedFileExtensions: [],
      }),
  },
  {
    need: 'functions.read',
    calls: (client) => new Functions(client).list(),
  },
  {
    need: 'functions.write',
    calls: (client) =>
      new Functions(client).create({
        functionId: '',
        name: '',
        runtime: 'node-22' as never,
        execute: [],
        entrypoint: 'src/main.js',
        commands: '',
      }),
  },
  {
    need: 'teams.read',
    calls: (client) => new Teams(client).list(),
  },
  {
    need: 'teams.write',
    calls: (client) =>
      new Teams(client).create({
        teamId: '',
        name: '',
      }),
  },
];

type Verdict = 'ok' | 'missing' | 'unknown' | 'forbidden';

/**
 * Extrai só o nome do escopo. A mensagem crua traz host e id do projeto, então
 * ela é lida e descartada — o que sai daqui é o nome do escopo e mais nada.
 * O SDK guarda o corpo em `response` (objeto ou texto, conforme o erro).
 */
function missingScope(error: unknown) {
  const body = (error as { response?: unknown })?.response;
  const parts = [
    typeof body === 'string' ? body : ((body as { message?: string })?.message ?? ''),
    (error as { message?: string })?.message ?? '',
  ];
  for (const part of parts) {
    const found = /missing scopes \(\[?\s*"?([\w.]+)"?\s*\]?\)/.exec(part)?.[1];
    if (found) return found;
  }
  return 'escopo desconhecido (mensagem não reconhecida)';
}

function classify(error: unknown): { verdict: Verdict; detail: string } {
  const code = (error as { code?: unknown })?.code;
  const type = (error as { type?: unknown })?.type;
  if (typeof code !== 'number') return { verdict: 'unknown', detail: 'erro inesperado' };
  if (code === 401) return { verdict: 'missing', detail: missingScope(error) };
  if (code === 403) return { verdict: 'forbidden', detail: String(type ?? 'forbidden') };
  // 400/404/409 da validação: passou pela autorização, logo o escopo existe.
  return { verdict: 'ok', detail: `autorizado (HTTP ${code})` };
}

const MARK: Record<Verdict, string> = {
  ok: 'OK  ',
  missing: 'FALTA',
  unknown: '?   ',
  forbidden: 'NEGADO',
};

export async function runCapabilities(env: NodeJS.ProcessEnv) {
  assertDedicatedProject(env); // Bloqueia produção antes até das sondas de escopo.
  const parsed = parseEnvironment(env);
  if (!parsed.APPWRITE_ENDPOINT || !parsed.APPWRITE_PROJECT_ID || !env.APPWRITE_API_KEY)
    throw new Error('Configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY.');
  const client = new Client()
    .setEndpoint(parsed.APPWRITE_ENDPOINT)
    .setProject(parsed.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  const databaseId = parsed.APPWRITE_DATABASE_ID;

  const results: Array<{ need: string; verdict: Verdict; detail: string }> = [];
  for (const capability of CAPABILITIES) {
    try {
      await capability.calls(client, databaseId);
      results.push({ need: capability.need, verdict: 'ok', detail: 'rota respondeu' });
    } catch (error) {
      results.push({ need: capability.need, ...classify(error) });
    }
  }

  // Transações do modelo em uso: a rota não é escopada por banco.
  for (const path of ['/tablesdb/transactions/zz-probe-nao-usar']) {
    try {
      const response = await fetch(`${parsed.APPWRITE_ENDPOINT.replace(/\/$/, '')}${path}`, {
        headers: {
          'X-Appwrite-Project': parsed.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': env.APPWRITE_API_KEY,
        },
      });
      results.push({
        need: 'transaction',
        verdict: response.status === 401 ? 'missing' : 'ok',
        detail:
          response.status === 401
            ? 'escopo de transação ausente'
            : `autorizado (HTTP ${response.status})`,
      });
    } catch {
      results.push({ need: `transaction ${path}`, verdict: 'unknown', detail: 'erro de rede' });
    }
  }

  for (const result of results)
    console.log(`${MARK[result.verdict]}  ${result.need.padEnd(34)} ${result.detail}`);
  const missing = results.filter((r) => r.verdict === 'missing' || r.verdict === 'forbidden');
  return { results, missing };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('infra/appwrite/capabilities.ts');
if (isDirectRun) {
  const { missing } = await runCapabilities(process.env);
  if (missing.length) {
    console.error(
      `\nProvisionamento bloqueado. Escopos faltantes: ${missing.map((m) => m.detail).join(', ')}.`,
    );
    process.exitCode = 1;
  } else {
    console.log('\nChave de provisionamento com todas as capacidades necessárias.');
  }
}
