import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Native crops only: never manufacture resolution by enlarging a mockup.
const source = 'public/brand/product-concept.webp';
const out = 'public/brand/polish';
await mkdir(out, { recursive: true });
async function crop(name, region, path, softPath = '') {
  const { width, height } = region;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="edge"><feGaussianBlur stdDeviation="0.65"/></filter><filter id="soft"><feGaussianBlur stdDeviation="18"/></filter></defs><path d="${softPath}" fill="white" filter="url(#soft)"/><path d="${path}" fill="white" filter="url(#edge)"/></svg>`,
  );
  await sharp(source)
    .extract(region)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(`${out}/${name}.webp`);
}
// A single intact blossom, cut around the petals rather than a blurred tile.
await crop(
  'cream-bloom',
  { left: 80, top: 650, width: 300, height: 285 },
  'M79 146Q43 125 44 95Q41 69 67 65Q105 58 134 79Q126 43 143 31Q170 13 186 34Q193 49 187 66Q205 50 218 64Q235 82 218 113Q218 136 207 145Q239 143 250 168Q265 198 243 217Q217 234 191 214Q181 255 160 275Q140 291 113 283Q88 275 91 252L104 213Q56 231 30 211Q18 198 32 181Q48 154 79 146Z',
);
await crop(
  'lilac-floral',
  { left: 723, top: 580, width: 207, height: 255 },
  'M0 153Q9 110 38 106Q4 66 32 38Q56 27 77 63Q72 14 103 4Q126 12 130 45Q173 18 190 47Q202 70 179 95L207 84L207 190Q182 188 165 175Q184 226 149 235Q121 232 112 200Q83 255 56 226Q42 207 52 183Q12 205 0 177Z',
);

// Preserve a narrow edge feather and opaque product labels. Exclude the UI
// caption below y=940, which belongs to the source mockup, not the landing.
const width = 930,
  height = 940;
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="x"><stop stop-color="white" stop-opacity="0"/><stop offset=".12" stop-color="white"/><stop offset=".92" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="y" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".07" stop-color="white"/><stop offset=".94" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="m"><rect width="100%" height="100%" fill="url(#y)"/></mask></defs><rect width="100%" height="100%" fill="url(#x)" mask="url(#m)"/></svg>`,
);
await sharp(source)
  .extract({ left: 0, top: 0, width, height })
  .ensureAlpha()
  .composite([{ input: mask, blend: 'dest-in' }])
  .webp({ quality: 94, alphaQuality: 100 })
  .toFile(`${out}/hero-products.webp`);

// Isolated packshot for cream surfaces. Keep the bottles' native pixel detail.
await crop(
  'experience-still-life',
  { left: 0, top: 65, width: 930, height: 875 },
  'M286 32Q389 8 469 31L513 55L518 79L465 86L459 119L443 135L442 168L478 174L478 257Q519 269 535 318L537 798L302 798L301 319Q315 274 353 260L354 174L370 169L371 102L335 112L317 143L278 185L259 181L296 101L281 84Z M579 330Q630 311 694 329L696 391Q700 415 729 442L732 824L543 824L541 449Q548 420 576 392Z',
  'M0 531Q50 451 111 455Q191 530 261 391L300 518L340 785L740 785L751 482Q790 460 805 501L854 569L930 619L950 900L-20 900Z',
);
console.log('Native polish crops generated (no resize or sharpening).');
