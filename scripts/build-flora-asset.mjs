// Assets da R2 (flores, buquê, fita de luz) recortados da referência oficial
// (Mockup Editorial NUY Creators Regal.png). Painel médio = img x874–1390
// (516img → 1920css, fator 3.7209). Cada asset leva máscara feather (SVG
// feGaussianBlur + dest-in, mesmo pipeline do build-scene-asset.mjs) nas
// bordas que derretem na cena; bordas de viewport/seção ficam firmes.
// Uso: node scripts/build-flora-asset.mjs
import sharp from 'sharp';

const REF = 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const SCALE = 4;

// [nome, crop, mask {x,y,w,h} em fração do asset, blur em fração, cor de fundo p/ check]
// Crops FINAIS (aplicados via inline node nesta rodada e retroalimentados
// aqui p/ regeneração determinística — mesmas params = mesmos bytes):
const JOBS = [
  // Orquídea lilás da jornada, esquerda. Cortada estreita p/ não levar o
  // "Expl…" do rótulo nem o anel da moeda; borda esquerda firme, resto derrete.
  [
    'journey-orchid-l',
    { left: 874, top: 140, width: 58, height: 72 },
    { x: -0.12, y: -0.06, w: 1.02, h: 0.94 },
    0.05,
    '#141a38',
  ],
  // Buquê borboletado lilás do topo-direita da jornada (sangra até x1366img —
  // recorte para na oclusão do celular); topo firme na viewport.
  [
    'journey-bouquet-tr',
    { left: 1270, top: 0, width: 96, height: 120 },
    { x: 0.06, y: -0.1, w: 0.88, h: 0.75 },
    0.08,
    '#141a38',
  ],
  // Fita dourada da base da jornada (curva-S + bloom âmbar à direita);
  // topo recortado abaixo do fantasma "NUY" (y232img); base firme na fronteira.
  [
    'journey-ribbon',
    { left: 874, top: 232, width: 492, height: 30 },
    { x: -0.1, y: 0.12, w: 1.05, h: 1.5 },
    0.05,
    '#141a38',
  ],
  // Bloom creme-alaranjado do canto inferior-esquerdo do FAQ. Base estendida
  // ATÉ y735img: a ponta atravessa a fronteira FAQ→CTA (fio de luz + pétalas
  // derretem ~38img abaixo — recaptura provou fade sem borda dura).
  [
    'faq-bloom-corner',
    { left: 874, top: 600, width: 78, height: 135 },
    { x: -0.12, y: 0.05, w: 0.96, h: 0.93 },
    0.07,
    '#101a2e',
  ],
  // Orquídea rosada da edge esquerda do CTA; recorte estreito (32img) p/ parar
  // ANTES da manchete que começa em x~905–910img (antes levava "Se…/Faça").
  [
    'cta-bloom-l',
    { left: 874, top: 740, width: 32, height: 100 },
    { x: -0.12, y: 0.03, w: 0.82, h: 0.96 },
    0.07,
    '#131230',
  ],
];

for (const [name, crop, m, blurFrac, bgColor] of JOBS) {
  const W = crop.width * SCALE;
  const H = crop.height * SCALE;
  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs>
         <filter id="f" x="-30%" y="-30%" width="160%" height="160%">
           <feGaussianBlur stdDeviation="${Math.round((Math.max(W, H) * blurFrac) / 2)}" />
         </filter>
       </defs>
       <rect x="${m.x * W}" y="${m.y * H}" width="${m.w * W}" height="${m.h * H}"
             rx="${W * 0.08}" filter="url(#f)" fill="#ffffff" />
     </svg>`,
  );
  const out = `public/brand/reference/${name}.webp`;
  await sharp(REF)
    .extract(crop)
    .resize(W, H, { kernel: 'lanczos3' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .webp({ quality: 94, alphaQuality: 90 })
    .toFile(out);
  await sharp(out)
    .flatten({ background: bgColor })
    .png()
    .toFile(`artifacts/round6/check-${name}.png`);
  console.log('ok', name, `${W}x${H}`);
}
