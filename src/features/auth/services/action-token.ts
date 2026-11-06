export const RESET_TOKEN_COOKIE = 'nuy_reset_token';
export const VERIFICATION_TOKEN_COOKIE = 'nuy_verification_token';
export const RESET_TOKEN_PATH = '/redefinir-senha';
export const VERIFICATION_TOKEN_PATH = '/verificar-email';
export const ACTION_TOKEN_MAX_AGE_SECONDS = 15 * 60;

export type ActionToken = { userId: string; secret: string };

const USER_ID = /^[A-Za-z0-9._-]{1,36}$/;
const DEFINITIVE_TOKEN_HTTP_CODES = new Set([400, 401, 404, 409, 410, 422]);

/**
 * Só descarta o segredo quando o Appwrite confirmou que a tentativa não pode
 * ser repetida. Falha de rede, indisponibilidade, timeout e rate limit mantêm o
 * cookie curto para a pessoa tentar de novo sem expor o token na URL.
 */
export function definitiveActionTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; type?: unknown };
  if (
    typeof value.type === 'string' &&
    ['user_invalid_token', 'user_token_expired', 'user_not_found'].includes(value.type)
  )
    return true;
  return typeof value.code === 'number' && DEFINITIVE_TOKEN_HTTP_CODES.has(value.code);
}

export function validActionToken(value: unknown): value is ActionToken {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const token = value as Partial<ActionToken>;
  return (
    typeof token.userId === 'string' &&
    USER_ID.test(token.userId) &&
    typeof token.secret === 'string' &&
    token.secret.length >= 1 &&
    token.secret.length <= 512
  );
}

export function serializeActionToken(token: ActionToken): string | null {
  if (!validActionToken(token)) return null;
  return Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');
}

export function parseActionToken(value: string | undefined): ActionToken | null {
  if (!value || value.length > 1024) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    return validActionToken(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
