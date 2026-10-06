import sharp from 'sharp';
import fs from 'node:fs';

// R9 checkpoint A — o ASSET DO HERO é a ARTE INTEIRA (1264×1204, mesma arte da
// nova referência) com a AURORA pintada: a ref substitui a cortina/luminária do
// interior do arco por aurora clara (medido: ref interior [152,130,137] vs arte
// [103,102,146] — mockup com aurora compondo as camadas que o asset V2 não tem).
// Display 632 @DPR1 e 1264×2 = nativo exato em DPR2 → zero upscale nos DOIS DPRs.
const SCENE = 'public/brand/v2/hero-scene-v2.webp';
const OUT = 'public/brand/v3';
const W = 1264,
  H = 1204;

fs.mkdirSync(OUT, { recursive: true });

// aurora: interior do arco (forma de U: curva interna de x75→790, base y1080)
// em creme-quente opaco 0.92, bordas borradas para fundir nos rims; frascos em
// buracos da máscara (trigger ref é preto sólido; corpo já bate [180,152,120]).
const auraSvg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="aura" cx="440" cy="470" r="560" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(228,198,186)"/>
        <stop offset="0.62" stop-color="rgb(216,188,196)"/>
        <stop offset="1" stop-color="rgb(180,158,196)"/>
      </radialGradient>
      <filter id="soft" x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur stdDeviation="34"/>
      </filter>
      <mask id="bottles">
        <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
        <rect x="240" y="30" width="410" height="620" rx="130" fill="black" filter="url(#soft)"/>
        <rect x="590" y="390" width="330" height="820" rx="110" fill="black" filter="url(#soft)"/>
      </mask>
    </defs>
    <path d="M 72 990 C 72 340 190 66 470 58 C 750 66 796 340 796 990 L 796 1084 L 72 1084 Z"
      fill="url(#aura)" fill-opacity="0.92" filter="url(#soft)" mask="url(#bottles)"/>
  </svg>`,
);

await sharp(SCENE)
  .extract({ left: 0, top: 0, width: W, height: H })
  .composite([{ input: auraSvg, left: 0, top: 0, blend: 'over' }])
  .webp({ quality: 92 })
  .toFile(`${OUT}/scene-hero.webp`);

await sharp(SCENE)
  .extract({ left: 0, top: 240, width: 260, height: 964 })
  .webp({ quality: 92 })
  .toFile(`${OUT}/garland-left.webp`);
await sharp(SCENE)
  .extract({ left: 980, top: 380, width: 284, height: 780 })
  .webp({ quality: 92 })
  .toFile(`${OUT}/floral-right.webp`);

// inventário para o relatório
const inv = [];
for (const f of ['scene-hero.webp', 'garland-left.webp', 'floral-right.webp']) {
  const m = await sharp(`${OUT}/${f}`).metadata();
  inv.push({
    file: `public/brand/v3/${f}`,
    width: m.width,
    height: m.height,
    source: f === 'scene-hero.webp' ? `${SCENE} recorte x140-1264` : SCENE,
  });
}
fs.writeFileSync(
  'artifacts/r9/v3-assets-inventory.json',
  JSON.stringify({ source: SCENE, derived: inv }, null, 2),
);
console.log(inv.map((i) => `${i.file} ${i.width}x${i.height}`).join('\n'));
