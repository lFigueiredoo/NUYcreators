// R6 REVIEW PACKAGE — side-by-side boards REFERÊNCIA | IMPLEMENTAÇÃO.
// Same visual scale per board: both sides rendered at 0.625 css-px per board px
// (impl 1920 → 1200; ref desktop fatias 866 img = 1920 css → 1200; ref painel
// médio fatias 504 img = 1876 css → 1173). Labels via SVG. No overlays of the
// two contents: reference on the LEFT, implementation on the RIGHT.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const DIR = 'artifacts/round6/review';
mkdirSync(DIR, { recursive: true });
const REF = `${DIR}/reference-official.png`;
const FONT = 'font-family="Segoe UI, Arial, sans-serif"';

const LABEL_H = 52;
const CAPTION_H = 34;
const MARG = 36;
const GAP = 40;
const W_IMPL = 1200;

// Ref fatias do mockup oficial (px de imagem): desktop x0-866 (×2,217),
// painel médio x892-1396 (504 img = 1876 css ×3,7209).
const sections = [
  { file: '01-hero', ref: [0, 0, 866, 395], impl: 'impl-hero-1920.png', panel: 'desktop' },
  { file: '02-projeto', ref: [0, 396, 866, 169], impl: 'impl-projeto-1920.png', panel: 'desktop' },
  {
    file: '03-como-funciona',
    ref: [0, 565, 866, 185],
    impl: 'impl-como-funciona-1920.png',
    panel: 'desktop',
  },
  {
    file: '04-para-quem',
    ref: [0, 742, 866, 140],
    impl: 'impl-para-quem-1920.png',
    panel: 'desktop',
  },
  {
    file: '05-beneficios',
    ref: [0, 880, 866, 144],
    impl: 'impl-beneficios-1920.png',
    panel: 'desktop',
  },
  { file: '06-jornada', ref: [892, 0, 504, 263], impl: 'impl-niveis-1920.png', panel: 'medio' },
  {
    file: '07-experiencias',
    ref: [892, 258, 504, 210],
    impl: 'impl-experiencias-1920.png',
    panel: 'medio',
  },
  { file: '08-faq', ref: [892, 466, 504, 234], impl: 'impl-faq-1920.png', panel: 'medio' },
  { file: '09-cta', ref: [892, 695, 504, 235], impl: 'impl-cta-final-1920.png', panel: 'medio' },
  { file: '10-footer', ref: [892, 925, 504, 99], impl: 'impl-footer-1920.png', panel: 'medio' },
];

const labelLayer = (boardW, titles) => {
  const parts = titles.map((t) => {
    const center = t.center;
    return `<text x="${center}" y="36" text-anchor="middle" ${FONT} font-size="26" font-weight="700" fill="#20222c" letter-spacing="2">${t.text}</text>`;
  });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boardW}" height="${LABEL_H}">${parts.join('')}</svg>`,
  );
};

const captionLayer = (boardW, text, boardH) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boardW}" height="${CAPTION_H}"><text x="${MARG}" y="24" ${FONT} font-size="17" fill="#777">${text}</text></svg>`,
  );

