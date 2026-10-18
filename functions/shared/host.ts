import { timingSafeEqual } from 'node:crypto';
import { Account, Client, Query, TablesDB, Teams } from 'node-appwrite';
import type { CoreContext, CoreCode, CoreResult } from '../../src/features/workspace/core';
import { confirmedRoles } from '../../src/lib/security/memberships';
import type { AdminRole } from '../../src/lib/security/permissions';

/**
 * Hospedeiro Appwrite Function do núcleo operacional.
 *
 * A regra de negócio NÃO mora aqui: cada entrada chama um fluxo de
 * `src/features/workspace/core` com o cliente e a identidade já resolvidos. Este
 * arquivo só faz o que é do runtime:
 *
 *  1. identidade — lê o JWT que o Appwrite injeta e pergunta ao Appwrite quem é.
 *     `userId` do corpo da requisição nunca é usado, em nenhuma entrada;
 *  2. credencial — usa a chave dinâmica da própria function (`x-appwrite-key`),
 *     nunca uma chave de provisionamento vinda do ambiente do app;
 *  3. papéis — de membership CONFIRMADA na equipe administrativa, lidos com a
 *     chave da function. Se o escopo `teams.read` não estiver no runtime, a
 *     leitura falha e devolve lista vazia: comando de equipe recusa. Fail-closed;
 *  4. transporte — traduz o código de negócio do núcleo para status HTTP e JSON,
 *     sem vazar mensagem de erro de plataforma nem credencial.
 *
 * Nada aqui importa `server-only` (o bundle é esbuild, não Next) nem usa alias
 * `@/`: só caminhos relativos, como o resto de `functions/`.
 */
export type FunctionEvent = {
  /**
   * `bodyJson` NÃO é um valor: é um **getter** do runtime que faz `JSON.parse`
   * no `body` cru — ler a propriedade pode ESTOURAR, e é por isso que `body()`
   * abaixo lê dentro de `try`. `body` é o corpo cru de onde o getter lê (string
   * vazia na execução agendada, que não manda corpo nenhum).
   */
  req: { headers: Record<string, string>; body?: unknown; bodyJson: unknown };
  res: { json: (data: unknown, status?: number) => unknown };
  error: (message: string) => void;
};

/**
 * Resultado do preparo. A recusa CARREGA a resposta em vez de enviá-la: o
 * wrapper do runtime exige que o handler exportado RETORNE o objeto de resposta
 * em toda ramificação — chamar `res.json()` como efeito colateral termina em
 * "Return statement missing. return context.res.empty() if no response is
 * expected." (medido nesta rodada, HTTP 500 com corpo vazio). Por isso a entry
 * faz `if (!run.ready) return run.response;`.
 */
export type Hosted =
  | { ready: true; ctx: CoreContext; body: Record<string, unknown> }
  | { ready: false; response: unknown };

const STATUS: Record<CoreCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  unavailable: 503,
  conflict: 409,
  window_closed: 409,
  not_published: 409,
  level_required: 403,
  capacity_full: 409,
  not_participant: 403,
  duplicate_content: 409,
  insufficient_points: 409,
  out_of_stock: 409,
  limit_reached: 409,
  price_changed: 409,
};

