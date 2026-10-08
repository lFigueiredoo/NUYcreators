/**
 * Plano remoto do provisionamento (Sprint 6, TablesDB).
 *
 * Lê o projeto vivo e classifica cada recurso do manifesto. Só lê: nada aqui
 * cria, altera ou apaga. O `provision.ts` consome este plano para decidir o que
 * escrever, e é o mesmo veredito que o operador vê antes do apply.
 *
 * As classificações existem para separar três coisas que não podem ser tratadas
 * igual:
 *
 *  - `UPDATE` — propriedade móvel e não sensível (nome, runtime, cota). Corrigir
 *    é reconciliação normal.
 *  - `DRIFT_SECURITY` — divergência em regra de acesso ou de proteção
 *    (permissão de table/bucket, `rowSecurity`/`fileSecurity`, `execute` e
 *    `scopes` de Function, criptografia/antivírus). **Aborta por padrão**:
 *    corrigir sozinho esconderia uma alteração de acesso que ninguém pediu. Só o
 *    `--reconcile-security` explícito corrige.
 *  - `DRIFT_IMMUTABLE` — tipo/tamanho/obrigatoriedade de coluna, tipo/campos de
 *    índice, marca de identidade. Corrigir exigiria recriar o recurso (e perder
 *    dado); **sempre aborta**, com ou sem flag.
 *
 * `BLOCKED_PERMISSION` não é divergência: é a chave não conseguir ler aquele
 * recurso. O plano segue com o que consegue ler e diz o escopo que falta.
 */
import { Functions, Query, Storage, TablesDB, Teams } from 'node-appwrite';
import {
  tables,
  buckets,
  team,
  levelSeed,
  schemaVersion,
  databaseName,
  functionDefinitions,
  executeRoles,
  functionScopes,
  type Column,
} from './schema';
import { collectionPermissions, bucketPermissions } from '../../src/lib/security/permissions';
import { APPLICATION_ID, MARKER_ID, markerMatches, type IdentityReport } from './identity';

export type PlanAction =
  'CREATE' | 'UPDATE' | 'NOOP' | 'DRIFT_SECURITY' | 'DRIFT_IMMUTABLE' | 'BLOCKED_PERMISSION';

export type PlanKind =
  'database' | 'team' | 'table' | 'column' | 'index' | 'bucket' | 'seed' | 'function' | 'marker';

export type PlanEntry = {
  action: PlanAction;
  kind: PlanKind;
  id: string;
  /** O que muda, em vocabulário de operador. */
  detail?: string;
  expected?: string;
  found?: string;
};

/**
 * A postura de acesso que o manifesto exige de TODA table gerenciada: nenhuma
 * permissão no nível da table e `rowSecurity` ligada — o acesso é por linha.
 *
 * Existe como valor único, e não repetido em cada chamada, porque três caminhos
 * escrevem esse estado (CREATE, reconciliação de segurança e o UPDATE de
 * propriedade móvel) e o plano compara contra ele. Com a expectativa duplicada,
 * o `updateTable` do caminho UPDATE ficou sem os campos de acesso: a API
 * reinicia booleano omitido, e um update cosmético de nome desligou a
 * `rowSecurity` da table `users`.
 *
 * Uniformidade medida no staging em 2026-10-07: as 31 tables do manifesto estão
 * com `rowSecurity=true`, `enabled=true` e sem permissão de table.
 */
export const tableAccess = {
  permissions: collectionPermissions,
  rowSecurity: true,
} as const;

export type TableWriteArgs = {
  databaseId: string;
  tableId: string;
  name: string;
  permissions: string[];
  rowSecurity: boolean;
};

/**
 * Os argumentos que `createTable`/`updateTable` recebem — com a MESMA postura de
 * acesso nos dois. Como `updateTable` reinicia booleano omitido, o payload é
 * completo por construção: corrigir o nome de exibição não tem como alterar
 * nada além do nome. Colunas, índices e tipo não cabem aqui — mudá-los não é
 * UPDATE, e um `UPDATE` de nome não pode nem expressá-los.
 *
 * `enabled` fica de fora de propósito: não é campo gerenciado pelo manifesto (o
 * plano não o classifica), foi medido intacto quando omitido no update real de
 * `users`, e escrevê-lo aqui reativaria em silêncio uma table desligada à mão.
 */
