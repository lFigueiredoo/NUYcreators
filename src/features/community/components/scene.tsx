import Image from 'next/image';
import styles from './landing.module.css';
import art from './hero-artboard.module.css';
import motion from './hero-motion.module.css';

/** Modular art layers. Swap imageSrc/imageAlt when official packshots arrive. */
export function Scene({
  imageSrc = '/brand/reference/hero-composition-hi.webp',
  imageAlt = '',
}: {
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <div className={styles.scene}>
      <div className={art.lightMap} aria-hidden="true">
        <i className={art.productCream} />
        <i className={art.edgeVignette} />
      </div>
      <div className={motion.glowPulse} data-hero-glow-pulse aria-hidden="true" />
      <div className={art.starlight} aria-hidden="true" />
      <Image
        src="/brand/reference/hero-environment-hi.webp"
        alt=""
        width={1650}
        height={270}
        className={art.environment}
        sizes="72vw"
      />
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={art.backgroundFlowers}
        /* Layout real = 24%w @1920 (461px): o otimizador servia 384 — slot
           abaixo do wire e desfiado na tela. sizes ≥ layout + margem. */
        sizes="25vw"
      />
      <svg className={art.lightOrbit} viewBox="0 0 1600 730" aria-hidden="true">
        <defs>
          <linearGradient id="hero-arch" x1="0" y1="0" x2=".2" y2="1">
            <stop stopColor="#ae9ddb" />
            <stop offset=".4" stopColor="#e6b8c7" />
            <stop offset=".7" stopColor="#fff2cd" />
            <stop offset="1" stopColor="#e9bd80" />
          </linearGradient>
          {/* A única linha de luz da referência: entra à esquerda sob os
              botões, mergulha atrás das bases das garrafas, sobe à direita
              delas e faz o cume (95,4%w/50,7%h) com clarão-desta, descendo
              vertente na borda direita (pontos medidos nos crops da ref:
              130,586 · 1050,626 · 1527,369 · 1583,698 — unidades artboard). */}
          <linearGradient
            id="hero-orbit-fade"
            gradientUnits="userSpaceOnUse"
            x1="130"
            y1="586"
            x2="1590"
            y2="700"
          >
            <stop offset="0" stopColor="#e9bd80" stopOpacity="0" />
            <stop offset="0.3" stopColor="#e9bd80" stopOpacity="0.55" />
            <stop offset="0.75" stopColor="#f6d49a" stopOpacity="0.95" />
            <stop offset="0.93" stopColor="#f2c98c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#e9bd80" stopOpacity="0.1" />
          </linearGradient>
          <filter id="hero-orbit-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
          <path
            id="hero-orbit-main"
            d="M130 586C420 624 760 644 1030 627C1300 610 1462 369 1527 369C1600 369 1580 540 1586 698"
          />
          <g id="hero-orbit-spark">
            <ellipse cx="1527" cy="369" rx="9" ry="4.6" fill="#f8dcae" opacity="0.55" />
            <rect
              x="1519.5"
              y="368.3"
              width="15"
              height="1.4"
              rx="0.7"
              fill="#ffe9bd"
              opacity="0.9"
            />
            <rect
              x="1526.3"
              y="361.5"
              width="1.4"
              height="15"
              rx="0.7"
              fill="#ffe9bd"
              opacity="0.8"
            />
            <circle cx="1527" cy="369" r="2.1" fill="#fff6e0" />
          </g>
        </defs>
        <use href="#hero-orbit-main" className={art.orbitGlow} />
        <use href="#hero-orbit-main" className={art.orbitStroke} />
        <use href="#hero-orbit-spark" filter="url(#hero-orbit-blur)" opacity="0.8" />
        <use href="#hero-orbit-spark" />
      </svg>
      <div className={motion.energyMarker} data-hero-orbit-energy aria-hidden="true">
        <svg viewBox="0 0 20 20">
          <defs>
            <filter id="hero-energy-halo" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          <circle
            cx="10"
            cy="10"
            r="4"
            fill="#f3d2ac"
            opacity=".5"
            filter="url(#hero-energy-halo)"
          />
          <circle cx="10" cy="10" r="1.8" fill="#fff2cd" />
        </svg>
      </div>
      <Image
        src="/brand/reference/hero-white-bloom-hi.webp"
        alt=""
        width={360}
        height={400}
        className={art.gapBloom}
        sizes="(max-width: 760px) 14vw, 11vw"
      />
      <div className={styles.productLayer} data-depth="product" data-hero-packshot>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1264}
          height={1416}
          preload
          quality={90}
          sizes="(max-width: 760px) 100vw, 52vw"
          className={styles.product}
        />
      </div>
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={styles.referenceBouquet}
        sizes="(max-width: 760px) 34vw, 27vw"
      />
      {/* Borda esquerda da arte aprovada: buquê espelhado sangrando pra fora do
          artboard (substitui os antigos tiles de pétalas/foliagem, que tinham o
          frame da folha embutido). Uma segunda camada atrás dá profundidade
          (massa desfocada) em vez de um recorte solto. */}
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={art.leftBlossomsEcho}
        /* Layout real = 26%w (R7): o trilho de srcset precisa carregar pixels
           acima do mostrado — 24vw servia bitmap 256 p/ 266px @1024. */
        sizes="28vw"
      />
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={art.leftBlossoms}
        sizes="16vw"
      />
      <div className={art.warmFloor} aria-hidden="true" />
      <Image
        src="/brand/reference/hero-white-bloom-hi.webp"
        alt=""
        width={360}
        height={400}
        className={art.baseBloom}
        sizes="(max-width: 760px) 20vw, 14vw"
      />
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={art.foregroundFlowers}
        sizes="21vw"
      />
      <Image
        src="/brand/reference/hero-bouquet-hi.webp"
        alt=""
        width={584}
        height={704}
        className={art.cornerFlowers}
        /* Layout real = 20%w (384px @1920): servia bitmap 256 — mesmo
           desalinho. sizes ≥ layout + margem. */
        sizes="21vw"
      />
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 73 + 23) % 100}%`,
              top: `${(i * 41 + 13) % 96}%`,
              width: i % 4 === 0 ? '2px' : '1px',
              height: i % 4 === 0 ? '2px' : '1px',
              opacity: 0.15 + (i % 5) * 0.12,
            }}
          />
        ))}
      </div>
    </div>
  );
}
