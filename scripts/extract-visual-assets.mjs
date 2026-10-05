import sharp from 'sharp';
import fs from 'node:fs/promises';

// Source art is user-supplied. Only image/decorative regions are extracted.
// No complete panel, screenshot, UI text, creator profile or ranking is bundled.
const source = 'Universo NUY_ Bem-Estar em Flor.png';
const directory = 'public/brand/reference';
await fs.mkdir(directory, { recursive: true });
const assets = [
  ['hero-composition-art', { left: 446, top: 74, width: 316, height: 354 }],
  ['campaign-interior', { left: 1006, top: 62, width: 192, height: 135 }],
  ['reward-products', { left: 800, top: 400, width: 131, height: 105 }],
  ['reward-ritual', { left: 944, top: 400, width: 132, height: 105 }],
];
for (const [name, crop] of assets) {
  const image = sharp(source).extract(crop);
  if (name === 'hero-composition-art') {
    // Footer badges at y402 are UI, not art: erase that strip entirely.
    const mask = Buffer.from(
      `<svg width="316" height="354" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="m" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".06" stop-color="white"/><stop offset=".84" stop-color="white"/><stop offset=".91" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect width="316" height="354" fill="url(#m)"/></svg>`,
    );
    image.ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]);
  }
  await image.webp({ quality: 94 }).toFile(`${directory}/${name}.webp`);
}
const masked = [
  ['hero-bouquet', { left: 388, top: 245, width: 146, height: 176 }],
  ['hero-violet-flower', { left: 415, top: 111, width: 47, height: 58 }],
  ['campaign-crown', { left: 1110, top: 0, width: 130, height: 85 }],
  ['hero-left-foliage', { left: 0, top: 292, width: 64, height: 105 }],
  ['hero-ground-foliage', { left: 60, top: 335, width: 185, height: 62 }],
  ['edge-petals', { left: 0, top: 210, width: 52, height: 105 }],
  ['ranking-bouquet', { left: 1114, top: 770, width: 85, height: 220 }],
  ['final-portrait', { left: 384, top: 866, width: 330, height: 220 }],
];
for (const [name, crop] of masked) {
  const mask = Buffer.from(
    `<svg width="${crop.width}" height="${crop.height}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="m"><stop offset="65%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><ellipse cx="${crop.width / 2}" cy="${crop.height / 2}" rx="${crop.width / 2}" ry="${crop.height / 2}" fill="url(#m)"/></svg>`,
  );
  const masks = [{ input: mask, blend: 'dest-in' }];
  if (name === 'hero-bouquet') {
    masks.push({
      input: Buffer.from(
        '<svg width="146" height="176" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="m" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset=".72" stop-color="white"/><stop offset=".87" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect width="146" height="176" fill="url(#m)"/></svg>',
      ),
      blend: 'dest-in',
    });
  }
  await sharp(source)
    .extract(crop)
    .ensureAlpha()
    .composite(masks)
    .webp({ quality: 94 })
    .toFile(`${directory}/${name === 'hero-bouquet' ? 'hero-bouquet-art' : name}.webp`);
}
await fs.writeFile(
  `${directory}/README.md`,
  '# Assets conceituais da referência\n\nRecortes modulares da arte fornecida pelo usuário, não fotografias/packshots oficiais. Coordenadas e máscaras reproduzíveis em scripts/extract-visual-assets.mjs. A imagem original não é alterada. Nenhuma interface completa, pessoa apresentada como creator real ou dado de atividade é reutilizado. Substituir por assets oficiais antes da campanha final.\n',
);
console.log('Extracted modular image/decorative assets; original untouched.');
