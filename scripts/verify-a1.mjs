import { chromium } from '@playwright/test';
// A1 live check: the hero concept chip is gone (even in dev) and the CTA art
// note pouts outside the photograph column.
const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1040 },
  reducedMotion: 'reduce',
});
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('[class*=finalCta]').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const report = await page.evaluate(() => {
  const text = (document.querySelector('main') ?? document.body).innerText;
  const note = Array.from(document.querySelectorAll('span')).find((s) =>
    /Arte conceitual/.test(s.textContent ?? ''),
  );
  const portrait = Array.from(document.querySelectorAll('img')).find((img) =>
    (img.getAttribute('class') ?? '').includes('finalPortrait'),
  );
  const noteBox = note?.getBoundingClientRect();
  const portraitBox = portrait?.getBoundingClientRect();
  return {
    heroChipGone: !text.includes('Composição conceitual'),
    noteExists: !!note,
    noteLeftPct: noteBox ? Math.round((noteBox.left / innerWidth) * 100 * 10) / 10 : null,
    noteOutsidePhoto:
      noteBox && portraitBox
        ? noteBox.right < portraitBox.left || noteBox.left > portraitBox.right
        : null,
  };
});
console.log(JSON.stringify(report, null, 2));
await browser.close();
