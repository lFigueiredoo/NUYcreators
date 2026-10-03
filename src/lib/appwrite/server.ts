import 'server-only';
import { Account, Client } from 'node-appwrite';
import { cookies } from 'next/headers';
import { getEnvironment } from '@/lib/env/server';
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
