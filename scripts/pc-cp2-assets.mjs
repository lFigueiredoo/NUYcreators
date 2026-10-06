/**
 * Proposta C · Checkpoint 2 — derivados de asset das seções 04 e 05.
 *
 * A folha `creators/creators-reference.webp` (1448×1086) é uma tira de QUATRO
 * retratos colados, com costura em x ≈ 360 / 723 / 1087 (medida por varredura
 * de colunas creme, não a olho). Aqui ela é cortada em quatro retratos 2:3 —
 * cada card recebe o bitmap inteiro que vai exibir, sem reamostrar.
 *
 * Nada é ampliado: o corte é 356×534 nativo e o webp sai na resolução da
 * origem. O corte vertical para em 534px (metade do painel), onde o rosto
 * assenta no terço superior do card.
 *
 * A seção 05 NÃO gera asset: a foto da campanha do brief tem texto rasterizado
 * e só 562×265 nativos (não cobre um banner). O banner usa a foto de produto
 * em alta (products-floral, 1448×1086) sobre o navy, com o scrim em CSS.
 */
import { mkdir, stat } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'public/brand/nuy-creators-v2/creators/creators-reference.webp';
const OUT = 'public/brand/nuy-creators-v2/creators';

/** [x, largura] de cada painel — as costuras medidas na tira. */
const PAINEIS = [
  [0, 356],
  [365, 355],
  [728, 355],
  [1092, 356],
];
const ALTURA = 534;

await mkdir(OUT, { recursive: true });

for (const [i, [left, width]] of PAINEIS.entries()) {
  const dest = `${OUT}/creator-0${i + 1}.webp`;
  await sharp(SRC)
    .extract({ left, top: 0, width, height: ALTURA })
    .webp({ quality: 88, effort: 6 })
    .toFile(dest);
  const out = await stat(dest);
  console.log(
    `creator-0${i + 1}.webp  ${width}×${ALTURA} (corte x=${left})  ${(out.size / 1024).toFixed(0)} kB`,
  );
}

console.log('\nretratos do checkpoint 2 prontos em', OUT);
