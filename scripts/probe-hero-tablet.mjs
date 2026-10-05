// Probe do hero/tablet: onde o header e o copy sentam em 768/900/1024.
import { chromium } from '@playwright/test';

const widths = [768, 900, 1024];
const browser = await chromium.launch();

for (const width of widths) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
  const out = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return (
        Math.round(r.top + window.scrollY) +
        ',' +
        Math.round(r.left) +
        ' ' +
        Math.round(r.width) +
        'x' +
        Math.round(r.height) +
        ' minh:' +
        c.minHeight
      );
    };
    const hero =
      document.querySelector('[data-visual-hero]') ||
      document.querySelector("section[class*='hero']") ||
      document.querySelector('main > section');
    const header = document.querySelector("[class*='site-header']");
    return {
      heroSel: hero && hero.className.slice(0, 60),
      hero: box(hero),
      header: box(header),
      headerPos: header && getComputedStyle(header).position,
    };
  });
  console.log(width, JSON.stringify(out, null, 1));
  await page.close();
}
await browser.close();
