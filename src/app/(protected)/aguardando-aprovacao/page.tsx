import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Clock3, ShieldCheck, CircleAlert } from 'lucide-react';
import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { AuthFormShell } from '@/features/auth/components/auth-form-shell';
import { logoutAction } from '@/features/auth/services/actions';
import {
  currentAccountApproval,
  ownCreatorApplication,
} from '@/features/accounts/services/creator';
import { readOwnProfile, SESSION_COOKIE } from '@/lib/appwrite/server';
import { requireSession, sessionRoles } from '@/lib/security/authorization';
import styles from '@/features/auth/components/auth-access.module.css';
import approvalStyles from '@/features/accounts/components/waiting.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Análise do cadastro', robots: { index: false, follow: false } };

export default async function AwaitingApproval() {
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)!.value;
  if ((await sessionRoles(secret, user.$id)).length) redirect('/admin');
  const status = await currentAccountApproval(secret, user.$id);
  if (status === 'active') redirect('/app');
  let profile: Awaited<ReturnType<typeof readOwnProfile>> = null;
  let profileUnavailable = false;
  try {
    profile = await readOwnProfile(secret, user.$id);
  } catch {
    profileUnavailable = true;
  }
  if (
    !profileUnavailable &&
    (status === 'missing' || status === 'pending_review') &&
    !profile?.onboardingCompletedAt
  )
    redirect('/onboarding');
  const application = await ownCreatorApplication(secret, user.$id);
  const rejected = status === 'rejected';
  const unavailable = status === 'unavailable' || status === 'missing' || profileUnavailable;
  const Icon = unavailable || rejected ? CircleAlert : Clock3;

  return (
    <AuthLayout band="compact">
      <AuthFormShell
        title={
          unavailable
            ? 'Não foi possível consultar seu cadastro.'
            : rejected
              ? 'Cadastro não aprovado.'
              : 'Seu cadastro está em análise.'
        }
        lead={
          unavailable
            ? 'Tente consultar novamente em instantes. Se precisar, fale com a equipe NUY.'
            : rejected
              ? 'A equipe NUY analisou sua solicitação. Confira a orientação abaixo antes de entrar em contato.'
              : 'Recebemos seu perfil. A equipe NUY vai conferir seus dados e liberar o acesso à comunidade após a aprovação.'
        }
      >
        <div className={approvalStyles.statusBox}>
          <Icon size={24} aria-hidden="true" />
          <div>
            <strong>
              {unavailable
                ? 'Consulta indisponível'
                : rejected
                  ? 'Solicitação recusada'
                  : 'Aguardando aprovação da NUY'}
            </strong>
            <p>{user.email}</p>
            {rejected && application?.status === 'rejected' && application.reason ? (
              <p className={approvalStyles.reason}>{application.reason}</p>
            ) : null}
          </div>
        </div>
        {!unavailable && !rejected ? (
          <p className={approvalStyles.hint}>
            <ShieldCheck size={18} aria-hidden="true" /> Sua solicitação já está com a equipe. Você
            não precisa criar outra conta.
          </p>
        ) : null}
        <div className={approvalStyles.actions}>
          <a href="/aguardando-aprovacao" className={styles.submit}>
            Consultar situação
          </a>
          <a href="mailto:mundonuy@gmail.com" className={approvalStyles.support}>
            Falar com a equipe NUY
          </a>
        </div>
        <form action={logoutAction} className={styles.inlineForm}>
          <button type="submit" className={approvalStyles.exit}>
            Sair da conta
          </button>
        </form>
      </AuthFormShell>
    </AuthLayout>
  );
}
