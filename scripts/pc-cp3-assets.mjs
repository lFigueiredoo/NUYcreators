/**
 * Proposta C · Checkpoint 3 — derivados de asset da seção 07 (Recompensas).
 *
 * Três recortes 3:4, um por categoria, tirados das fotos que já existem na
 * direção Proposta C — nenhuma imagem nova é gerada e nada é reamostrado: cada
 * caixa usa a ALTURA NATIVA da fonte (1086px) e a largura 3:4 correspondente
 * (814px). Esse é o maior recorte 3:4 possível em cada arquivo, e é o que
 * permite o card de 352px em DPR 2 sem ampliar bitmap (352 × 2 = 704 ≤ 705).
 *
 *   reward-products    ← products-floral (1448×1086)  packshot da linha
 *   reward-kits        ← products-home   (1448×1086)  a linha montada na bandeja
 *   reward-experiences ← products-home   (1448×1086)  o canto de casa, sem produto
 *
 * As duas últimas vêm do MESMO arquivo, em regiões que não se sobrepõem de
 * forma legível: a bandeja (x 634..1448) e o sofá com a manta (x 0..814). É o
 * único jeito de manter `home/cozy-home.webp` — que a seção 06 já mostra
 * inteira — fora dos cards, para nenhuma foto se repetir entre seções.
 *
 * A seção 06 não gera asset: usa `home/cozy-home.webp` (1672×941) inteiro.
 *
 * Caixas escolhidas sobre folhas de contato com rótulo gravado no bitmap
 * (`artifacts/proposta-c/tmp/candidatos-finais.png`), não a olho em grade.
 */
import { mkdir, stat } from 'node:fs/promises';
import sharp from 'sharp';

const V2 = 'public/brand/nuy-creators-v2';
const OUT = `${V2}/rewards`;

const CORTES = [
  {
    nome: 'reward-products',
    src: `${V2}/products/products-floral.webp`,
    box: { left: 380, top: 0, width: 814, height: 1086 },
  },
  {
    nome: 'reward-kits',
    src: `${V2}/products/products-home.webp`,
    box: { left: 634, top: 0, width: 814, height: 1086 },
  },
  {
    nome: 'reward-experiences',
    src: `${V2}/products/products-home.webp`,
    box: { left: 0, top: 0, width: 814, height: 1086 },
  },
];

await mkdir(OUT, { recursive: true });

for (const { nome, src, box } of CORTES) {
  const origem = await sharp(src).metadata();
  const dest = `${OUT}/${nome}.webp`;
  await sharp(src).extract(box).webp({ quality: 88, effort: 6 }).toFile(dest);
  const out = await stat(dest);
  const razao = (box.width / box.height).toFixed(3);
  console.log(
    `${nome}.webp`.padEnd(24) +
      `${box.width}×${box.height} (3:4 = ${razao})  ` +
      `corte x=${box.left} y=${box.top} de ${origem.width}×${origem.height}  ` +
      `${(out.size / 1024).toFixed(0)} kB`,
  );
}

console.log('\nrecortes da seção 07 prontos em', OUT);
