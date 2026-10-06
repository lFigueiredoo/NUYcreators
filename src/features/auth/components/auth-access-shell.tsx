import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { body, display } from '@/features/public-landing/landing-fonts';
import styles from './auth-access.module.css';

/**
 * Casca das telas públicas de acesso (Proposta C) — Login e Cadastro.
 *
 * Peças simples, sem design system: `AuthLayout` (faixa de topo + divisão
 * editorial) e `AuthVisualPanel` (fotografia com frase). O título com o texto
 * de apoio e o formulário é `auth-form-shell.tsx`, à parte — as telas que
 * trocam o título no cliente importam aquele módulo, que não carrega fontes.
 *
 * Desde o fechamento do Sprint 4B todas as telas públicas de acesso vivem
 * aqui — recuperação, redefinição, verificação e onboarding.
 *
 * Tipografia: as fontes da própria landing (`public-landing/landing-fonts.ts`)
 * — Playfair Display nos títulos, Inter no corpo. O acento manuscrito não
 * entra nestas telas, então só as duas famílias são aplicadas.
 */
export function AuthLayout({
  children,
  band = 'tall',
}: {
  children: React.ReactNode;
  band?: 'tall' | 'compact';
}) {
  return (
    <main id="main" className={`${styles.shell} ${display.variable} ${body.variable}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.lockup} aria-label="NUY Creators início">
          <span className={styles.lockupMark}>NUY</span>
          <span className={styles.lockupLabel}>CREATORS</span>
        </Link>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" className={styles.backArrow} />
          Voltar ao site
        </Link>
      </header>

      <div className={styles.split}>
        <AuthVisualPanel band={band} />
        <div className={styles.column}>
          {children}
          <nav className={styles.legal} aria-label="Informações legais">
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
          </nav>
        </div>
      </div>
    </main>
  );
}

/**
 * Fotografia de lifestyle da direção (mesmo arquivo do hero, enquadramento
 * próprio: coluna alta ancorada na creator e no produto). `band` decide a
 * altura da faixa no empilhado — o cadastro usa a faixa menor para o
 * formulário começar mais cedo.
 */
export function AuthVisualPanel({ band }: { band: 'tall' | 'compact' }) {
  return (
    <figure className={`${styles.visual} ${band === 'compact' ? styles.visualCompact : ''}`}>
      <Image
        src="/brand/nuy-creators-v2/hero/hero-lifestyle.webp"
        alt="Mulher sorrindo no sofá de casa segurando um borrifador NUY, com frascos da linha e flores brancas sobre a mesa"
        width={1448}
        height={1086}
        quality={90}
        sizes="(max-width: 900px) 100vw, 55vw"
        className={styles.visualImage}
        priority
      />
      <p className={styles.visualPhrase}>
        Rotinas reais.
        <br />
        Conteúdos que inspiram.
      </p>
    </figure>
  );
}

/* O título + texto de apoio + formulário vive em `auth-form-shell.tsx`: as
   telas de recuperação/redefinição/verificação trocam título e lead no cliente
   e importam aquela peça — separada para não trazer `next/font` ao bundle de
   cliente. */
