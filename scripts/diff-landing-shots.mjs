// Pixel-diff two screenshots (fullPage) and report changed-pixel stats.
import sharp from 'sharp';

const [aPath, bPath, outPath] = process.argv.slice(2);
const a = sharp(aPath).ensureAlpha();
const b = sharp(bPath).ensureAlpha();
const [A, B] = await Promise.all([
  a.raw().toBuffer({ resolveWithObject: true }),
  b.raw().toBuffer({ resolveWithObject: true }),
]);

const { width, height, channels } = A.info;
if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
  console.log(
    `DIFFERENT SIZES: ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}`,
  );
  process.exit(2);
}
const diff = Buffer.alloc(width * height * 4);
let changed = 0;
let maxDelta = 0;
for (let i = 0; i < width * height; i++) {
  const p = i * channels;
  const d = Math.max(
    Math.abs(A.data[p] - B.data[p]),
    Math.abs(A.data[p + 1] - B.data[p + 1]),
    Math.abs(A.data[p + 2] - B.data[p + 2]),
  );
  if (d > 8) {
    changed++;
    diff[p] = 255;
    diff[p + 1] = 0;
    diff[p + 2] = 255;
    diff[p + 3] = 255;
  } else {
    diff[p] = 255;
    diff[p + 1] = 255;
    diff[p + 2] = 255;
    diff[p + 3] = 255;
    for (let c = 0; c < 3; c++) diff[p + c] = 255;
  }
  if (d > maxDelta) maxDelta = d;
}
const pct = ((changed / (width * height)) * 100).toFixed(4);
console.log(`${width}x${height} · changed>8: ${changed} px (${pct}%) · maxDelta: ${maxDelta}`);
if (outPath)
  await sharp(diff, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outPath);
