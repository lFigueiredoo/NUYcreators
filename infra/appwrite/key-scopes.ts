/**
 * Preflight das chaves MÍNIMAS do aplicativo: operação (linhas) e mídia (arquivos).
 *
 * Responde duas perguntas por chave, e as duas importam:
 *
 *   1. ela consegue fazer o que o app precisa? (`rows.read` + `rows.write` na de
 *      operação, `files.read` + `files.write` na de mídia);
 *   2. ela NÃO consegue fazer o resto? Chave que faz mais do que o desenho pede
 *      não é chave melhor, é chave que amplia o alcance de um vazamento.
 *
 * ## Como se mede um escopo sem criar recurso
 *
 * Mesma técnica de `capabilities.ts`: a autorização é avaliada ANTES da validação
 * e antes da existência do recurso. Então um corpo inválido ou um id que não
 * existe responde `400`/`404` quando o escopo está presente, e `401
 * general_unauthorized_scope` — nomeando o que falta — quando não está. Todo id
 * aqui é o fantasma `zz-probe-nao-usar` ou vazio: **nada nasce desta sonda**.
 *
 * A redação da mensagem foi MEDIDA, não suposta (`artifacts/calibrar-sondas.mjs`,
 * rodado contra a chave de teste, de perfil conhecido): a rota de arquivo cobra
 * exatamente `files.read`/`files.write`, a de chave cobra `keys.read`/`keys.write`
 * (e vive em `/project/keys`, não em `/keys`, que não existe), e o 401 pode nomear
 * MAIS DE UM escopo — `["tables.write","collections.write"]`, `["executions.write",
 * "execution.write"]`. Ler só o primeiro nome lia "escopo não nomeado" onde havia
 * dois nomes; por isso o parse devolve a lista inteira.
 *
 * Nunca imprime chave, cabeçalho ou corpo de resposta — só nome de escopo e veredito.
 */
import {
  Client,
  Functions,
  Storage,
  TablesDB,
  TablesDBIndexType,
  Teams,
  Users,
} from 'node-appwrite';
import { parseEnvironment } from '../../src/lib/env/schema';
import { assertDedicatedProject } from './safety';

/** Id que não existe de propósito: a sonda mede escopo, não recurso. */
const FANTASMA = 'zz-probe-nao-usar';

type Probe = {
  /** Escopo que a rota exige — e que a mensagem de recusa deve nomear. */
  scope: string;
  /** Nomes equivalentes que esta versão do Appwrite pode usar no lugar. */
  aliases?: string[];
  /** Rota exercitada, em uma linha, para o relatório. */
  route: string;
  calls: (client: Client, databaseId: string) => Promise<unknown>;
};

/**
 * O catálogo de sondas. Cada rota foi calibrada contra a chave de teste: onde ela
 * não tem o escopo, o servidor nomeia exatamente o escopo que esta tabela declara.
 */
