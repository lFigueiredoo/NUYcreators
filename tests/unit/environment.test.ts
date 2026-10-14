import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEnvironment } from '../../src/lib/env/schema';
import { PRODUCTION_PROTECTED_PROJECT_ID } from '../../src/lib/env/protected-project';
afterEach(() => vi.unstubAllEnvs());
it('accepts shared infrastructure only with the explicitly matching expected ID', () => {
  const env = {
    APPWRITE_ENDPOINT: 'https://api.edocs.phiq.com.br/v1',
    APPWRITE_PROJECT_ID: 'nuy-test',
    APPWRITE_EXPECTED_PROJECT_ID: 'nuy-test',
  };
  expect(parseEnvironment(env).APPWRITE_PROJECT_ID).toBe('nuy-test');
  expect(() =>
    parseEnvironment({ ...env, APPWRITE_EXPECTED_PROJECT_ID: 'other-project' }),
  ).toThrow();
});
describe('environment', () => {
  it('rejects a Preview deployment connected to the protected production project', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(() =>
      parseEnvironment({
        APPWRITE_ENDPOINT: 'https://api.edocs.phiq.com.br/v1',
        APPWRITE_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
        APPWRITE_EXPECTED_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
      }),
    ).toThrow('PRODUCTION_PROTECTED');
  });
  it('keeps the protected project available to the Production runtime', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(
      parseEnvironment({
        APPWRITE_ENDPOINT: 'https://api.edocs.phiq.com.br/v1',
        APPWRITE_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
        APPWRITE_EXPECTED_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
        APP_URL: 'https://nuy.example.test',
      }).APPWRITE_PROJECT_ID,
    ).toBe(PRODUCTION_PROTECTED_PROJECT_ID);
  });
  it('permits disconnected development, with critical operations disabled', () => {
    expect(parseEnvironment({}).APPWRITE_TRANSACTIONS_VERIFIED).toBe('false');
  });
  it('rejects partial configuration', () => {
    expect(() => parseEnvironment({ APPWRITE_PROJECT_ID: 'nuy' })).toThrow();
  });
  it('rejects invalid endpoints', () => {
    expect(() =>
      parseEnvironment({ APPWRITE_ENDPOINT: 'invalid', APPWRITE_PROJECT_ID: 'nuy' }),
    ).toThrow();
  });
});
