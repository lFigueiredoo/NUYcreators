import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/editorial.module.css';

const products = [
  {
    file: 'limpador-cha-branco-125ml.png',
    width: 170,
    height: 273,
    alt: 'Limpador multiuso Chá Branco, 125 ml',
    className: styles.cleaner,
  },
  {
    file: 'aromatizador-flores-vibrantes-200ml.png',
    width: 365,
    height: 673,
    alt: 'Aromatizador Flores Vibrantes, 200 ml',
    className: styles.diffuser,
  },
  {
    file: 'sabonete-cereja-selvagem-500ml.png',
    width: 152,
    height: 401,
    alt: 'Sabonete líquido Cereja Selvagem, 500 ml',
    className: styles.soap,
  },
];

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="editorial-hero-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>COMUNIDADE NUY CREATORS</p>
          <h1 id="editorial-hero-title" className={styles.headline}>
            Bem-vindo à
            <br /> <span translate="no">NUY Creators</span>
          </h1>
          <p className={styles.heroDescription}>
            Crie, compartilhe e viva experiências com a marca que cuida da sua casa.
          </p>
          <Link href="/app" prefetch={false} className={styles.heroAction}>
            ACESSAR O NUY CREATORS
          </Link>
        </div>
        <figure className={styles.products} aria-label="Produtos NUY para o cuidado da casa">
          <Image
            src="/brand/editorial/hero/hero-pedra-fundo.webp"
            alt=""
            width={1250}
            height={938}
            loading="eager"
            fetchPriority="high"
            unoptimized
            className={styles.stone}
          />
          {products.map(({ file, width, height, alt, className }) => (
            <Image
              key={file}
              src={`/brand/nuy-creators-clean/products/${file}`}
              width={width}
              height={height}
              alt={alt}
              loading="eager"
              unoptimized
              className={`${styles.product} ${className}`}
            />
          ))}
        </figure>
      </div>
    </section>
  );
}
