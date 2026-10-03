import { expect, it } from 'vitest';
import { parseEnvironment } from '../../src/lib/env/schema';
it('keeps registration disabled without approved policy', () => {
  expect(() => parseEnvironment({ APPWRITE_REGISTRATION_ENABLED: 'true' })).toThrow();
  expect(parseEnvironment({ NUY_MINIMUM_AGE: '' }).NUY_MINIMUM_AGE).toBeUndefined();
});
