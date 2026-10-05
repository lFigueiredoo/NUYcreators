import { chromium } from '@playwright/test';
/**
 * Full-page + section-crop captures for the delivery report.
 * Usage: node scripts/delivery-shots.mjs [base]
 */
const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
for (const [w, h] of [
  [1920, 1040],
  [1440, 900],
]) {
  const page = await browser.newPage({
    viewport: { width: w, height: h },
    reducedMotion: 'reduce',
  });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `artifacts/delivery/full-${w}.png`, fullPage: true });
  const targets = [
    ['header', 'header'],
    ['como-funciona', '#como-funciona'],
    ['jornada', '#niveis'],
    ['experiencias', '#experiencias'],
    ['faq', '#faq'],
    ['final', '.faqWrap, [class*=finalCta]'],
  ];
  for (const [name, selS] of targets) {
    const loc = page.locator(selS).first();
    try {
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await loc.screenshot({ path: `artifacts/delivery/ent-${name}-${w}.png` });
    } catch (e) {
      console.log('miss', name, e.message.split('\n')[0]);
    }
  }
  await page.close();
}
// mobile 390 + 375 fulls
for (const w of [390, 375]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 844 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `artifacts/delivery/full-${w}.png`, fullPage: true });
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  console.log(w, 'scrollWidth', sw.join('/'));
  await page.close();
}
await browser.close();
console.log('done');
