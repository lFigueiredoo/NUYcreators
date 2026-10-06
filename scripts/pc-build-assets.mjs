/**
 * Proposta C — assets oficiais da nova landing pública.
 *
 * Converte as imagens fornecidas pelo usuário (artifacts/images/*.png) para
 * webp no diretório canônico public/brand/nuy-creators-v2/, sem reamostrar
 * (nunca amplia): o bitmap servido é o bitmap de origem.
 *
 * As duas folhas de apresentação (proposal-c, imagens-a-utilizar) têm texto
 * rasterizado embutido — servem só para comparação lado a lado e NUNCA são
 * renderizadas na página. As fotos 02–06 não têm texto embutido.
 */
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'artifacts/images';
const OUT = 'public/brand/nuy-creators-v2';

// Ordem de leitura das capturas do ChatGPT: os dois últimos dígitos do nome
// antes da extensão identificam a imagem (…16_35_53-1.png → índice 1).
const MAP = [
  { idx: 1, dest: 'reference/proposal-c.webp', quality: 88 },
  { idx: 2, dest: 'hero/hero-lifestyle.webp', quality: 90 },
  { idx: 3, dest: 'products/products-floral.webp', quality: 88 },
  { idx: 4, dest: 'creators/creators-reference.webp', quality: 88 },
  { idx: 5, dest: 'products/products-home.webp', quality: 88 },
  { idx: 6, dest: 'home/cozy-home.webp', quality: 88 },
  { idx: 7, dest: 'reference/imagens-a-utilizar.webp', quality: 88 },
];

const files = await readdir(SRC);
const byIndex = new Map();
for (const f of files) {
  const m = /-(\d+)\.png$/i.exec(f);
  if (m) byIndex.set(Number(m[1]), join(SRC, f));
}

await mkdir(OUT, { recursive: true });
for (const { idx, dest, quality } of MAP) {
  const src = byIndex.get(idx);
  if (!src) throw new Error(`imagem ${idx} não encontrada em ${SRC}`);
  const target = join(OUT, dest);
  await mkdir(join(OUT, dest, '..'), { recursive: true });
  const meta = await sharp(src).metadata();
  await sharp(src).webp({ quality, effort: 6 }).toFile(target);
  const out = await stat(target);
  console.log(
    `${dest.padEnd(42)} ${String(meta.width) + '×' + meta.height} → ` +
      `${(out.size / 1024).toFixed(0)} kB (q${quality})`,
  );
}
console.log('\nassets da Proposta C prontos em', OUT);
