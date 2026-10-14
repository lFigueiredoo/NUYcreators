import { expect, it } from 'vitest';
import { canModerateComment } from '../../src/features/academy/domain';

it('somente permite transições de moderação explícitas', () => {
  expect(canModerateComment('pending', 'visible')).toBe(true);
  expect(canModerateComment('pending', 'rejected')).toBe(true);
  expect(canModerateComment('visible', 'hidden')).toBe(true);
  expect(canModerateComment('unknown', 'visible')).toBe(false);
  expect(canModerateComment('rejected', 'visible')).toBe(false);
});
