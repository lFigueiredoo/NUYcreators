import 'server-only';
import { Account, Client } from 'node-appwrite';
import { cookies } from 'next/headers';
import { getEnvironment } from '@/lib/env/server';
import { databaseId, getTableRow, sessionTables } from '@/lib/appwrite/data';
export const SESSION_COOKIE = 'nuy-session';
export function createAccount(secret?: string) {
  const env = getEnvironment();
  if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID)
    throw new Error('Appwrite ainda não configurado.');
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID);
  if (secret) client.setSession(secret);
  return new Account(client);
}
export async function currentUser() {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return null;
  try {
    return await createAccount(secret).get();
  } catch (error) {
    if ((error as { code?: number }).code === 401) return null;
    throw error;
  }
}
export function authConfigured() {
  const env = getEnvironment();
  return Boolean(
    env.APPWRITE_ENDPOINT &&
    env.APPWRITE_PROJECT_ID &&
    process.env.APPWRITE_AUTH_API_KEY &&
    (process.env.NODE_ENV !== 'production' || env.AUTH_RATE_LIMIT_VERIFIED === 'true'),
  );
}
export function createSessionAccount() {
  const env = getEnvironment();
  if (!authConfigured()) throw new Error('Autenticação ainda não configurada.');
  return new Account(
    new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT!)
      .setProject(env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_AUTH_API_KEY!),
  );
}
export function registrationConfigured() {
  return authConfigured() && getEnvironment().APPWRITE_REGISTRATION_ENABLED === 'true';
}
export function sessionClient(secret: string) {
  const env = getEnvironment();
  return new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT!)
    .setProject(env.APPWRITE_PROJECT_ID!)
    .setSession(secret);
}
/**
 * Perfil privado do próprio usuário (linha `profiles/{userId}`), lido com a
 * sessão dele — a linha é criada com `read(user:userId)`, então nenhuma key de
 * admin é necessária. Linha ausente é estado normal (perfil ainda não criado) e
 * devolve `null`; falha real sobe para quem chamou decidir.
 */
export async function readOwnProfile(
  secret: string,
  userId: string,
): Promise<{ onboardingCompletedAt?: unknown } | null> {
  try {
    const row = await getTableRow(sessionTables(secret), {
      databaseId: databaseId(),
      tableId: 'profiles',
      rowId: userId,
    });
    // A tabela não tem schema no SDK: o único campo lido é o marcador de
    // conclusão que a função `complete-onboarding` grava por último.
    return {
      onboardingCompletedAt: (row as { onboardingCompletedAt?: unknown }).onboardingCompletedAt,
    };
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}
