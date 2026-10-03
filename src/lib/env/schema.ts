import { z } from 'zod';
export const environmentSchema = z.object({
  APPWRITE_ENDPOINT: z.union([z.url(), z.literal('')]).optional(),
  APPWRITE_PROJECT_ID: z.string().optional(),
  APPWRITE_DATABASE_ID: z.string().default('nuy-creators'),
  APPWRITE_ADMIN_TEAM_ID: z.string().default('nuy-admins'),
  APP_URL: z.url().default('http://localhost:3000'),
  APPWRITE_FUNCTIONS_ENABLED: z.enum(['true', 'false']).default('false'),
  APPWRITE_TRANSACTIONS_VERIFIED: z.enum(['true', 'false']).default('false'),
  APPWRITE_REGISTRATION_ENABLED: z.enum(['true', 'false']).default('false'),
  AUTH_RATE_LIMIT_VERIFIED: z.enum(['true', 'false']).default('false'),
  NUY_TERMS_VERSION: z.string().optional(),
  NUY_MINIMUM_AGE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(18).max(100).optional(),
  ),
});
export function parseEnvironment(input: Record<string, string | undefined>) {
  const env = environmentSchema.parse(input);
  if (Boolean(env.APPWRITE_ENDPOINT) !== Boolean(env.APPWRITE_PROJECT_ID)) {
    throw new Error('Configure endpoint e projeto Appwrite juntos.');
  }
  if (
    env.APPWRITE_REGISTRATION_ENABLED === 'true' &&
    (!env.NUY_TERMS_VERSION || !env.NUY_MINIMUM_AGE)
  ) {
    throw new Error('Cadastro exige versão de termos e política de idade mínima aprovadas.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !env.APP_URL.startsWith('https://') &&
    env.APPWRITE_PROJECT_ID
  ) {
    throw new Error('APP_URL deve usar HTTPS em produção conectada.');
  }
  return env;
}
