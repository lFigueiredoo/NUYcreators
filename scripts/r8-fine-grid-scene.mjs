import sharp from 'sharp';

// Fine 50px grid over the hero scene asset (content space, mockup-comparable).
const src = 'public/brand/v2/hero-scene-v2.webp';
const info = await sharp(src).metadata();
const w = info.width; // 1264
const h = info.height; // 1204
const lines = [];
for (let x = 0; x <= w; x += 50) {
  const big = x % 100 === 0;
  lines.push(
    `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${big ? 'lime' : 'rgba(0,255,0,0.3)'}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`,
  );
  if (big) lines.push(`<text x="${x + 3}" y="20" fill="lime" font-size="26">${x}</text>`);
}
for (let y = 0; y <= h; y += 50) {
  const big = y % 100 === 0;
  lines.push(
    `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${big ? 'lime' : 'rgba(0,255,0,0.3)'}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`,
  );
  if (big) lines.push(`<text x="4" y="${y - 5}" fill="lime" font-size="26">${y}</text>`);
}
const overlay = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines.join('')}</svg>`,
  ),
  { density: 72 },
)
  .png()
  .toBuffer();
const composed = await sharp(src)
  .composite([{ input: overlay, blend: 'over' }])
  .png()
  .toBuffer();
await sharp(composed)
  .resize({ width: 1568, kernel: 'lanczos3' })
  .png()
  .toFile('artifacts/r8/grid-fine-scene.png');
console.log('grid-fine-scene ok');
