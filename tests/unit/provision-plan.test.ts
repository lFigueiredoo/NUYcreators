import { describe, expect, it } from 'vitest';
import {
  buildPlan,
  indexKey,
  summarize,
  tableAccess,
  tableWriteArgs,
  TEAM_NAME,
  type Clients,
  type PlanEntry,
  type PlanKind,
} from '../../infra/appwrite/plan';
import { collectionPermissions } from '../../src/lib/security/permissions';
import {
  tables,
  buckets,
  functionDefinitions,
  executeRoles,
  functionScopes,
  levelSeed,
  schemaVersion,
} from '../../infra/appwrite/schema';
import { MARKER_ID, type IdentityReport } from '../../infra/appwrite/identity';

/**
 * O plano remoto é a única fonte do que o apply escreve, então ele precisa ser
 * provado onde não há projeto vivo: aqui, contra clientes falsos que devolvem
 * exatamente as formas que o SDK do Appwrite devolve. Cada caso mede uma
 * classificação — e nenhum deles toca a rede.
 */

type RemoteColumn = {
  key: string;
  type: string;
  required: boolean;
  size?: number;
  status: string;
};
type RemoteIndex = { key: string; type: string; columns: string[]; status: string };
type RemoteTable = {
  id: string;
  name: string;
  $permissions: string[];
  rowSecurity: boolean;
  columns: RemoteColumn[];
  indexes: RemoteIndex[];
};
type RemoteBucket = {
  $id: string;
  name: string;
  $permissions: string[];
  fileSecurity: boolean;
  encryption: boolean;
  antivirus: boolean;
  maximumFileSize: number;
  allowedFileExtensions: string[];
};
type RemoteFunction = {
  $id: string;
  name: string;
  runtime: string;
  entrypoint: string;
  commands: string;
  enabled: boolean;
  execute: string[];
  scopes: string[];
  /** Agenda declarada no manifesto; ausente nas functions sem agendamento. */
  schedule?: string;
};

type Remote = {
  database?: { name: string };
  team?: { name: string };
  tables?: RemoteTable[];
  /** `true` simula chave sem `tables.read`. */
  tablesDenied?: boolean;
  buckets?: RemoteBucket[];
  functions?: RemoteFunction[];
  seeds?: Record<string, Record<string, unknown>>;
  marker?: Record<string, unknown>;
};

const PROJECT_ID = 'projeto-de-teste';

function failure(code: number, type: string, message = type) {
  return Object.assign(new Error(message), { code, type });
}
const notFound = (type: string) => failure(404, type);

const identity = (marker: IdentityReport['marker'] = 'first-bootstrap'): IdentityReport => ({
  endpoint: 'https://exemplo/v1',
  projectId: PROJECT_ID,
  expectedProjectId: PROJECT_ID,
  environment: 'staging',
  provisioningKey: 'accepted',
  authKey: 'accepted-with-read-denied',
  sessionsWrite: 'pending-real-session-test',
  testKey: 'not-configured',
  marker,
});

/**
 * Manifesto completo, como ficaria depois de um apply bem-sucedido. Os casos de
 * drift partem daqui e estragam um campo só.
 */
