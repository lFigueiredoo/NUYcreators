import { Permission, Role } from 'node-appwrite';
/** Never grant collection-wide client read/write on private data. */
export const collectionPermissions: string[] = [];
export const bucketPermissions: string[] = [];
export function ownerReadPermissions(userId: string) {
  return [Permission.read(Role.user(userId))];
}
export const adminCapabilities = {
  admin: ['moderate', 'adjust-points', 'manage-catalog', 'fulfill', 'view-audit'],
  moderator: ['moderate'],
  fulfillment: ['fulfill'],
} as const;
export type AdminRole = keyof typeof adminCapabilities;
/** Only pass roles obtained from a verified Appwrite team membership. */
export function roleAllows(role: AdminRole, capability: string) {
  return (adminCapabilities[role] as readonly string[]).includes(capability);
}
