// R7 — contact sheet dos assets de ornamentação (fundo xadrez p/ revelar
// fundo baked), + crop de candidatos da referência em 3× (com réguas).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'artifacts/round7/assets';
mkdirSync(OUT, { recursive: true });
const REF = 'artifacts/round6/review/reference-official.png';

const assets = [
  'hero-bouquet-hi',
  'hero-white-bloom-hi',
  'hero-left-foliage-hi',
  'hero-violet-flower-hi',
  'project-bloom-mass',
  'project-bloom-hi',
  'journey-bouquet-tr',
  'journey-orchid-l',
  'journey-ribbon',
  'faq-bloom-corner',
  'experience-scene-ref',
  'cta-bloom-l',
  'edge-petals-hi',
];
const TH = 150;
const COLS = 7;
const cell = TH + 22;
const rows = Math.ceil((assets.length + 1) / COLS);
const canvasW = COLS * cell + cell;
const canvasH = rows * (TH + 40) + 20;

const comps = [];
for (let i = 0; i < assets.length; i++) {
  const name = assets[i];
  let buf;
  try {
    buf = await sharp(`public/brand/reference/${name}.webp`)
      .resize(TH, TH, { fit: 'inside' })
      .png()
      .toBuffer();
  } catch {
    continue;
  }
  const m = await sharp(buf).metadata();
  const x = (i % COLS) * cell + 10;
  const y = Math.floor(i / COLS) * (TH + 40) + 30;
  comps.push({ input: buf, left: x, top: y });
  comps.push({
    input: Buffer.from(
      `<svg width="${cell - 6}" height="18"><text x="2" y="13" font-size="11" font-family="Arial" fill="#333">${name} ${m.width}×${m.height}</text></svg>`,
    ),
    left: x,
    top: y + TH + 3,
  });
}
// referên. como último tile
const refThumb = await sharp(REF).resize(TH, TH, { fit: 'inside' }).png().toBuffer();
comps.push({
  input: refThumb,
  left: (assets.length % COLS) * cell + 10,
  top: Math.floor(assets.length / COLS) * (TH + 40) + 30,
});

await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: '#7a7fa0' },
})
  .composite(comps)
  .png()
  .toFile(`${OUT}/contact-sheet.png`);
console.log('sheet ok');

// Candidatos de crop na referência (coords img do mockup 1536×1024):
const candidates = [
  ['projeto-inf-esq', 0, 470, 240, 100, 'desktop-floral canto inf-esq do cartão'],
  ['projeto-topo-curvas', 40, 380, 400, 60, 'curvas douradas do topo'],
  ['como-topo-esq', 0, 565, 160, 90, 'floral topo-esquerda como'],
  ['como-direita', 770, 565, 96, 96, 'borda direita como'],
  ['para-quem-floral', 0, 680, 180, 110, 'floral esquerda para-quem'],
  ['beneficios-floral', 0, 940, 260, 84, 'cluster inf-esq benefícios'],
  ['exp-base-flores', 892, 400, 300, 68, 'base flores experiências (creme)'],
  ['exp-trecho-produtos', 1100, 258, 296, 210, 'trecho produtos experiências'],
];
for (const [name, left, top, width, height, note] of candidates) {
  await sharp(REF)
    .extract({ left, top, width, height })
    .resize(width * 2, height * 2, { kernel: 'nearest' })
    .png()
    .toFile(`${OUT}/cand-${name}.png`);
  console.log(
    `cand-${name} ok — ${name}: ${note} @img(${left},${top},${width},${height}) = css ${(height * 2.217) | 0}px`,
  );
}
