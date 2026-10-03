import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  APPLICATION_ID,
  MARKER_ID,
  MARKER_KEY,
  markerMatches,
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
};
const marker = {
  $id: MARKER_ID,
  key: MARKER_KEY,
  valueJson: JSON.stringify({ applicationId: APPLICATION_ID, projectId: env.APPWRITE_PROJECT_ID }),
  public: false,
  $permissions: [],
};
const fetchMock = vi.fn();
function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}
function acceptedReads(markerResponse = respond(200, { documents: [marker] })) {
  fetchMock
    .mockResolvedValueOnce(respond(200, { total: 1, databases: [{ $id: 'nuy-creators' }] }))
    .mockResolvedValueOnce(
      respond(401, {
        type: 'general_unauthorized_scope',
        message: 'User (role: applications) missing scope (databases.read)',
      }),
    )
    .mockResolvedValueOnce(markerResponse)
    .mockResolvedValueOnce(respond(200, { documentSecurity: true, $permissions: [] }));
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
it('uses only GET with one exact project and rejects redirects', async () => {
  acceptedReads();
  const result = await verifyReadOnlyIdentity(env);
  expect(result.marker).toBe('verified');
  expect(result.sessionsWrite).toBe('pending-real-session-test');
  expect(fetchMock).toHaveBeenCalledTimes(4);
  for (const [url, options] of fetchMock.mock.calls) {
    expect(String(url)).toMatch(/^https:\/\/shared-appwrite\.example\.test\/v1\//);
    expect(options.method).toBe('GET');
    expect(options.redirect).toBe('error');
    expect(options.headers['X-Appwrite-Project']).toBe(env.APPWRITE_PROJECT_ID);
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
it('rejects an SSR key that can read administrative databases', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(200, { total: 0, databases: [] }))
    .mockResolvedValueOnce(respond(200, { total: 0, databases: [] }));
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('privilégio excessivo');
});
it('allows the first bootstrap only when its database is absent', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(200, { total: 0, databases: [] }))
    .mockResolvedValueOnce(
      respond(401, {
        type: 'general_unauthorized_scope',
        message: 'User (role: applications) missing scope (databases.read)',
      }),
    )
    .mockResolvedValueOnce(respond(404, { type: 'database_not_found' }));
  expect((await verifyReadOnlyIdentity(env)).marker).toBe('first-bootstrap');
});
it('does not adopt an existing unmarked database automatically', async () => {
  acceptedReads(respond(200, { documents: [] }));
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('Marker applicationId ausente');
});
it('rejects a divergent marker without repairing it', async () => {
  acceptedReads(
    respond(200, {
      documents: [
        {
          ...marker,
          valueJson: JSON.stringify({ applicationId: 'edocs', projectId: env.APPWRITE_PROJECT_ID }),
        },
      ],
    }),
  );
  await expect(verifyReadOnlyIdentity(env)).rejects.toThrow('divergente');
});
it('requires a private marker bound to the approved project', () => {
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