function provisioned(): Remote {
  return {
    database: { name: 'NUY Creators' },
    team: { name: TEAM_NAME },
    tables: tables.map((table) => ({
      id: table.id,
      name: table.id,
      $permissions: [],
      rowSecurity: true,
      columns: table.columns.map((column) => ({ ...column, status: 'available' })),
      indexes: [
        ...table.unique.map((columns) => ({
          key: indexKey(true, columns),
          type: 'unique',
          columns: [...columns],
          status: 'available',
        })),
        ...table.indexes.map((columns) => ({
          key: indexKey(false, columns),
          type: 'key',
          columns: [...columns],
          status: 'available',
        })),
      ],
    })),
    buckets: buckets.map((bucket) => ({
      $id: bucket.id,
      name: bucket.id,
      $permissions: [],
      fileSecurity: true,
      encryption: true,
      antivirus: true,
      maximumFileSize: bucket.size,
      allowedFileExtensions: [...bucket.extensions],
    })),
    functions: functionDefinitions.map((definition) => ({
      $id: definition.id,
      name: `NUY ${definition.id}`,
      runtime: 'node-22',
      entrypoint: 'src/main.js',
      commands: 'npm ci',
      // Postura derivada do MANIFESTO, como o plano a cobra: o fixture descreve
      // o estado depois de um apply, e um apply escreve o que o `audience`
      // declara — não um literal fechado que o próprio plano chamaria de drift.
      enabled: definition.audience !== 'closed',
      execute: executeRoles(definition.audience),
      schedule: definition.schedule ?? '',
      scopes: functionScopes(definition),
    })),
    seeds: Object.fromEntries(
      levelSeed.map((level, order) => {
        const { id, ...data } = level;
        return [
          id,
          {
            $id: id,
            $permissions: ['read("any")'],
            ...data,
            order,
            active: true,
            rulesVersion: schemaVersion,
          },
        ];
      }),
    ),
    marker: {
      $id: MARKER_ID,
      key: 'applicationId',
      public: false,
      $permissions: [],
      valueJson: JSON.stringify({ applicationId: 'nuy-creators', projectId: PROJECT_ID }),
    },
  };
}

/** O que o plano pediu às listagens — o limite precisa ser explícito. */
const asked: { listTables?: string[] } = {};

function clients(remote: Remote): Clients {
  const table = (tableId: string) => {
    if (remote.tablesDenied)
      throw failure(401, 'general_unauthorized_scope', 'missing scopes (["tables.read"])');
    if (!remote.database) throw notFound('database_not_found');
    const found = (remote.tables ?? []).find((item) => item.id === tableId);
    if (!found) throw notFound('table_not_found');
    return { ...found, $id: found.id };
  };
  const db = {
    get: async () => {
      if (!remote.database) throw notFound('database_not_found');
      return { $id: 'nuy-creators', name: remote.database.name };
    },
    update: async () => ({}),
    listTables: async ({ queries }: { queries?: string[] } = {}) => {
      asked.listTables = queries;
      if (remote.tablesDenied)
        throw failure(401, 'general_unauthorized_scope', 'missing scopes (["tables.read"])');
      if (!remote.database) throw notFound('database_not_found');
      // A listagem real devolve o recurso inteiro, com `$id` — não só o id.
      return {
        total: (remote.tables ?? []).length,
        tables: (remote.tables ?? []).map((item) => ({ ...item, $id: item.id })),
      };
    },
    getTable: async ({ tableId }: { tableId: string }) => table(tableId),
    getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
      if (!remote.database) throw notFound('database_not_found');
      if (tableId === 'creator_levels') {
        const found = remote.seeds?.[rowId];
        if (!found) throw notFound('row_not_found');
        return found;
      }
      if (remote.marker) return remote.marker;
      throw notFound('table_not_found');
    },
  };
  const teams = {
    get: async () => {
      if (!remote.team) throw notFound('team_not_found');
      return { $id: 'nuy-admins', name: remote.team.name };
    },
  };
  const storage = {
    listBuckets: async () => ({
      total: (remote.buckets ?? []).length,
      buckets: remote.buckets ?? [],
    }),
  };
  const functions = {
    list: async () => ({
      total: (remote.functions ?? []).length,
      functions: remote.functions ?? [],
    }),
  };
  return { db, storage, teams, functions } as unknown as Clients;
}

const plan = (remote: Remote) => buildPlan(clients(remote), 'nuy-creators', identity());

function entry(entries: PlanEntry[], kind: PlanKind, id: string) {
  const found = entries.find((item) => item.kind === kind && item.id === id);
  if (!found) throw new Error(`O plano não classificou ${kind} ${id}.`);
  return found;
}

