import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// V2 hero assets: straight extracts from the best native sources.
// RULE: trim/tint only — never resize, never sharpen, never blur-bake.
const out = 'public/brand/v2';
await mkdir(out, { recursive: true });

const audit = [];

// 1) Hero scene: trim the transparent bands of hero-composition-hi (native crop).
{
  const src = 'public/brand/reference/hero-composition-hi.webp';
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + (info.channels - 1)];
  const rowAlpha = (y) => {
    let s = 0;
    let n = 0;
    for (let x = 0; x < info.width; x += 8) {
      s += alphaAt(x, y);
      n++;
    }
    return s / n;
  };
  let first = 0;
  let last = info.height - 1;
  while (first < info.height && rowAlpha(first) < 128) first++;
  while (last > first && rowAlpha(last) < 128) last--;
  const height = last - first + 1;
  console.log(`scene content rows: ${first}..${last} → 1264x${height}`);
  await sharp(src)
    .extract({ left: 0, top: first, width: info.width, height })
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(`${out}/hero-scene-v2.webp`);
  audit.push({
    asset: 'hero-scene-v2.webp',
    from: src,
    extract: { left: 0, top: first, width: info.width, height },
    srcW: info.width,
    srcH: height,
  });
}

// 2) Wordmark: alpha-trim, and tint the glyph to the brand cream if it is pure white.
{
  const src = 'public/brand/reference/nuy-wordmark-hi.png';
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + info.channels - 1];
    if (a > 200) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  const avg = [r / n, g / n, b / n];
  console.log(
    `wordmark opaque avg: #${avg.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')} over ${n}px`,
  );
  const trimmed = await sharp(src).trim({ threshold: 8 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  let pipe = sharp(trimmed);
  // Pure-white glyphs on the navy header read colder than the mockup's ivory
  // lockup; multiply with the warm cream keeps alpha, changes only the fill.
  if (avg[0] > 250 && avg[1] > 250 && avg[2] > 250) {
    const cream = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}"><rect fill="#f6eedd" width="100%" height="100%"/></svg>`,
    );
    pipe = sharp(trimmed).composite([{ input: cream, blend: 'multiply' }]);
  }
  await pipe.webp({ quality: 94, alphaQuality: 100 }).toFile(`${out}/wordmark-nuy.webp`);
  console.log(`wordmark trimmed: ${meta.width}x${meta.height}`);
  audit.push({ asset: 'wordmark-nuy.webp', from: src, srcW: meta.width, srcH: meta.height });
}

await writeFile('artifacts/r8/v2-assets.json', JSON.stringify(audit, null, 2));
console.log('v2 assets:', audit.map((a) => `${a.asset} ${a.srcW}x${a.srcH}`).join(', '));
