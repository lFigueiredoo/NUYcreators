// Constrói o asset da cena de EXPERIÊNCIAS a partir da referência oficial
// (Mockup Editorial NUY Creators Regal.png). O crop cobre exatamente a fatia
// da ref (img 1130–1388 × 262–465): creme contínuo, sem a janela em arca do
// asset antigo (experience-editorial-688.webp). Feather nas bordas esquerda/
// topo (como na ref), direita e base firmes — a cena sangra para a borda da
// página e morre na fronteira com o FAQ.
// Uso: node scripts/build-scene-asset.mjs
import sharp from 'sharp';

const REF = 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const SCALE = 4; // 228×202 img → 912×808 (display ~47.6vw @1920 ≈ 1:1)
const crop = { left: 1134, top: 263, width: 228, height: 202 };
// À direita de img ~1364 o mockup tem o painel do celular sobreposto
// (oclusão) — a cena real termina ~93,5% da página, com margem creme depois.

const W = crop.width * SCALE;
const H = crop.height * SCALE;

// Máscara: retângulo estourado à direita/base (firmes) com blur nas bordas
// esquerda/topo. rx pequeno → cantos acima/abaixo do fecho também derretem.
const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <defs>
       <filter id="f" x="-20%" y="-20%" width="140%" height="140%">
         <feGaussianBlur stdDeviation="${Math.round(W * 0.055)}" />
       </filter>
     </defs>
     <rect x="${-W * 0.12}" y="${H * 0.035}" width="${W * 1.24}" height="${H * 1.2}"
           rx="${W * 0.09}" filter="url(#f)" fill="#ffffff" />
   </svg>`,
);

await sharp(REF)
  .extract(crop)
  .resize(W, H, { kernel: 'lanczos3' })
  .sharpen({ sigma: 0.6 })
  .composite([{ input: maskSvg, blend: 'dest-in' }])
  .webp({ quality: 94, alphaQuality: 90 })
  .toFile('public/brand/reference/experience-scene-ref.webp');

await sharp('public/brand/reference/experience-scene-ref.webp')
  .flatten({ background: '#f3e2cb' })
  .png()
  .toFile('artifacts/round6/asset-scene-check.png');

console.log('ok: experience-scene-ref.webp', W + 'x' + H);
