import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 10 — CTA final (Proposta C).
 *
 * Último bloco navy: convite sobre a fotografia de casa real (velas, frascos
 * da linha, manta e flores — luz natural, nada de cena escura). Deslogado, o
 * convite é fazer parte; logado, o único passo com sentido é o painel.
 *
 * A foto é a `products-home.webp` (1448×1086): o enquadramento é doméstico,
 * não de campanha, e nenhum bitmap é ampliado — o slot no desktop fica na
 * metade da régua e no mobile em faixa inteira.
 */
export function CtaFinal({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <section id="cta-final" className={styles.ctaFinal} aria-labelledby="pl-cta-final-title">
      <div className={styles.ctaFinalCopy}>
        <p className={styles.ctaFinalEyebrow} data-pl-reveal>
          FAÇA PARTE
        </p>

        <h2 id="pl-cta-final-title" className={styles.ctaFinalTitle} data-pl-reveal>
          Faça parte da NUY CREATORS.
        </h2>

        <p className={styles.ctaFinalBody} data-pl-reveal>
          Entre para uma comunidade feita para quem transforma rotina em inspiração.
        </p>

        <div className={styles.ctaFinalActions} data-pl-reveal>
          {authenticated ? (
            <Link href="/app" className={styles.ctaFinalPrimary}>
              Ir para meu painel
              <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
            </Link>
          ) : (
            <>
              <Link href="/cadastro" className={styles.ctaFinalPrimary}>
                Quero fazer parte
                <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
              </Link>
              <Link href="/login" className={styles.ctaFinalSecondary}>
                Já tenho uma conta
              </Link>
            </>
          )}
        </div>
      </div>

      <figure className={styles.ctaFinalMedia} data-pl-reveal>
        <Image
          src="/brand/nuy-creators-v2/products/products-home.webp"
          alt="Frascos da linha NUY e velas acesas sobre a mesa de centro, entre flores e uma manta de tricô"
          width={1448}
          height={1086}
          quality={88}
          sizes="(max-width: 899px) 100vw, min(52vw, 760px)"
          className={styles.ctaFinalImage}
          loading="lazy"
        />
      </figure>
    </section>
  );
}
