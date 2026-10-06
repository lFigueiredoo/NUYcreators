import sharp from 'sharp';

// R9 round 8c — fechar a escala da cena: TRIGGER HEAD (bloco preto sólido de
// contraste máximo) medido com o MESMO detector na arte-fonte (1264 nativo),
// na ref (1920) e na V3 (1920). Escala = largura_trigger / largura_arte_fonte.

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const load = async (f) => {
  const img = await sharp(f).png().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * img.info.width + x) * img.info.channels;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };
  return { px, w: img.info.width, h: img.info.height };
};

// runs escuras contíguas; ignora runs coladas à borda da janela
const solidRuns = ({ px }, y, x0, x1, minW = 20, thr = 60) => {
  let start = null;
  const runs = [];
  for (let x = x0; x < x1; x++) {
    const dark = lum(px(x, y)) < thr;
    if (dark && start === null) start = x;
    if (!dark && start !== null) {
      if (x - start > minW) runs.push([start, x - 1, x - start]);
      start = null;
    }
  }
  if (start !== null && x1 - start > minW) runs.push([start, x1 - 1, x1 - start]);
  return runs;
};

const art = await load('public/brand/v2/hero-scene-v2.webp');
const ref = await load('artifacts/r9/reference-hero.png');
const v3 = await load('artifacts/r9/checkpoint-a/v3-hero-1920.png');

console.log('=== ARTE (nativa 1264) — trigger head: procurar a run preta sólida ===');
for (const y of [100, 130, 160, 190])
  console.log(`art y${y}:`, JSON.stringify(solidRuns(art, y, 100, 800)));

console.log('=== REF (1920) ===');
for (const y of [140, 160, 180])
  console.log(`ref y${y}:`, JSON.stringify(solidRuns(ref, y, 1150, 1500)));

console.log('=== V3 (1920) ===');
for (const y of [140, 160, 180])
  console.log(`v3 y${y}:`, JSON.stringify(solidRuns(v3, y, 1250, 1550)));

// base dos frascos (mesa): linha com transição clara→navy, para fixar escala vertical
console.log('=== base/mesa: última linha de conteúdo vivo (lum>90, janela dos frascos) ===');
const bottomEdge = ({ px, w, h }, x0, x1) => {
  for (let y = h - 1; y > 0; y--) {
    let bright = 0;
    for (let x = x0; x < x1; x += 3) if (lum(px(x, y)) > 90) bright++;
    if (bright > (x1 - x0) / 3 / 6) return y;
  }
  return -1;
};
const artArt = await sharp('public/brand/v2/hero-scene-v2.webp')
  .png()
  .raw()
  .toBuffer({ resolveWithObject: true });
console.log(
  'art bottomEdge (janela frascos x300-900):',
  bottomEdge({ px: art.px, w: art.w, h: art.h }, 300, 900),
  'de',
  art.h,
);
console.log('ref bottomEdge (frascos x1230-1600):', bottomEdge(ref, 1230, 1600), 'de', ref.h);
console.log('v3 bottomEdge (frascos x1310-1600):', bottomEdge(v3, 1310, 1600), 'de', v3.h);
