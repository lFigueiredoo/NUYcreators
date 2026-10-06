import sharp from 'sharp';

// R8 — plates 2× (dense grid 144dpi) do hero da referência a 1920:
// headlines, chips e header. Mesma técnica de SVG único (data-URI embutido).
const SRC = 'artifacts/r8/reference/source-mockup.png';
const base = await sharp(SRC)
  .extract({ left: 0, top: 0, width: 864, height: 410 })
  .resize({ width: 1920, kernel: 'lanczos3' })
  .png()
  .toBuffer();
const b64 = base.toString('base64');

const plates = [
  { name: 'zoom2x-ref-headline', left: 190, top: 180, w: 930, h: 270 },
  { name: 'zoom2x-ref-chips-a', left: 190, top: 755, w: 710, h: 110 },
  { name: 'zoom2x-ref-chips-b', left: 850, top: 755, w: 770, h: 110 },
  { name: 'zoom2x-ref-header-left', left: 190, top: 0, w: 810, h: 130 },
  { name: 'zoom2x-ref-header-right', left: 1400, top: 0, w: 450, h: 130 },
];
for (const s of plates) {
  const g = [];
  for (let x = Math.ceil(s.left / 10) * 10; x < s.left + s.w; x += 10) {
    const cx = x - s.left;
    if (x % 50 === 0)
      g.push(
        `<line x1="${cx}" y1="0" x2="${cx}" y2="${s.h}" stroke="lime" stroke-width="1" opacity="0.85"/>`,
        `<text x="${cx + 2}" y="18" fill="yellow" font-size="13">${x}</text>`,
      );
    else
      g.push(
        `<line x1="${cx}" y1="0" x2="${cx}" y2="${s.h}" stroke="lime" stroke-width="0.5" opacity="0.3"/>`,
      );
  }
  for (let y = Math.ceil(s.top / 10) * 10; y < s.top + s.h; y += 10) {
    const cy = y - s.top;
    if (y % 50 === 0)
      g.push(
        `<line x1="0" y1="${cy}" x2="${s.w}" y2="${cy}" stroke="lime" stroke-width="1" opacity="0.85"/>`,
        `<text x="3" y="${cy + 14}" fill="yellow" font-size="13">${y}</text>`,
      );
    else
      g.push(
        `<line x1="0" y1="${cy}" x2="${s.w}" y2="${cy}" stroke="lime" stroke-width="0.5" opacity="0.3"/>`,
      );
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">` +
    `<image href="data:image/png;base64,${b64}" x="${-s.left}" y="${-s.top}" width="1920" height="911"/>` +
    `${g.join('')}</svg>`;
  await sharp(Buffer.from(svg), { density: 144 }).png().toFile(`artifacts/r8/${s.name}.png`);
  console.log(s.name, 'ok');
}
