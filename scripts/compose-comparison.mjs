import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Comparações lado a lado (REF | IMPL) normalizadas pela largura — a diferença
// de altura por seção é exatamente a divergência de ritmo que quero ver.
const REF = 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const IMPL = 'artifacts/delivery';
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });
const W = 820; // largura de cada painel na comparação

const pairs = [
  ['hero', ['hero', 0, 0, 866, 395], `${IMPL}/a15-secao-hero-1920.png`],
  ['projeto', ['projeto', 0, 395, 866, 170], `${IMPL}/a15-secao-projeto-1920.png`],
  ['como', ['como', 0, 565, 866, 185], `${IMPL}/a15-secao-como-funciona-1920.png`],
  ['para-quem', ['para-quem', 0, 750, 866, 135], `${IMPL}/a15-secao-para-quem-1920.png`],
  ['beneficios', ['beneficios', 0, 885, 866, 139], `${IMPL}/a15-secao-beneficios-1920.png`],
  ['journey', ['journey', 892, 0, 504, 259], `${IMPL}/a15-secao-niveis-1920.png`],
  ['experiencias', ['experiencias', 892, 259, 504, 210], `${IMPL}/a15-secao-experiencias-1920.png`],
  ['faq', ['faq', 892, 469, 504, 249], `${IMPL}/a15-secao-faq-1920.png`],
  ['cta', ['cta', 892, 718, 504, 163], `${IMPL}/a15-secao-cta-1920.png`],
  ['footer', ['footer', 892, 881, 504, 143], `${IMPL}/a15-secao-footer-1920.png`],
  ['mobile-hero', ['mobile-hero', 1404, 0, 132, 530], null],
  ['mobile-projeto', ['mobile-projeto', 1404, 530, 132, 494], null],
];

const refFull = await sharp(REF).png().toBuffer();
for (const [name, [x, y, w, h], implPath] of pairs) {
  const refCrop = await sharp(refFull)
    .extract({ left: x, top: y, width: w, height: h })
    .png()
    .toBuffer();
  const refR = await sharp(refCrop).resize(W).png().toBuffer();
  const refMeta = await sharp(refR).metadata();
  let canvas;
  try {
    if (implPath) {
      const implCrop = await sharp(implPath).resize(W).png().toBuffer();
      const implMeta = await sharp(implCrop).metadata();
      canvas = sharp({
        create: {
          width: W * 2 + 12,
          height: Math.max(refMeta.height, implMeta.height),
          channels: 3,
          background: '#333',
        },
      }).composite([
        { input: refR, left: 0, top: 0 },
        { input: implCrop, left: W + 12, top: 0 },
      ]);
      await canvas.png().toFile(`${OUT}/comparison-${name}.png`);
      console.log(`${name}: ref ${W}x${refMeta.height} | impl ${W}x${implMeta.height}`);
    } else {
      // Mobile: impl vem de a15-full-390 (crop vertical correspondente)
      const implY = name === 'mobile-hero' ? [0, 1160] : [1160, 1500];
      const implCrop = await sharp(`${IMPL}/a15-full-390.png`)
        .extract({ left: 0, top: implY[0], width: 390, height: implY[1] })
        .resize(W)
        .png()
        .toBuffer();
      const implMeta = await sharp(implCrop).metadata();
      await sharp({
        create: {
          width: W * 2 + 12,
          height: Math.max(refMeta.height, implMeta.height),
          channels: 3,
          background: '#333',
        },
      })
        .composite([
          { input: refR, left: 0, top: 0 },
          { input: implCrop, left: W + 12, top: 0 },
        ])
        .png()
        .toFile(`${OUT}/comparison-${name}.png`);
      console.log(`${name}: ref ${W}x${refMeta.height} | impl ${W}x${implMeta.height}`);
    }
  } catch (e) {
    console.log(`${name}: ERRO ${String(e.message).slice(0, 80)}`);
  }
}
console.log('comparações em', OUT);
