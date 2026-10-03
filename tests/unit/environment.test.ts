import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/lib/env/schema';
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
