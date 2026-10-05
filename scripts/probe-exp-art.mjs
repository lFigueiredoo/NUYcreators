import { chromium } from '@playwright/test';

// Geometria do 06: art box vs asset natural + posições do texto @1920.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(async () => {
  const sec = document.getElementById('experiencias');
  const art = sec?.querySelector('[class*="experienceArt"]');
  const img = art?.querySelector('img');
  const eyebrow = sec?.querySelector('p');
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return {
      left: Math.round(b.left),
      right: Math.round(b.right),
      top: Math.round(b.top),
      w: Math.round(b.width),
      h: Math.round(b.height),
    };
  };
  const artR = art ? r(art) : null;
  const secR = sec ? r(sec) : null;
  const nat = img
    ? { w: img.naturalWidth, h: img.naturalHeight, src: img.currentSrc.split('/').pop() }
    : null;
  return { secR, artR, nat, eyebrow: eyebrow ? r(eyebrow) : null };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
