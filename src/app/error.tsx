'use client';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // O digest permite correlacionar com o log do servidor sem colocar mensagem,
    // stack ou dados da requisição no console do navegador.
    console.error('[app:error-boundary]', {
      name: error.name || 'Error',
      digest: error.digest,
    });
  }, [error]);

  return (
    <main id="main" className="fallback-page">
      <h1>Um instante de pausa.</h1>
      <p>Não foi possível carregar esta experiência. Nenhuma operação foi confirmada.</p>
      <button onClick={retry}>Tentar novamente</button>
    </main>
  );
}
