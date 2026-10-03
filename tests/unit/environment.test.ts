import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/lib/env/schema';
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
