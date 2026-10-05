import { chromium } from '@playwright/test';
// A6: map the empty channels inside the steps grid (text boxes out) so the new
// calligraphic ribbon can be drawn through them without crossing any text.
const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1040 },
  reducedMotion: 'reduce',
});
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('#como-funciona').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const m = await page.evaluate(() => {
  const ol = document.querySelector('ol[class*=steps]');
  const section = document.getElementById('como-funciona');
  const olB = ol.getBoundingClientRect();
  const norm = (b) =>
    [
      ((b.left - olB.left) / olB.width) * 100,
      ((b.top - olB.top) / olB.height) * 100,
      (b.width / olB.width) * 100,
      (b.height / olB.height) * 100,
    ].map((v) => Math.round(v * 10) / 10);
  const items = Array.from(ol.querySelectorAll(':scope > li')).map((li) => {
    const num = li.querySelector('span');
    const h3 = li.querySelector('h3');
    const p = li.querySelector('p');
    return {
      li: norm(li.getBoundingClientRect()),
      number: norm(num.getBoundingClientRect()),
      title: norm(h3.getBoundingClientRect()),
      p: norm(p.getBoundingClientRect()),
    };
  });
  const h2 = section.querySelector('h2');
  return {
    olBox: [
      Math.round(olB.left),
      Math.round(olB.top + scrollY),
      Math.round(olB.width),
      Math.round(olB.height),
    ],
    sectionH: Math.round(section.getBoundingClientRect().height),
    h2Top: Math.round(h2.getBoundingClientRect().height),
    olLeftPct:
      Math.round(
        ((olB.left - section.getBoundingClientRect().left) /
          section.getBoundingClientRect().width) *
          1000,
      ) / 10,
    items,
  };
});
console.log(JSON.stringify(m, null, 1));
await browser.close();