/** Corpo cru vazio: ausente, nulo ou só espaço. É o caso da execução AGENDADA. */
function empty(event: FunctionEvent): boolean {
  const raw = event.req.body;
  return raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Corpo da requisição, lido de forma TOLERANTE ao corpo ausente.
 *
 * `event.req.bodyJson` é um getter do runtime que faz `JSON.parse` no corpo. A
 * execução AGENDADA chega sem corpo nenhum, e o parse de string vazia estoura
 * `SyntaxError: Unexpected end of JSON input` **antes** de qualquer guarda —
 * medido nesta instalação: 116 de 116 execuções agendadas em HTTP 500, enquanto
 * as 84 por HTTP concluíam. O `process-outbox` morria ali, sem chegar a
 * `machineAuthorized`: a fila de avisos só andava por chamada manual.
 *
 * Corpo ausente/vazio vale `{}` — a única leitura que o corpo vazio pode ter. Um
 * corpo que EXISTE e não é JSON válido continua sendo erro e sobe: engolir isso
 * faria uma requisição malformada seguir como "sem corpo", um caminho que
 * ninguém pediu.
 */
function body(event: FunctionEvent): Record<string, unknown> {
  try {
    return asRecord(event.req.bodyJson);
  } catch (error) {
    if (empty(event)) return {};
    throw error;
  }
}

/**
 * Endpoint do SDK dentro do container.
 *
 * O runtime injeta `APPWRITE_FUNCTION_API_ENDPOINT` e, nesta instalação, ele vem
 * em `http://`. O servidor responde **301** para https, e o `fetch` segue 301
 * TROCANDO O MÉTODO por GET — é a especificação, não defeito do SDK. Medido
 * dentro do container nesta rodada: `POST http://…/tablesdb/transactions`
 * devolveu `{"total":0,"transactions":[]}` com HTTP 200 (a LISTAGEM) e o mesmo
 * POST por https devolveu 201 com a transação criada. Como toda escrita do
 * núcleo é POST/PATCH/DELETE com `transactionId`, o efeito era silencioso: a
 * operação seguia sem transação nenhuma — e a chave dinâmica ainda viajaria em
 * claro.
 *
 * Por isso o MESMO host é usado com TLS quando ele responde. A sonda é única
 * por container; se o https não atender (instalação interna http-only), o
 * endpoint injetado é mantido e o fato fica registrado — melhor um sinal alto do
 * que trocar um erro por outro.
 *
 * Exportado porque `complete-onboarding` não passa por `hosted()` e, enquanto
 * montou o cliente com o valor injetado cru, sofreu exatamente este defeito:
 * `getRow` (GET) respondia 404 corretamente, `createRow` (POST) virava listagem com
 * HTTP 200, e a function devolvia `{"saved":true}` sem ter gravado linha nenhuma —
 * falha silenciosa, medida contra o staging no Sprint 8. A resolução mora aqui, e
 * não copiada lá, para não haver duas versões da mesma regra.
 */
export type EndpointHost = { error: (message: string) => void };

let resolvedEndpoint: Promise<string | null> | null = null;

export function resolveEndpoint(event: EndpointHost, injected: string): Promise<string | null> {
  resolvedEndpoint ??= (async () => {
    let url: URL;
    try {
      url = new URL(injected);
    } catch {
      return null;
    }
    const clean = url.toString().replace(/\/$/, '');
    if (url.protocol !== 'http:') return clean;
    const secure = new URL(clean);
    secure.protocol = 'https:';
    secure.pathname = `${secure.pathname.replace(/\/$/, '')}/health/version`;
    try {
      const probe = await fetch(secure, { redirect: 'error', signal: AbortSignal.timeout(3000) });
      if (!probe.ok) return clean;
      return clean.replace(/^http:/, 'https:');
    } catch {
      event.error('endpoint_sem_https');
      return clean;
    }
  })();
  return resolvedEndpoint;
}

async function rolesFor(
  client: Client,
  teamId: string,
  userId: string,
  event: FunctionEvent,
): Promise<AdminRole[]> {
  try {
    const list = await new Teams(client).listMemberships({
      teamId,
      queries: [Query.equal('userId', userId), Query.limit(100)],
    });
    // Chave de servidor devolve `userId` de verdade — a apuração estrita vale.
    return confirmedRoles(list.memberships, userId, teamId);
  } catch {
    // Fail-closed: sem leitura de equipe não há papel. Mas o silêncio escondia
    // um escopo faltando (medido: sem `teams.read` a leitura responde 401
    // `general_unauthorized_scope`), e o comando de equipe virava `forbidden`
    // sem deixar rastro. O log registra o FATO, nunca a mensagem da plataforma.
    event.error('roles_unreadable');
    return [];
  }
}

export async function hosted(
  event: FunctionEvent,
  options: { requireUser?: boolean; roles?: boolean } = {},
): Promise<Hosted> {
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = event.req.headers['x-appwrite-key'];
  const jwt = event.req.headers['x-appwrite-user-jwt'];
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT
    ? await resolveEndpoint(event, process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    : null;
  if (!endpoint || !project || !key) {
    return { ready: false, response: event.res.json({ error: 'runtime_unconfigured' }, 500) };
  }
  const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
  const teamId = process.env.APPWRITE_ADMIN_TEAM_ID ?? 'nuy-admins';
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  let userId = '';
  if (jwt) {
    try {
      userId = (
        await new Account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)).get()
      ).$id;
    } catch {
      // JWT presente porém inválido é sessão não comprovada — nunca "anônimo".
      return { ready: false, response: event.res.json({ error: 'unauthenticated' }, 401) };
    }
  }
  if (options.requireUser && !userId) {
    return { ready: false, response: event.res.json({ error: 'unauthenticated' }, 401) };
  }
  return {
    ready: true,
    ctx: {
      tables: new TablesDB(client),
      databaseId,
      // Papéis só quando a entrada PEDE (`roles: true`): ler equipe exige
      // `teams.read` na chave dinâmica, e escopo a mais é escopo a mais.
      actor: {
        userId,
        roles: userId && options.roles ? await rolesFor(client, teamId, userId, event) : [],
      },
      now: new Date(),
      correlationId: event.req.headers['x-appwrite-trigger'] ?? 'function',
      academyCommentsReady: process.env.APPWRITE_ACADEMY_SCHEMA_READY === 'true' ||
        process.env.APPWRITE_ACADEMY_ENABLED === 'true',
      challengeCommentsPrivateReady:
        process.env.APPWRITE_ACADEMY_SCHEMA_READY === 'true' &&
        process.env.APPWRITE_ACADEMY_CHALLENGE_ACL_PRIVATE_READY === 'true',
    },
    body: body(event),
  };
}

