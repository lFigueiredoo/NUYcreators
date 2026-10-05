import sharp from 'sharp';

// Magnifica uma região de um PNG: node scripts/mag-region.mjs <src> <left> <top> <w> <h> <out> [zoom]
const [src, left, top, width, height, out, zoomArg] = process.argv.slice(2);
const zoom = Number(zoomArg ?? 2);
const buf = await sharp(src)
  .extract({ left: Number(left), top: Number(top), width: Number(width), height: Number(height) })
  .png()
  .toBuffer();
await sharp(buf)
  .resize(Math.round(Number(width) * zoom))
  .sharpen()
  .png()
  .toFile(out);
console.log('magnificado →', out);
