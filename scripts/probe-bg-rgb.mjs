// Probe médio RGB de patches da referência vs implementação (v2 — raw pipeline,
// porque sharp().stats() ignora o extract e devolve a média da imagem inteira).
import sharp from 'sharp';

const REF = 'artifacts/round6/reference.png';
const IMPL = {
  niveis: 'artifacts/round6/impl-secao-niveis-1920.png', // 1920 x ~985
  faq: 'artifacts/round6/impl-secao-faq-1920.png', // 1920 x ~877
  cta: 'artifacts/round6/impl-secao-cta-final-1920.png', // 1920 x ~877
};
const PANEL = { x: 892, w: 504 };
const SPAN = { niveis: [0, 263], faq: [466, 697], cta: [697, 928] };

async function rawMean(img, { left, top, width, height }) {
  const { data, info } = await sharp(img)
    .extract({
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const sums = new Array(ch).fill(0);
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) sums[c] += data[i * ch + c];
  return sums.slice(0, 3).map((s) => Math.round((s / n) * 10) / 10);
}

const PATCHES = {
  niveis: [
    { name: 'topo-esq', x: 0.36, y: 0.06 },
    { name: 'centro', x: 0.55, y: 0.32 },
    { name: 'direita-entre-nos', x: 0.6, y: 0.58 },
    { name: 'base-esq', x: 0.18, y: 0.93 },
  ],
  faq: [
    { name: 'topo', x: 0.55, y: 0.08 },
    { name: 'centro-esq', x: 0.42, y: 0.45 },
  ],
  cta: [
    { name: 'esq-texto', x: 0.12, y: 0.3 },
    { name: 'topo', x: 0.05, y: 0.06 },
  ],
};

for (const [id, list] of Object.entries(PATCHES)) {
  const [y0, y1] = SPAN[id];
  const secH = y1 - y0;
  for (const p of list) {
    const refM = await rawMean(REF, {
      left: PANEL.x + p.x * PANEL.w,
      top: y0 + p.y * secH,
      width: 44,
      height: 30,
    });
    const implH = id === 'niveis' ? 985 : 877;
    const implM = await rawMean(IMPL[id], {
      left: p.x * 1920,
      top: p.y * implH,
      width: 44,
      height: 30,
    });
    console.log(`${id} ${p.name.padEnd(18)} ref=(${refM.join(', ')})  impl=(${implM.join(', ')})`);
  }
}
console.log('ok');
