import sharp from 'sharp';

// Grid overlay (50px lines, 100px labels) to pick precise crops by eye.
const [input, out, wArg, hArg] = process.argv.slice(2);
const w = Number(wArg);
const h = Number(hArg);
const pieces = [];
for (let x = 0; x <= w; x += 50) {
  pieces.push(`<path d="M${x} 0V${h}" stroke="lime" stroke-width="1"/>`);
  if (x % 100 === 0)
    pieces.push(`<text x="${x + 3}" y="14" font-size="11" fill="yellow">${x}</text>`);
}
for (let y = 0; y <= h; y += 50) {
  pieces.push(`<path d="M0 ${y}H${w}" stroke="lime" stroke-width="1"/>`);
  if (y % 100 === 0)
    pieces.push(`<text x="3" y="${y + 12}" font-size="11" fill="yellow">${y}</text>`);
}
const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${pieces.join('')}</svg>`;
await sharp(input)
  .composite([{ input: Buffer.from(svg), blend: 'over' }])
  .png()
  .toFile(out);
console.log('ok', out);
