import sharp from 'sharp';
import { readFileSync } from 'node:fs';

// R8 — grade+zooms do hero de referência a 1920 com UMA única rasterização:
// o recorte vai embutido como data-URI dentro do próprio SVG (o composite
// de sharp + <line>/opacity falha silenciosamente nesta versão).
// Uso: node scripts/r8-grid-overlay.mjs  [deixa também um slice sem grade]

const SRC = 'artifacts/r8/reference/source-mockup.png';
const BOX = { left: 0, top: 0, width: 864, height: 410 };
const TARGET_W = 1920;

const base = await sharp(SRC)
  .extract(BOX)
  .resize({ width: TARGET_W, kernel: 'lanczos3' })
  .png()
  .toBuffer();
const b64 = base.toString('base64');
const H = Math.round((410 / 864) * TARGET_W); // 911

function sliceSVG({ name, left, top, w, h, grid = true, step = 25, labelEvery = 50 }) {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">`,
    `<image href="data:image/png;base64,${b64}" x="${-left}" y="${-top}" width="${TARGET_W}" height="${H}"/>`,
  ];
  if (grid) {
    for (let x = Math.ceil(left / step) * step; x < left + w; x += step) {
      parts.push(
        `<line x1="${x - left}" y1="0" x2="${x - left}" y2="${h}" stroke="lime" stroke-width="1" opacity="0.6"/>`,
      );
      if (x % labelEvery === 0)
        parts.push(`<text x="${x - left + 2}" y="24" fill="yellow" font-size="16">${x}</text>`);
    }
    for (let y = Math.ceil(top / step) * step; y < top + h; y += step) {
      parts.push(
        `<line x1="0" y1="${y - top}" x2="${w}" y2="${y - top}" stroke="lime" stroke-width="1" opacity="0.6"/>`,
      );
      if (y % labelEvery === 0)
        parts.push(`<text x="4" y="${y - top + 18}" fill="yellow" font-size="16">${y}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

const slices = [
  { name: 'zoom-ref-header-left', left: 300, top: 0, w: 800, h: 130 },
  { name: 'zoom-ref-header-right', left: 1120, top: 0, w: 800, h: 130 },
  { name: 'zoom-ref-kicker-Headline', left: 180, top: 180, w: 940, h: 260, grid: false },
  { name: 'grid-kicker-Headline', left: 180, top: 180, w: 940, h: 260 },
  { name: 'zoom-ref-desc-buttons', left: 180, top: 420, w: 720, h: 280, grid: false },
  { name: 'grid-desc-buttons', left: 180, top: 420, w: 720, h: 280 },
  { name: 'zoom-ref-chips-band', left: 180, top: 750, w: 1470, h: 150 },
];
for (const s of slices) {
  await sharp(Buffer.from(sliceSVG(s)), { density: 72 })
    .png()
    .toFile(`artifacts/r8/${s.name}.png`);
  console.log(s.name, 'ok');
}
