import sharp from 'sharp';

// Fine 10px grid over the mockup hero (left desktop panel), 4x for reading.
const src = 'artifacts/r8/reference/source-mockup.png';
const w = 880;
const h = 410;
const lines = [];
for (let x = 0; x <= w; x += 10) {
  const big = x % 50 === 0;
  lines.push(
    `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${big ? 'lime' : 'rgba(0,255,0,0.35)'}" stroke-width="${big ? 1.5 : 0.8}" vector-effect="non-scaling-stroke"/>`,
  );
  if (big) lines.push(`<text x="${x + 2}" y="12" fill="lime" font-size="16">${x}</text>`);
}
for (let y = 0; y <= h; y += 10) {
  const big = y % 50 === 0;
  lines.push(
    `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${big ? 'lime' : 'rgba(0,255,0,0.35)'}" stroke-width="${big ? 1.5 : 0.8}" vector-effect="non-scaling-stroke"/>`,
  );
  if (big) lines.push(`<text x="2" y="${y - 3}" fill="lime" font-size="16">${y}</text>`);
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
  .extract({ left: 0, top: 0, width: w, height: h })
  .composite([{ input: overlay, blend: 'over' }])
  .png()
  .toBuffer();
// 4x lanczos for close reading (view tool shows ~1568 wide).
await sharp(composed)
  .resize({ width: 1568, kernel: 'lanczos3' })
  .png()
  .toFile('artifacts/r8/grid-fine-hero.png');
console.log('grid-fine-hero ok (mockup 10px grid, 1568w)');
