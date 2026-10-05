import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Iteração do hero (rodada referência): captura APENAS do hero @1920 contra o
// dev :3000 (HMR já reflete os edits; server do usuário nunca é reiniciado).
// Uso: node scripts/capture-hero-iter.mjs [tag]
const BASE = 'http://localhost:3000';
const TAG = process.argv[2] ?? 'it1';
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });

const to = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label} (${ms}ms)`)), ms)),
  ]);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await to(page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 }), 50000, 'goto');
await to(
  page.evaluate(() => document.fonts.ready),
  15000,
  'fonts',
);
await page.evaluate(async () => {
  document.querySelectorAll('img').forEach((i) => {
    i.loading = 'eager';
  });
  await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})));
});
await page.waitForTimeout(400);
const hero = await page.evaluate(() => {
  const el = document.querySelector('[data-visual-hero]');
  const b = el.getBoundingClientRect();
  return {
    top: Math.round(b.top + scrollY),
    height: Math.round(b.height),
    width: Math.round(b.width),
  };
});
const buf = await to(
  page.screenshot({
    clip: { x: 0, y: hero.top, width: 1920, height: hero.height },
    fullPage: true,
  }),
  90000,
  'shot',
);
await sharp(buf).png().toFile(`${OUT}/impl-hero-${TAG}-1920.png`);
console.log(`hero ${TAG}: y${hero.top} ${hero.width}×${hero.height} → impl-hero-${TAG}-1920.png`);
await browser.close();
