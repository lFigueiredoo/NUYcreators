import type { Metadata } from 'next';
import { PublicLanding } from '@/features/public-landing/public-landing';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Home pública — PROPOSTA C "Entre Casa & Creators".
 * A camada visual anterior (navy/violeta) foi removida. A página não consulta
 * sessão: conteúdo público precisa ser cacheável e os destinos de acesso
 * continuam funcionando para visitantes e contas já autenticadas.
 */
export default function Home() {
  return <PublicLanding />;
}