describe('plano remoto de provisionamento', () => {
  it('projeto virgem: tudo nasce, nada diverge', async () => {
    const entries = await plan({});
    const summary = summarize(entries);
    expect(summary.securityDrift).toBe(0);
    expect(summary.immutableDrift).toBe(0);
    expect(summary.blocked).toBe(0);
    expect(summary.update).toBe(0);
    expect(summary.noop).toBe(0);
    // Tudo o que o manifesto descreve precisa aparecer, sem sobra.
    expect(summary.create).toBe(entries.length);
    expect(entry(entries, 'database', 'nuy-creators').action).toBe('CREATE');
    expect(entry(entries, 'team', 'nuy-admins').action).toBe('CREATE');
    expect(entry(entries, 'table', 'users').action).toBe('CREATE');
    expect(entry(entries, 'column', 'users.authUserId').action).toBe('CREATE');
    expect(entry(entries, 'index', `users.${indexKey(true, ['authUserId'])}`).action).toBe(
      'CREATE',
    );
    expect(entry(entries, 'bucket', 'submission-media').action).toBe('CREATE');
    expect(entry(entries, 'seed', 'exploradora').action).toBe('CREATE');
    expect(entry(entries, 'function', 'redeem-reward').action).toBe('CREATE');
    expect(entry(entries, 'marker', MARKER_ID).action).toBe('CREATE');
    // Um registro por recurso do manifesto, e nada além dele.
    const counts = (kind: PlanKind) => entries.filter((item) => item.kind === kind).length;
    expect(counts('table')).toBe(tables.length);
    expect(counts('bucket')).toBe(buckets.length);
    expect(counts('seed')).toBe(levelSeed.length);
    expect(counts('function')).toBe(functionDefinitions.length);
    expect(counts('column')).toBe(tables.reduce((total, item) => total + item.columns.length, 0));
    expect(counts('index')).toBe(
      tables.reduce((total, item) => total + item.unique.length + item.indexes.length, 0),
    );
  });

  it('lista as tables com limite explícito, acima do tamanho do manifesto', async () => {
    // A API devolve 25 por padrão: sem limite explícito, a 26ª table do
    // manifesto seria lida como ausente e o plano pediria CREATE de novo.
    await plan(provisioned());
    const queries = (asked.listTables ?? []).map(
      (item) => JSON.parse(item) as { method: string; values: number[] },
    );
    const limit = queries.find((query) => query.method === 'limit')?.values[0];
    expect(typeof limit).toBe('number');
    expect(limit).toBeGreaterThan(tables.length);
  });

  it('infra idêntica ao manifesto: tudo NOOP, nada a escrever', async () => {
    const entries = await plan(provisioned());
    expect(summarize(entries)).toEqual({
      create: 0,
      update: 0,
      noop: entries.length,
      securityDrift: 0,
      immutableDrift: 0,
      blocked: 0,
    });
    expect(entry(entries, 'marker', MARKER_ID).action).toBe('NOOP');
    expect(entry(entries, 'function', 'complete-onboarding').action).toBe('NOOP');
  });

  it('permissão na table: divergência de segurança, não reconciliação silenciosa', async () => {
    const remote = provisioned();
    remote.tables![0].$permissions = ['read("any")'];
    const entries = await plan(remote);
    const drifted = entry(entries, 'table', tables[0].id);
    expect(drifted.action).toBe('DRIFT_SECURITY');
    expect(drifted.expected).toContain('permissions=[]');
    expect(drifted.found).toContain('read("any")');
    expect(summarize(entries).securityDrift).toBe(1);
  });

  it('rowSecurity desligada é divergência de segurança', async () => {
    const remote = provisioned();
    remote.tables![1].rowSecurity = false;
    const entries = await plan(remote);
    expect(entry(entries, 'table', tables[1].id).action).toBe('DRIFT_SECURITY');
  });

  it('coluna com tipo, tamanho ou obrigatoriedade diferentes é divergência imutável', async () => {
    const remote = provisioned();
    const sizeMismatch = remote.tables![0].columns[0];
    sizeMismatch.size = 128;
    const requiredMismatch = remote.tables![1].columns[0];
    requiredMismatch.required = false;
    const entries = await plan(remote);
    expect(entry(entries, 'column', `${tables[0].id}.${sizeMismatch.key}`).action).toBe(
      'DRIFT_IMMUTABLE',
    );
    expect(entry(entries, 'column', `${tables[1].id}.${requiredMismatch.key}`).action).toBe(
      'DRIFT_IMMUTABLE',
    );
    expect(summarize(entries).immutableDrift).toBe(2);
  });

  it('coluna e índice fora do manifesto são divergência imutável, não silêncio', async () => {
    const remote = provisioned();
    remote.tables![0].columns.push({
      key: 'colunaEstranha',
      type: 'varchar',
      required: false,
      size: 64,
      status: 'available',
    });
    remote.tables![0].indexes.push({
      key: 'i_colunaEstranha',
      type: 'key',
      columns: ['colunaEstranha'],
      status: 'available',
    });
    const entries = await plan(remote);
    expect(entry(entries, 'column', `${tables[0].id}.colunaEstranha`).action).toBe(
      'DRIFT_IMMUTABLE',
    );
    expect(entry(entries, 'index', `${tables[0].id}.i_colunaEstranha`).action).toBe(
      'DRIFT_IMMUTABLE',
    );
  });

  it('índice existente com outras colunas é divergência imutável', async () => {
    const remote = provisioned();
    const target = entry(await plan(remote), 'index', `users.${indexKey(true, ['authUserId'])}`);
    remote.tables![0].indexes = remote.tables![0].indexes.map((index) =>
      index.key === target.id.split('.')[1] ? { ...index, columns: ['status'] } : index,
    );
    const entries = await plan(remote);
    expect(entry(entries, 'index', target.id).action).toBe('DRIFT_IMMUTABLE');
  });

  it('chave sem tables.read bloqueia com o nome do escopo, sem inventar CREATE', async () => {
    const entries = await plan({ tablesDenied: true });
    const blocked = entry(entries, 'table', 'users');
    expect(blocked.action).toBe('BLOCKED_PERMISSION');
    expect(blocked.detail).toBe('tables.read');
    expect(summarize(entries).blocked).toBe(tables.length);
    // O que a chave consegue ler continua sendo classificado.
    expect(entry(entries, 'bucket', 'avatars').action).toBe('CREATE');
  });

  it('function com container fora do declarado, ou executável publicamente, é divergência de segurança', async () => {
    // O manifesto declara `complete-onboarding` para o papel `users`, então o
    // container DESLIGADO é divergência: a porta de entrada fechada com o produto
    // declarado aberto — a armadilha do Sprint 7, agora cobrada pelo plano.
    // (Antes do Sprint 8 este caso usava o sentido oposto, `closed` + habilitada;
    //  o manifesto não tem mais function `closed`, e o que se cobra aqui é a mesma
    //  comparação `found.enabled !== expectedEnabled`, no sentido alcançável.)
    const disabled = provisioned();
    disabled.functions = disabled.functions!.map((item) =>
      item.$id === 'complete-onboarding' ? { ...item, enabled: false } : item,
    );
    const enabled = await plan(disabled);
    expect(entry(enabled, 'function', 'complete-onboarding').action).toBe('DRIFT_SECURITY');
    expect(entry(enabled, 'function', 'complete-onboarding').found).toContain('enabled=false');

    // `redeem-reward` executa com a sessão da usuária (`execute=["users"]`):
    // abrir para `any` é ampliação de acesso, mesmo com o container habilitado
    // exatamente como o manifesto pede.
    const open = provisioned();
    open.functions = open.functions!.map((item) =>
      item.$id === 'redeem-reward' ? { ...item, execute: ['any'] } : item,
    );
    const entries = await plan(open);
    expect(entry(entries, 'function', 'redeem-reward').action).toBe('DRIFT_SECURITY');
    expect(entry(entries, 'function', 'redeem-reward').found).toContain('execute=[any]');
  });

  it('function sem escopo de dados no manifesto (não implementada) mantém scopes vazios', async () => {
    const remote = provisioned();
    remote.functions = remote.functions!.map((item) =>
      item.$id === 'join-challenge' ? { ...item, scopes: ['rows.write'] } : item,
    );
    const entries = await plan(remote);
    expect(entry(entries, 'function', 'join-challenge').action).toBe('DRIFT_SECURITY');
  });

  it('criptografia ou antivírus desligados no bucket são divergência de segurança', async () => {
    const remote = provisioned();
    remote.buckets![0].antivirus = false;
    const entries = await plan(remote);
    const drifted = entry(entries, 'bucket', buckets[0].id);
    expect(drifted.action).toBe('DRIFT_SECURITY');
    expect(drifted.found).toContain('antivirus desligado');
  });

  it('cota e extensões do bucket são propriedades móveis: UPDATE', async () => {
    const remote = provisioned();
    remote.buckets![0].maximumFileSize = 1;
    const entries = await plan(remote);
    const drifted = entry(entries, 'bucket', buckets[0].id);
    expect(drifted.action).toBe('UPDATE');
    // O UPDATE reescreve o bucket inteiro: as regras de acesso seguem o manifesto.
    expect(remote.buckets![0].$permissions).toEqual([]);
    expect(remote.buckets![0].fileSecurity).toBe(true);
  });

  it('nome divergente de banco e de equipe são propriedades móveis: UPDATE', async () => {
    const remote = provisioned();
    remote.database!.name = 'Outro Nome';
    remote.team!.name = 'Outro Time';
    const entries = await plan(remote);
    expect(entry(entries, 'database', 'nuy-creators')).toMatchObject({
      action: 'UPDATE',
      found: 'Outro Nome',
    });
    expect(entry(entries, 'team', 'nuy-admins')).toMatchObject({
      action: 'UPDATE',
      found: 'Outro Time',
    });
  });

  it('nível com faixa alterada é UPDATE; com permissão alterada é segurança', async () => {
    const remote = provisioned();
    remote.seeds!.exploradora = { ...remote.seeds!.exploradora, maxPoints: 999 };
    remote.seeds!.criadora = {
      ...remote.seeds!.criadora,
      $permissions: ['read("any")', 'write("any")'],
    };
    const entries = await plan(remote);
    expect(entry(entries, 'seed', 'exploradora').action).toBe('UPDATE');
    expect(entry(entries, 'seed', 'criadora').action).toBe('DRIFT_SECURITY');
  });

  it('marca de identidade com outro projeto é divergência imutável', async () => {
    const remote = provisioned();
    remote.marker = {
      ...remote.marker!,
      valueJson: JSON.stringify({ applicationId: 'nuy-creators', projectId: 'outro-projeto' }),
    };
    const entries = await plan(remote);
    const drifted = entry(entries, 'marker', MARKER_ID);
    expect(drifted.action).toBe('DRIFT_IMMUTABLE');
    expect(drifted.found).toBe('outro valor');
  });
});

