import { chromium } from '@playwright/test';

// Mede a largura renderizada da linha "Feito para quem transforma" no h2 do 03
// e o range de tamanho de fonte que cabe na coluna atual @1920.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const audience = document.querySelector('[id="para-quem"], .audience')?.closest('section');
  const h2 = audience?.querySelector('h2');
  if (!h2) return { err: 'h2 não encontrado' };
  const cs = getComputedStyle(h2);
  const colW = h2.getBoundingClientRect().width;
  const measure = (text, font) => {
    const span = document.createElement('span');
    span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:400 ${font} ${
      cs.fontFamily
    };letter-spacing:${cs.letterSpacing}`;
    span.textContent = text;
    document.body.appendChild(span);
    const w = span.getBoundingClientRect().width;
    span.remove();
    return Math.round(w);
  };
  const line = 'Feito para quem transforma';
  const sizes = {};
  for (const s of [58, 54, 52, 50, 48, 46, 44]) sizes[s] = measure(line, `${s}px`);
  return {
    colW: Math.round(colW),
    fontSize: cs.fontSize,
    ls: cs.letterSpacing,
    family: cs.fontFamily.slice(0, 60),
    neededAt58: sizes[58],
    sizes,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
