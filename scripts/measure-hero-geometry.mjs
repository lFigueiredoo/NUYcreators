/**
 * Mede as caixas aprovadas do Hero no fold 100svh (1920×1080) para o snapshot
 * do teste visual. Uso: node scripts/measure-hero-geometry.mjs [http://localhost:3100]
 */
import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const boxes = await page.evaluate(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const round = (v) => Math.round(v * 100) / 100;
      return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      hero: box('[data-visual-hero]'),
      artboard: box('[data-hero-artboard]'),
      headline: box('[data-hero-headline]'),
      packshot: box('[data-hero-packshot]'),
      benefits: box('[data-hero-benefits]'),
      actions: box('[data-hero-actions]'),
    };
  });
  console.log(JSON.stringify(boxes, null, 2));
} finally {
  await browser.close();
}
