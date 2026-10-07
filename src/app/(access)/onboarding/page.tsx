import { redirect } from 'next/navigation';
import { Info } from 'lucide-react';
import { currentUser, authConfigured } from '@/lib/appwrite/server';
import { currentSessionRoles } from '@/lib/security/authorization';
import { getEnvironment } from '@/lib/env/server';
import { resendAction, logoutAction } from '@/features/auth/services/actions';
import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { AuthFormShell } from '@/features/auth/components/auth-form-shell';
import { OnboardingForm } from '@/features/profiles/components/onboarding-form';
import styles from '@/features/auth/components/auth-access.module.css';

/**
 * Onboarding na identidade da Proposta C — camada visual apenas.
 *
 * A guarda e o fluxo continuam idênticos: sem autenticação configurada a tela
 * declara o estado (nenhum perfil criado); sem sessão, redireciona para
 * `/login`; com sessão, mostra o formulário de perfil, o reenvio da verificação
 * (quando o e-mail ainda não está confirmado) e a saída da conta — as mesmas
 * server actions `resendAction` e `logoutAction`.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seu perfil' };

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string }>;
}) {
  if (!authConfigured())
    return (
      <AuthLayout band="compact">
        <AuthFormShell
          title={
            <>
              Queremos conhecer <em>sua história.</em>
            </>
          }
          lead="O perfil NUY Creators é o passo que prepara a sua participação na comunidade."
        >
          <p className={styles.notice} role="status">
            <Info size={16} aria-hidden="true" />O onboarding estará disponível quando a
            autenticação for conectada. Nenhum perfil foi criado.
          </p>
        </AuthFormShell>
      </AuthLayout>
    );

  const user = await currentUser();
  if (!user) redirect('/login');
  // Operação administrativa não passa pelo onboarding de criadora — nem na
  // visita manual: quem tem membership confirmada em `nuy-admins` sai daqui
  // para a sua área. É destino, não autorização: a porta do `/admin` continua
  // sendo o `requireStaff` de lá dentro.
  if ((await currentSessionRoles(user.$id)).length) redirect('/admin');
  const params = await searchParams;

  return (
    <AuthLayout band="compact">
      <AuthFormShell
        title={
          <>
            Conte <em>sua história.</em>
          </>
        }
        lead="Seus dados, seu universo de criação e, se quiser, suas redes — o passo que prepara a sua participação na comunidade."
      >
        {!user.emailVerification && (
          <div className={styles.block}>
            <p className={styles.notice} role="status">
              <Info size={16} aria-hidden="true" />
              Verifique seu e-mail antes de salvar o perfil.
            </p>
            <form action={resendAction}>
              <button type="submit" className={styles.ghost}>
                Reenviar verificação
              </button>
            </form>
            {params.verification === 'sent' && (
              <p className={`${styles.message} ${styles.success}`} role="status" aria-live="polite">
                Solicitação de envio concluída. Confira sua caixa de entrada.
              </p>
            )}
          </div>
        )}

        <OnboardingForm
          name={user.name}
          enabled={user.emailVerification && getEnvironment().APPWRITE_FUNCTIONS_ENABLED === 'true'}
        />

        <form action={logoutAction} className={styles.inlineForm}>
          <button type="submit" className={styles.ghost}>
            Sair da conta
          </button>
        </form>
      </AuthFormShell>
    </AuthLayout>
  );
}
