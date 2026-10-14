/**
 * Stub de Appwrite — SOMENTE TESTE.
 *
 * Implementa o subconjunto da API REST que a área autenticada usa (conta,
 * sessão, linhas de TablesDB e memberships), com três propriedades que importam
 * para validar o produto de verdade:
 *
 *  1. permissão por linha: `$permissions` é respeitada igual ao Appwrite, então
 *     uma linha alheia é 404 mesmo que alguém esqueça o filtro;
 *  2. `queries[]` é interpretado de verdade (equal/isNull/orderBy/limit/offset)
 *     e qualquer método desconhecido vira 400 em vez de ser ignorado em
 *     silêncio — filtro ignorado escondido seria mentira no teste;
 *  3. toda requisição entra no journal (`/__stub/log`), para os testes de
 *     segurança conferirem o que a aplicação realmente pediu.
 */
import { createServer } from 'node:https';
import { randomUUID } from 'node:crypto';
import { readCertificate } from '../certs.mjs';
import { buildDataset } from './fixtures.mjs';
import { academyAdmin, academyFixtureTables } from './academy-fixtures.mjs';
import { MEDIA_FILES } from './media.mjs';

/** Bucket de catálogo do manifesto: o único que o stub serve. */
const MEDIA_BUCKET = 'community-media';

/** Métodos de query implementados; o resto falha alto. */
const SUPPORTED = new Set([
  'equal',
  'notEqual',
  'isNull',
  'isNotNull',
  'orderAsc',
  'orderDesc',
  'limit',
  'offset',
  'search',
]);

function value(doc, attribute) {
  if (attribute in doc) return doc[attribute];
  return undefined;
}

