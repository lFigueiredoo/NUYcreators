import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { VerifyScreen } from '@/features/auth/components/auth-recovery-forms';
import { authConfigured } from '@/lib/appwrite/server';

/**
 * Verificação de e-mail na identidade da Proposta C.
 *
 * O link enviado pelo Appwrite chega com `userId`/`secret` e a confirmação
 * continua sendo o mesmo clique que dispara `verifyAction` — nada é confirmado
 * sozinho no carregamento da página.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirmar e-mail' };

export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthLayout band="compact">
      <VerifyScreen
        configured={authConfigured()}
        token={{ userId: params.userId ?? '', secret: params.secret ?? '' }}
      />
    </AuthLayout>
  );
}
