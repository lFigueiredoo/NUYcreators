/**
 * QA visual da landing: full-page (1920/1440/390) + crops por seção.
 * Uso: node scripts/capture-qa-visual.mjs <before|after> [http://localhost:3100]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const stage = process.argv[2] || 'after';
const url = process.argv[3] || 'http://localhost:3100';
const directory = `artifacts/qa-visual/${stage}`;
await fs.mkdir(directory, { recursive: true });

const SECTION_IDS = [
  'projeto',
  'como-funciona',
  'para-quem',
  'beneficios',
  'niveis',
  'experiencias',
  'faq',
];
const crops = [
  'projeto',
  'como-funciona',
  'para-quem',
  'beneficios',
  'niveis',
  'experiencias',
  'faq',
];

const browser = await chromium.launch();
const evidence = {};
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 1000],
    [390, 844],
  ]) {
    const report = { sections: {} };
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error('Landing indisponível; captura recusada.');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const prefix = `${directory}/${width}`;
    await page.screenshot({ path: `${prefix}-viewport.png` });
    await page.screenshot({ path: `${prefix}-full.png`, fullPage: true });
    await page.locator('[data-visual-hero]').screenshot({ path: `${prefix}-hero.png` });
    for (const id of crops) {
      const section = page.locator(`#${id}`);
      if ((await section.count()) === 1) {
        await section.screenshot({ path: `${prefix}-section-${id}.png` });
      }
    }
    const cta = page.locator('main > div > section:last-of-type');
    if ((await cta.count()) === 1)
      await cta.screenshot({ path: `${prefix}-section-cta-final.png` });
    report.hero = await page.locator('[data-visual-hero]').boundingBox();
    report.artboard = await page.locator('[data-hero-artboard]').boundingBox();
    report.fonts = await page.evaluate(() => ({
      ready: document.status === 'loaded',
      faces: [...document.fonts]
        .filter((face) => face.status === 'loaded')
        .map((face) => `${face.family} ${face.weight} ${face.status}`),
    }));
    for (const id of SECTION_IDS) {
      const box = await page.locator(`#${id}`).boundingBox();
      report.sections[id] = box ? Math.round(box.height) : null;
    }
    report.overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    evidence[width] = report;
    await fs.writeFile(`${directory}/${width}-report.json`, JSON.stringify(report, null, 2));
    await page.close();
  }
  await fs.writeFile(`${directory}/evidence.json`, JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
console.log(`Captured artifacts/qa-visual/${stage}`);
