import { expect, it } from 'vitest';
import {
  collectionPermissions,
  bucketPermissions,
  ownerReadPermissions,
  roleAllows,
} from '../../src/lib/security/permissions';
it('denies all collection and bucket access by default', () => {
  expect(collectionPermissions).toEqual([]);
  expect(bucketPermissions).toEqual([]);
});
it('gives owners read-only document access', () => {
  expect(ownerReadPermissions('owner')).toEqual(['read("user:owner")']);
});
it('separates admin capabilities', () => {
  expect(roleAllows('moderator', 'adjust-points')).toBe(false);
  expect(roleAllows('fulfillment', 'moderate')).toBe(false);
  expect(roleAllows('admin', 'adjust-points')).toBe(true);
});