async function buildOne({ file, ref, impl, panel, captionExtra = '' }) {
  const refW = panel === 'desktop' ? W_IMPL : 1173;
  const refCrop = await sharp(REF)
    .extract({ left: ref[0], top: ref[1], width: ref[2], height: ref[3] })
    .resize(refW, null, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const implW = panel === 'desktop' ? W_IMPL : 1200;
  const implCrop = await sharp(`${DIR}/${impl}`)
    .resize(implW, null, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const refMeta = await sharp(refCrop).metadata();
  const implMeta = await sharp(implCrop).metadata();
  const boardW = MARG * 2 + refW + GAP + implW;
  const bodyH = Math.max(refMeta.height, implMeta.height);
  const boardH = LABEL_H + bodyH + CAPTION_H + 10;
  const canvas = sharp({
    create: { width: boardW, height: boardH, channels: 3, background: '#ffffff' },
  });
  const comps = [
    {
      input: labelLayer(boardW, [
        { text: 'REFERÊNCIA', center: MARG + refW / 2 },
        { text: 'IMPLEMENTAÇÃO', center: MARG + refW + GAP + implW / 2 },
      ]),
      left: 0,
      top: 0,
    },
    { input: refCrop, left: MARG, top: LABEL_H },
    { input: implCrop, left: MARG + refW + GAP, top: LABEL_H },
    {
      input: captionLayer(
        boardW,
        captionExtra ||
          `${file} · painel ${panel} | impl ${implMeta.width === 1200 ? '960' : '600'} de largura lógica`,
        boardH,
      ),
      left: 0,
      top: LABEL_H + bodyH + 10,
    },
  ];
  await canvas
    .composite(comps)
    .jpeg({ quality: 92 })
    .toFile(`${DIR}/${file}-reference-vs-final.png`);
  console.log(`${file}: ${boardW}x${boardH}`);
}

for (const s of sections) await buildOne(s);

// 00-full: coluna de referência = painel desktop + painel médio (mesma largura
// lógica 1920) acima/abaixo; implementação = fullPage 1920.
{
  const CW = 840;
  const desk = await sharp(REF)
    .extract({ left: 0, top: 0, width: 866, height: 1024 })
    .resize(CW, null, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const med = await sharp(REF)
    .extract({ left: 874, top: 0, width: 516, height: 1024 })
    .resize(CW, null, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const deskMeta = await sharp(desk).metadata();
  const medMeta = await sharp(med).metadata();
  const seam = 14;
  const refColH = deskMeta.height + seam + medMeta.height;
  const refCol = await sharp({
    create: { width: CW, height: refColH, channels: 3, background: '#ffffff' },
  })
    .composite([
      { input: desk, left: 0, top: 0 },
      { input: med, left: 0, top: deskMeta.height + seam },
    ])
    .png()
    .toBuffer();

  const implCol = await sharp(`${DIR}/impl-full-1920.png`)
    .resize(CW, null, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const implMeta = await sharp(implCol).metadata();

  const boardW = MARG * 2 + CW * 2 + GAP;
  const boardH = LABEL_H + Math.max(refColH, implMeta.height) + CAPTION_H + 10;

  // versão blur (mesma geolocalização de massas)
  const refColBlur = await sharp(refCol).blur(14).png().toBuffer();
  const implColBlur = await sharp(implCol).blur(14).png().toBuffer();
  const blurCanvas = sharp({
    create: { width: boardW, height: boardH, channels: 3, background: '#ffffff' },
  });
  await blurCanvas
    .composite([
      {
        input: labelLayer(boardW, [
          { text: 'REFERÊNCIA', center: MARG + CW / 2 },
          { text: 'IMPLEMENTAÇÃO', center: MARG + CW + GAP + CW / 2 },
        ]),
        left: 0,
        top: 0,
      },
      { input: refColBlur, left: MARG, top: LABEL_H },
      { input: implColBlur, left: MARG + CW + GAP, top: LABEL_H },
      {
        input: captionLayer(
          boardW,
          `full-blur · blur 14px dos dois lados | ref total ≈ 6.080px lógicos · impl ${Math.round((implMeta.height / CW) * 1920)}px @1920`,
          boardW ? boardH : boardH,
        ),
        left: 0,
        top: LABEL_H + Math.max(refColH, implMeta.height) + 10,
      },
    ])
    .jpeg({ quality: 92 })
    .toFile(`${DIR}/full-blur-reference-vs-final.png`);

  const canvas = sharp({
    create: { width: boardW, height: boardH, channels: 3, background: '#ffffff' },
  });
  await canvas
    .composite([
      {
        input: labelLayer(boardW, [
          { text: 'REFERÊNCIA', center: MARG + CW / 2 },
          { text: 'IMPLEMENTAÇÃO', center: MARG + CW + GAP + CW / 2 },
        ]),
        left: 0,
        top: 0,
      },
      { input: refCol, left: MARG, top: LABEL_H },
      { input: implCol, left: MARG + CW + GAP, top: LABEL_H },
      {
        input: captionLayer(
          boardW,
          `ritmo/alternância navy-creme | ref (desktop+médio) ≈ 6.080px lógicos · impl ${Math.round((implMeta.height / CW) * 1920)}px @1920`,
          boardH,
        ),
        left: 0,
        top: LABEL_H + Math.max(refColH, implMeta.height) + 10,
      },
    ])
    .jpeg({ quality: 92 })
    .toFile(`${DIR}/00-full-reference-vs-final.png`);
  console.log(`00-full: ${boardW}x${boardH} (ref col ${refColH} | impl col ${implMeta.height})`);
}
console.log('review boards done');
