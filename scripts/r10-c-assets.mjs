/**
 * R10 · Checkpoint A (OPÇÃO C — minimalista premium)
 * Monta a cena do hero a partir da arte nativa (hero-composition-hi, 1264×1416):
 *   1. remove o script "Mais que limpeza, é uma aura" (blur mascarado)
 *   2. recorta a faixa preta do rodapé da arte e a borda esquerda mais densa
 *   3. esmaece esquerda/topo/rodapé para o navy (sem emenda dura)
 * Saída: public/brand/c/scene-hero-c.webp + preview sobre navy para inspeção.
 * Sem re-render e sem upscale: a arte é usada em escala nativa (≤1).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'public/brand/reference/hero-composition-hi.webp';
const OUT_DIR = 'public/brand/c';
const PREVIEW_DIR = 'artifacts/r10';

const CROP = { left: 200, top: 0, width: 1064, height: 1295 }; // arte útil (sem a faixa preta y>1295)
const SCRIPT = { left: 545, top: 95, width: 519, height: 470 }; // script no espaço recortado (arte x 745-1264, y 95-565) — folga > feather da máscara

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PREVIEW_DIR, { recursive: true });

const meta = await sharp(SRC).metadata();
if (meta.width !== 1264 || meta.height !== 1416) {
  throw new Error(`arte inesperada: ${meta.width}x${meta.height}`);
}

// --- 1. arte recortada, RGBA
const base = await sharp(SRC)
  .extract(CROP)
  .ensureAlpha()
  .png()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = base.info;

// --- 2. patch do script: blur em duas passadas, aplicado por máscara suave
// O traço do script tem ~4px; σ=12 em duas passadas já o apaga, e — diferente
// do σ=45 — preserva a textura do bokeh/follhagem atrás (σ alto virava um
// borrão cinza sem estrutura, visível como "retângulo lavado" na página).
const blurred = await sharp(base.data)
  .blur(12)
  .blur(12)
  .modulate({ brightness: 0.94, saturation: 0.97 })
  .png()
  .toBuffer();

const maskSvg = `<svg width="${W}" height="${H}">
  <defs>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>
  <rect x="${SCRIPT.left}" y="${SCRIPT.top}" width="${SCRIPT.width}" height="${SCRIPT.height}"
        fill="#fff" filter="url(#soft)"/>
</svg>`;

const patchLayer = await sharp(blurred)
  .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
  .png()
  .toBuffer();

// --- 3. esmaecimento para o navy: esquerda, topo e rodapé
const fadeSvg = `<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000"/>
      <stop offset="0.04" stop-color="#000"/>
      <stop offset="0.21" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000"/>
      <stop offset="0.13" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="0.955" stop-color="#fff"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="fade">
      <rect width="${W}" height="${H}" fill="url(#left)"/>
      <rect width="${W}" height="${H}" fill="url(#top)" style="mix-blend-mode:multiply"/>
      <rect width="${W}" height="${H}" fill="url(#bottom)" style="mix-blend-mode:multiply"/>
    </mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff" mask="url(#fade)"/>
</svg>`;

const alphaMask = await sharp(Buffer.from(fadeSvg)).greyscale().toBuffer();

const scene = await sharp(base.data)
  .composite([
    { input: patchLayer, blend: 'over' },
    { input: alphaMask, blend: 'dest-in' },
  ])
  .png()
  .toBuffer();

await sharp(scene).webp({ quality: 92, effort: 6 }).toFile(`${OUT_DIR}/scene-hero-c.webp`);

// --- preview sobre navy do hero (#07172f), 1:1
const sceneMeta = await sharp(scene).metadata();
const overNavy = await sharp({
  create: { width: sceneMeta.width, height: sceneMeta.height, channels: 4, background: '#07172f' },
})
  .composite([{ input: scene }])
  .png()
  .toBuffer();
await sharp(overNavy).toFile(`${PREVIEW_DIR}/scene-hero-c-preview.png`);

// --- verificação de legibilidade do script: região em 2× (nearest) sobre navy
await sharp(overNavy)
  .extract({ left: SCRIPT.left, top: SCRIPT.top, width: SCRIPT.width, height: SCRIPT.height })
  .resize({ width: SCRIPT.width * 2, kernel: 'nearest' })
  .png()
  .toFile(`${PREVIEW_DIR}/scene-c-scriptzone-2x.png`);

console.log(
  JSON.stringify(
    {
      source: `${meta.width}x${meta.height}`,
      crop: CROP,
      canvas: `${W}x${H}`,
      out: `${OUT_DIR}/scene-hero-c.webp`,
    },
    null,
    1,
  ),
);
