import Image from 'next/image';
import type { CSSProperties } from 'react';
import styles from '../styles/landing.module.css';

/**
 * 04 — Creators (Proposta C: "Entre Casa & Creators").
 *
 * Quatro retratos de campanha, em grade — e nada além da fotografia: não
 * existe creator público no backend, e batizar uma pessoa gerada com nome,
 * @ ou tema seria inventar uma comunidade que ainda não publicou nada.
 * A grade já é a dos dados reais: quando os perfis existirem, cada card
 * recebe nome e tema sem mexer em layout nem em tamanho.
 *
 * Os retratos vêm de `creators-reference.webp` (tira de quatro), cortados em
 * `scripts/pc-cp2-assets.mjs` — sem reamostragem.
 */
const retratos = [
  {
    src: '/brand/nuy-creators-v2/creators/creator-01.webp',
    alt: 'Mulher de olhos fechados erguendo um borrifador NUY, entre flores brancas',
  },
  {
    src: '/brand/nuy-creators-v2/creators/creator-02.webp',
    alt: 'Mulher de cabelo cacheado apoiada no braço, com frascos NUY sobre a mesa',
  },
  {
    src: '/brand/nuy-creators-v2/creators/creator-03.webp',
    alt: 'Mulher sorrindo com um frasco roxo da linha NUY nas mãos',
  },
  {
    src: '/brand/nuy-creators-v2/creators/creator-04.webp',
    alt: 'Mulher inclinada sobre um vaso de flores, com um borrifador NUY na mesa',
  },
] as const;

export function Creators() {
  return (
    <section id="comunidade" className={styles.creators} aria-labelledby="pl-creators-title">
      <div className={styles.sectionHead}>
        <p className={styles.sectionEyebrow} data-pl-reveal>
          CREATORS NUY
        </p>

        <h2 id="pl-creators-title" className={styles.sectionTitle} data-pl-reveal>
          Pessoas reais, casas reais,
          <br />
          <em>mais inspiração todos os dias.</em>
        </h2>

        <p className={styles.sectionBody} data-pl-reveal>
          Conheça creators que compartilham suas rotinas, dicas e experiências com NUY.
        </p>
      </div>

      <ul className={styles.creatorsGrid}>
        {retratos.map((retrato, index) => (
          <li
            key={retrato.src}
            className={styles.creatorCard}
            data-pl-reveal
            style={{ '--pl-stagger': `${index * 70}ms` } as CSSProperties}
          >
            <figure className={styles.creatorMedia}>
              <Image
                src={retrato.src}
                alt={retrato.alt}
                width={356}
                height={534}
                quality={88}
                sizes="(max-width: 899px) 68vw, min(23vw, 356px)"
                className={styles.creatorImage}
                loading="lazy"
              />
            </figure>
          </li>
        ))}
      </ul>

      <p className={styles.gridNote} data-pl-reveal>
        Imagens de campanha NUY — os perfis da comunidade chegam com os primeiros conteúdos.
      </p>
    </section>
  );
}
