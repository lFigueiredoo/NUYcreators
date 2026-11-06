import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { ResetScreen } from '@/features/auth/components/auth-recovery-forms';
import { authConfigured } from '@/lib/appwrite/server';
import { cookies } from 'next/headers';
import { parseActionToken, RESET_TOKEN_COOKIE } from '@/features/auth/services/action-token';

/**
 * Redefinição de senha na identidade da Proposta C.
 *
 * O Proxy troca `userId`/`secret` por cookie HttpOnly e redireciona para esta
 * URL limpa. A página só sabe se existe um token válido; nunca recebe seu valor.
 */
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Criar nova senha',
  robots: { index: false, follow: false },
};

export default async function Reset() {
  const token = parseActionToken((await cookies()).get(RESET_TOKEN_COOKIE)?.value);
  return (
    <AuthLayout band="tall">
      <ResetScreen configured={authConfigured()} hasToken={Boolean(token)} />
    </AuthLayout>
  );
}