/**
 * Execução AGENDADA pelo próprio Appwrite.
 *
 * O gatilho `x-appwrite-trigger: schedule` é afirmado pela PLATAFORMA: quem
 * chama não consegue forjar cabeçalho `x-appwrite-*` ("Invalid headers: ...
 * cannot start with 'x-appwrite'", medido nesta rodada), e quem cria agenda é
 * quem administra o projeto. Medido também: a execução agendada chega sem
 * usuária, sem JWT e com `trigger=schedule` — nada disso vem do payload.
 */
export function scheduled(event: FunctionEvent): boolean {
  return event.req.headers['x-appwrite-trigger'] === 'schedule';
}

/**
 * Caminho de MÁQUINA para tarefas internas — reconstruir ranking, esvaziar a
 * fila de eventos.
 *
 * Dois caminhos, ambos sem identidade de pessoa e ambos fechados por padrão:
 *  1. AGENDAMENTO do Appwrite (`scheduled`), que é o que faz a fila andar sem
 *     ninguém clicando;
 *  2. AGENDADOR EXTERNO com o segredo de implantação (`NUY_OPS_TOKEN`) contra o
 *     cabeçalho `x-nuy-ops-token`, comparado em tempo constante. Sem segredo
 *     configurado este caminho fica FECHADO — nunca "aberto por ausência de
 *     configuração".
 */
export function machineAuthorized(event: FunctionEvent): boolean {
  if (scheduled(event)) return true;
  const expected = process.env.NUY_OPS_TOKEN;
  const provided = event.req.headers['x-nuy-ops-token'];
  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

/**
 * Ator de serviço, com nome que aparece na auditoria. Só é criado DEPOIS de
 * `machineAuthorized`: não existe caminho em que papel venha do payload.
 */
export function asService(ctx: CoreContext, name: string): CoreContext {
  return { ...ctx, actor: { userId: `service:${name}`, roles: ['admin'] } };
}

/** Recusa de negócio → HTTP. Mensagem de plataforma não sobe; código sim. */
export function refuse<T>(event: FunctionEvent, result: CoreResult<T>): unknown {
  if (result.ok) return null;
  event.error(result.failure.code); // Código de negócio, nunca o payload.
  return event.res.json({ error: result.failure.code }, STATUS[result.failure.code]);
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function integer(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}
