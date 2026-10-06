import { PublicLanding } from '@/features/public-landing/public-landing';
import { currentUser } from '@/lib/appwrite/server';

export const dynamic = 'force-dynamic';

/**
 * Home pública — PROPOSTA C "Entre Casa & Creators".
 * A camada visual anterior (navy/violeta) foi removida; a sessão continua
 * vindo do Appwrite para o header alternar Entrar / Ir para meu painel.
 */
export default async function Home() {
  const user = await currentUser();
  return <PublicLanding authenticated={Boolean(user)} />;
}
