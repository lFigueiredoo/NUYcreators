import sharp from 'sharp';

const W = 1264,
  H = 1204;
const v = [];
for (let x = 0; x <= W; x += 100)
  v.push(
    `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="cyan" stroke-width="2"/><text x="${x + 4}" y="24" fill="cyan" font-size="20">${x}</text>`,
  );
const h = [];
for (let y = 0; y <= H; y += 100)
  h.push(
    `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="yellow" stroke-width="2"/><text x="6" y="${y + 22}" fill="yellow" font-size="20">${y}</text>`,
  );
const grid = Buffer.from(`<svg width="${W}" height="${H}">${v.join('')}${h.join('')}</svg>`);

// sharp aplica resize ANTES do composite: primeiro redimensionar para buffer
const art = await sharp('public/brand/v2/hero-scene-v2.webp')
  .resize({ width: 840 })
  .png()
  .toBuffer();
const artMeta = await sharp(art).metadata();
const gridScaled = Buffer.from(
  `<svg width="${artMeta.width}" height="${artMeta.height}">${v.join('')}${h.join('')}</svg>`,
);
await sharp(art)
  .composite([{ input: gridScaled, left: 0, top: 0 }])
  .png()
  .toFile('artifacts/r9/v2-scene-grid.png');
console.log('ok', artMeta.width, 'x', artMeta.height);
