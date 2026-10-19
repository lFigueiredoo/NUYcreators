import { assertDedicatedProject, PRODUCTION_PROTECTED_PROJECT_ID } from './safety';
import { execSync } from 'node:child_process';

export const C2_ENDPOINT = 'https://api.edocs.phiq.com.br/v1';
export const C2_PROJECT_ID = '6ad55be5003719f6b399';
export const C2_PROJECT_NAME = 'NUY Creators — Academia Staging';
const c2Operations = {
  'inspect-academy': { key: 'APPWRITE_C2_SCHEMA_API_KEY', probe: '/tablesdb' },
  'provision-academy': { key: 'APPWRITE_C2_SCHEMA_API_KEY', probe: '/tablesdb' },
  'provision-challenge-tests': { key: 'APPWRITE_C2_SCHEMA_API_KEY', probe: '/tablesdb' },
  'seed-academy': { key: 'APPWRITE_C2_ROWS_API_KEY',
    probe: '/tablesdb/nuy-creators/tables/academy_categories/rows' },
  'test-academy': { key: 'APPWRITE_C2_ROWS_API_KEY',
    probe: '/tablesdb/nuy-creators/tables/academy_categories/rows' },
  'provision-identities': { key: 'APPWRITE_C2_IDENTITY_API_KEY', probe: '/users' },
} as const;
export type C2Operation = keyof typeof c2Operations;

/** Every C2 writer must opt in to one named operation before making a request. */
export function assertC2WriteTarget(
  env: Record<string, string | undefined>, operation: C2Operation,
) {
  assertDedicatedProject(env);
  if (env.APPWRITE_PROJECT_ID === PRODUCTION_PROTECTED_PROJECT_ID)
    throw new Error('PRODUCTION_PROTECTED: escrita C2 recusada.');
  if (env.APPWRITE_ENDPOINT !== C2_ENDPOINT ||
      env.APPWRITE_PROJECT_ID !== C2_PROJECT_ID ||
      env.APPWRITE_EXPECTED_PROJECT_ID !== C2_PROJECT_ID ||
      env.APPWRITE_C2_PROJECT_NAME !== C2_PROJECT_NAME)
    throw new Error('C2: endpoint, ID ou nome do projeto divergente.');
  if (env.APPWRITE_C2_AUTHORIZED_OPERATION !== operation)
    throw new Error(`C2: operação ${operation} não autorizada nesta execução.`);
  if (!env[c2Operations[operation].key])
    throw new Error('C2: chave exclusiva do projeto staging ausente.');
}

/** Verify Console identity and that this key is accepted only by staging. */
export async function verifyC2WriteTarget(
  env: Record<string, string | undefined>, operation: C2Operation,
) {
  assertC2WriteTarget(env, operation);
  const cliEnv = { ...process.env };
  delete cliEnv.APPWRITE_C2_SCHEMA_API_KEY;
  delete cliEnv.APPWRITE_C2_ROWS_API_KEY;
  delete cliEnv.APPWRITE_C2_IDENTITY_API_KEY;
  let listed: { projects?: { $id?: string; name?: string; endpoint?: string }[] };
  try {
    // Constant, read-only command. Console session is independent of API keys.
    const raw = execSync('appwrite list-projects --json', {
      encoding: 'utf8', timeout: 20000, windowsHide: true, env: cliEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    listed = JSON.parse(raw.slice(raw.indexOf('{'))) as typeof listed;
  } catch {
    throw new Error('C2: identidade via sessão Console indisponível; escrita recusada.');
  }
  const matches = listed.projects?.filter((project) => project.$id === C2_PROJECT_ID) ?? [];
  if (matches.length !== 1 || matches[0].name !== C2_PROJECT_NAME ||
      matches[0].endpoint !== C2_ENDPOINT)
    throw new Error('C2: identidade do staging divergente no Console; escrita recusada.');
  const profile = c2Operations[operation];
  const privateProductionProbe = operation === 'seed-academy' || operation === 'test-academy';
  const productionPath = privateProductionProbe
    ? '/tablesdb/nuy-creators/tables/users/rows?queries%5B0%5D=%7B%22method%22%3A%22limit%22%2C%22values%22%3A%5B1%5D%7D'
    : profile.probe;
  const headers = {
    'X-Appwrite-Project': C2_PROJECT_ID,
    'X-Appwrite-Key': env[profile.key]!,
  };
  const [scopeResponse, productionResponse, versionResponse] = await Promise.all([
    fetch(`${C2_ENDPOINT}${profile.probe}`, {
      method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(20000),
    }),
    fetch(`${C2_ENDPOINT}${productionPath}`, {
      method: 'GET', headers: { ...headers,
        'X-Appwrite-Project': PRODUCTION_PROTECTED_PROJECT_ID },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    }),
    fetch(`${C2_ENDPOINT}/health/version`, {
      method: 'GET', headers: { 'X-Appwrite-Project': C2_PROJECT_ID },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    }),
  ]);
  let privateProductionRowsHidden = false;
  if (privateProductionProbe && productionResponse.ok) {
    const body = await productionResponse.json() as { total?: number; rows?: unknown[] };
    privateProductionRowsHidden = body.total === 0 && Array.isArray(body.rows) &&
      body.rows.length === 0;
  }
  if (!scopeResponse.ok ||
      !([401, 403].includes(productionResponse.status) || privateProductionRowsHidden) ||
      !versionResponse.ok)
    throw new Error('C2: chave, isolamento ou versão não comprovados; escrita recusada.');
  const version = await versionResponse.json() as { version?: string };
  if (version.version !== '2.2.0')
    throw new Error('C2: identidade ou versão remota divergente; escrita recusada.');
  return { projectId: C2_PROJECT_ID, projectName: C2_PROJECT_NAME,
    version: version.version };
}
