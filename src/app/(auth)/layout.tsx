import Link from 'next/link';
import { ArrowLeft, Flower2 } from 'lucide-react';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="auth-layout">
      <aside className="auth-editorial">
        <Link href="/" className="wordmark">
          nuy<span>CREATORS</span>
        </Link>
        <div>
          <p className="eyebrow">Uma rotina. Infinitas possibilidades.</p>
          <h2>
            Histórias reais.
            <br />
            Sensações que
            <br />
            <em>inspiram.</em>
          </h2>
          <p>O extraordinário também mora nos pequenos momentos.</p>
        </div>
        <Flower2 className="auth-flower" aria-hidden="true" />
      </aside>
      <section className="auth-panel">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} /> Voltar para NUY Creators
        </Link>
        {children}
      </section>
    </main>
  );
}
