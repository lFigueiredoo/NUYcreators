import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  APPLICATION_ID,
  MARKER_ID,
  MARKER_KEY,
  markerMatches,
  verifyIntegrationIdentity,
  verifyReadOnlyIdentity,
} from '../../infra/appwrite/identity';
const env = {
  APPWRITE_ENDPOINT: 'https://shared-appwrite.example.test/v1',
  APPWRITE_PROJECT_ID: 'isolated-identity-unit-test',
  APPWRITE_EXPECTED_PROJECT_ID: 'isolated-identity-unit-test',
  APPWRITE_DEDICATED_PROJECT_CONFIRMED: 'true',
  APPWRITE_TEST_ENVIRONMENT: 'staging',
  APPWRITE_API_KEY: 'fixture-provision-key',
  APPWRITE_AUTH_API_KEY: 'fixture-auth-key',
  APPWRITE_TEST_API_KEY: 'fixture-test-key',
};
const marker = {
  $id: MARKER_ID,
  key: MARKER_KEY,
  valueJson: JSON.stringify({ applicationId: APPLICATION_ID, projectId: env.APPWRITE_PROJECT_ID }),
  public: false,
  $permissions: [],
};
/** 401 autenticado, com o escopo negado — não um 401 genérico. */
const deniedScope = () =>
  respond(401, {
    type: 'general_unauthorized_scope',
    message: 'User (role: applications) missing scopes (["databases.read"])',
  });
const fetchMock = vi.fn();
function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}
type ProbeOverrides = {
  auth?: () => Response;
  sessions?: () => Response;
  rows?: () => Response;
  /** Repete a sequência inteira: a qualificação do app sonda tudo de novo. */
  times?: number;
};
/**
 * Sondagens na ordem real da verificação: provisionamento, chave SSR,
 * sessions.write, chave de teste, marker e table do marker.
 */
function acceptedReads(overrides: ProbeOverrides = {}) {
  const { auth = deniedScope, sessions, rows, times = 1 } = overrides;
  const ok = () => respond(200, { total: 1, databases: [{ $id: 'nuy-creators' }] });
  for (let round = 0; round < times; round++)
    fetchMock
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(auth())
      .mockResolvedValueOnce(sessions?.() ?? respond(400, { type: 'general_argument_invalid' }))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(rows?.() ?? respond(200, { total: 1, rows: [marker] }))
      .mockResolvedValueOnce(respond(200, { rowSecurity: true, $permissions: [] }));
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
it('fails before network when expected ID is missing or different', async () => {
  await expect(
    verifyReadOnlyIdentity({ ...env, APPWRITE_EXPECTED_PROJECT_ID: '' }),
  ).rejects.toThrow('ausente');
  await expect(
    verifyReadOnlyIdentity({ ...env, APPWRITE_EXPECTED_PROJECT_ID: 'other-project' }),
  ).rejects.toThrow('difere');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('requires authorized dev/staging and does not silently reuse a credential', async () => {
  await expect(
    verifyReadOnlyIdentity({ ...env, APPWRITE_TEST_ENVIRONMENT: 'production' }),
  ).rejects.toThrow();
  await expect(
    verifyReadOnlyIdentity({ ...env, APPWRITE_AUTH_API_KEY: env.APPWRITE_API_KEY }),
  ).rejects.toThrow('distintas');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('uses only authenticated GETs plus the one non-writing session probe', async () => {
  acceptedReads();
  const result = await verifyReadOnlyIdentity(env);
  expect(result.marker).toBe('verified');
  expect(result.sessionsWrite).toBe('authorized');
  expect(result.authKey).toBe('accepted-with-read-denied');
  expect(fetchMock).toHaveBeenCalledTimes(6);
  for (const [url, options] of fetchMock.mock.calls) {
    expect(String(url)).toMatch(/^https:\/\/shared-appwrite\.example\.test\/v1\//);
    expect(options.redirect).toBe('error');
    expect(options.headers['X-Appwrite-Project']).toBe(env.APPWRITE_PROJECT_ID);
    if (String(url).includes('/account/sessions/email')) {
      expect(options.method).toBe('POST');
      expect(options.body).toBe('{}');
    } else {
      expect(options.method).toBe('GET');
    }
  }
});
it('stops on an invalid provisioning key without trying another project', async () => {
  fetchMock.mockResolvedValueOnce(
    respond(401, { message: 'sensitive mocked response', type: 'general_unauthorized' }),
  );
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow(
    'Chave de provisionamento não autorizada',
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('never treats a plain SSR 401 as proof of an authenticated key', async () => {
  fetchMock.mockResolvedValueOnce(respond(200, { total: 0, databases: [] })).mockResolvedValueOnce(
    respond(401, {
      type: 'general_unauthorized_scope',
      message: 'Invalid key or guests missing scope',
    }),
  );
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('Chave SSR não comprovada');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('provisiona com chave SSR larga, mas não qualifica o app com ela', async () => {
  acceptedReads({
    auth: () => respond(200, { total: 1, databases: [{ $id: 'nuy-creators' }] }),
    times: 2,
  });
  const report = await verifyReadOnlyIdentity(env);
  expect(report.authKey).toBe('accepted-over-scoped');
  await expect(
    verifyIntegrationIdentity({ ...env, APPWRITE_RUN_INTEGRATION_TESTS: 'true' }),
  ).rejects.toThrow('privilégio excessivo');
});
it('bloqueia a qualificação do app quando sessions.write não é comprovado', async () => {
  acceptedReads({ sessions: () => respond(401, { type: 'general_unauthorized_scope' }), times: 2 });
  const report = await verifyReadOnlyIdentity(env);
  expect(report.sessionsWrite).toBe('missing');
  await expect(
    verifyIntegrationIdentity({ ...env, APPWRITE_RUN_INTEGRATION_TESTS: 'true' }),
  ).rejects.toThrow('sessions.write');
});
it('allows the first bootstrap only when its database is absent', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(200, { total: 0, databases: [] }))
    .mockResolvedValueOnce(deniedScope())
    .mockResolvedValueOnce(respond(400, { type: 'general_argument_invalid' }))
    .mockResolvedValueOnce(respond(200, { total: 0, databases: [] }))
    .mockResolvedValueOnce(respond(404, { type: 'database_not_found' }));
  expect((await verifyReadOnlyIdentity(env)).marker).toBe('first-bootstrap');
});
it('does not adopt an existing unmarked database automatically', async () => {
  acceptedReads({ rows: () => respond(200, { total: 0, rows: [] }) });
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('Marker applicationId ausente');
});
it('rejects a divergent marker without repairing it', async () => {
  acceptedReads({
    rows: () =>
      respond(200, {
        total: 1,
        rows: [
          {
            ...marker,
            valueJson: JSON.stringify({
              applicationId: 'edocs',
              projectId: env.APPWRITE_PROJECT_ID,
            }),
          },
        ],
      }),
  });
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('divergente');
});
it('requires a private marker row bound to the approved project', () => {
  expect(markerMatches(marker, env.APPWRITE_PROJECT_ID)).toBe(true);
  expect(markerMatches(marker, 'other-project')).toBe(false);
  expect(markerMatches({ ...marker, public: true }, env.APPWRITE_PROJECT_ID)).toBe(false);
  expect(markerMatches({ ...marker, $permissions: ['read("any")'] }, env.APPWRITE_PROJECT_ID)).toBe(
    false,
  );
});
it('does not expose network failures or response bodies', async () => {
  fetchMock.mockRejectedValue(new Error('simulated request with secret fixture-provision-key'));
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('Sondagem de leitura indisponível');
});