const SONDAS: Probe[] = [
  {
    scope: 'rows.read',
    route: 'GET listRows',
    calls: (client, databaseId) => new TablesDB(client).listRows({ databaseId, tableId: FANTASMA }),
  },
  {
    scope: 'rows.write',
    route: 'POST createRow',
    calls: (client, databaseId) =>
      new TablesDB(client).createRow({ databaseId, tableId: FANTASMA, rowId: FANTASMA, data: {} }),
  },
  {
    scope: 'databases.read',
    route: 'GET /tablesdb',
    calls: (client) => new TablesDB(client).list(),
  },
  {
    scope: 'databases.write',
    route: 'POST create database',
    calls: (client) => new TablesDB(client).create({ databaseId: '', name: '' }),
  },
  {
    scope: 'tables.read',
    route: 'GET listTables',
    calls: (client, databaseId) => new TablesDB(client).listTables({ databaseId }),
  },
  {
    scope: 'tables.write',
    aliases: ['collections.write'],
    route: 'POST createTable',
    calls: (client, databaseId) =>
      new TablesDB(client).createTable({ databaseId, tableId: '', name: '' }),
  },
  {
    scope: 'columns.read',
    aliases: ['attributes.read'],
    route: 'GET listColumns',
    calls: (client, databaseId) =>
      new TablesDB(client).listColumns({ databaseId, tableId: FANTASMA }),
  },
  {
    scope: 'columns.write',
    aliases: ['attributes.write'],
    route: 'POST createVarcharColumn',
    calls: (client, databaseId) =>
      new TablesDB(client).createVarcharColumn({
        databaseId,
        tableId: FANTASMA,
        key: '',
        size: 1,
        required: false,
      }),
  },
  {
    scope: 'indexes.read',
    route: 'GET listIndexes',
    calls: (client, databaseId) =>
      new TablesDB(client).listIndexes({ databaseId, tableId: FANTASMA }),
  },
  {
    scope: 'indexes.write',
    route: 'POST createIndex',
    calls: (client, databaseId) =>
      new TablesDB(client).createIndex({
        databaseId,
        tableId: FANTASMA,
        key: '',
        type: TablesDBIndexType.Key,
        columns: [],
      }),
  },
  {
    scope: 'users.read',
    route: 'GET listUsers',
    calls: (client) => new Users(client).list(),
  },
  {
    scope: 'users.write',
    route: 'PATCH updateEmailVerification',
    calls: (client) =>
      new Users(client).updateEmailVerification({ userId: FANTASMA, emailVerification: true }),
  },
  {
    scope: 'teams.read',
    route: 'GET listTeams',
    calls: (client) => new Teams(client).list(),
  },
  {
    scope: 'teams.write',
    route: 'POST createTeam',
    calls: (client) => new Teams(client).create({ teamId: '', name: '' }),
  },
  {
    scope: 'sessions.write',
    route: 'POST /account/sessions/email',
    calls: () => rawRequest('POST', '/account/sessions/email'),
  },
  {
    scope: 'functions.read',
    route: 'GET listFunctions',
    calls: (client) => new Functions(client).list(),
  },
  {
    scope: 'functions.write',
    route: 'POST createFunction',
    calls: (client) =>
      new Functions(client).create({
        functionId: '',
        name: '',
        // Runtime de mentira de propósito: a sonda mede autorização, e o valor
        // inválido garante que nada seria criado nem com o escopo presente.
        runtime: 'node-22' as never,
        execute: [],
        entrypoint: 'src/main.js',
        commands: '',
      }),
  },
  {
    scope: 'execution.read',
    route: 'GET listExecutions',
    calls: (client) => new Functions(client).listExecutions({ functionId: FANTASMA }),
  },
  {
    scope: 'execution.write',
    aliases: ['executions.write'],
    // O id fantasma não existe: a chamada não executa nada, só mede autorização.
    route: 'POST createExecution',
    calls: (client) =>
      new Functions(client).createExecution({ functionId: FANTASMA, body: '', async: true }),
  },
  {
    scope: 'buckets.read',
    route: 'GET getBucket',
    calls: (client) => new Storage(client).getBucket({ bucketId: FANTASMA }),
  },
  {
    scope: 'buckets.write',
    route: 'POST createBucket',
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
    scope: 'files.read',
    route: 'GET getFile',
    calls: (client) => new Storage(client).getFile({ bucketId: FANTASMA, fileId: FANTASMA }),
  },
  {
    scope: 'files.write',
    route: 'DELETE deleteFile',
    calls: (client) => new Storage(client).deleteFile({ bucketId: FANTASMA, fileId: FANTASMA }),
  },
  {
    scope: 'keys.read',
    route: 'GET /project/keys',
    calls: () => rawRequest('GET', '/project/keys'),
  },
  {
    scope: 'keys.write',
    route: 'POST /project/keys',
    calls: () => rawRequest('POST', '/project/keys'),
  },
];

/**
 * Rotas que o SDK não expõe: chaves de projeto e criação de sessão. Exercidas cruas,
 * com corpo vazio — corpo vazio não cria sessão nem chave, só mede a autorização.
 */
let rawClient: { endpoint: string; projectId: string; key: string } | null = null;

