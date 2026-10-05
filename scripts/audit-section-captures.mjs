import { chromium } from '@playwright/test';

/**
 * Captures element-scoped section crops of the public landing so visual polish
 * rounds can be calibrated on exact regions instead of guessed page offsets.
 * Usage: node scripts/audit-section-captures.mjs [base] [outDir]
 */

const base = process.argv[2] || 'http://localhost:3000';
const outDir = process.argv[3] || 'artifacts/issues';
const sections = [
  ['header', 'header.site-header'],
  ['projeto', '#projeto'],
  ['how', '#como-funciona'],
  ['journey', 'section[class*="levelSection"], [class*="levelSection"]'],
  ['audience', '[class*="audience"]'],
  ['benefits', '#beneficios'],
  ['experience', '[class*="experience"], section:has([class*="experienceArt"])'],
  ['faq', '#faq'],
  ['final', '[class*="final"]'],
];
const browser = await chromium.launch();
try {
  for (const [label, width, height] of [
    ['1920', 1920, 1040],
    ['1440', 1440, 900],
    ['390', 390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'no-preference',
    });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    for (const [name, selector] of sections) {
      const locator = page.locator(selector).first();
      if ((await locator.count()) === 0) continue;
      try {
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(350);
        await locator.screenshot({ path: `${outDir}/sec-${name}-${label}.png` });
      } catch {
        /* element taller than viewport: capture what is possible */
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
