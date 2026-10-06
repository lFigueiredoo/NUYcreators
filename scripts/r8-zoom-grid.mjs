import sharp from 'sharp';

// Fine 50px grids, 1:1, over the product regions of each candidate source.
const jobs = [
  {
    src: 'public/brand/reference/hero-composition-hi.webp',
    out: 'zoom-grid-hero-comp-bottles',
    box: { left: 100, top: 260, width: 620, height: 940 },
  },
  {
    src: 'public/brand/product-concept.webp',
    out: 'zoom-grid-product-concept-bottles',
    box: { left: 150, top: 40, width: 620, height: 900 },
  },
];
for (const { src, out, box } of jobs) {
  const lines = [];
  for (let x = 0; x <= box.width; x += 50) {
    const sx = x + box.left;
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${box.height}" stroke="lime" stroke-width="1" opacity="0.8"/>`,
    );
    if (x % 100 === 0)
      lines.push(`<text x="${x + 3}" y="16" fill="lime" font-size="18">${sx}</text>`);
  }
  for (let y = 0; y <= box.height; y += 50) {
    const sy = y + box.top;
    lines.push(
      `<line x1="0" y1="${y}" x2="${box.width}" y2="${y}" stroke="lime" stroke-width="1" opacity="0.8"/>`,
    );
    if (y % 100 === 0)
      lines.push(`<text x="3" y="${y + 20}" fill="lime" font-size="18">${sy}</text>`);
  }
  const overlay = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}">${lines.join('')}</svg>`,
    ),
    { density: 72 },
  )
    .png()
    .toBuffer();
  const composed = await sharp(src)
    .extract(box)
    .composite([{ input: overlay, blend: 'over' }])
    .png()
    .toBuffer();
  await sharp(composed).png().toFile(`artifacts/r8/${out}.png`);
  console.log(out, 'ok');
}
