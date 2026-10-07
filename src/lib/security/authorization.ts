import 'server-only';
import { cache } from 'react';
import { Teams, Query } from 'node-appwrite';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentUser, SESSION_COOKIE, sessionClient } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { hasCapability, ownTeamRoles } from './memberships';
import type { AdminRole } from './permissions';

/**
 * Papéis da sessão, apurados da equipe `nuy-admins`.
 *
 * Vale para duas coisas: decidir se uma PÁGINA abre (`requireStaff`) e compor o
 * ator de um COMANDO (`sessionRoles`). Uma única apuração para os dois, porque a
 * regra é a mesma e não pode divergir entre "viu a tela" e "executou a ação".
 *
 * Falha de leitura devolve lista vazia: sem papel confirmado não há privilégio —
 * o caminho conservador é sempre negar.
 *
 * `cache` é por REQUISIÇÃO: o layout do /admin e a página que ele embrulha pedem
 * os mesmos papéis, e não há motivo para ler a mesma membership duas vezes no mesmo
 * pedido. Duas requisições nunca compartilham resultado.
 */
export const sessionRoles = cache(async (secret: string, userId: string): Promise<AdminRole[]> => {
  const teamId = getEnvironment().APPWRITE_ADMIN_TEAM_ID;
  try {
    // A listagem de sessão redige a identidade (medido): o filtro por `userId`
    // precisa vir daqui, e `ownTeamRoles` cobra esse contrato.
    const membership = await new Teams(sessionClient(secret)).listMemberships({
      teamId,
      queries: [Query.equal('userId', userId), Query.limit(100)],
    });
    return ownTeamRoles(membership.memberships, userId, teamId);
  } catch (error) {
    if (![401, 403, 404].includes((error as { code?: number }).code ?? 0)) throw error;
    return [];
  }
});

export async function requireSession() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireStaff(capability?: string) {
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)!.value;
  const roles = await sessionRoles(secret, user.$id);
  if (!roles.length || (capability && !hasCapability(roles, capability)))
    redirect('/app?access=denied');
  return { user, roles };
}
