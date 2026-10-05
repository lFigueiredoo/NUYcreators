// R7 — sondas de cor na referência oficial + bbox do creme assado no asset da
// cena de experiências + crops candidatos finais (3×).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'artifacts/round7/assets';
mkdirSync(OUT, { recursive: true });
const REF = 'artifacts/round6/review/reference-official.png';

const raw = await sharp(REF).raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// Dominante de uma região: só pixels que passam o filtro, clusterizado grosso.
function dominant(x0, y0, w, h, filter, label, conv = 1) {
  const buckets = new Map();
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = px(x, y);
      if (!filter(c)) continue;
      const key = [c[0], c[1], c[2]].map((v) => Math.round((v / 16) * 16) >> 0).join(',');
      const k = `${key}`;
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(
    `${label}: ` +
      sorted
        .map(([k, n]) => {
          const [r, g, b] = k.split(',').map(Number);
          return `${hex([r, g, b])}×${n}`;
        })
        .join(' '),
  );
  return sorted;
}

const lilac = ([r, g, b]) => b > 150 && r > 110 && b > g + 12 && r > g + 6 && b - g < 90;
const navyish = ([r, g, b]) => b > 60 && r < 90 && b < 130 && b > r + 10;
const gold = ([r, g, b]) => r > 150 && g > 100 && b < 170 && r > b + 30 && g > b - 10;

// 1. accent do h2 "novas experiências." (lilás na ref) — linha 2 do h2
console.log('=== EXPERIÊNCIAS ===');
dominant(900, 318, 220, 30, lilac, 'h2 em (lilás) y318-348');
// linha 1 do h2 (creme/lavanda neutra?)
dominant(900, 282, 160, 26, ([r, g, b]) => r > 150, 'h2 linha1 claro y282-308');
// chips navy
dominant(900, 370, 260, 44, navyish, 'chips navy y370-414');
// cenário/dourado da cena
dominant(1100, 300, 296, 160, gold, 'cena ouros y300-460');

// 2. estrela do projeto
console.log('=== PROJETO ===');
dominant(470, 450, 120, 60, gold, 'sparkle região (470,450,120,60)');
// curvas do topo
dominant(40, 396, 420, 40, gold, 'curvas topo y396-436');
// flor inf-esq: tom médio
dominant(10, 500, 140, 60, ([r, g, b]) => r > 120, 'flor inf-esq claros y500-560');

// 3. dourados genéricos do navy (para-quem/benefícios/hero)
console.log('=== NAVY GENERICOS ===');
dominant(0, 742, 866, 140, gold, 'para-quem dourados');
dominant(0, 880, 866, 144, gold, 'beneficios dourados');
dominant(0, 80, 866, 100, gold, 'hero topo dourados y80-180');

// 4. footer
console.log('=== FOOTER ===');
for (const [x, y] of [
  [1100, 970],
  [1000, 950],
  [1300, 1000],
  [920, 1010],
])
  console.log(`footer ${x},${y}: ${hex(px(x, y))}`);

// 5. base da seção experiências na ref — onde termina o conteúdo/produto (bbox de creme assado no ASSET)
console.log('=== ASSET EXPERIENCE-SCENE (creme assado) ===');
{
  const a = await sharp('public/brand/reference/experience-scene-ref.webp')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data: d, info: nfo } = a;
  const P = (x, y) => {
    const i = (y * nfo.width + x) * nfo.channels;
    return [d[i], d[i + 1], d[i + 2], nfo.channels > 3 ? d[i + 3] : 255];
  };
  const W = nfo.width,
    H = nfo.height;
  console.log(`asset ${W}x${H} ch=${nfo.channels}`);
  const isCream = (c) =>
    c[3] === 0 || (c[0] > 225 && c[1] > 205 && c[2] > 175 && Math.abs(c[0] - 243) < 26);
  // fração de creme por linha (últimas 20 linhas) e por coluna (últimas 15 cols)
  for (const yy of [
    0,
    Math.round(H * 0.3),
    Math.round(H * 0.6),
    Math.round(H * 0.82),
    H - 12,
    H - 4,
  ]) {
    let n = 0;
    for (let x = 0; x < W; x += 4) if (isCream(P(x, yy))) n++;
    console.log(`linha y=${yy}: ${((n / (W / 4)) * 100).toFixed(0)}% creme`);
  }
  for (const xx of [0, 4, Math.round(W * 0.9), W - 8, W - 2]) {
    let n = 0;
    for (let y = 0; y < H; y += 4) if (isCream(P(xx, y))) n++;
    console.log(`coluna x=${xx}: ${((n / (H / 4)) * 100).toFixed(0)}% creme`);
  }
}

// 6. crops candidatos finais (3× para leitura de coordenadas)
const finals = [
  ['como-floral-r', 790, 578, 76, 84, 'blossom + pétala borda direita "como"], right=cut'],
];
const extra = [
  ['como-direita-fim', 790, 578, 76, 84],
  ['projeto-floral-final', 0, 496, 152, 70],
  ['projeto-sparkle-mag', 480, 448, 100, 64],
  ['exp-h2-mag', 892, 274, 260, 76],
  ['exp-chips-mag', 892, 358, 300, 62],
];
for (const [name, left, top, width, height, note] of [...finals, ...extra]) {
  if (!top && top !== 0) continue;
  await sharp(REF)
    .extract({ left, top, width, height })
    .resize(width * 3, height * 3, { kernel: 'nearest' })
    .png()
    .toFile(`${OUT}/cand-${name}.png`);
  console.log(
    `cand-${name}: @img(${left},${top},${width},${height}) css ${(width * 2.217) | 0}×${(height * 2.217) | 0}`,
  );
}
