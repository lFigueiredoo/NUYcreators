// Ground truth de layout dos blocos reescritos (R4): retângulos + computed
// styles em #cta-final e #faq, diretamente do DOM vivo (fator img→css = 3.7209).
// Saída: JSON por seletor, p/ comparar com os alvos da ref em css @1920.
import { chromium } from '@playwright/test';

const SELECTORS = [
  '#cta-final > div:last-of-type',
  '#cta-final > div:last-of-type > h2',
  '#cta-final > div:last-of-type > h2 em',
  '#cta-final > div:last-of-type > p',
  '#cta-final > div:last-of-type > div:last-child',
  '#cta-final > div:last-of-type > div:last-child > a:first-child',
  '#cta-final > div:last-of-type > div:last-child > a:last-child',
  '#faq > div:first-child > .eyebrow',
  '#faq > div:first-child > h2',
  '#faq > div:first-child > h2 em',
  '#faq .faq-list',
  '#faq .faq-list details:first-child',
  '#faq .faq-list details:nth-child(2)',
  '#faq .faq-list details:nth-child(2) summary',
  '#faq .faq-list details:last-child',
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const out = await page.evaluate((sels) => {
  const sy = window.scrollY;
  const pick = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      box: `${Math.round(r.x)},${Math.round(r.y + sy)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      font: `${cs.font.fontSize ?? cs.fontSize} / ${cs.lineHeight}`,
    };
  };
  return sels.map((s) => ({ s, ...pick(document.querySelector(s)) }));
}, SELECTORS);

for (const row of out) console.log(JSON.stringify(row));
await browser.close();
