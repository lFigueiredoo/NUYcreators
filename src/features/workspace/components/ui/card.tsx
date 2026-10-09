import type { ReactNode } from 'react';
import Link from 'next/link';
import { Flower2 } from 'lucide-react';
import { CatalogMedia } from '../catalog-media';
import styles from '../../styles/app.module.css';

/** Bloco base do produto. `navy` é o destaque — usado com parcimônia. */
export function Card({
  tone = 'plain',
  className,
  children,
}: {
  tone?: 'plain' | 'navy';
  className?: string;
  children: ReactNode;
}) {
  const classes = [styles.card, tone === 'navy' ? styles.cardNavy : '', className]
    .filter(Boolean)
    .join(' ');
  return <section className={classes}>{children}</section>;
}

/**
 * A moldura da imagem do cartão — a única caixa de mídia da área da creator.
 *
 * O conteúdo é sempre `CatalogMedia` (imagem servida pela rota `/app/midia`
 * ou a inicial do nome), então o cartão inteiro nunca mostra ícone de imagem
 * quebrada. Quem chama passa a classe da VARIANTE (proporção, borda, tamanho);
 * as propriedades comuns da caixa moram em `.cardMedia`, num lugar só.
 *
 * Com `href`, a moldura inteira é clicável — o mesmo destino do título, que
 * continua sendo o link com nome acessível.
 */
export function CardMedia({
  fileId,
  name,
  href,
  className,
  cover,
}: {
  fileId: string | null;
  name: string;
  href?: string;
  className?: string;
  /** Desenho para a caixa GRANDE sem imagem — ver `CoverFallback`. */
  cover?: ReactNode;
}) {
  const classes = [styles.cardMedia, className].filter(Boolean).join(' ');
  const media = <CatalogMedia fileId={fileId} name={name} cover={cover} />;
  if (href)
    return (
      <Link href={href} className={classes}>
        {media}
      </Link>
    );
  return <div className={classes}>{media}</div>;
}

/**
 * A capa institucional de um item sem imagem publicada.
 *
 * É o desenho de TODO cartão sem foto — o desafio na grade, o destaque do painel,
 * a recompensa na vitrine e a capa do detalhe. Ele não explica o que falta: a
 * caixa já se lê como capa da marca, e quem olha a grade de cartões não precisa
 * de um aviso técnico repetido em cada um. O que o item é continua dito pelo nome
 * logo abaixo, no corpo do cartão.
 *
 * A inicial preenche bem uma miniatura de 56px; numa caixa de 300 a 400px ela
 * virava um retângulo quase vazio com uma letra solta no meio, que se lê como
 * imagem quebrada. Aqui o vazio é desenhado como marca: a faixa navy da NUY, o
 * ícone em anel dourado, o lockup e a régua. Composição de identidade, não foto
 * — nenhuma imagem é inventada para fingir que existe uma.
 */
export function CoverFallback() {
  return (
    <div className={styles.coverFallback}>
      <CoverMark />
    </div>
  );
}

/** O desenho em si — o mesmo nas duas paletas, para não haver duas marcas. */
function CoverMark() {
  return (
    <>
      <span className={styles.coverIcon} aria-hidden="true">
        <Flower2 size={16} />
      </span>
      <p className={styles.coverBrand}>NUY Creators</p>
      <span className={styles.coverRule} aria-hidden="true" />
    </>
  );
}

/**
 * A capa da VITRINE de recompensas sem imagem: o mesmo desenho, sem a faixa navy.
 *
 * A vitrine é uma prateleira, e o que falta nela é o produto — não a marca. Com
 * a faixa escura, duas recompensas lado a lado davam uma grade desequilibrada,
 * em que uma coluna parecia ter carregado e a outra não. É a mesma composição de
 * identidade sobre o creme do cartão: nada é inventado para fingir que existe
 * uma foto, e nada muda de lugar entre as duas paletas.
 */
export function RewardCoverFallback() {
  return (
    <div className={`${styles.coverFallback} ${styles.rewardFallback}`}>
      <CoverMark />
    </div>
  );
}
