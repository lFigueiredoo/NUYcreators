/**
 * Stub de Appwrite — SOMENTE TESTE.
 *
 * Implementa o subconjunto da API REST que a área autenticada usa (conta,
 * sessão, documentos e memberships), com três propriedades que importam para
 * validar o produto de verdade:
 *
 *  1. permissão por documento: `$permissions` é respeitada igual ao Appwrite,
 *     então um documento alheio é 404 mesmo que alguém esqueça o filtro;
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

function withSystemFields(document, dataset, index) {
  const created = document.$createdAt ?? document.createdAt ?? dataset.now.toISOString();
  return {
    $id: document.$id,
    $sequence: index,
    $createdAt: created,
    $updatedAt: document.$updatedAt ?? created,
    $permissions: document.$permissions ?? [],
    $databaseId: 'nuy-creators',
    ...document,
  };
}

/**
 * @param {{ port?: number, now?: Date }} [options]
 */
export async function startStub(options = {}) {
  const dataset = buildDataset(options.now ?? new Date());
  const sessions = new Map();
  const journal = [];

  const documentsOf = (collectionId) => dataset.collections[collectionId] ?? null;

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

    // ----------------------------------------------------------- documents
    if (segments[0] === 'databases' && segments[2] === 'collections') {
      if (!session && !isAdmin)
        return failure(response, 401, 'user_unauthorized', 'Sessão necessária.');

      const collectionId = segments[3];
      const collection = documentsOf(collectionId);
      if (!collection)
        return failure(response, 404, 'collection_not_found', 'Coleção não provisionada.');

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

      const visible = (document) => {
        if (isAdmin) return true;
        const permissions = document.$permissions ?? [];
        if (permissions.includes('read("any")')) return true;
        return context.userId ? permissions.includes(`read("user:${context.userId}")`) : false;
      };

      // Documento único: /databases/{db}/collections/{col}/documents/{id}
      if (segments.length === 6) {
        const documentId = decodeURIComponent(segments[5]);
        const found = collection.find((entry) => entry.$id === documentId);
        if (!found || !visible(found))
          return failure(response, 404, 'document_not_found', 'Documento não encontrado.');
        return json(response, 200, withSystemFields(found, dataset, collection.indexOf(found)));
      }

      if (segments.length === 5 && request.method === 'GET') {
        const filtered = collection
          .map((document, index) => withSystemFields(document, dataset, index))
          .filter(visible)
          .filter((document) => queries.every((query) => matches(document, query)));

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
          documents: sorted.slice(offset, offset + limit),
        });
      }

      return failure(response, 405, 'stub_route_not_found', 'Método não suportado.');
    }

    // ----------------------------------------------------------- teams
    if (segments[0] === 'teams' && segments[2] === 'memberships') {
      if (!session && !isAdmin)
        return failure(response, 401, 'user_unauthorized', 'Sessão necessária.');
      // Nenhuma membership de equipe nas fixtures: o acesso administrativo é
      // Sprint 6 e não deve existir para quem entra pela área de creators.
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
