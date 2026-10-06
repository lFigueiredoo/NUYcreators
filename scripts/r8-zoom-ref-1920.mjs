import sharp from 'sharp';

// R8 — zooms 1:1 do hero da referência a 1920 (fatias ≤1600px para leitura
// sem downscale na revisão; rótulos = coordenadas alvo em 1920).
const ref = await sharp('artifacts/r8/reference/source-mockup.png')
  .extract({ left: 0, top: 0, width: 864, height: 410 })
  .resize({ width: 1920, kernel: 'lanczos3' })
  .png()
  .toBuffer();

const slices = [
  { name: 'zoom-ref-header-left', left: 300, top: 0, w: 800, h: 130 },
  { name: 'zoom-ref-header-right', left: 1120, top: 0, w: 800, h: 130 },
  { name: 'zoom-ref-kicker-Headline', left: 180, top: 180, w: 940, h: 260 },
  { name: 'zoom-ref-desc-buttons', left: 180, top: 420, w: 720, h: 280 },
  { name: 'zoom-ref-chips-band', left: 180, top: 750, w: 1470, h: 150 },
];
for (const s of slices) {
  const g = [];
  for (let x = 0; x <= s.w; x += 25) {
    const ax = x + s.left;
    if (ax % 50 === 0)
      g.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${s.h}" stroke="lime" stroke-width="1" opacity="0.65"/>`,
        `<text x="${x + 2}" y="24" fill="yellow" font-size="16">${ax}</text>`,
      );
  }
  for (let y = 0; y <= s.h; y += 25) {
    const ay = y + s.top;
    if (ay % 50 === 0)
      g.push(
        `<line x1="0" y1="${y}" x2="${s.w}" y2="${y}" stroke="lime" stroke-width="1" opacity="0.65"/>`,
        `<text x="4" y="${y > 14 ? y + 18 : y}" fill="yellow" font-size="16">${ay}</text>`,
      );
  }
  const svg = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">${g.join('')}</svg>`,
    ),
    { density: 72 },
  )
    .png()
    .toBuffer();
  await sharp(
    await sharp(ref)
      .extract({ left: s.left, top: s.top, width: s.w, height: s.h })
      .png()
      .toBuffer(),
  )
    .composite([{ input: svg, blend: 'over' }])
    .png()
    .toFile(`artifacts/r8/${s.name}.png`);
  console.log(s.name, 'ok');
}
