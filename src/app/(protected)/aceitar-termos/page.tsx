import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/auth-access-shell';
import { AuthFormShell } from '@/features/auth/components/auth-form-shell';
import styles from '@/features/auth/components/auth-access.module.css';
import { acceptCurrentTermsAction } from '@/features/legal/services/actions';
import { currentTermsState } from '@/features/legal/services/consent';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE,
} from '@/features/legal/versions';
import { SESSION_COOKIE } from '@/lib/appwrite/server';
import { requireSession } from '@/lib/security/authorization';
import { returnPath } from '@/features/workspace/domain/flash';
import { currentAccountApproval } from '@/features/accounts/services/creator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atualização dos Termos' };

const errors: Record<string, string> = {
  origem: 'A solicitação não foi reconhecida. Recarregue a página e tente novamente.',
  obrigatorio: 'Leia e marque o aceite para continuar.',
  indisponivel: 'Não foi possível registrar o aceite agora. Tente novamente em instantes.',
};

export default async function AcceptTerms({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; returnTo?: string }>;
}) {
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (secret) {
    const approval = await currentAccountApproval(secret, user.$id);
    if (approval === 'pending_review' || approval === 'rejected') redirect('/aguardando-aprovacao');
  }
  const params = await searchParams;
  const destination = returnPath(params.returnTo ?? '', '/app');
  if (secret && (await currentTermsState(secret, user.$id)) === 'accepted') redirect(destination);
  const action = acceptCurrentTermsAction.bind(null, destination);
  const message = params.erro ? errors[params.erro] : '';

  return (
    <AuthLayout band="compact">
      <AuthFormShell
        title={
          <>
            Termos <em>atualizados.</em>
          </>
        }
        lead={`Para continuar no NUY Creators, confirme os Termos ${CURRENT_TERMS_VERSION} e a Política de Privacidade ${CURRENT_PRIVACY_VERSION}, vigentes desde ${LEGAL_EFFECTIVE_DATE}.`}
      >
        <form action={action} className={styles.form}>
          <p className={styles.notice}>
            Leia os <Link href="/termos">Termos de Uso vigentes</Link>. Seu novo aceite ficará
            registrado com a versão e a data para proteger você e a NUY.
          </p>
          <label className={styles.terms}>
            <input type="checkbox" name="terms" required />
            <span>
              Li e concordo com os <Link href="/termos">Termos de Uso</Link> e com a{' '}
              <Link href="/privacidade">Política de Privacidade</Link> vigentes.
            </span>
          </label>
          <button type="submit" className={styles.submit}>
            Aceitar e continuar
          </button>
          {message && (
            <p className={`${styles.message} ${styles.error}`} role="alert">
              {message}
            </p>
          )}
        </form>
      </AuthFormShell>
    </AuthLayout>
  );
}
