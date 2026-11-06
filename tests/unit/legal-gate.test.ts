import { expect, it } from 'vitest';
import { parseEnvironment } from '../../src/lib/env/schema';
import { termsAreCurrent } from '../../src/features/legal/services/consent';
import {
  CURRENT_LEGAL_CONSENT_VERSION,
  CURRENT_TERMS_VERSION,
} from '../../src/features/legal/versions';
it('keeps registration disabled without approved policy', () => {
  expect(() => parseEnvironment({ APPWRITE_REGISTRATION_ENABLED: 'true' })).toThrow();
  expect(parseEnvironment({ NUY_MINIMUM_AGE: '' }).NUY_MINIMUM_AGE).toBeUndefined();
});

it('exige novo aceite quando a versão dos Termos ou da Privacidade muda', () => {
  const userId = 'creator-1';
  expect(
    termsAreCurrent(
      {
        authUserId: userId,
        status: 'active',
        acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
      },
      userId,
    ),
  ).toBe(true);
  expect(
    termsAreCurrent(
      { authUserId: userId, status: 'active', acceptedTermsVersion: 'versao-anterior' },
      userId,
    ),
  ).toBe(false);
  expect(
    termsAreCurrent(
      {
        authUserId: userId,
        status: 'active',
        acceptedTermsVersion: `terms:${CURRENT_TERMS_VERSION}|privacy:versao-anterior`,
      },
      userId,
    ),
  ).toBe(false);
  expect(
    termsAreCurrent(
      {
        authUserId: 'outra-conta',
        status: 'active',
        acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
      },
      userId,
    ),
  ).toBe(false);
});