/**
 * A regressão que este bloco existe para impedir, medida em staging em
 * 2026-10-07: o caminho UPDATE chamava `updateTable({ databaseId, tableId,
 * name })` e a API reinicia booleano que não vem no corpo — o update cosmético
 * do nome desligou a `rowSecurity` da table `users` (e a correção exigiu
 * `--reconcile-security` à mão).
 *
 * O que se prova aqui é o PAYLOAD, não um objeto de conveniência: os mesmos
 * argumentos que o provisionador entrega ao SDK, capturados no momento da
 * chamada por um `db` falso com a forma do cliente real.
 */
function dbEspiao() {
  const chamadas: { metodo: string; args: Record<string, unknown> }[] = [];
  const anotar =
    (metodo: string) =>
    async (args: Record<string, unknown>): Promise<unknown> => {
      chamadas.push({ metodo, args });
      return {};
    };
  return {
    chamadas,
    db: { createTable: anotar('createTable'), updateTable: anotar('updateTable') },
  };
}

/** O que a API faz com o que NÃO vem no corpo — como medido, não como suposto. */
function servidorAplica(
  estado: { name: string; $permissions: string[]; rowSecurity: boolean; enabled: boolean },
  args: { name?: string; permissions?: string[]; rowSecurity?: boolean },
) {
  return {
    ...estado,
    name: args.name ?? estado.name,
    // Documentado: "by default, the current permissions are inherited".
    $permissions: args.permissions ?? estado.$permissions,
    // Medido: booleano omitido volta ao padrão (false), e foi assim que a
    // segurança por linha caiu.
    rowSecurity: args.rowSecurity ?? false,
    // Medido no update real de `users`: `enabled` ficou intacto quando omitido.
    enabled: estado.enabled,
  };
}

