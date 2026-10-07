/**
 * Gera os assets de marca do NUY Creators a partir dos arquivos entregues pela
 * designer.
 *
 * Entrada (fora do repositório, exportada pela designer):
 *   - `Logotipo Nuy Creators Elegante.png` — lockup horizontal "nuy | CREATORS"
 *     em navy sobre fundo branco sólido (com sombra de mockup).
 *   - `nuy-logo-site.png` — só a marca "nuy", já com transparência.
 *
 * Saída (no repositório):
 *   - `public/brand/logo/nuy-creators-lockup.png` — lockup recortado e transparente.
 *   - `public/brand/logo/nuy-mark.png` — marca recortada e transparente.
 *   - `src/app/icon.png` / `src/app/apple-icon.png` — favicon (convenção do App
 *     Router) sobre o creme da marca, para funcionar em aba clara e escura.
 *
 * Por que a chave de branco é feita aqui e não pedida em PNG transparente: o
 * lockup veio achatado sobre branco. O alfa sai de `(255 − canal mínimo)/255`
 * com *unpremultiply* pela mesma razão — o branco e a sombra do mockup somem e
 * a cor real da marca nas bordas fica preservada (o navy mais escuro é
 * `0,20,53`, então o canal mínimo da marca é 0 e a álgebra fecha exata).
 *
 *   node scripts/build-brand-logo.mjs ["<pasta de entrada>"]
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIR = process.argv[2] ?? 'C:/Users/rdeq1/Downloads';
const LOCKUP_SRC = join(INPUT_DIR, 'Logotipo Nuy Creators Elegante.png');
const MARK_SRC = join(INPUT_DIR, 'nuy-logo-site.png');

const LOCKUP_OUT = join(ROOT, 'public/brand/logo/nuy-creators-lockup.png');
const MARK_OUT = join(ROOT, 'public/brand/logo/nuy-mark.png');
const ICON_OUT = join(ROOT, 'src/app/icon.png');
const APPLE_OUT = join(ROOT, 'src/app/apple-icon.png');

/** Recorte medido do lockup original (conteúdo sem a margem branca). */
const LOCKUP_BOX = { left: 86, top: 371, width: 1278, height: 297 };
/** Cor de fundo dos ícones: o creme da Proposta C. */
const CREAM = { r: 249, g: 245, b: 239, alpha: 1 };

/** Branco → transparente, recuperando a cor real da marca nas bordas. */
async function keyedOnWhite(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const from = pixel * channels;
    const to = pixel * 4;
    const min = Math.min(data[from], data[from + 1], data[from + 2]);
    // A sombra suave do mockup vive acima de ~5% de alfa: descartamos.
    const alpha = Math.max(0, ((255 - min) / 255 - 0.05) / 0.95);
    out[to + 3] = Math.round(alpha * 255);
    for (let channel = 0; channel < 3; channel++) {
      const value = alpha > 0 ? (data[from + channel] - (1 - alpha) * 255) / alpha : 0;
      out[to + channel] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } });
}

async function main() {
  for (const file of [LOCKUP_SRC, MARK_SRC]) {
    if (!existsSync(file)) throw new Error(`Arquivo de origem ausente: ${file}`);
  }

  const lockup = await (
    await keyedOnWhite(LOCKUP_SRC)
  )
    .extract(LOCKUP_BOX)
    .resize({ width: 640, kernel: 'lanczos3' })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(LOCKUP_OUT);

  const mark = await sharp(MARK_SRC)
    .trim({ threshold: 1 })
    .resize({ width: 480, kernel: 'lanczos3' })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(MARK_OUT);

  // Favicon: marca centralizada sobre o creme, para não sumir em aba escura.
  const markBuffer = await sharp(MARK_OUT).toBuffer();
  const icon = async (size, output) =>
    sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
      .composite([
        {
          input: await sharp(markBuffer)
            .resize({ width: Math.round(size * 0.78), kernel: 'lanczos3' })
            .toBuffer(),
          gravity: 'center',
        },
      ])
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(output);

  await icon(512, ICON_OUT);
  await icon(180, APPLE_OUT);

  for (const [label, file, meta] of [
    ['lockup', LOCKUP_OUT, lockup],
    ['marca', MARK_OUT, mark],
    ['icon', ICON_OUT, await sharp(ICON_OUT).metadata()],
    ['apple-icon', APPLE_OUT, await sharp(APPLE_OUT).metadata()],
  ]) {
    console.log(`[brand] ${label}: ${meta.width}x${meta.height} → ${file.replace(ROOT, '.')}`);
  }
}

await main();
