import sharp from 'sharp';

// R8 — grade de 25px sobre o hero da referência oficial, levado a 1920 de largura
// (painel desktop 864×410 do mockup 1536×1024 → ×2.2222). Todas as etiquetas
// indicam coordenadas alvo em 1920, então a leitura já sai na escala da
// implementação. Tres fatias em 1:1 para leitura magnificada:
//  - header (0..120)
//  - coluna de copy (y 140..760)
//  - faixa dos chips (y 700..930)
const BOX = { left: 0, top: 0, width: 864, height: 410 };
const TARGET_W = 1920;

const upscaled = await sharp('artifacts/r8/reference/source-mockup.png')
  .extract(BOX)
  .resize({ width: TARGET_W, kernel: 'lanczos3' })
  .png()
  .toBuffer();
const meta = await sharp(upscaled).metadata();
const W = meta.width;
const H = meta.height;

function grid(lines, step = 25) {
  const out = [];
  for (let x = 0; x <= W; x += step) {
    out.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="lime" stroke-width="1" opacity="0.7"/>`,
    );
    if (x % 100 === 0)
      out.push(`<text x="${x + 3}" y="706" fill="yellow" font-size="26">${x}</text>`);
  }
  for (let y = 0; y <= H; y += step) {
    out.push(
      `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="lime" stroke-width="1" opacity="0.7"/>`,
    );
    if (y % 100 === 0)
      out.push(`<text x="${x + 3}" y="${y + 30}" fill="yellow" font-size="26">${y}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join('')}</svg>`;
}

const steps = [
  { name: 'grid-ref-header', y0: 0, y1: 130 },
  { name: 'grid-ref-copy', y0: 180, y1: 660 },
  { name: 'grid-ref-chips', y0: 660, y1: 911 },
];
for (const s of steps) {
  const h = s.y1 - s.y0;
  const g = [];
  for (let x = 0; x <= W; x += 25) {
    g.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="lime" stroke-width="0" opacity="0"/>`,
    );
    if (x % 50 === 0)
      g.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="lime" stroke-width="1" opacity="0.7"/>`,
        `<text x="${x + 3}" y="26" fill="yellow" font-size="20">${x}</text>`,
      );
  }
  for (let y = s.y0; y < s.y1; y += 25) {
    const gy = y - s.y0;
    g.push(
      `<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="lime" stroke-width="0" opacity="0"/>`,
      `<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="lime" stroke-width="1" opacity="0.5"/>`,
      `<text x="4" y="${gy + 28}" fill="yellow" font-size="20">${y}</text>`,
    );
  }
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}">${g.join('')}</svg>`,
  );
  await sharp(upscaled)
    .extract({ left: 0, top: s.y0, width: W, height: h })
    .composite([{ input: svg, blend: 'over' }])
    .png()
    .toFile(`artifacts/r8/${s.name}.png`);
  console.log(s.name, 'ok');
}
