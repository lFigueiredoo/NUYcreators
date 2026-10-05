import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';

const directory = 'artifacts/vertical/direction-type-study';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      '[data-hero-headline] {font-family:var(--nuy-serif)!important;font-weight:500!important;font-size:5.7cqw!important;height:auto!important;} [data-hero-headline] strong {font-family:inherit!important;font-weight:500!important;font-size:6.95cqw!important;}',
  });
  const crop = { left: 80, top: 220, width: 1050, height: 320 };
  const capture = async (name) => {
    const image = await page.locator('[data-visual-hero]').screenshot();
    const buffer = await sharp(image)
      .resize({ width: 1920, height: 1080, fit: 'contain', background: '#040f26' })
      .extract(crop)
      .png()
      .toBuffer();
    await fs.writeFile(`${directory}/${name}.png`, buffer);
    return buffer;
  };
  const reference = await sharp('artifacts/visual/hero-reference.png')
    .resize({ width: 1920, height: 1080, fit: 'contain', background: '#040f26' })
    .extract(crop)
    .png()
    .toBuffer();
  const cormorant = await capture('cormorant');
  const font = await fs.readFile('artifacts/BodoniModa-study.ttf');
  await page.evaluate(async (base64) => {
    const face = new FontFace('NUY Bodoni Study', `url(data:font/ttf;base64,${base64})`);
    document.fonts.add(await face.load());
  }, font.toString('base64'));
  await page.addStyleTag({
    content:
      '[data-hero-headline], [data-hero-headline] strong {font-family:"NUY Bodoni Study" !important;font-weight:400 !important;}',
  });
  const bodoni = await capture('bodoni');
  await sharp({ create: { width: 3150, height: 320, channels: 3, background: '#040f26' } })
    .composite([
      { input: reference, left: 0, top: 0 },
      { input: cormorant, left: 1050, top: 0 },
      { input: bodoni, left: 2100, top: 0 },
    ])
    .png()
    .toFile(`${directory}/reference-cormorant-bodoni.png`);
} finally {
  await browser.close();
}
