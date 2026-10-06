import sharp from 'sharp';

// R9 round 8 — alinhamento cena ref↔V3 com o MESMO detector nos dois pratos.
// Features: (1) corpo escuro do frasco trigger (lum<70), (2) rim do arco
// (colunas com lum>140 numa linha), (3) script "Mais que limpeza" (pixéis
// claros quentes na janela do céu direito).

const load = async (f) => {
  const img = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * img.info.width + x) * img.info.channels;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };
  return { img, px };
};
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// 1 — frasco: linhas y400-520, runs escuras (corpo + trigger são pretos)
const bottle = ({ px }, y0, y1, x0, x1) => {
  let minX = Infinity,
    maxX = -Infinity,
    runs = [];
  for (let y = y0; y < y1; y += 6) {
    const dark = [];
    for (let x = x0; x < x1; x += 2) if (lum(px(x, y)) < 70) dark.push(x);
    for (const x of dark) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (dark.length) {
      // agrega runs separadas (frasco vs flor escura)
      let start = dark[0],
        prev = dark[0];
      for (const x of dark.slice(1)) {
        if (x - prev > 30) {
          runs.push([start, prev]);
          start = x;
        }
        prev = x;
      }
      runs.push([start, prev]);
    }
  }
  return { minX, maxX, runs: runs.slice(0, 10) };
};

// 2 — arco: numa linha, colunas com lum>140 (agrupadas em runs)
const arch = ({ px }, y, x0, x1) => {
  const cols = [];
  for (let x = x0; x < x1; x += 2) if (lum(px(x, y)) > 140) cols.push(x);
  const runs = [];
  if (cols.length) {
    let start = cols[0],
      prev = cols[0];
    for (const x of cols.slice(1)) {
      if (x - prev > 24) {
        runs.push([start, prev]);
        start = x;
      }
      prev = x;
    }
    runs.push([start, prev]);
  }
  return runs;
};

// 3 — script: bbox de pixéis claros (lum>150) na janela céu direito
const script = ({ px }, x0, y0, x1, y1) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2)
      if (lum(px(x, y)) > 150) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return Number.isFinite(minX) ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
};

const ref = await load('artifacts/r9/reference-hero.png');
const v3 = await load('artifacts/r9/checkpoint-a/v3-hero-1920.png');

for (const [name, im] of [
  ['ref', ref],
  ['v3', v3],
]) {
  console.log(`--- ${name} ---`);
  console.log('frasco y400-520 x1000-1750:', JSON.stringify(bottle(im, 400, 520, 1000, 1750)));
  console.log('arco y=300:', JSON.stringify(arch(im, 300, 900, 1920)));
  console.log('arco y=200:', JSON.stringify(arch(im, 200, 900, 1920)));
  console.log(
    'script janela x1400-1918 y100-320:',
    JSON.stringify(script(im, 1400, 100, 1918, 320)),
  );
  console.log(
    'script janela x1450-1918 y250-420:',
    JSON.stringify(script(im, 1450, 250, 1918, 420)),
  );
}
