import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import styles from '../styles/landing.module.css';

/**
 * 07 — Recompensas (Proposta C).
 *
 * Volta ao claro: título na régua à esquerda, três categorias em grade
 * editorial à direita. O visitante está deslogado — a seção apresenta
 * categorias, nunca o catálogo: sem saldo, sem estoque, sem preço em pontos,
 * sem botão de resgate. Cada card é um convite a fazer parte (o destino é o
 * cadastro), que é o único passo possível para quem ainda não entrou.
 *
 * Os recortes vêm de `scripts/pc-cp3-assets.mjs` (3:4, sem reamostragem).
 */
const categorias = [
  {
    titulo: 'Produtos NUY',
    src: '/brand/nuy-creators-v2/rewards/reward-products.webp',
    width: 814,
    height: 1086,
    alt: 'Frascos da linha NUY sobre a bandeja de mármore, entre flores brancas',
    texto: 'Peças da linha para trazer para a rotina de casa.',
  },
  {
    titulo: 'Kits exclusivos',
    src: '/brand/nuy-creators-v2/rewards/reward-kits.webp',
    width: 814,
    height: 1086,
    alt: 'Bandeja com os três frascos da linha NUY, velas e flores sobre a mesa de centro',
    texto: 'Conjuntos montados para quem faz parte da comunidade.',
  },
  {
    titulo: 'Experiências especiais',
    src: '/brand/nuy-creators-v2/rewards/reward-experiences.webp',
    width: 814,
    height: 1086,
    alt: 'Canto de sala com sofá, manta de tricô e velas sob a luz da janela',
    texto: 'Momentos que a NUY prepara para quem participa.',
  },
] as const;

export function Rewards() {
  return (
    <section id="recompensas" className={styles.rewards} aria-labelledby="pl-rewards-title">
      <div className={styles.rewardsInner}>
        <div className={styles.rewardsCopy}>
          <p className={styles.sectionEyebrow} data-pl-reveal>
            RECOMPENSAS
          </p>

          <h2 id="pl-rewards-title" className={styles.rewardsTitle} data-pl-reveal>
            Recompensas que fazem sentido.
          </h2>

          <p className={styles.rewardsBody} data-pl-reveal>
            Sua participação abre novas possibilidades com a NUY.
          </p>

          <p className={styles.rewardsNote} data-pl-reveal>
            Categorias disponíveis para quem faz parte da comunidade.
          </p>
        </div>

        <ul className={styles.rewardsCards}>
          {categorias.map((categoria, indice) => (
            <li
              key={categoria.titulo}
              className={styles.rewardCard}
              data-pl-reveal
              style={{ '--pl-stagger': `${indice * 90}ms` } as CSSProperties}
            >
              <Link
                href="/cadastro"
                className={styles.rewardLink}
                aria-label={`${categoria.titulo} — fazer parte da comunidade`}
              >
                <figure className={styles.rewardMedia}>
                  <Image
                    src={categoria.src}
                    alt={categoria.alt}
                    width={categoria.width}
                    height={categoria.height}
                    quality={88}
                    sizes="(max-width: 700px) 352px, min(30vw, 344px)"
                    className={styles.rewardImage}
                    loading="lazy"
                  />
                </figure>

                <span className={styles.rewardHead}>
                  <span className={styles.rewardTitle}>{categoria.titulo}</span>
                  <ArrowRight
                    size={17}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={styles.rewardArrow}
                  />
                </span>

                <span className={styles.rewardText}>{categoria.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
