import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { RecoveryScreen } from '@/features/auth/components/auth-recovery-forms';
import { authConfigured } from '@/lib/appwrite/server';

/**
 * Recuperação de senha na identidade da Proposta C.
 *
 * `recoveryAction` continua a mesma, com o mesmo campo `email` e a resposta
 * uniforme que não revela se a conta existe. O título e o texto vivem no
 * componente de cliente porque trocam quando o envio conclui.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recuperar acesso' };

export default function Recovery() {
  return (
    <AuthLayout band="tall">
      <RecoveryScreen configured={authConfigured()} />
    </AuthLayout>
  );
}
