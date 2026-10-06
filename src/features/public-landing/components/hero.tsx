import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 02 — Hero (Proposta C: "Entre Casa & Creators").
 *
 * Copy à esquerda na régua editorial; fotografia de lifestyle dominando a
 * direita, sangrando até a borda e derretendo no creme pela esquerda (como na
 * referência — sem retângulo duro, sem máscara agressiva).
 *
 * Prova social NEUTRA: não há creators no backend, então não há número nem
 * avatar — inventar os dois seria mentir sobre a comunidade.
 *
 * O acento manuscrito "Mais rotinas boas por aqui." vem da referência.
 */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="pl-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow} data-pl-reveal>
          COMUNIDADE NUY CREATORS
        </p>

        <h1 id="pl-hero-title" className={styles.headline} data-pl-reveal>
          Rotinas reais
          <br />
          que deixam
          <br />a casa mais viva.
        </h1>

        <p className={styles.rule} aria-hidden="true" data-pl-reveal />

        <p className={styles.body} data-pl-reveal>
          Uma comunidade de creators que compartilham dicas, experiências e conteúdos reais para
          inspirar um dia a dia com mais limpeza, bem-estar e beleza.
        </p>

        <div className={styles.actions} data-pl-reveal>
          <Link href="/cadastro" className={styles.primaryButton}>
            Fazer parte da comunidade
            <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
          </Link>
        </div>

        <p className={styles.socialProof} data-pl-reveal>
          Conheça a comunidade NUY
        </p>
      </div>

      <figure className={styles.heroMedia} data-pl-reveal>
        <Image
          src="/brand/nuy-creators-v2/hero/hero-lifestyle.webp"
          alt="Mulher sorrindo no sofá de casa segurando um borrifador NUY, com frascos da linha e flores brancas sobre a mesa"
          width={1448}
          height={1086}
          quality={90}
          sizes="(max-width: 899px) 100vw, 68vw"
          className={styles.heroImage}
          priority
        />
        {/* Acento manuscrito da referência, ancorado na própria foto: cai no
            fade da esquerda, onde a imagem já virou creme. Só existe no
            desktop — no empilhado a foto perde o fade (ver landing.module.css). */}
        <p className={styles.script} data-pl-script aria-hidden="true">
          Mais
          <br />
          rotinas boas
          <br />
          por aqui.
        </p>
      </figure>
    </section>
  );
}
