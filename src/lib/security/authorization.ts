import 'server-only';
import { Teams, Query } from 'node-appwrite';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentUser, SESSION_COOKIE, sessionClient } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { confirmedRoles, hasCapability } from './memberships';
export async function requireSession() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}
export async function requireStaff(capability?: string) {
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)!.value;
  const teamId = getEnvironment().APPWRITE_ADMIN_TEAM_ID;
  let roles;
  try {
    const membership = await new Teams(sessionClient(secret)).listMemberships({
      teamId,
      queries: [Query.equal('userId', user.$id), Query.limit(100)],
    });
    roles = confirmedRoles(membership.memberships, user.$id, teamId);
  } catch (error) {
    if (![401, 403, 404].includes((error as { code?: number }).code ?? 0)) throw error;
    redirect('/app?access=denied');
  }
  if (!roles.length || (capability && !hasCapability(roles, capability)))
    redirect('/app?access=denied');
  return { user, roles };
}
