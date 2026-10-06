import sharp from 'sharp';

// Reference crops: hero region of the left desktop panel of the mockup.
const src = 'artifacts/r8/reference/source-mockup.png';
const crops = [
  { name: 'hero-left-col', box: [0, 0, 460, 400], scale: 3 },
  { name: 'hero-scene', box: [380, 0, 880, 410], scale: 2 },
  { name: 'hero-full', box: [0, 0, 880, 410], scale: 2 },
  { name: 'header-band', box: [0, 0, 880, 70], scale: 3 },
];
for (const { name, box, scale } of crops) {
  const [l, t, r, b] = box;
  await sharp(src)
    .extract({ left: l, top: t, width: Math.min(r, 1536) - l, height: Math.min(b, 1024) - t })
    .resize({ width: Math.round((Math.min(r, 1536) - l) * scale), kernel: 'lanczos3' })
    .png()
    .toFile(`artifacts/r8/reference/${name}.png`);
  console.log(name, 'ok');
}
