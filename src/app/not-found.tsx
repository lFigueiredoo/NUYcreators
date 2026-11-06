import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Página não encontrada',
};

export default function NotFound() {
  return (
    <main id="main" className="fallback-page">
      <p>Erro 404</p>
      <h1>Esta página não foi encontrada.</h1>
      <p>O endereço pode ter mudado ou não estar mais disponível.</p>
      <Link href="/">Voltar ao início</Link>
    </main>
  );
}
