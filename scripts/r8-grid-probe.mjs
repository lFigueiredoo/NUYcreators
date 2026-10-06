import sharp from 'sharp';

// Gridded previews for precise source measurements.
const jobs = [
  {
    src: 'public/brand/reference/hero-composition-hi.webp',
    out: 'grid-hero-composition',
    w: 1264,
    h: 1416,
  },
  { src: 'public/brand/product-concept.webp', out: 'grid-product-concept', w: 930, h: 1011 },
];
for (const { src, out, w, h } of jobs) {
  const lines = [];
  for (let x = 0; x <= w; x += 100) {
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="lime" stroke-width="2" opacity="0.75"/>`,
    );
    lines.push(`<text x="${x + 4}" y="18" fill="lime" font-size="20">${x}</text>`);
  }
  for (let y = 0; y <= h; y += 100) {
    lines.push(
      `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="lime" stroke-width="2" opacity="0.75"/>`,
    );
    lines.push(`<text x="4" y="${y + 22}" fill="lime" font-size="20">${y}</text>`);
  }
  const display = Math.min(w, 700);
  const overlaySvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines.join('')}</svg>`,
  );
  const overlay = await sharp(overlaySvg, { density: 72 }).png().toBuffer();
  const composed = await sharp(src)
    .composite([{ input: overlay, blend: 'over' }])
    .png()
    .toBuffer();
  await sharp(composed).resize({ width: display }).png().toFile(`artifacts/r8/${out}.png`);
  console.log(out, 'ok');
}
