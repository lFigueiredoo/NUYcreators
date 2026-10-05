import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { format } from 'prettier';

const stage = process.argv[2] || 'v1';
const baseURL = process.argv[3] || 'http://localhost:3000';
const directory = `artifacts/visual/${stage}`;
await fs.mkdir(directory, { recursive: true });
const original = 'Universo NUY_ Bem-Estar em Flor.png';
await fs.copyFile(original, 'artifacts/visual-reference.png');

async function compare(reference, current, width, height, prefix) {
  const options = { width, height, fit: 'contain', background: '#071632' };
  const a = await sharp(reference)
    .resize(options)
    .flatten({ background: '#071632' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const b = await sharp(current)
    .resize(options)
    .flatten({ background: '#071632' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const overlay = Buffer.alloc(a.length),
    diff = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    overlay[i] = Math.round((a[i] + b[i]) / 2);
    diff[i] = Math.abs(a[i] - b[i]);
  }
  const raw = { width, height, channels: 3 };
  await sharp(overlay, { raw }).png().toFile(`${prefix}-overlay.png`);
  await sharp(diff, { raw }).png().toFile(`${prefix}-diff.png`);
  const leftImage = await sharp(a, { raw }).png().toBuffer();
  const rightImage = await sharp(b, { raw }).png().toBuffer();
  const labels = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="40"><rect width="100%" height="100%" fill="#071632"/><g font-family="Arial" font-size="16" fill="#F6F0E7"><text x="15" y="26">REFERÊNCIA</text><text x="${width + 15}" y="26">IMPLEMENTAÇÃO HTML</text></g></svg>`,
  );
  await sharp({
    create: { width: width * 2, height: height + 40, channels: 3, background: '#071632' },
  })
    .composite([
      { input: leftImage, left: 0, top: 40 },
      { input: rightImage, left: width, top: 40 },
      { input: labels, left: 0, top: 0 },
    ])
    .png()
    .toFile(`${prefix}-side-by-side.png`);
  const aBlur = await sharp(reference).resize(options).blur(16).png().toBuffer();
  const bBlur = await sharp(current).resize(options).blur(16).png().toBuffer();
  await sharp({ create: { width: width * 2, height, channels: 3, background: '#071632' } })
    .composite([
      { input: aBlur, left: 0, top: 0 },
      { input: bBlur, left: width, top: 0 },
    ])
    .png()
    .toFile(`${prefix}-masses.png`);
}

const referenceHero = await sharp(original)
  .extract({ left: 20, top: 18, width: 744, height: 410 })
  .png()
  .toBuffer();
const referenceCanvas = await sharp(original)
  .extract({ left: 20, top: 18, width: 1225, height: 1068 })
  .png()
  .toBuffer();
await sharp(referenceHero).toFile('artifacts/visual/hero-reference.png');
await sharp(referenceCanvas).toFile('artifacts/visual/application-reference.png');
const browser = await chromium.launch();
try {
  for (const [width, height] of [
    [1440, 1000],
    [1920, 1080],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
    if (
      !response?.ok() ||
      !(await page.locator('[data-visual-hero], section[aria-label="NUY Creators"]').count())
    )
      throw new Error('Landing indisponível; nenhuma captura será tratada como evidência final.');
    await page.evaluate(() => document.fonts.ready);
    const prefix = `${directory}/${width}`;
    await page.screenshot({ path: `${prefix}.png` });
    await page.screenshot({ path: `${prefix}-full.png`, fullPage: true });
    const hero = page.locator('[data-visual-hero], section[aria-label="NUY Creators"]').first();
    await hero.screenshot({ path: `${prefix}-hero.png` });
    const geometry = await page.evaluate(() => {
      const selectors = [
        '[data-visual-hero]',
        'header',
        'h1',
        '[data-depth="product"]',
        '#desafio',
        '#comunidade',
        '#recompensas',
        '#niveis',
        '#ranking',
      ];
      return Object.fromEntries(
        selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [selector, null];
          const rect = element.getBoundingClientRect();
          return [
            selector,
            { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height },
          ];
        }),
      );
    });
    await fs.writeFile(
      `${prefix}-geometry.json`,
      await format(JSON.stringify(geometry), { parser: 'json' }),
    );
    if (width > 760) {
      await compare(original, `${prefix}.png`, width, height, prefix);
      await compare(referenceHero, `${prefix}-hero.png`, 744, 410, `${prefix}-hero`);
      const canvas = page.locator('[data-visual-canvas]');
      if (await canvas.count()) {
        const canvasImage = await canvas.screenshot();
        const meta = await sharp(canvasImage).metadata();
        const padding = await canvas.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            left: parseInt(style.paddingLeft),
            right: parseInt(style.paddingRight),
            top: parseInt(style.paddingTop),
            bottom: parseInt(style.paddingBottom),
          };
        });
        // The reference application ROI excludes the outer presentation margin.
        // Remove only the equivalent CSS padding, never text/content regions.
        await sharp(canvasImage)
          .extract({
            left: padding.left,
            top: padding.top,
            width: meta.width - padding.left - padding.right,
            height: meta.height - padding.top - padding.bottom,
          })
          .png()
          .toFile(`${prefix}-application.png`);
        await compare(
          referenceCanvas,
          `${prefix}-application.png`,
          1225,
          1068,
          `${prefix}-application`,
        );
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (stage === 'v3') {
  await fs.copyFile(`${directory}/1440.png`, 'artifacts/visual-current.png');
  await fs.copyFile(`${directory}/1440-overlay.png`, 'artifacts/visual-overlay.png');
  await fs.copyFile(`${directory}/1440-diff.png`, 'artifacts/visual-diff.png');
}
console.log(
  `Visual evidence captured: ${directory}. Reference unchanged; no similarity score claimed.`,
);
