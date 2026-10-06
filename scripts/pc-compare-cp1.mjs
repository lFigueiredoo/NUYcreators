/**
 * Proposta C · Checkpoint 1 — composições lado a lado.
 *
 * `comparison-1920.png`: faixa de hero da folha da Proposta C sobre a dobra
 * da implementação, na mesma largura (1920). A folha é um crop do mock — o
 * objetivo é comparar composição, não fazer diff de pixel.
 *
 * `comparison-390.png`: mock mobile da folha "Imagens a utilizar" ao lado do
 * hero da implementação a 390 CSS px, alinhados pelo topo.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'artifacts/proposta-c/checkpoint-1';
const CROPS = 'artifacts/proposta-c/crops';
const CREAM = { r: 249, g: 245, b: 239, alpha: 1 };
const INK = '#0e2a44';
const RULE = '#c7a1b3';

await mkdir(CROPS, { recursive: true });

/** `&` e afins quebram o parser XML do SVG. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Barra de título desenhada em SVG — texto de rótulo, não conteúdo do site. */
function labelBar(width, height, left, right) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${CREAM.r},${CREAM.g},${CREAM.b}"/>
      <rect x="0" y="${height - 2}" width="${width}" height="2" fill="${RULE}"/>
      <text x="40" y="${height / 2 + 7}" font-family="Georgia, serif" font-size="26" fill="${INK}">${esc(left)}</text>
      <text x="${width - 40}" y="${height / 2 + 7}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#4a6076">${esc(right)}</text>
    </svg>`,
  );
}

// ---------------------------------------------------------------- 1920
{
  const refBand = await sharp(`${CROPS}/ref-hero-band.png`).metadata();
  const implFold = await sharp(`${OUT}/implementation-1920-fold.png`).metadata();
  const W = 1920;
  const bar = 62;

  const ref = await sharp(`${CROPS}/ref-hero-band.png`)
    .resize({ width: W, kernel: 'lanczos3' })
    .toBuffer();
  const refH = Math.round((refBand.height / refBand.width) * W);

  const impl = await sharp(`${OUT}/implementation-1920-fold.png`)
    .resize({ width: W, kernel: 'lanczos3' })
    .toBuffer();
  const implH = Math.round((implFold.height / implFold.width) * W);

  const totalH = bar + refH + bar + implH;

  await sharp({
    create: { width: W, height: totalH, channels: 4, background: CREAM },
  })
    .composite([
      {
        input: labelBar(
          W,
          bar,
          'Referência — Proposta C · Entre Casa & Creators',
          'mock oficial (crop da folha)',
        ),
        top: 0,
        left: 0,
      },
      { input: ref, top: bar, left: 0 },
      {
        input: labelBar(
          W,
          bar,
          'Implementação — / · 1920 × 1080',
          'captura real, build de produção',
        ),
        top: bar + refH,
        left: 0,
      },
      { input: impl, top: bar + refH + bar, left: 0 },
    ])
    .png()
    .toFile(`${OUT}/comparison-1920.png`);

  console.log('comparison-1920.png', `${W}x${totalH}`);
}

// ----------------------------------------------------------------- 390
{
  // Hero da implementação a 390: header + hero + faixa (0..1023 CSS px, DPR2).
  const impl = sharp(`${OUT}/implementation-390.png`);
  const meta = await impl.metadata();
  const heroH = Math.min(meta.height, 1023 * 2);

  const mock = await sharp(`${CROPS}/mock-mobile.png`)
    .resize({ width: 780, kernel: 'lanczos3' })
    .toBuffer();
  const mockMeta = await sharp(`${CROPS}/mock-mobile.png`).metadata();
  const mockH = Math.round((mockMeta.height / mockMeta.width) * 780);

  const implCrop = await impl.extract({ left: 0, top: 0, width: 780, height: heroH }).toBuffer();

  const bar = 56;
  const pad = 36;
  const W = 780 * 2 + pad * 3;
  const bodyH = Math.max(mockH, heroH);
  const totalH = bar + bodyH + pad;

  await sharp({
    create: { width: W, height: totalH, channels: 4, background: CREAM },
  })
    .composite([
      {
        input: labelBar(W, bar, 'Referência — mock mobile', 'folha “Imagens a utilizar” · item 6'),
        top: 0,
        left: 0,
      },
      { input: mock, top: bar + pad, left: pad },
      { input: implCrop, top: bar + pad, left: pad * 2 + 780 },
    ])
    .png()
    .toFile(`${OUT}/comparison-390.png`);

  console.log('comparison-390.png', `${W}x${totalH}`, `(mock ${mockH}, impl ${heroH})`);
}
