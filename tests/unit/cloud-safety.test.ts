import { expect, it } from 'vitest';
import {
  assertAppwriteEndpoint,
  assertDedicatedProject,
  assertTestEnvironment,
} from '../../infra/appwrite/safety';
import { confirmedRoles, hasCapability } from '../../src/lib/security/memberships';
it('permits shared infrastructure endpoints without inferring project identity from the hostname', () => {
  expect(() => assertAppwriteEndpoint('https://api.edocs.phiq.com.br/v1')).not.toThrow();
  expect(() => assertAppwriteEndpoint('https://fra.cloud.appwrite.io/v1')).not.toThrow();
  for (const endpoint of [
    'http://fra.cloud.appwrite.io/v1',
    'https://token@fra.cloud.appwrite.io/v1',
    'https://api.edocs.phiq.com.br/v1?key=sensitive',
    'https://api.edocs.phiq.com.br/v1#token',
  ])
    expect(() => assertAppwriteEndpoint(endpoint)).toThrow();
});
it('requires an independently configured expected project ID', () => {
  const env = {
    APPWRITE_ENDPOINT: 'https://api.edocs.phiq.com.br/v1',
    APPWRITE_PROJECT_ID: 'nuy-test',
    APPWRITE_DEDICATED_PROJECT_CONFIRMED: 'true',
    APPWRITE_TEST_ENVIRONMENT: 'staging',
  };
  expect(() => assertDedicatedProject(env)).toThrow('APPWRITE_EXPECTED_PROJECT_ID ausente');
  expect(() =>
    assertDedicatedProject({ ...env, APPWRITE_EXPECTED_PROJECT_ID: 'another-project' }),
  ).toThrow('difere');
  expect(() =>
    assertDedicatedProject({ ...env, APPWRITE_EXPECTED_PROJECT_ID: 'nuy-test' }),
  ).not.toThrow();
  expect(() =>
    assertDedicatedProject({
      ...env,
      APPWRITE_EXPECTED_PROJECT_ID: 'nuy-test',
      APPWRITE_DATABASE_ID: 'edocs',
    }),
  ).toThrow();
});
it('refuses integration tests outside explicitly confirmed staging/dev', () => {
  expect(() =>
    assertTestEnvironment({
      APPWRITE_ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
      APPWRITE_PROJECT_ID: 'test',
      APPWRITE_EXPECTED_PROJECT_ID: 'test',
      APPWRITE_DEDICATED_PROJECT_CONFIRMED: 'true',
      APPWRITE_TEST_API_KEY: 'test-only',
      APPWRITE_RUN_INTEGRATION_TESTS: 'true',
      APPWRITE_TEST_ENVIRONMENT: 'production',
    }),
  ).toThrow();
});
it('does not trust unconfirmed membership, another team or payload roles', () => {
  const membership = { userId: 'user', teamId: 'nuy-admins', confirm: false, roles: ['admin'] };
  expect(confirmedRoles([membership], 'user', 'nuy-admins')).toEqual([]);
  expect(confirmedRoles([{ ...membership, confirm: true }], 'other-user', 'nuy-admins')).toEqual(
    [],
  );
  expect(confirmedRoles([{ ...membership, confirm: true }], 'user', 'other-team')).toEqual([]);
  const roles = confirmedRoles(
    [{ ...membership, confirm: true, roles: ['moderator', 'owner', 'invented'] }],
    'user',
    'nuy-admins',
  );
  expect(roles).toEqual(['moderator']);
  expect(hasCapability(roles, 'adjust-points')).toBe(false);
});
