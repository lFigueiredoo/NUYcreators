import { requireSession } from '@/lib/security/authorization';
import { logoutAction } from '@/features/auth/services/actions';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sessão autenticada' };
export default async function SessionProof() {
  await requireSession();
  return (
    <main id="main" className="public-inner">
      <h1>Sessão autenticada.</h1>
      <p>
        Identidade verificada no servidor pelo Appwrite. Esta é apenas uma página de validação da
        fundação; o dashboard não foi implementado.
      </p>
      <form action={logoutAction}>
        <Button>Sair da conta</Button>
      </form>
    </main>
  );
}
