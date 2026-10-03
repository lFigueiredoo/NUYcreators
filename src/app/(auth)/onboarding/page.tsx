import { redirect } from 'next/navigation';
import { currentUser, authConfigured } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { OnboardingForm } from '@/features/profiles/components/onboarding-form';
import { resendAction, logoutAction } from '@/features/auth/services/actions';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string }>;
}) {
  if (!authConfigured())
    return (
      <>
        <h1>
          Queremos conhecer
          <br />
          sua história.
        </h1>
        <p className="service-notice">
          O onboarding estará disponível quando a autenticação for conectada. Nenhum perfil foi
          criado.
        </p>
      </>
    );
  const user = await currentUser();
  if (!user) redirect('/login');
  const params = await searchParams;
  return (
    <>
      <p className="eyebrow">Seu perfil NUY Creators</p>
      <h1>Conte sua história.</h1>
      {!user.emailVerification && (
        <div className="service-notice">
          <p>Verifique seu email antes de salvar o perfil.</p>
          <form action={resendAction}>
            <Button variant="outline">Reenviar verificação</Button>
          </form>
          {params.verification === 'sent' && (
            <p>Solicitação de envio concluída. Confira sua caixa de entrada.</p>
          )}
        </div>
      )}
      <OnboardingForm
        name={user.name}
        enabled={user.emailVerification && getEnvironment().APPWRITE_FUNCTIONS_ENABLED === 'true'}
      />
      <form action={logoutAction} className="mt-8">
        <Button variant="outline">Sair da conta</Button>
      </form>
    </>
  );
}
