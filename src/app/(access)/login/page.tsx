import { AuthAccessForm } from '@/features/auth/components/auth-access-form';
import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { AuthFormShell } from '@/features/auth/components/auth-form-shell';
import { authConfigured } from '@/lib/appwrite/server';

/**
 * Login público na identidade da Proposta C. Grupo de rotas `(access)`: as
 * telas que já nascem na direção nova ficam fora do layout legado de `(auth)`,
 * que continua servindo recuperar/redefinir/verificar/onboarding até a
 * aprovação do checkpoint.
 *
 * `force-dynamic` e a checagem de configuração seguem como estavam: nada da
 * lógica de sessão é tocado aqui.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar' };

export default function Login() {
  return (
    <AuthLayout band="tall">
      <AuthFormShell
        title={
          <>
            Bem-vinda <em>de volta.</em>
          </>
        }
        lead="Continue sua experiência na comunidade NUY Creators."
      >
        <AuthAccessForm mode="login" configured={authConfigured()} />
      </AuthFormShell>
    </AuthLayout>
  );
}