export function tableWriteArgs(
  action: PlanAction,
  databaseId: string,
  tableId: string,
): TableWriteArgs | null {
  if (action !== 'CREATE' && action !== 'UPDATE' && action !== 'DRIFT_SECURITY') return null;
  return {
    databaseId,
    tableId,
    name: tableId,
    permissions: [...tableAccess.permissions],
    rowSecurity: tableAccess.rowSecurity,
  };
}

export type Clients = {
  db: TablesDB;
  storage: Storage;
  teams: Teams;
  functions: Functions;
};

/**
 * Nome da equipe no Console. Mora aqui, e não no manifesto, porque o manifesto é
 * impresso cru pelo `infra:plan` offline — e aquele contrato é congelado. Plano
 * remoto e apply leem daqui, então continuam sem poder discordar.
 */
export const TEAM_NAME = 'NUY Creators — Equipe';

/** Nome do índice: mesma fórmula no plano e no apply, senão o diff mente. */
export function indexKey(unique: boolean, attributes: string[]) {
  return `${unique ? 'u' : 'i'}_${attributes.join('_').replace('$', '')}`.slice(0, 36);
}

type ReadResult<T> =
  { state: 'present'; value: T } | { state: 'absent' } | { state: 'blocked'; scope: string };

/** 404 é ausência; 401 é falta de escopo — nunca a mesma coisa. */
async function read<T>(run: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    return { state: 'present', value: await run() };
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (code === 404) return { state: 'absent' };
    if (code === 401) return { state: 'blocked', scope: scopeOf(error) };
    throw error;
  }
}

function scopeOf(error: unknown) {
  const body = (error as { response?: unknown })?.response;
  const parts = [
    typeof body === 'string' ? body : ((body as { message?: string })?.message ?? ''),
    (error as { message?: string })?.message ?? '',
  ];
  for (const part of parts) {
    const found = /missing scopes \(\[?\s*"?([\w.]+)"?\s*\]?\)/.exec(part)?.[1];
    if (found) return found;
  }
  return 'escopo de leitura';
}

/**
 * Estrutural de propósito: o modelo remoto traz variantes de coluna que o
 * manifesto não usa (email, enum, relationship). Ler só o que se compara evita
 * que uma variante nova quebre o plano inteiro.
 */
type RemoteColumn = {
  key: string;
  type: string;
  required?: boolean;
  size?: number;
  status?: string;
  array?: boolean;
};

/**
 * `string` e `varchar` são a mesma coluna: o primeiro é o nome legado da rota,
 * o segundo o nome TablesDB. Comparar os dois ao pé da letra acusaria uma
 * divergência que não existe.
 */
function normalizeColumnType(type: string) {
  return type === 'string' ? 'varchar' : type;
}

/** Compara a coluna desejada com o que existe. Devolve a divergência ou null. */
function columnDrift(expected: Column, found: RemoteColumn) {
  const type = normalizeColumnType(found.type);
  if (type !== expected.type) return `tipo ${found.type} ≠ ${expected.type}`;
  if (found.array === true) return 'coluna é array no projeto e escalar no manifesto';
  if ('required' in found && found.required !== expected.required)
    return `obrigatório ${found.required} ≠ ${expected.required}`;
  if (expected.type === 'varchar' && 'size' in found && found.size !== expected.size)
    return `tamanho ${found.size} ≠ ${expected.size}`;
  return null;
}

