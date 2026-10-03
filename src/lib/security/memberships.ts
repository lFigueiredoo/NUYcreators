import { roleAllows, type AdminRole } from './permissions';
type Membership = { userId: string; teamId: string; confirm: boolean; roles: string[] };
export function confirmedRoles(
  memberships: Membership[],
  userId: string,
  teamId: string,
): AdminRole[] {
  return [
    ...new Set(
      memberships
        .filter(
          (membership) =>
            membership.userId === userId && membership.teamId === teamId && membership.confirm,
        )
        .flatMap((membership) =>
          membership.roles.filter((role): role is AdminRole =>
            ['admin', 'moderator', 'fulfillment'].includes(role),
          ),
        ),
    ),
  ];
}
export function hasCapability(roles: AdminRole[], capability: string) {
  return roles.some((role) => roleAllows(role, capability));
}
