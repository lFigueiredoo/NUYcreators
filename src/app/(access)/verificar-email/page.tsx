import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { VerifyScreen } from '@/features/auth/components/auth-recovery-forms';
import { verifyEmailToken } from '@/features/auth/services/actions';
import { authConfigured } from '@/lib/appwrite/server';
import { redirect } from 'next/navigation';

/**
 * Verificação de e-mail na identidade da Proposta C.
 *
 * O link enviado pelo Appwrite chega com `userId`/`secret`, é confirmado no
 * carregamento da página e encaminha a pessoa para o onboarding.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirmar e-mail' };

export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  let verificationError = '';
  if (params.userId && params.secret) {
    const form = new FormData();
    form.set('userId', params.userId);
    form.set('secret', params.secret);
    const result = await verifyEmailToken(form);
    if (result.success) {
      redirect('/onboarding?verification=verified');
    }
    verificationError = result.message;
  }
  return (
    <AuthLayout band="compact">
      <VerifyScreen
        configured={authConfigured()}
        token={{ userId: params.userId ?? '', secret: params.secret ?? '' }}
        initialError={verificationError}
      />
    </AuthLayout>
  );
}
