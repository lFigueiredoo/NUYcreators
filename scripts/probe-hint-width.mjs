import { chromium } from '@playwright/test';

// Larguras reais das microcopys do 03 @1920 (para casar as quebras da ref).
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const measure = (text, css, size) => {
    const span = document.createElement('span');
    span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:400 ${size} ${css}`;
    span.textContent = text;
    document.body.appendChild(span);
    const w = span.getBoundingClientRect().width;
    span.remove();
    return Math.round(w);
  };
  const hint = getComputedStyle(
    document.querySelector('.audienceHint, [class*="audienceHint"]') || document.body,
  );
  const sub = getComputedStyle(document.querySelector('[id="para-quem"] > div > p'));
  const size = hint.fontSize;
  return {
    hintFont: size,
    hintMaxW: hint.maxWidth,
    w_marca: measure('Quem já vive a marca', hint.fontFamily, size),
    w_marcaNo: measure('Quem já vive a marca no', hint.fontFamily, size),
    w_audiencia: measure('Quem inspira audiências', hint.fontFamily, size),
    w_rotina: measure('Quem transforma rotina', hint.fontFamily, size),
    subFont: sub.fontSize,
    w_subLine1: measure(
      'Não é sobre parecer alguém. É sobre compartilhar',
      sub.fontFamily,
      sub.fontSize,
    ),
    w_subLine1Plus18: measure(
      'Não é sobre parecer alguém. É sobre compartilhar o',
      sub.fontFamily,
      sub.fontSize,
    ),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
