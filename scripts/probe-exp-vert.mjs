import { chromium } from '@playwright/test';

// Vertical do 06 @1920: caixas de cada bloco de texto + coluna.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const sec = document.getElementById('experiencias');
  const kids = [];
  for (const el of sec.querySelectorAll('p, h2, ul, a, div')) {
    const b = el.getBoundingClientRect();
    if (b.height > 8 && b.height < 3000) {
      kids.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 28),
        txt: (el.textContent || '').slice(0, 22),
        top: Math.round(b.top),
        left: Math.round(b.left),
        w: Math.round(b.width),
        h: Math.round(b.height),
      });
    }
  }
  return kids;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
