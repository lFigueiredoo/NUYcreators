'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="fallback-page">
      <h1>Um instante de pausa.</h1>
      <p>Não foi possível carregar esta experiência. Nenhuma operação foi confirmada.</p>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  );
}
