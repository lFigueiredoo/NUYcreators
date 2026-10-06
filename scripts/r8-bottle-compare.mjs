import sharp from 'sharp';

// 1:1 comparisons of the spray-bottle region across candidate sources.
const jobs = [
  {
    name: 'bottle-src-product-concept',
    src: 'public/brand/product-concept.webp',
    // spray bottle incl. trigger: left ~230..560, top ~0..950
    region: { left: 230, top: 10, width: 340, height: 950 },
  },
  {
    name: 'bottle-src-hero-composition',
    src: 'public/brand/reference/hero-composition-hi.webp',
    // spray bottle region within 1264x1416
    region: { left: 560, top: 170, width: 340, height: 950 },
  },
];
const parts = [];
for (const j of jobs) {
  const buf = await sharp(j.src).extract(j.region).png().toBuffer();
  parts.push(buf);
}
const tallest = Math.max(...jobs.map((j) => j.region.height));
await sharp({
  create: { width: 700, height: tallest, channels: 3, background: { r: 20, g: 26, b: 60 } },
})
  .composite([
    { input: parts[0], left: 0, top: 0 },
    { input: parts[1], left: 350, top: 0 },
  ])
  .png()
  .toFile('artifacts/r8/bottle-source-compare.png');
console.log('left: product-concept (340w)', 'right: hero-composition-hi (340w)');
