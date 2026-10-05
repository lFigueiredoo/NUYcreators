// Ajustes na cena do Hero depois do QA "after": apaga a legenda embutida do buquê,
// dá máscara real ao violeta, ao ground foliage e à faixa de entorno, para eliminar
// as junções retangulares dos tiles sobre o fundo navy.
// Não altera os demais assets gerados por extract-hi-res-assets.mjs.
import sharp from 'sharp';
import fs from 'node:fs/promises';

const source = 'Universo NUY_ Bem-Estar em Flor.png';
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

// 1) Buquê — o mesmo pipeline do gerador, agora com remendo desfocado sobre a legenda
//    "Recompensas reais" (asset 4×: x 181–381, y 590–648) antes das máscaras.
{
  const crop = { left: 388, top: 245, width: 146, height: 176 };
  const up = await sharp(source)
    .extract(crop)
    .resize({ width: 584, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.65, m1: 0.4, m2: 0.2 })
    .ensureAlpha()
    .png()
    .toBuffer();
  const zone = { left: 100, top: 594, width: 370, height: 74 };
  const smeared = await sharp(up).extract(zone).median(31).modulate({ brightness: 0.8 }).toBuffer();
  const featherH = gradientMask(zone.width, zone.height, [
    [0, 0],
    [20, 1],
    [78, 1],
    [100, 0],
  ]);
  const featherV = gradientMask(
    zone.width,
    zone.height,
    [
      [0, 0],
      [24, 1],
      [78, 1],
      [100, 0],
    ],
    true,
  );
  const patch = await sharp(smeared)
    .ensureAlpha()
    .composite([
      { input: featherH, blend: 'dest-in' },
      { input: featherV, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
  const base = await sharp(up)
    .composite([{ input: patch, left: zone.left, top: zone.top }])
    .png()
    .toBuffer();
  const image = sharp(base).composite(
    scaleMasks(
      [
        (w, h) => radialFade(w, h),
        // Vertical (horizontal:true = gradiente girado p/ topo→base, como na referência).
        (w, h) =>
          gradientMask(
            w,
            h,
            [
              [0, 1],
              [72, 1],
              [88, 0],
            ],
            true,
          ),
      ],
      584,
      704,
    ),
  );
  const output = await image.webp({ quality: 94 }).toFile(`${directory}/hero-bouquet-hi.webp`);
  console.log(
    `hero-bouquet-hi: ${output.width}×${output.height} (${(output.size / 1024).toFixed(0)}kb)`,
  );
}

// 2) Violeta — recorte apertado SÓ na pétala (a moldura antiga pegava o céu com o
//    raio de luz e a borda do arco da própria arte, que lia como uma caixa). Radial
//    a partir de 55% da flor; 8× compensa a exibição a ~123px de CSS.
{
  const crop = { left: 426, top: 131, width: 28, height: 30 };
  const out = await sharp(source)
    .extract(crop)
    .resize({ width: crop.width * 8, kernel: 'lanczos3' })
    .ensureAlpha()
    .composite(scaleMasks([(w, h) => radialFade(w, h, 55)], crop.width * 8, crop.height * 8))
    .webp({ quality: 94 })
    .toFile(`${directory}/hero-violet-flower-hi.webp`);
  console.log(`hero-violet-flower-hi: ${out.width}×${out.height} (pétala 8×, radial 55)`);
}

// 3) Ground foliage — não vai mais para a cena: a faixa de névoa clara do recorte
//    tinha início abrupto sobre o navy do artboard e lia como caixa. O chão fica
//    por conta da faixa de entorno + warmFloor + cornerFlowers (como na referência).

// 4) Environment — fades assados: topo some, base derrete; laterais já tinham máscara CSS.
//    5.5× porque a faixa exibe até ~1382px de CSS no fold 1920×1080.
const environmentOutput = await sharp(heroReference)
  .extract({ left: 32, top: 323, width: 300, height: 49 })
  .resize({ width: 1650, kernel: 'lanczos3' })
  .ensureAlpha()
  .composite(
    scaleMasks(
      [
        (w, h) =>
          gradientMask(
            w,
            h,
            [
              [0, 0],
              [26, 1],
              [82, 1],
              [94, 0],
            ],
            true,
          ),
        (w, h) =>
          gradientMask(w, h, [
            [0, 0],
            [5, 1],
            [95, 1],
            [100, 0],
          ]),
      ],
      1650,
      270,
    ),
  )
  .webp({ quality: 94 })
  .toFile(`${directory}/hero-environment-hi.webp`);
console.log(
  `hero-environment-hi: ${environmentOutput.width}×${environmentOutput.height} (fades topo/base/laterais)`,
);
