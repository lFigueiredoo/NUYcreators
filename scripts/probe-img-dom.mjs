// Inspeção do DOM vivo: imgs em #faq / #cta-final / #niveis — src efetivo,
// naturalWidth (quebrada?), complete e rect. Espelha capture-sections.mjs.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const dump = await page.evaluate(() => {
  const out = [];
  for (const scope of ['#faq', '#cta-final', '#niveis']) {
    const root = document.querySelector(scope);
    if (!root) {
      out.push({ scope, MISSING: true });
      continue;
    }
    root.querySelectorAll('img').forEach((img) => {
      const r = img.getBoundingClientRect();
      out.push({
        scope,
        src: (img.currentSrc || img.src).slice(0, 110),
        natural: img.naturalWidth + 'x' + img.naturalHeight,
        rect: `${Math.round(r.x)},${Math.round(r.y + window.scrollY)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    });
  }
  return out;
});
for (const d of dump) console.log(JSON.stringify(d));
await browser.close();
