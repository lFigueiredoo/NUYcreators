/**
 * O hero como o olho vê: 1920 de largura, e uma segunda passada na metade
 * direita ampliada — é onde a composição dos frascos vive.
 *
 * Uso: node scripts/polish-hero-view.mjs [base] [sufixo]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const SUFFIX = process.argv[3] ?? 'final';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
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
await page.waitForTimeout(1800);

const hero = await page.locator('[class*=landing-module][class*=hero]').first().boundingBox();
await page.screenshot({
  path: `${OUT}/hero-view-${SUFFIX}.png`,
  clip: { x: 0, y: 0, width: 1920, height: Math.round(hero.height) },
});

const stage = await page.locator('[class*=heroStage]').first().boundingBox();
const zoom = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
await zoom.goto(BASE, { waitUntil: 'load' });
await zoom.evaluate(async () => {
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await zoom.waitForTimeout(1500);
await zoom.screenshot({
  path: `${OUT}/hero-group-${SUFFIX}.png`,
  clip: {
    x: stage.x - 40,
    y: stage.y - 20,
    width: stage.width + 80,
    height: stage.height + 40,
  },
});
console.log('hero', hero, 'stage', stage);

await browser.close();