function matches(doc, query) {
  const current = value(doc, query.attribute);
  switch (query.method) {
    case 'equal': {
      const wanted = query.values ?? [];
      return wanted.some((entry) => entry === current);
    }
    case 'notEqual': {
      const wanted = query.values ?? [];
      return wanted.every((entry) => entry !== current);
    }
    case 'isNull':
      return current === null || current === undefined;
    case 'isNotNull':
      return current !== null && current !== undefined;
    case 'search': {
      const term = String(query.values?.[0] ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');
      return (
        term.length >= 3 &&
        String(current ?? '')
          .toLocaleLowerCase('pt-BR')
          .includes(term)
      );
    }
    default:
      return true;
  }
}

function compare(a, b, attribute, direction) {
  const left = value(a, attribute);
  const right = value(b, attribute);
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  const result = left < right ? -1 : 1;
  return direction === 'desc' ? -result : result;
}

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function failure(response, status, type, message) {
  json(response, status, { message, code: status, type, version: '2.0.0' });
}

/**
 * Campos de sistema da linha. `$tableId`/`$databaseId` entram com os nomes do
 * TablesDB (o antigo `$collectionId` não existe mais): o adaptador da aplicação
 * lê `$tableId` e o stub não pode ser a única API a falar a linguagem antiga.
 */
function withSystemFields(row, dataset, index, tableId) {
  const created = row.$createdAt ?? row.createdAt ?? dataset.now.toISOString();
  return {
    $id: row.$id,
    $sequence: index,
    $createdAt: created,
    $updatedAt: row.$updatedAt ?? created,
    $permissions: row.$permissions ?? [],
    $databaseId: 'nuy-creators',
    $tableId: tableId,
    ...row,
  };
}

/**
 * @param {{ port?: number, now?: Date }} [options]
 */
export async function startStub(options = {}) {
  const dataset = buildDataset(options.now ?? new Date());
  if (options.academyFixture) {
    dataset.users.push(academyAdmin);
    Object.assign(dataset.tables, academyFixtureTables);
    dataset.tables.public_creator_profiles.push({
      $id: 'academy-public-ana',
      $permissions: [],
      userId: 'viewer-ana',
      displayName: 'Ana Beatriz',
    });
  }
  const sessions = new Map();
  const journal = [];
  const transactions = new Map();

  const rowsOf = (tableId) => dataset.tables[tableId] ?? null;

  const server = createServer(readCertificate(), async (request, response) => {
    const url = new URL(request.url ?? '/', 'https://localhost');
    const raw = url.pathname.split('/').filter(Boolean);

    const sessionSecret =
      request.headers['x-appwrite-session'] ??
      request.headers['x-appwrite-fallback-cookie'] ??
      null;
    const apiKey = request.headers['x-appwrite-key'] ?? null;
    const session =
      typeof sessionSecret === 'string' ? (sessions.get(sessionSecret) ?? null) : null;
    const isAdmin = Boolean(apiKey);
    const context = { userId: session?.userId ?? null, isAdmin };

    if (raw[0] === '__stub') {
      if (raw[1] === 'log') return json(response, 200, { entries: journal });
      if (raw[1] === 'sessions') return json(response, 200, { sessions: [...sessions.keys()] });
      return failure(response, 404, 'stub_route_not_found', 'Rota de stub desconhecida.');
    }
    if (raw[0] !== 'v1')
      return failure(response, 404, 'stub_route_not_found', 'Rota desconhecida.');
    const segments = raw.slice(1);

    journal.push({
      method: request.method,
      path: url.pathname,
      search: url.search,
      userId: context.userId,
      admin: isAdmin,
      at: new Date().toISOString(),
    });

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = Buffer.concat(chunks).toString('utf8');
    let body = {};
    if (payload) {
      try {
        body = JSON.parse(payload);
      } catch {
        return failure(response, 400, 'general_argument_invalid', 'Corpo inválido.');
      }
    }

    // ---------------------------------------------------------------- conta
    if (segments[0] === 'account') {
      if (segments[1] === 'sessions' && segments[2] === 'email' && request.method === 'POST') {
        const user = dataset.users.find((entry) => entry.email === body.email);
        if (!user || user.password !== body.password)
          return failure(response, 401, 'user_invalid_credentials', 'Credenciais inválidas.');
        const secret = `stub-${randomUUID()}`;
        const expire = new Date(dataset.now.getTime() + 365 * 24 * 3600 * 1000).toISOString();
        sessions.set(secret, { userId: user.id, expire });
        return json(response, 201, {
          $id: 'current',
          $createdAt: dataset.now.toISOString(),
          userId: user.id,
          expire,
          provider: 'email',
          secret,
        });
      }

      if (segments[1] === 'sessions' && segments[2] === 'current' && request.method === 'DELETE') {
        if (sessionSecret) sessions.delete(sessionSecret);
        response.writeHead(204);
        return response.end();
      }

      if (segments[1] === 'sessions' && request.method === 'GET') {
        if (!session) return failure(response, 401, 'user_unauthorized', 'Sessão inválida.');
        return json(response, 200, {
          total: 1,
          sessions: [{ $id: 'current', userId: session.userId }],
        });
      }

      if (segments.length === 1 && request.method === 'GET') {
        const user = dataset.users.find((entry) => entry.id === context.userId);
        if (!user) return failure(response, 401, 'user_unauthorized', 'Sessão inválida.');
        return json(response, 200, {
          $id: user.id,
          $createdAt: dataset.now.toISOString(),
          $updatedAt: dataset.now.toISOString(),
          name: user.name,
          registration: dataset.now.toISOString(),
          email: user.email,
          emailVerification: user.emailVerification,
          prefs: {},
          status: true,
          labels: [],
        });
      }

      return failure(response, 404, 'stub_route_not_found', 'Rota de conta desconhecida.');
    }

    // Isolated Academy transactions with optimistic row conflict detection.
    if (segments[0] === 'tablesdb' && segments[1] === 'transactions') {
      if (!isAdmin) return failure(response, 401, 'user_unauthorized', 'Chave necessária.');
      if (segments.length === 2 && request.method === 'POST') {
        const txId = randomUUID();
        transactions.set(txId, {
          original: structuredClone(dataset.tables), working: structuredClone(dataset.tables),
          touched: new Map(),
        });
        return json(response, 201, { $id: txId, status: 'pending', ttl: body.ttl ?? 120 });
      }
      const txId = segments[2];
      const tx = transactions.get(txId);
      if (!tx) return failure(response, 404, 'transaction_not_found', 'Transação ausente.');
      if (request.method === 'DELETE') {
        transactions.delete(txId);
        return json(response, 200, {});
      }
      if (request.method === 'PATCH' && body.rollback) {
        transactions.delete(txId);
        return json(response, 200, { $id: txId, status: 'failed' });
      }
      if (request.method === 'PATCH' && body.commit) {
        for (const [key] of tx.touched) {
          const [tableId, rowId] = key.split('|');
          const before = tx.original[tableId]?.find((row) => row.$id === rowId) ?? null;
          const current = dataset.tables[tableId]?.find((row) => row.$id === rowId) ?? null;
          if (JSON.stringify(before) !== JSON.stringify(current))
            return failure(response, 409, 'transaction_conflict', 'Linha alterada em paralelo.');
        }
        for (const [key] of tx.touched) {
          const [tableId, rowId] = key.split('|');
          const now = tx.working[tableId].find((row) => row.$id === rowId);
          const index = dataset.tables[tableId].findIndex((row) => row.$id === rowId);
          if (index >= 0) dataset.tables[tableId][index] = structuredClone(now);
          else dataset.tables[tableId].push(structuredClone(now));
        }
        transactions.delete(txId);
        return json(response, 200, { $id: txId, status: 'completed' });
      }
      return failure(response, 405, 'stub_route_not_found', 'Transação inválida.');
    }

    // ------------------------------------------------------- rows (TablesDB)
    // GET /tablesdb/{db}/tables/{table}/rows[/{id}] — os mesmos IDs de table do
    // manifesto, e o envelope do TablesDB (`rows`, não `documents`).
    if (segments[0] === 'tablesdb' && segments[2] === 'tables') {
      if (!session && !isAdmin)
        return failure(response, 401, 'user_unauthorized', 'Sessão necessária.');

      const tableId = segments[3];
      const txId = url.searchParams.get('transactionId') ?? body.transactionId;
      const tx = txId ? transactions.get(txId) : null;
      if (txId && !tx) return failure(response, 404, 'transaction_not_found', 'Transação ausente.');
      const table = tx ? tx.working[tableId] : rowsOf(tableId);
      if (!table) return failure(response, 404, 'table_not_found', 'Tabela não provisionada.');

      const queries = [];
      for (const [key, entry] of url.searchParams.entries()) {
        if (key !== 'queries' && !key.startsWith('queries[')) continue;
        try {
          queries.push(JSON.parse(entry));
        } catch {
          return failure(response, 400, 'general_argument_invalid', 'Query ilegível.');
        }
      }
      const unsupported = queries.find((query) => !SUPPORTED.has(query.method));
      if (unsupported)
        return failure(
          response,
          400,
          'general_argument_invalid',
          `Query não implementada no stub: ${unsupported.method}`,
        );

      const visible = (row) => {
        if (isAdmin) return true;
        const permissions = row.$permissions ?? [];
        if (permissions.includes('read("any")')) return true;
        if (session && permissions.includes('read("users")')) return true;
        return context.userId ? permissions.includes(`read("user:${context.userId}")`) : false;
      };

      // Linha única: /tablesdb/{db}/tables/{table}/rows/{id}
      if (segments.length === 6 && request.method === 'GET') {
        const rowId = decodeURIComponent(segments[5]);
        const found = table.find((entry) => entry.$id === rowId);
        if (!found || !visible(found))
          return failure(response, 404, 'row_not_found', 'Linha não encontrada.');
        return json(response, 200, withSystemFields(found, dataset, table.indexOf(found), tableId));
      }

      if (!isAdmin && request.method !== 'GET')
        return failure(response, 401, 'user_unauthorized', 'Escrita só pelo servidor.');
      if (!tableId.startsWith('academy_') && !tableId.startsWith('community_') && tableId !== 'notifications' && request.method !== 'GET')
        return failure(response, 403, 'stub_write_forbidden', 'Escrita fora da Academia.');
      if (segments.length === 5 && request.method === 'POST') {
        const rowId = body.rowId;
        if (!rowId || table.some((row) => row.$id === rowId))
          return failure(response, 409, 'row_already_exists', 'Linha duplicada.');
        const row = { $id: rowId, $permissions: body.permissions ?? [], ...body.data };
        table.push(row);
        if (tx) tx.touched.set(`${tableId}|${rowId}`, true);
        return json(response, 201, withSystemFields(row, dataset, table.length - 1, tableId));
      }
      if (segments.length === 6 && request.method === 'PATCH') {
        const rowId = decodeURIComponent(segments[5]);
        const index = table.findIndex((row) => row.$id === rowId);
        if (index < 0) return failure(response, 404, 'row_not_found', 'Linha ausente.');
        table[index] = { ...table[index], ...body.data,
          ...(body.permissions ? { $permissions: body.permissions } : {}) };
        if (tx) tx.touched.set(`${tableId}|${rowId}`, true);
        return json(response, 200, withSystemFields(table[index], dataset, index, tableId));
      }
      if (segments.length === 5 && request.method === 'GET') {
        const filtered = table
          .map((row, index) => withSystemFields(row, dataset, index, tableId))
          .filter(visible)
          .filter((row) => queries.every((query) => matches(row, query)));

        const sorts = queries.filter(
          (query) => query.method === 'orderAsc' || query.method === 'orderDesc',
        );
        const sorted = [...filtered];
        for (const sort of [...sorts].reverse()) {
          const direction = sort.method === 'orderDesc' ? 'desc' : 'asc';
          sorted.sort((a, b) => compare(a, b, sort.attribute, direction));
        }

        const limitQuery = [...queries].reverse().find((query) => query.method === 'limit');
        const offsetQuery = [...queries].reverse().find((query) => query.method === 'offset');
        const limit = Math.min(Number(limitQuery?.values?.[0] ?? 25), 100);
        const offset = Number(offsetQuery?.values?.[0] ?? 0);

        return json(response, 200, {
          total: sorted.length,
          rows: sorted.slice(offset, offset + limit),
        });
      }

      return failure(response, 405, 'stub_route_not_found', 'Método não suportado.');
    }

    // ------------------------------------------------ arquivos (Storage)
    // GET /storage/buckets/{bucket}/files/{id}        → metadados (mimeType)
    // GET /storage/buckets/{bucket}/files/{id}/view   → bytes
    if (segments[0] === 'storage' && segments[1] === 'buckets' && segments[3] === 'files') {
      // Como no Appwrite: arquivo se abre com CHAVE, não com sessão de usuária. Se
      // o servidor do app passar a sessão no lugar da chave, isto vira 401 e o
      // teste denuncia — em vez de o bucket parecer aberto.
      if (!isAdmin) return failure(response, 401, 'user_unauthorized', 'Chave necessária.');
      if (segments[2] !== MEDIA_BUCKET)
        return failure(response, 404, 'storage_bucket_not_found', 'Bucket não provisionado.');
      const fileId = decodeURIComponent(segments[4] ?? '');
      const file = MEDIA_FILES.get(fileId);
      if (!file) return failure(response, 404, 'file_not_found', 'Arquivo não encontrado.');
      if (segments[5] === 'view') {
        response.writeHead(200, {
          'content-type': file.mimeType,
          'content-length': file.bytes.length,
        });
        return response.end(file.bytes);
      }
      return json(response, 200, {
        $id: fileId,
        $createdAt: dataset.now.toISOString(),
        $updatedAt: dataset.now.toISOString(),
        $permissions: [],
        bucketId: MEDIA_BUCKET,
        name: `${fileId}.png`,
        signature: '',
        mimeType: file.mimeType,
        sizeOriginal: file.bytes.length,
        chunksTotal: 1,
        chunksUploaded: 1,
      });
    }

    // ----------------------------------------------------------- teams
    if (segments[0] === 'teams' && segments[2] === 'memberships') {
      if (!session && !isAdmin)
        return failure(response, 401, 'user_unauthorized', 'Sessão necessária.');
      if (options.academyFixture && session?.userId === academyAdmin.id) {
        return json(response, 200, {
          total: 1,
          memberships: [
            {
              $id: 'academy-admin-membership',
              userId: '',
              teamId: 'nuy-admins',
              confirm: true,
              roles: ['admin'],
            },
          ],
        });
      }
      // Creators não recebem membership administrativa.
      return json(response, 200, { total: 0, memberships: [] });
    }

    return failure(response, 404, 'stub_route_not_found', 'Rota desconhecida.');
  });

  const port = options.port ?? 0;
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  const assigned = typeof address === 'object' && address ? address.port : port;
  return {
    server,
    port: assigned,
    endpoint: `https://127.0.0.1:${assigned}/v1`,
    dataset,
    journal,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const isDirectRun = process.argv[1]?.endsWith('server.mjs');
if (isDirectRun) {
  const stub = await startStub({ port: Number(process.env.STUB_PORT ?? 3210) });
  console.log(`[stub] Appwrite de teste em ${stub.endpoint}`);
  console.log(`[stub] usuários: ${stub.dataset.users.map((user) => user.email).join(', ')}`);
}
