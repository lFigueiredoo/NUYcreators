import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertDedicatedProject, assertTestEnvironment } from './safety';

export const MARKER_ID = 'application-identity';
export const MARKER_KEY = 'applicationId';
export const APPLICATION_ID = 'nuy-creators';
type Environment = Record<string, string | undefined>;
type Receipt = {
  endpoint: string;
  projectId: string;
  applicationId: string;
  status: 'in_progress' | 'completed';
};
export type IdentityReport = {
  endpoint: string;
  projectId: string;
  expectedProjectId: string;
  environment: string;
  provisioningKey: 'accepted';
  /**
   * `accepted-with-read-denied` é a chave mínima que o desenho pede. Uma chave
   * aceita porém larga é registrada como `accepted-over-scoped`: não é chave
   * inválida, mas não passa no gate de integração do app — provisionar schema
   * não depende do perfil da chave de sessões, a postura de runtime depende.
   */
  authKey: 'accepted-with-read-denied' | 'accepted-over-scoped';
  sessionsWrite: 'authorized' | 'missing' | 'pending-real-session-test';
  testKey: 'accepted' | 'not-configured';
  marker: 'verified' | 'first-bootstrap' | 'bootstrap-resume';
};
export class IdentityError extends Error {}
type ReadResult = { status: number; body: Record<string, unknown> };
async function readOnly(
  endpoint: string,
  projectId: string,
  key: string,
  path: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<ReadResult> {
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': key,
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new IdentityError('Resposta Appwrite não reconhecida.');
    return { status: response.status, body: value as Record<string, unknown> };
  } catch {
    // Never print fetch errors: they may carry request headers or credentials.
    throw new IdentityError(
      'Sondagem de leitura indisponível ou resposta inválida. Sem redirect, escrita ou fallback.',
    );
  }
}
function validDatabaseList(result: ReadResult) {
  return (
    result.status === 200 &&
    Array.isArray(result.body.databases) &&
    typeof result.body.total === 'number' &&
    result.body.total === result.body.databases.length &&
    result.body.databases.every(
      (db) => !!db && typeof db === 'object' && '$id' in db && typeof db.$id === 'string',
    )
  );
}
function scopeDeniedByAuthenticatedKey(result: ReadResult) {
  // A plain 401 does NOT prove an accepted key. Require the authenticated applications role
  // and the specific denied scope, distinct from expired/invalid-key errors.
  const message = typeof result.body.message === 'string' ? result.body.message : '';
  return (
    [401, 403].includes(result.status) &&
    result.body.type === 'general_unauthorized_scope' &&
    /role:\s*applications/.test(message) &&
    /databases\.read/.test(message)
  );
}
export function markerMatches(document: Record<string, unknown>, projectId: string) {
  try {
    const value: unknown = JSON.parse(String(document.valueJson));
    return (
      document.$id === MARKER_ID &&
      document.key === MARKER_KEY &&
      document.public === false &&
      Array.isArray(document.$permissions) &&
      document.$permissions.length === 0 &&
      !!value &&
      typeof value === 'object' &&
      'applicationId' in value &&
      value.applicationId === APPLICATION_ID &&
      'projectId' in value &&
      value.projectId === projectId
    );
  } catch {
    return false;
  }
}
function receiptPath(projectId: string) {
  return resolve('.appwrite', `provisioning-${projectId}.json`);
}
async function receiptFor(endpoint: string, projectId: string): Promise<Receipt | null> {
  try {
    const value = JSON.parse(await readFile(receiptPath(projectId), 'utf8')) as Receipt;
    if (
      value.endpoint !== endpoint ||
      value.projectId !== projectId ||
      value.applicationId !== APPLICATION_ID ||
      !['in_progress', 'completed'].includes(value.status)
    )
      throw new IdentityError('Receipt local incompatível. Não será adotado ou sobrescrito.');
    return value;
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return null;
    throw new IdentityError('Receipt local inválido. Revisão necessária antes de bootstrap.');
  }
}
export async function recordBootstrap(report: IdentityReport, status: Receipt['status']) {
  const previous = await receiptFor(report.endpoint, report.projectId);
  if (previous?.status === 'completed' && status === 'in_progress') return;
  await mkdir(resolve('.appwrite'), { recursive: true });
  // Local non-secret receipt is never a substitute for the remote marker.
  await writeFile(
    receiptPath(report.projectId),
    JSON.stringify(
      {
        endpoint: report.endpoint,
        projectId: report.projectId,
        applicationId: APPLICATION_ID,
        status,
      } satisfies Receipt,
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
export async function verifyReadOnlyIdentity(env: Environment): Promise<IdentityReport> {
  assertDedicatedProject(env); // Must finish before ANY request.
  if (!env.APPWRITE_API_KEY || !env.APPWRITE_AUTH_API_KEY)
    throw new IdentityError('Configure chaves separadas de provisionamento e sessões.');
  // Operação (linhas) e testes entram no mesmo guard: reaproveitar a chave de
  // provisionamento ou a de sessões para escrever linhas apagaria a separação que
  // o desenho exige. Chave ausente é permitida — o core fica desligado, não amplo.
  const configured = [
    env.APPWRITE_API_KEY,
    env.APPWRITE_AUTH_API_KEY,
    env.APPWRITE_TEST_API_KEY,
    env.APPWRITE_OPS_API_KEY,
  ].filter((value): value is string => Boolean(value));
  if (new Set(configured).size !== configured.length)
    throw new IdentityError(
      'Chaves de provisionamento, sessões, testes e operação devem ser distintas. Nenhum escopo será ampliado.',
    );
  const endpoint = env.APPWRITE_ENDPOINT!,
    projectId = env.APPWRITE_PROJECT_ID!;
  // TablesDB: a listagem de bancos vive em /tablesdb. O escopo exigido continua
  // sendo databases.read — o vocabulário mudou, o nome do escopo não.
  const provisioning = await readOnly(endpoint, projectId, env.APPWRITE_API_KEY, '/tablesdb');
  if (!validDatabaseList(provisioning))
    throw new IdentityError(
      `Chave de provisionamento não autorizada no Project ID configurado, ou databases.read ausente (HTTP ${provisioning.status}). Pare e confira a chave no Console; sem fallback.`,
    );
  const auth = await readOnly(endpoint, projectId, env.APPWRITE_AUTH_API_KEY, '/tablesdb');
  let authKey: IdentityReport['authKey'];
  if (scopeDeniedByAuthenticatedKey(auth)) authKey = 'accepted-with-read-denied';
  else if (auth.status === 200 && validDatabaseList(auth)) authKey = 'accepted-over-scoped';
  else
    throw new IdentityError(
      `Chave SSR não comprovada como aceita no projeto configurado (HTTP ${auth.status}). Pode ser chave inválida ou de outro projeto. Não será ampliada ou reutilizada outra chave.`,
    );
  // Prova de aceitação da chave pelo caminho que ela precisa ter. Corpo vazio
  // não cria sessão nenhuma: só interessa se passou da autorização.
  const sessions = await readOnly(
    endpoint,
    projectId,
    env.APPWRITE_AUTH_API_KEY,
    '/account/sessions/email',
    'POST',
  );
  const sessionsWrite: IdentityReport['sessionsWrite'] =
    sessions.status === 400
      ? 'authorized'
      : sessions.status === 401
        ? 'missing'
        : 'pending-real-session-test';
  let testKey: IdentityReport['testKey'] = 'not-configured';
  if (env.APPWRITE_TEST_API_KEY) {
    const probe = await readOnly(endpoint, projectId, env.APPWRITE_TEST_API_KEY, '/tablesdb');
    if (!validDatabaseList(probe))
      throw new IdentityError(
        `Chave de testes não autorizada no projeto configurado (HTTP ${probe.status}).`,
      );
    testKey = 'accepted';
  }
  const receipt = await receiptFor(endpoint, projectId);
  const path = '/tablesdb/nuy-creators/tables/platform_settings/rows';
  const params = new URLSearchParams();
  params.append(
    'queries[]',
    JSON.stringify({ method: 'equal', attribute: 'key', values: [MARKER_KEY] }),
  );
  const marker = await readOnly(endpoint, projectId, env.APPWRITE_API_KEY, `${path}?${params}`);
  let state: IdentityReport['marker'];
  if (marker.status === 200 && Array.isArray(marker.body.rows)) {
    const table = await readOnly(
      endpoint,
      projectId,
      env.APPWRITE_API_KEY,
      '/tablesdb/nuy-creators/tables/platform_settings',
    );
    if (
      table.status !== 200 ||
      table.body.rowSecurity !== true ||
      !Array.isArray(table.body.$permissions) ||
      table.body.$permissions.length !== 0
    )
      throw new IdentityError(
        'Table do marker tem permissões/security divergentes. Marker não pode ser considerado privado; nenhuma escrita autorizada.',
      );
    if (
      marker.body.rows.length === 1 &&
      markerMatches(marker.body.rows[0] as Record<string, unknown>, projectId)
    )
      state = 'verified';
    else if (marker.body.rows.length === 0 && receipt?.status === 'in_progress')
      state = 'bootstrap-resume';
    else
      throw new IdentityError(
        'Marker applicationId ausente, divergente ou duplicado em banco existente. Pare; nenhum marker será reparado/reescrito automaticamente.',
      );
  } else if (
    marker.status === 404 &&
    [
      'database_not_found',
      'table_not_found',
      'row_not_found',
      'collection_not_found',
      'document_not_found',
      'database_collection_not_found',
    ].includes(String(marker.body.type))
  ) {
    if (receipt?.status === 'completed')
      throw new IdentityError(
        'Marker esperado desapareceu após provisionamento concluído. Possível configuração incorreta.',
      );
    const databasePresent = (provisioning.body.databases as { $id: string }[]).some(
      (db) => db.$id === APPLICATION_ID,
    );
    if (databasePresent && receipt?.status !== 'in_progress')
      throw new IdentityError(
        'Banco nuy-creators já existe sem marker/receipt de bootstrap. Adoção automática bloqueada.',
      );
    state = receipt?.status === 'in_progress' ? 'bootstrap-resume' : 'first-bootstrap';
  } else
    throw new IdentityError(
      `Marker não pôde ser verificado (HTTP ${marker.status}). Nenhuma escrita autorizada.`,
    );
  return {
    endpoint,
    projectId,
    expectedProjectId: env.APPWRITE_EXPECTED_PROJECT_ID!,
    environment: env.APPWRITE_TEST_ENVIRONMENT!,
    provisioningKey: 'accepted',
    authKey,
    sessionsWrite,
    testKey,
    marker: state,
  };
}
export async function verifyIntegrationIdentity(env: Environment) {
  assertTestEnvironment(env);
  const report = await verifyReadOnlyIdentity(env);
  if (report.marker !== 'verified' || report.testKey !== 'accepted')
    throw new IdentityError('Integração exige marker remoto válido e chave de teste aceita.');
  // O app roda com a chave de sessões: ela precisa ser mínima e capaz de abrir
  // sessão. Aqui, sim, o perfil dela é requisito — não no provisionamento.
  if (report.authKey !== 'accepted-with-read-denied')
    throw new IdentityError(
      'Chave SSR aceita mas com privilégio excessivo: reduza APPWRITE_AUTH_API_KEY a sessions.write antes de qualificar o app.',
    );
  if (report.sessionsWrite !== 'authorized')
    throw new IdentityError('Chave SSR não comprovou sessions.write. Integração bloqueada.');
  return report;
}
/**
 * Gate dos probes de infraestrutura (transações, atomicidade, concorrência).
 *
 * O que uma rodada de probes precisa é do marker remoto e da chave de teste —
 * ela opera o banco com a chave de testes, não com a chave de sessões do app. A
 * postura da chave SSR é requisito do **app em runtime**, cobrado por
 * `verifyIntegrationIdentity`; misturar as duas coisas bloquearia a prova de
 * transações por um motivo que nada tem a ver com transações. O relatório
 * continua carregando a postura medida, e quem chama é obrigado a mostrá-la.
 */
export async function verifyProbeIdentity(env: Environment) {
  assertTestEnvironment(env);
  const report = await verifyReadOnlyIdentity(env);
  if (report.marker !== 'verified' || report.testKey !== 'accepted')
    throw new IdentityError('Probes exigem marker remoto válido e chave de teste aceita.');
  return report;
}
