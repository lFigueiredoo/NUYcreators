import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/landing.module.css';

/**
 * 02 — Hero (Opção 1: limpo, produto protagonista).
 *
 * Copy à esquerda, composição real dos packshots NUY à direita — sem mulher
 * inventada, sem fotografia de IA, sem cenário complexo.
 *
 * POLISH: os frascos deixaram de ser PNGs soltos no creme. Cada um é um item
 * com sombra própria — contato curto e escuro na base, ambiente largo e suave
 * um passo além — sobre um plano horizontal discreto, com uma sombra coletiva
 * do grupo e um halo de estúdio atrás. A profundidade vem do degrau de cada
 * frasco (`--pl-rest-scale`) e do deslocamento de rolagem de 8px.
 *
 * Protagonistas: Aromatizador Flores Vibrantes + Sabonete Cereja Selvagem,
 * com o Limpador Chá Branco à frente-esquerda (máximo de 3, conforme o brief).
 *
 * Tamanhos honestos: cada frasco é renderizado no máximo nos seus pixels
 * nativos (ver tests/e2e/landing-quality.spec.ts — nada de upscale).
 */
/**
 * Largura/altura declaradas são os pixels NATIVOS do arquivo (bbox do alpha),
 * não o tamanho de exibição — o CSS é quem manda no layout. A ordem segue a
 * leitura visual da fileira (o frasco menor entra primeiro, à frente-esquerda),
 * e o índice de cada um é o degrau da cascata de entrada.
 */
const HERO_PRODUCTS = [
  {
    src: '/brand/nuy-creators-clean/products/limpador-cha-branco-125ml.png',
    width: 170,
    height: 273,
    sizes: '(max-width: 899px) 21vw, 100px',
    alt: 'Limpador multiuso Chá Branco, 125 ml, à frente dos protagonistas',
    itemClass: styles.heroItemBack,
    imageClass: styles.heroProductBack,
  },
  {
    src: '/brand/nuy-creators-clean/products/aromatizador-flores-vibrantes-200ml.png',
    width: 365,
    height: 673,
    sizes: '(max-width: 899px) 46vw, 216px',
    alt: 'Aromatizador ambiente Flores Vibrantes, 200 ml, com flores no rótulo',
    itemClass: styles.heroItemMain,
    imageClass: styles.heroProductMain,
  },
  {
    src: '/brand/nuy-creators-clean/products/sabonete-cereja-selvagem-500ml.png',
    width: 152,
    height: 401,
    sizes: '(max-width: 899px) 19vw, 90px',
    alt: 'Sabonete líquido Cereja Selvagem, 500 ml, com cereja no rótulo',
    itemClass: styles.heroItemFront,
    imageClass: styles.heroProductFront,
  },
] as const;

export function Hero() {
  return (
    <section
      className={styles.hero}
      aria-labelledby="pl-hero-title"
      /* O `LandingDepth` escreve aqui o progresso da rolagem; sem JS fica 0. */
      data-pl-depth
    >
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow} data-pl-reveal data-pl-index="0">
          COMUNIDADE NUY CREATORS
        </p>

        {/* Duas linhas, duas janelas: cada linha é um `overflow: hidden` e o texto
            sobe 12px por dentro dele. Palavra por palavra não — o título é lido
            como duas linhas editoriais, que é como ele foi composto. */}
        <h1 id="pl-hero-title" className={styles.headline}>
          <span className={styles.headlineLine}>
            <span className={styles.headlineText} data-pl-reveal data-pl-index="1">
              Bem-vinda à{' '}
            </span>
          </span>
          <span className={styles.headlineLine}>
            <span className={styles.headlineText} data-pl-reveal data-pl-index="2">
              NUY Creators
            </span>
          </span>
        </h1>

        <p className={styles.body} data-pl-reveal data-pl-index="3">
          Crie, compartilhe e viva experiências
          <br />
          com a marca que cuida da sua casa.
        </p>

        <div className={styles.actions} data-pl-reveal data-pl-index="4">
          <Link href="/cadastro" className={styles.primaryButton}>
            FAÇA PARTE
          </Link>
        </div>
      </div>

      <figure className={styles.heroProducts} aria-label="Linha NUY de casa">
        <div className={styles.heroStage}>
          {/* Luz de estúdio e plano: decorativos, e por isso fora da árvore de
              acessibilidade — quem lê a cena são os três packshots.
              A luz entra dentro de um campo próprio: o reveal é dono do
              `transform` do elemento que anima, e a luz centra a si mesma por
              `translate(-50%, -50%)` — se as duas coisas morassem no mesmo
              nó, o halo pousaria fora do lugar (a 200px à direita do grupo). */}
          <span className={styles.heroLightField} aria-hidden="true" data-pl-reveal data-pl-index="0">
            <span className={styles.heroLight} />
          </span>
          <div className={styles.heroGroup}>
            {/* O plano NÃO entra no reveal. Ele é o chão da cena: um chão que
                sobe 11px para "aparecer" não é um chão, e como o reveal deixa
                o elemento deslocado até o observer disparar, o plano ficava
                permanentemente baixo em qualquer viewport onde ele caísse
                abaixo da folga de 12% do observer — no empilhado, os três
                frascos boiavam 9px acima da linha de apoio. Fica de fora do
                movimento e no lugar desde o primeiro quadro. */}
            <span className={styles.heroBase} aria-hidden="true" />
            {HERO_PRODUCTS.map((product, index) => (
              <span
                key={product.src}
                className={`${styles.heroItem} ${product.itemClass}`}
                data-pl-reveal
                data-pl-index={String(index)}
              >
                <Image
                  src={product.src}
                  alt={product.alt}
                  width={product.width}
                  height={product.height}
                  sizes={product.sizes}
                  className={product.imageClass}
                  priority
                />
              </span>
            ))}
          </div>
        </div>
      </figure>
    </section>
  );
}
