// Dump alpha grid of an image to understand which mask survived compositing.
import sharp from 'sharp';
const file = process.argv[2] ?? 'public/brand/reference/hero-bouquet-hi.webp';
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
console.log('asset', W, 'x', info.height, 'channels', info.channels);
const xs = [50, 150, 250, 350, 450, 550];
let head = 'x     ';
for (const x of xs) head += String(x).padStart(6);
console.log(head);
for (const y of [50, 150, 300, 450, 520, 560, 590, 620, 650, 690]) {
  let row = String(y).padStart(6);
  for (const x of xs) row += String(Math.round(data[(y * W + x) * 4 + 3])).padStart(6);
  console.log(row);
}
