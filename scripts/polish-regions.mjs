/**
 * Recortes por região, no tamanho em que o olho vê (DPR 1) e ampliados (DPR 2).
 *
 * Uso: node scripts/polish-regions.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });

const REGIONS = [
  ['community', 'section[class*=community]', 1],
  ['community-2x', 'section[class*=community]', 2],
  ['steps', 'section[class*=how]', 1],
  ['steps-2x', 'div[class*=progressRow]', 2],
  ['faq-2x', 'section[class*=faq]', 2],
  ['cta-2x', 'section[class*=ctaFinal]', 2],
];

const browser = await chromium.launch();

for (const [name, selector, dpr] of REGIONS) {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  // Varre a página para todo reveal assentar, e volta.
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.evaluate(() => {
    const el = document.querySelector('[data-pl-reveal]');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  const node = page.locator(selector).first();
  await node.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const box = await node.boundingBox();
  if (!box) {
    console.log(`${name}: não achei ${selector}`);
    await page.close();
    continue;
  }
  const clip = {
    x: Math.max(0, box.x - 10),
    y: Math.max(0, box.y - 10),
    width: Math.min(1920, box.width + 20),
    height: box.height + 20,
  };
  await page.screenshot({
    path: `${OUT}/region-${name}.png`,
    clip,
    scale: 'css',
    ...(dpr === 2 ? {} : {}),
  });
  console.log(`${name}: ${Math.round(clip.width)}×${Math.round(clip.height)} @ dpr1`);
  await page.close();
}

await browser.close();