async function rawRequest(method: 'GET' | 'POST', path: string): Promise<number> {
  if (!rawClient) throw new Error('Sonda crua sem cliente configurado.');
  const response = await fetch(`${rawClient.endpoint.replace(/\/$/, '')}${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: {
      'X-Appwrite-Project': rawClient.projectId,
      'X-Appwrite-Key': rawClient.key,
      'Content-Type': 'application/json',
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  if (response.status === 401 || response.status === 403)
    throw Object.assign(new Error(`HTTP ${response.status}`), {
      code: response.status,
      response: await response.text(),
    });
  return response.status;
}

type Profile = {
  /** Variável de ambiente que carrega a chave. */
  envKey: string;
  /** Nome humano, para o relatório. */
  label: string;
  /** O que a chave PRECISA ter. */
  need: string[];
  /** O que ela NÃO pode ter: poder lateral que o desenho recusa. */
  forbidden: string[];
  /** Não é necessário, e também não é perigoso — mas deixa de ser mínima. */
  excess: string[];
};

/**
 * Perfis. O `need` sai do código, não da imaginação: a operação usa só
 * `listRows`/`createRow`/`updateRow`/`getRow`/`deleteRow`/`incrementRowColumn`
 * (`lib/appwrite/data/client.ts` + `features/workspace/services/commands.ts`), e a
 * mídia usa só `createFile`/`getFile`/`getFileView`/`deleteFile`
 * (`lib/appwrite/media.ts`). Nenhum dos dois lê schema — verificado por varredura.
 */
export const PROFILES: Record<string, Profile> = {
  ops: {
    envKey: 'APPWRITE_OPS_API_KEY',
    label: 'operação (linhas)',
    need: ['rows.read', 'rows.write'],
    forbidden: [
      'users.read',
      'users.write',
      'teams.read',
      'teams.write',
      'sessions.write',
      'functions.read',
      'functions.write',
      'execution.read',
      'execution.write',
      'buckets.read',
      'buckets.write',
      'files.read',
      'files.write',
      'keys.read',
      'keys.write',
      'databases.write',
      'tables.write',
      'columns.write',
      'indexes.write',
    ],
    excess: ['databases.read', 'tables.read', 'columns.read', 'indexes.read'],
  },
  media: {
    envKey: 'APPWRITE_MEDIA_API_KEY',
    label: 'mídia (arquivos)',
    need: ['files.read', 'files.write'],
    forbidden: [
      'users.read',
      'users.write',
      'teams.read',
      'teams.write',
      'sessions.write',
      'functions.read',
      'functions.write',
      'execution.read',
      'execution.write',
      'buckets.read',
      'buckets.write',
      'keys.read',
      'keys.write',
      'databases.write',
      'tables.write',
      'columns.write',
      'indexes.write',
      'rows.write',
    ],
    excess: ['rows.read', 'databases.read', 'tables.read', 'columns.read', 'indexes.read'],
  },
};

type Verdict = 'authorized' | 'denied' | 'unmeasured';

/**
 * Nomes de escopo citados numa recusa.
 *
 * A lista inteira, não o primeiro: o servidor escreve
 * `missing scopes (["tables.write","collections.write"])`, e ler só o primeiro nome
 * fazia a sonda dizer "não nomeado" onde havia dois nomes.
 */
export function namedScopes(error: unknown): string[] {
  const body = (error as { response?: unknown })?.response;
  const text = [
    typeof body === 'string' ? body : ((body as { message?: string })?.message ?? ''),
    (error as { message?: string })?.message ?? '',
  ].join(' ');
  const inside = /missing scopes \(([^)]*)\)/.exec(text)?.[1];
  if (!inside) return [];
  // O corpo chega DUAS vezes escapado quando o SDK entrega a resposta como texto
  // JSON: `[\"users.read\"]`. Exigir aspas limpas lia isso como "não nomeado" — o
  // escopo estava lá, o leitor é que não o via.
  return [...inside.replaceAll('\\', '').matchAll(/["']([\w.]+)["']/g)].map((match) => match[1]);
}

type Measured = { verdict: Verdict; detail: string; named: string[] };

function verdictOf(error: unknown): Measured {
  const code = (error as { code?: unknown })?.code;
  if (typeof code !== 'number')
    return { verdict: 'unmeasured', detail: 'erro inesperado', named: [] };
  if (code === 401 || code === 403) {
    const named = namedScopes(error);
    return {
      verdict: 'denied',
      detail: named.length ? named.join(', ') : 'não nomeado',
      named,
    };
  }
  // 400/404/409: passou pela autorização, logo o escopo existe.
  return { verdict: 'authorized', detail: `autorizado (HTTP ${code})`, named: [] };
}

/** Nomes aceitos para um escopo: o canônico e o que esta versão do Appwrite usa. */
function namesFor(scope: string) {
  const probe = SONDAS.find((item) => item.scope === scope);
  return [scope, ...(probe?.aliases ?? [])];
}

export type ScopeFinding = {
  key: string;
  scope: string;
  expectation: 'need' | 'forbidden' | 'excess';
  verdict: Verdict;
  detail: string;
  route: string;
  ok: boolean;
};

export function judge(expectation: ScopeFinding['expectation'], verdict: Verdict): boolean {
  if (verdict === 'unmeasured') return false;
  return expectation === 'need' ? verdict === 'authorized' : verdict === 'denied';
}

async function measureKey(profile: Profile, key: string, env: NodeJS.ProcessEnv) {
  const parsed = parseEnvironment(env);
  if (!parsed.APPWRITE_ENDPOINT || !parsed.APPWRITE_PROJECT_ID)
    throw new Error('Configure APPWRITE_ENDPOINT e APPWRITE_PROJECT_ID.');
  rawClient = {
    endpoint: parsed.APPWRITE_ENDPOINT,
    projectId: parsed.APPWRITE_PROJECT_ID,
    key,
  };
  const client = new Client()
    .setEndpoint(parsed.APPWRITE_ENDPOINT)
    .setProject(parsed.APPWRITE_PROJECT_ID)
    .setKey(key);
  const databaseId = parsed.APPWRITE_DATABASE_ID;

  const findings: ScopeFinding[] = [];
  const groups: Array<[ScopeFinding['expectation'], string[]]> = [
    ['need', profile.need],
    ['forbidden', profile.forbidden],
    ['excess', profile.excess],
  ];

  for (const [expectation, scopes] of groups) {
    for (const scope of scopes) {
      const probe = SONDAS.find(
        (item) => item.scope === scope || (item.aliases?.includes(scope) ?? false),
      );
      if (!probe) {
        findings.push({
          key: profile.envKey,
          scope,
          expectation,
          verdict: 'unmeasured',
          detail: 'sem sonda para esta rota',
          route: '—',
          ok: false,
        });
        continue;
      }
      let result: Measured;
      try {
        await probe.calls(client, databaseId);
        result = { verdict: 'authorized', detail: 'rota respondeu', named: [] };
      } catch (error) {
        result = verdictOf(error);
      }
      // A recusa precisa nomear ESTE escopo (ou um alias): se nomear outro, a sonda
      // mediu outra coisa e o veredito não vale.
      const consistent =
        result.verdict !== 'denied' ||
        result.named.length === 0 ||
        namesFor(probe.scope).some((name) => result.named.includes(name));
      findings.push({
        key: profile.envKey,
        scope,
        expectation,
        verdict: consistent ? result.verdict : 'unmeasured',
        detail: consistent
          ? result.detail
          : `recusa nomeou ${result.detail}, não ${namesFor(probe.scope).join('/')}`,
        route: probe.route,
        ok: consistent && judge(expectation, result.verdict),
      });
    }
  }
  return findings;
}

const MARK: Record<ScopeFinding['expectation'], string> = {
  need: 'precisa ter ',
  forbidden: 'não pode ter',
  excess: 'a mais     ',
};

export async function runKeyScopes(env: NodeJS.ProcessEnv, only?: string) {
  assertDedicatedProject(env); // QA de chaves nunca sonda o projeto protegido.
  const wanted = only ? [only] : Object.keys(PROFILES);
  const all: ScopeFinding[] = [];
  const absent: string[] = [];

  for (const name of wanted) {
    const profile = PROFILES[name];
    if (!profile) throw new Error(`Perfil desconhecido: ${name}. Use ops ou media.`);
    const key = env[profile.envKey];
    if (!key) {
      absent.push(`${profile.envKey} (${profile.label})`);
      continue;
    }
    console.log(`\n${profile.envKey} — ${profile.label}`);
    const findings = await measureKey(profile, key, env);
    all.push(...findings);
    for (const finding of findings) {
      const state =
        finding.verdict === 'authorized' ? 'OK ' : finding.verdict === 'denied' ? 'NEG' : '?  ';
      console.log(
        `${finding.ok ? 'PASS' : 'FAIL'}  ${MARK[finding.expectation]}  ${state}  ${finding.scope.padEnd(16)} ${finding.route.padEnd(26)} ${finding.detail}`,
      );
    }
  }

  for (const name of absent) console.log(`\n${name}: não configurada neste ambiente.`);
  const failures = all.filter((finding) => !finding.ok);
  console.log(
    `\n${all.length} escopo(s) medido(s) · ${failures.length} divergência(s)` +
      (absent.length ? ` · ${absent.length} chave(s) não configurada(s)` : ''),
  );
  return { findings: all, failures, absent };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('infra/appwrite/key-scopes.ts');
if (isDirectRun) {
  const only = process.argv[2];
  const { failures, absent } = await runKeyScopes(process.env, only);
  if (failures.length || absent.length) {
    for (const failure of failures)
      console.error(`\nDivergência: ${failure.key} ${failure.scope} — ${failure.detail}.`);
    if (absent.length)
      console.error(
        `\nChave não instalada: ${absent.join(', ')}. Sem ela, a capacidade fica desligada.`,
      );
    process.exitCode = 1;
  } else {
    console.log('\nTodas as chaves configuradas têm exatamente o que o desenho pede.');
  }
}
