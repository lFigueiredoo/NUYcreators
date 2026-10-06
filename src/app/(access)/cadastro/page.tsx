import { AuthAccessForm } from '@/features/auth/components/auth-access-form';
import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { AuthFormShell } from '@/features/auth/components/auth-form-shell';
import { registrationConfigured } from '@/lib/appwrite/server';

/**
 * Cadastro público na identidade da Proposta C.
 *
 * Primeiro passo continua simples: só os campos que a implementação funcional
 * já exige (nome, e-mail, senha e o aceite dos termos). Não há campo de
 * confirmação de senha no cadastro de hoje, e criá-lo exigiria mexer na
 * validação — fora do escopo "somente camada visual".
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fazer parte' };

export default function Signup() {
  return (
    <AuthLayout band="compact">
      <AuthFormShell
        title={
          <>
            Seu lugar no
            <br />
            NUY Creators começa aqui.
          </>
        }
        lead="Crie sua conta e faça parte de uma comunidade feita para pessoas, rotinas e experiências reais."
      >
        <AuthAccessForm mode="signup" configured={registrationConfigured()} />
      </AuthFormShell>
    </AuthLayout>
  );
}
