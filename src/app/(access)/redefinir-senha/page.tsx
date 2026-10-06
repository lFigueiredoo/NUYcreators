import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { ResetScreen } from '@/features/auth/components/auth-recovery-forms';
import { authConfigured } from '@/lib/appwrite/server';

/**
 * Redefinição de senha na identidade da Proposta C.
 *
 * Os tokens do link (`userId`/`secret`) continuam vindo dos `searchParams` e
 * indo nos mesmos campos ocultos para a mesma `resetAction`; sem eles a tela
 * não oferece um formulário que não teria o que enviar.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar nova senha' };

export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthLayout band="tall">
      <ResetScreen
        configured={authConfigured()}
        token={{ userId: params.userId ?? '', secret: params.secret ?? '' }}
      />
    </AuthLayout>
  );
}
