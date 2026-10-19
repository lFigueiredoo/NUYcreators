import { describe, expect, it } from 'vitest';
import { assertC2WriteTarget, C2_ENDPOINT, C2_PROJECT_ID,
  C2_PROJECT_NAME } from '../../infra/appwrite/c2-safety';

const safe = {
  APPWRITE_ENDPOINT: C2_ENDPOINT,
  APPWRITE_PROJECT_ID: C2_PROJECT_ID,
  APPWRITE_EXPECTED_PROJECT_ID: C2_PROJECT_ID,
  APPWRITE_C2_PROJECT_NAME: C2_PROJECT_NAME,
  APPWRITE_C2_SCHEMA_API_KEY: 'staging-only-test-key',
  APPWRITE_DEDICATED_PROJECT_CONFIRMED: 'true',
  APPWRITE_TEST_ENVIRONMENT: 'staging',
  APPWRITE_DATABASE_ID: 'nuy-creators',
  APPWRITE_ADMIN_TEAM_ID: 'nuy-admins',
  APPWRITE_C2_AUTHORIZED_OPERATION: 'provision-academy',
};

describe('C2 write guard', () => {
  it('accepts only the exact approved target and operation', () => {
    expect(() => assertC2WriteTarget(safe, 'provision-academy')).not.toThrow();
    expect(() => assertC2WriteTarget(safe, 'seed-academy')).toThrow();
  });

  it('rejects production even when expected ID and staging label match', () => {
    expect(() => assertC2WriteTarget({ ...safe,
      APPWRITE_PROJECT_ID: '6ac044af0008cbdda070',
      APPWRITE_EXPECTED_PROJECT_ID: '6ac044af0008cbdda070',
    }, 'provision-academy')).toThrow(/PRODUCTION_PROTECTED/);
  });

  it('rejects wrong endpoint, name, missing key and missing confirmation', () => {
    for (const change of [
      { APPWRITE_ENDPOINT: 'https://other.example/v1' },
      { APPWRITE_C2_PROJECT_NAME: 'staging' },
      { APPWRITE_C2_SCHEMA_API_KEY: '' },
      { APPWRITE_DEDICATED_PROJECT_CONFIRMED: 'false' },
    ]) expect(() => assertC2WriteTarget({ ...safe, ...change },
      'provision-academy')).toThrow();
  });

  it('requires a separate rows key for row operations', () => {
    expect(() => assertC2WriteTarget({ ...safe,
      APPWRITE_C2_AUTHORIZED_OPERATION: 'seed-academy',
    }, 'seed-academy')).toThrow(/chave exclusiva/);
    expect(() => assertC2WriteTarget({ ...safe,
      APPWRITE_C2_ROWS_API_KEY: 'rows-only-test-key',
      APPWRITE_C2_AUTHORIZED_OPERATION: 'seed-academy',
    }, 'seed-academy')).not.toThrow();
  });
});