export function sortedEqual(left: readonly string[], right: readonly string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

/**
 * Monta o plano inteiro. Nunca lança por divergência: divergência é resultado,
 * não exceção — quem aborta é o apply, com a política dele.
 */
export async function buildPlan(
  clients: Clients,
  databaseId: string,
  identity: IdentityReport,
): Promise<PlanEntry[]> {
  const { db, storage, teams, functions } = clients;
  const entries: PlanEntry[] = [];

  const database = await read(() => db.get({ databaseId }));
  if (database.state === 'blocked')
    entries.push({
      action: 'BLOCKED_PERMISSION',
      kind: 'database',
      id: databaseId,
      detail: database.scope,
    });
  else if (database.state === 'absent')
    entries.push({ action: 'CREATE', kind: 'database', id: databaseId });
  else if (database.value.name !== databaseName)
    entries.push({
      action: 'UPDATE',
      kind: 'database',
      id: databaseId,
      detail: 'nome',
      expected: databaseName,
      found: database.value.name,
    });
  else entries.push({ action: 'NOOP', kind: 'database', id: databaseId });

  const remoteTeam = await read(() => teams.get({ teamId: team.id }));
  if (remoteTeam.state === 'blocked')
    entries.push({
      action: 'BLOCKED_PERMISSION',
      kind: 'team',
      id: team.id,
      detail: remoteTeam.scope,
    });
  else if (remoteTeam.state === 'absent')
    entries.push({ action: 'CREATE', kind: 'team', id: team.id });
  else if (remoteTeam.value.name !== TEAM_NAME)
    entries.push({
      action: 'UPDATE',
      kind: 'team',
      id: team.id,
      detail: 'nome',
      expected: TEAM_NAME,
      found: remoteTeam.value.name,
    });
  else entries.push({ action: 'NOOP', kind: 'team', id: team.id });

  // Uma listagem por classe resolve o CREATE/NOOP de tudo de uma vez; só quem já
  // existe precisa de leitura profunda (colunas e índices). O limite é explícito
  // porque a API devolve 25 por padrão — sem isso, a 26ª table seria lida como
  // ausente e o plano pediria para criar o que já existe.
  const listed = await read(() => db.listTables({ databaseId, queries: [Query.limit(500)] }));
  if (listed.state === 'blocked') {
    // Sem escopo de leitura não há classificação honesta: nem CREATE, que seria
    // um palpite sobre um recurso que a chave não conseguiu enxergar.
    for (const table of tables)
      entries.push({
        action: 'BLOCKED_PERMISSION',
        kind: 'table',
        id: table.id,
        detail: listed.scope,
      });
  } else {
    // `absent` é o banco ainda inexistente: nada presente, tudo nasce com ele.
    const present =
      listed.state === 'present'
        ? new Set(listed.value.tables.map((item) => item.$id))
        : new Set<string>();
    for (const table of tables) {
      // A mesma classificação com ou sem recurso vivo: com a table ausente, cada
      // coluna e cada índice que o manifesto descreve vira CREATE. O plano não
      // pode resumir o que o apply escreve linha por linha — se resumisse,
      // aplicar o plano criaria tables vazias.
      const remote = present.has(table.id)
        ? await read(() => db.getTable({ databaseId, tableId: table.id }))
        : null;
      if (remote && remote.state !== 'present') {
        entries.push({
          action: 'BLOCKED_PERMISSION',
          kind: 'table',
          id: table.id,
          detail: remote.state === 'blocked' ? remote.scope : 'leitura falhou',
        });
        continue;
      }
      const found = remote?.value;
      const tableExpected = `permissions=[${tableAccess.permissions.join(', ')}], rowSecurity=${tableAccess.rowSecurity}`;
      if (!found) {
        entries.push({
          action: 'CREATE',
          kind: 'table',
          id: table.id,
          detail: `${table.columns.length} colunas, ${table.unique.length + table.indexes.length} índices`,
        });
      } else if (found.$permissions.length || !found.rowSecurity) {
        entries.push({
          action: 'DRIFT_SECURITY',
          kind: 'table',
          id: table.id,
          detail: found.$permissions.length ? 'permissões na table' : 'rowSecurity desligada',
          expected: tableExpected,
          found: `permissions=[${found.$permissions.join(', ')}], rowSecurity=${found.rowSecurity}`,
        });
      } else if (found.name !== table.id) {
        entries.push({
          action: 'UPDATE',
          kind: 'table',
          id: table.id,
          detail: 'nome',
          expected: table.id,
          found: found.name,
        });
      } else {
        entries.push({ action: 'NOOP', kind: 'table', id: table.id });
      }

      const remoteColumns = new Map((found?.columns ?? []).map((item) => [item.key, item]));
      for (const column of table.columns) {
        const existing = remoteColumns.get(column.key);
        if (!existing) {
          entries.push({
            action: 'CREATE',
            kind: 'column',
            id: `${table.id}.${column.key}`,
            detail: `${column.type}${column.type === 'varchar' ? `(${column.size})` : ''}`,
          });
          continue;
        }
        const drift = columnDrift(column, existing);
        entries.push(
          drift
            ? {
                action: 'DRIFT_IMMUTABLE',
                kind: 'column',
                id: `${table.id}.${column.key}`,
                detail: drift,
                expected: `${column.type}${column.required ? ' obrigatório' : ' opcional'}`,
                found: existing.type,
              }
            : { action: 'NOOP', kind: 'column', id: `${table.id}.${column.key}` },
        );
      }

      // Coluna que o manifesto não conhece: alguém mexeu na table à mão. Só
      // sairia com delete (destrutivo), então é divergência imutável — e
      // escondê-la faria o apply chamar de "pronto" um schema que não é o nosso.
      const manifestKeys = new Set(table.columns.map((item) => item.key));
      for (const existing of found?.columns ?? []) {
        if (manifestKeys.has(existing.key)) continue;
        entries.push({
          action: 'DRIFT_IMMUTABLE',
          kind: 'column',
          id: `${table.id}.${existing.key}`,
          detail: 'coluna fora do manifesto',
          expected: 'nenhum',
          found: `${existing.type} (${existing.status})`,
        });
      }

      const remoteIndexes = new Map((found?.indexes ?? []).map((item) => [item.key, item]));
      for (const [unique, groups] of [
        [true, table.unique],
        [false, table.indexes],
      ] as const) {
        for (const attributes of groups) {
          const key = indexKey(unique, attributes);
          const id = `${table.id}.${key}`;
          const existing = remoteIndexes.get(key);
          if (!existing) {
            entries.push({
              action: 'CREATE',
              kind: 'index',
              id,
              detail: `${unique ? 'único' : 'consulta'} [${attributes.join(', ')}]`,
            });
            continue;
          }
          const matchesType = existing.type === (unique ? 'unique' : 'key');
          const matchesAttributes = JSON.stringify(existing.columns) === JSON.stringify(attributes);
          entries.push(
            matchesType && matchesAttributes
              ? { action: 'NOOP', kind: 'index', id }
              : {
                  action: 'DRIFT_IMMUTABLE',
                  kind: 'index',
                  id,
                  detail: 'tipo ou colunas do índice',
                  expected: `${unique ? 'unique' : 'key'} [${attributes.join(', ')}]`,
                  found: `${existing.type} [${existing.columns.join(', ')}]`,
                },
          );
        }
      }

      const manifestIndexes = new Set(
        [
          ...table.unique.map((a) => [true, a] as const),
          ...table.indexes.map((a) => [false, a] as const),
        ].map(([unique, attributes]) => indexKey(unique, attributes)),
      );
      for (const existing of found?.indexes ?? []) {
        if (manifestIndexes.has(existing.key)) continue;
        entries.push({
          action: 'DRIFT_IMMUTABLE',
          kind: 'index',
          id: `${table.id}.${existing.key}`,
          detail: 'índice fora do manifesto',
          expected: 'nenhum',
          found: `${existing.type} [${existing.columns.join(', ')}]`,
        });
      }
    }
  }

  const listedBuckets = await read(() => storage.listBuckets({ queries: [Query.limit(500)] }));
  if (listedBuckets.state !== 'present') {
    for (const bucket of buckets) {
      if (listedBuckets.state === 'blocked')
        entries.push({
          action: 'BLOCKED_PERMISSION',
          kind: 'bucket',
          id: bucket.id,
          detail: listedBuckets.scope,
        });
      else entries.push({ action: 'CREATE', kind: 'bucket', id: bucket.id });
    }
  } else {
    const present = new Map(listedBuckets.value.buckets.map((item) => [item.$id, item]));
    for (const bucket of buckets) {
      const found = present.get(bucket.id);
      if (!found) {
        entries.push({ action: 'CREATE', kind: 'bucket', id: bucket.id });
        continue;
      }
      const security: string[] = [];
      if (found.$permissions.length || !found.fileSecurity)
        security.push(
          `permissions=[${found.$permissions.join(', ')}], fileSecurity=${found.fileSecurity}`,
        );
      if (!found.encryption) security.push('encryption desligada');
      if (!found.antivirus) security.push('antivirus desligado');
      if (security.length) {
        entries.push({
          action: 'DRIFT_SECURITY',
          kind: 'bucket',
          id: bucket.id,
          detail: security.join('; '),
          expected: `permissions=[${bucketPermissions.join(', ')}], fileSecurity=true, encryption=true, antivirus=true`,
          found: security.join('; '),
        });
        continue;
      }
      const movable: string[] = [];
      if (found.name !== bucket.id) movable.push('nome');
      if (found.maximumFileSize !== bucket.size)
        movable.push(`tamanho ${found.maximumFileSize} ≠ ${bucket.size}`);
      if (!sortedEqual(found.allowedFileExtensions, bucket.extensions))
        movable.push(`extensões [${found.allowedFileExtensions.join(', ')}]`);
      entries.push(
        movable.length
          ? { action: 'UPDATE', kind: 'bucket', id: bucket.id, detail: movable.join('; ') }
          : { action: 'NOOP', kind: 'bucket', id: bucket.id },
      );
    }
  }

  for (const [order, level] of levelSeed.entries()) {
    const { id, ...data } = level;
    const remote = await read(() =>
      db.getRow({ databaseId, tableId: 'creator_levels', rowId: id }),
    );
    if (remote.state === 'blocked') {
      entries.push({ action: 'BLOCKED_PERMISSION', kind: 'seed', id, detail: remote.scope });
      continue;
    }
    if (remote.state === 'absent') {
      entries.push({ action: 'CREATE', kind: 'seed', id });
      continue;
    }
    const found = remote.value as unknown as Record<string, unknown> & { $permissions: string[] };
    if (JSON.stringify(found.$permissions) !== JSON.stringify([`read("any")`])) {
      entries.push({
        action: 'DRIFT_SECURITY',
        kind: 'seed',
        id,
        detail: 'permissões do nível',
        expected: `read("any")`,
        found: `[${found.$permissions.join(', ')}]`,
      });
      continue;
    }
    const mismatch =
      found.minPoints !== data.minPoints ||
      found.maxPoints !== data.maxPoints ||
      found.name !== data.name ||
      found.order !== order ||
      found.active !== true ||
      found.rulesVersion !== schemaVersion;
    entries.push(
      mismatch
        ? {
            action: 'UPDATE',
            kind: 'seed',
            id,
            detail: 'faixa, nome, ordem ou versão de regras',
            expected: `${data.name} ${data.minPoints}–${data.maxPoints ?? '∞'} v${schemaVersion}`,
            found: `${String(found.name)} ${String(found.minPoints)}–${String(found.maxPoints ?? '∞')} v${String(found.rulesVersion)}`,
          }
        : { action: 'NOOP', kind: 'seed', id },
    );
  }

  const listedFunctions = await read(() => functions.list({ queries: [Query.limit(500)] }));
  if (listedFunctions.state !== 'present') {
    for (const definition of functionDefinitions) {
      if (listedFunctions.state === 'blocked')
        entries.push({
          action: 'BLOCKED_PERMISSION',
          kind: 'function',
          id: definition.id,
          detail: listedFunctions.scope,
        });
      else
        entries.push({
          action: 'CREATE',
          kind: 'function',
          id: definition.id,
          detail: definition.implemented
            ? 'implementada, container desabilitado'
            : 'não implementada, container desabilitado',
        });
    }
  } else {
    const present = new Map(listedFunctions.value.functions.map((item) => [item.$id, item]));
    for (const definition of functionDefinitions) {
      const found = present.get(definition.id);
      if (!found) {
        entries.push({
          action: 'CREATE',
          kind: 'function',
          id: definition.id,
          detail: definition.implemented
            ? 'implementada, container desabilitado'
            : 'não implementada, container desabilitado',
        });
        continue;
      }
      // A postura esperada vem do MANIFESTO, não de um literal: o plano cobra
      // exatamente o que o provisioner escreve. `execute` a mais, container
      // habilitado quando devia estar fechado, escopo que ninguém declarou —
      // tudo isso é divergência de ACESSO e interrompe o apply.
      const expectedScopes = functionScopes(definition);
      const expectedExecute = executeRoles(definition.audience);
      const expectedEnabled = definition.audience !== 'closed';
      const security: string[] = [];
      if (found.enabled !== expectedEnabled) security.push(`enabled=${found.enabled}`);
      if (!sortedEqual(found.execute, expectedExecute))
        security.push(`execute=[${found.execute.join(', ')}]`);
      if (!sortedEqual(found.scopes, expectedScopes))
        security.push(`scopes=[${found.scopes.join(', ')}]`);
      const expectedSchedule = definition.schedule ?? '';
      // A agenda é acesso por OUTRO caminho: quem a controla decide quando a
      // function roda sozinha. Divergiu, é divergência de segurança.
      if ((found.schedule ?? '') !== expectedSchedule)
        security.push(`schedule="${found.schedule ?? ''}"`);
      if (security.length) {
        entries.push({
          action: 'DRIFT_SECURITY',
          kind: 'function',
          id: definition.id,
          detail: security.join('; '),
          expected:
            `enabled=${expectedEnabled}, execute=[${expectedExecute.join(', ')}], ` +
            `scopes=[${expectedScopes.join(', ')}], schedule="${expectedSchedule}"`,
          found: security.join('; '),
        });
        continue;
      }
      const movable: string[] = [];
      if (found.name !== `NUY ${definition.id}`) movable.push('nome');
      if (found.runtime !== 'node-22') movable.push(`runtime ${found.runtime}`);
      if (found.entrypoint !== 'src/main.js') movable.push(`entrypoint ${found.entrypoint}`);
      if (found.commands !== 'npm ci') movable.push(`commands ${found.commands}`);
      entries.push(
        movable.length
          ? { action: 'UPDATE', kind: 'function', id: definition.id, detail: movable.join('; ') }
          : { action: 'NOOP', kind: 'function', id: definition.id },
      );
    }
  }

  const remoteMarker = await read(() =>
    db.getRow({ databaseId, tableId: 'platform_settings', rowId: MARKER_ID }),
  );
  if (remoteMarker.state === 'blocked')
    entries.push({
      action: 'BLOCKED_PERMISSION',
      kind: 'marker',
      id: MARKER_ID,
      detail: remoteMarker.scope,
    });
  else if (remoteMarker.state === 'absent')
    entries.push({
      action: 'CREATE',
      kind: 'marker',
      id: MARKER_ID,
      detail:
        identity.marker === 'verified'
          ? 'marca sumiu depois de provisionado'
          : 'identidade do projeto',
    });
  else if (
    !markerMatches(remoteMarker.value as unknown as Record<string, unknown>, identity.projectId)
  )
    entries.push({
      action: 'DRIFT_IMMUTABLE',
      kind: 'marker',
      id: MARKER_ID,
      detail: 'marca de identidade do projeto',
      expected: `${APPLICATION_ID}/${identity.projectId}`,
      found: 'outro valor',
    });
  else entries.push({ action: 'NOOP', kind: 'marker', id: MARKER_ID });

  return entries;
}

export function summarize(entries: PlanEntry[]) {
  const count = (action: PlanAction) => entries.filter((entry) => entry.action === action).length;
  return {
    create: count('CREATE'),
    update: count('UPDATE'),
    noop: count('NOOP'),
    securityDrift: count('DRIFT_SECURITY'),
    immutableDrift: count('DRIFT_IMMUTABLE'),
    blocked: count('BLOCKED_PERMISSION'),
  };
}

/** Linhas do plano, no formato que o operador lê antes de aprovar. */
export function formatPlan(entries: PlanEntry[]) {
  const lines = entries.map((entry) => {
    const head = `${entry.action.padEnd(17)} ${entry.kind.padEnd(10)} ${entry.id}`;
    if (entry.action === 'NOOP' || !entry.detail) return head;
    const detail = `  ${entry.detail}`;
    const compare =
      entry.expected && entry.found
        ? `\n${' '.repeat(19)}esperado: ${entry.expected}\n${' '.repeat(19)}encontrado: ${entry.found}`
        : '';
    return `${head}${detail}${compare}`;
  });
  const summary = summarize(entries);
  lines.push(
    '',
    `${summary.create} create · ${summary.update} update · ${summary.noop} noop · ` +
      `${summary.securityDrift} security drift · ${summary.immutableDrift} immutable drift · ${summary.blocked} blockers`,
  );
  return lines.join('\n');
}
