import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { VerifyScreen } from '@/features/auth/components/auth-recovery-forms';
import { parseActionToken, VERIFICATION_TOKEN_COOKIE } from '@/features/auth/services/action-token';
import { authConfigured } from '@/lib/appwrite/server';
import { cookies } from 'next/headers';

/**
 * Verificação de e-mail na identidade da Proposta C.
 *
 * O Proxy guarda `userId`/`secret` em cookie HttpOnly e limpa a URL. Abrir esta
 * página nunca altera a conta: somente o POST explícito do botão confirma.
 */
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Confirmar e-mail',
  robots: { index: false, follow: false },
};

export default async function Verify() {
  const token = parseActionToken((await cookies()).get(VERIFICATION_TOKEN_COOKIE)?.value);
  return (
    <AuthLayout band="compact">
      <VerifyScreen configured={authConfigured()} hasToken={Boolean(token)} />
    </AuthLayout>
  );
}
