import sharp from 'sharp';
import fs from 'node:fs/promises';

/**
 * Gera variantes em resolução adequada (-hi) dos assets conceituais exibidos grandes.
 * Fontes: PNG original (1448×1086), product-concept.webp (930×1011) e o mockup do
 * artboard (artifacts/visual/hero-reference.png, 744×410 — origem do wordmark e da
 * faixa de luz; as coordenadas desses dois pertencem a esse espaço, não ao PNG grande).
 * Regra de aceitação: largura natural ≥ largura renderizada no DPR 1 (margem para DPR 2).
 * A legenda "Recompensao reais" embutida na arte é removida com um remendo da prateleira
 * vizinha — texto estranho nunca pode ficar legível no Hero.
 */
const source = 'Universo NUY_ Bem-Estar em Flor.png';
const productConcept = 'public/brand/product-concept.webp';
const heroReference = 'artifacts/visual/hero-reference.png';
const directory = 'public/brand/reference';
await fs.mkdir(directory, { recursive: true });

const gradientMask = (w, h, stops, horizontal = false) => {
  const rotate = horizontal ? ` gradientTransform="rotate(90,.5,.5)"` : '';
  const list = stops
    .map(
      ([offset, opacity]) =>
        `<stop offset="${offset}%" stop-color="white" stop-opacity="${opacity}"/>`,
    )
    .join('');
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="m"${rotate}>${list}</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#m)"/></svg>`,
  );
};
const radialFade = (w, h, from = 65) =>
  Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="m"><stop offset="${from}%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#m)"/></svg>`,
  );
const scaleMasks = (masks, w, h) => masks.map((mask) => ({ input: mask(w, h), blend: 'dest-in' }));

const packshotStop = [
  [0, 0],
  [6, 1],
  [84, 1],
  [91, 0],
];
const bouquetBottom = [
  [0, 1],
  [72, 1],
  [87, 0],
];

// Remendo: a legenda "Recompensao reais" embutida na arte (crop-local x 0–56, y 319–332)
// é suprimida por um patch da própria região, fortemente desfocado e escurecido — a zona
// vira um brilho suave da prateleira, coerente com os pools de luz da peça.
const packshotRegion = { left: 446, top: 74, width: 316, height: 354 };
const patchZone = { left: 0, top: 310, width: 132, height: 40 };

async function hiAsset(name, crop, { from, scale, masks = [], sharpen = true } = {}) {
  let image = sharp(!from ? source : from).extract(crop);
  if (scale !== 1)
    image = image.resize({ width: Math.round(crop.width * scale), kernel: 'lanczos3' });
  if (sharpen) image = image.sharpen({ sigma: 0.65, m1: 0.4, m2: 0.2 });
  image = image.ensureAlpha();
  if (masks.length) image = image.composite(masks);
  const output = await image.webp({ quality: 94 }).toFile(`${directory}/${name}.webp`);
  console.log(`${name}: ${output.width}×${output.height} (${(output.size / 1024).toFixed(0)}kb)`);
}

// 1) Packshot do Hero — exibido a ~826px no desktop (100svh): 4× do crop original.
//    A máscara reproduz a original (VERTICAL: fade-in 0–6%, fade-out 84–91% — que
//    também recolhe a faixa de UI no rodapé da arte). A caligrafia da arte fica em
//    alpha cheio, como na composição aprovada; a legenda solta ("Recompensao reais")
//    na zona de fade ganha um remendo desfocado por segurança.
{
  const { left, top, width, height } = patchZone;
  const smeared = await sharp(source)
    .extract({ left: packshotRegion.left + left, top: packshotRegion.top + top, width, height })
    .blur(16)
    .modulate({ brightness: 0.7 })
    .toBuffer();
  // A borda esquerda permanece opaca (a legenda encosta nela); só cima/direita/baixo
  // são suavizados, para o remendo diluir no resto da prateleira.
  const edgeHorizontal = gradientMask(width, height, [
    [0, 1],
    [56, 1],
    [100, 0],
  ]);
  const edgeVertical = gradientMask(
    width,
    height,
    [
      [0, 0],
      [14, 1],
      [84, 1],
      [100, 0],
    ],
    true,
  );
  const softTile = await sharp(smeared)
    .ensureAlpha()
    .composite([
      { input: edgeHorizontal, blend: 'dest-in' },
      { input: edgeVertical, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
  const base = await sharp(source)
    .extract(packshotRegion)
    .composite([{ input: softTile, left, top }])
    .png()
    .toBuffer();
  const image = sharp(base)
    .resize({ width: packshotRegion.width * 4, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.65, m1: 0.4, m2: 0.2 })
    .ensureAlpha()
    .composite(scaleMasks([(w, h) => gradientMask(w, h, packshotStop, true)], 1264, 1416));
  const output = await image.webp({ quality: 94 }).toFile(`${directory}/hero-composition-hi.webp`);
  console.log(
    `hero-composition-hi: ${output.width}×${output.height} (${(output.size / 1024).toFixed(0)}kb)`,
  );
}
// 2) Buquê — exibido a até ~27vw: 4× com fade radial + inferior idênticos ao original.
//    O fade inferior é VERTICAL (horizontal:true: topo→base); sem o rotate ele sai
//    como um fade lateral e a legenda embutida na base sobrevive.
await hiAsset(
  'hero-bouquet-hi',
  { left: 388, top: 245, width: 146, height: 176 },
  {
    scale: 4,
    masks: scaleMasks(
      [(w, h) => radialFade(w, h), (w, h) => gradientMask(w, h, bouquetBottom, true)],
      584,
      704,
    ),
  },
);
// 3) Retrato do CTA final — exibido a até ~40vw: 3.5× com fade radial.
await hiAsset(
  'final-portrait-hi',
  { left: 384, top: 866, width: 330, height: 220 },
  {
    scale: 3.5,
    masks: scaleMasks([(w, h) => radialFade(w, h)], 1155, 770),
  },
);
// 4) Macro floral para "O projeto" — só as flores, sem borda de rótulo; 2× para DPR 2.
await hiAsset(
  'project-bloom-hi',
  { left: 6, top: 424, width: 286, height: 464 },
  {
    from: productConcept,
    scale: 2,
  },
);
// 5) A composição da seção "Experiências" migrou para `experience-editorial-688.webp`
//    (scripts/extract-experience-editorial.mjs): recorte em resolução nativa de
//    product-concept.webp, sem ampliação. O antigo experience-concept-hi (172px
//    reais exibidos a ~4×) está aposentado.
// 6) Environment do herói — origem é o mockup do artboard (não o PNG grande); 5.5×,
//    pois a faixa pode exibir ~1382px de CSS no fold de 1920×1080.
await hiAsset(
  'hero-environment-hi',
  { left: 32, top: 323, width: 300, height: 49 },
  {
    from: heroReference,
    scale: 5.5,
    sharpen: false,
  },
);
// 7) Microflorais — 4× para manter folga no DPR 2.
const smalls = [
  ['hero-violet-flower', { left: 415, top: 111, width: 47, height: 58 }],
  ['edge-petals', { left: 0, top: 210, width: 52, height: 105 }],
  ['hero-left-foliage', { left: 0, top: 292, width: 64, height: 105 }],
  ['hero-ground-foliage', { left: 60, top: 335, width: 185, height: 62 }],
];
for (const [name, crop] of smalls) {
  await hiAsset(`${name}-hi`, crop, { scale: 4, sharpen: false });
}
// white-bloom deriva do bouquet (recorte central da flor de cima), como no original.
await hiAsset(
  'hero-white-bloom-hi',
  { left: 422, top: 269, width: 90, height: 100 },
  {
    scale: 4,
    sharpen: false,
    masks: scaleMasks([(w, h) => radialFade(w, h, 55)], 360, 400),
  },
);

// 8) Wordmark — luminância→alpha a partir do mockup do artboard, em 6×.
const logoRegion = { left: 14, top: 10, width: 64, height: 40 };
const logoScale = 6;
const gray = await sharp(heroReference)
  .extract(logoRegion)
  .resize({ width: logoRegion.width * logoScale, kernel: 'lanczos3' })
  .greyscale()
  .raw()
  .toBuffer();
const w = logoRegion.width * logoScale;
const h = logoRegion.height * logoScale;
const rgba = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const alpha = Math.round(Math.max(0, Math.min(1, (gray[i] - 70) / 145)) * 255);
  rgba[i * 4] = 251;
  rgba[i * 4 + 1] = 249;
  rgba[i * 4 + 2] = 245;
  rgba[i * 4 + 3] = alpha;
}
await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toFile(`${directory}/nuy-wordmark-hi.png`);
console.log(`nuy-wordmark-hi: ${w}×${h}`);