describe('payload do update de table: nome muda, acesso não', () => {
  it('UPDATE carrega a postura de acesso inteira — e nada além dela', async () => {
    const espiao = dbEspiao();
    const args = tableWriteArgs('UPDATE', 'nuy-creators', 'users');
    expect(args).not.toBeNull();
    await espiao.db.updateTable(args as Record<string, unknown>);

    expect(espiao.chamadas).toHaveLength(1);
    expect(espiao.chamadas[0].metodo).toBe('updateTable');
    expect(espiao.chamadas[0].args).toMatchObject({
      databaseId: 'nuy-creators',
      tableId: 'users',
      name: 'users',
      permissions: collectionPermissions,
      rowSecurity: true,
    });
    // Nem id, nem coluna, nem índice: o payload não tem como expressá-los, então
    // um update de nome não pode mexer em schema por descuido.
    expect(Object.keys(espiao.chamadas[0].args).sort()).toEqual([
      'databaseId',
      'name',
      'permissions',
      'rowSecurity',
      'tableId',
    ]);
  });

  it('estado inicial rowSecurity=true → UPDATE só do nome → continua true', async () => {
    const inicial = { name: 'nuy-admin', $permissions: [], rowSecurity: true, enabled: true };
    const args = tableWriteArgs('UPDATE', 'nuy-creators', 'users')!;
    const final = servidorAplica(inicial, args);

    expect(final.name).toBe('users');
    expect(final.rowSecurity).toBe(true);
    expect(final.$permissions).toEqual([]);
    expect(final.enabled).toBe(true);
  });

  it('o guarda tem dentes: o payload de antes (só nome) derrubava rowSecurity', () => {
    const inicial = { name: 'nuy-admin', $permissions: [], rowSecurity: true, enabled: true };
    // Como o provisionador chamava antes desta correção.
    const antigo = { name: 'users' };
    expect(servidorAplica(inicial, antigo).rowSecurity).toBe(false);
    // Com o payload de agora, o mesmo update cosmético não alcança o acesso.
    const atual = tableWriteArgs('UPDATE', 'nuy-creators', 'users')!;
    expect(servidorAplica(inicial, atual).rowSecurity).toBe(true);
  });

  it('o payload não depende do estado lido: as 31 tables do manifesto recebem a mesma postura', () => {
    for (const table of tables) {
      const args = tableWriteArgs('UPDATE', 'nuy-creators', table.id)!;
      expect(args.rowSecurity).toBe(true);
      expect(args.permissions).toEqual(collectionPermissions);
      expect(args.name).toBe(table.id);
    }
  });

  it('CREATE, UPDATE e reconciliação de segurança escrevem argumentos idênticos', () => {
    const criar = tableWriteArgs('CREATE', 'nuy-creators', 'profiles');
    const atualizar = tableWriteArgs('UPDATE', 'nuy-creators', 'profiles');
    const reconciliar = tableWriteArgs('DRIFT_SECURITY', 'nuy-creators', 'profiles');
    expect(criar).toEqual(atualizar);
    expect(atualizar).toEqual(reconciliar);
  });

  it('nenhuma outra ação do plano produz escrita de table', () => {
    for (const action of ['NOOP', 'BLOCKED_PERMISSION', 'DRIFT_IMMUTABLE'] as const)
      expect(tableWriteArgs(action, 'nuy-creators', 'users')).toBeNull();
  });

  it('a expectativa do plano nasce do mesmo valor que o provisionador escreve', async () => {
    const remote = provisioned();
    remote.tables![0].rowSecurity = false;
    const drifted = entry(await plan(remote), 'table', tables[0].id);
    expect(drifted.action).toBe('DRIFT_SECURITY');
    // Uma origem só: o texto que o operador lê e os campos que o apply envia não
    // podem divergir — foi essa divergência que desligou a segurança por linha.
    expect(drifted.expected).toBe(
      `permissions=[${tableAccess.permissions.join(', ')}], rowSecurity=${tableAccess.rowSecurity}`,
    );
    expect(tableWriteArgs('DRIFT_SECURITY', 'nuy-creators', tables[0].id)).toMatchObject({
      permissions: tableAccess.permissions,
      rowSecurity: tableAccess.rowSecurity,
    });
  });
});
