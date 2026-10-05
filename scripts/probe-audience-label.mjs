import { chromium } from '@playwright/test';

// Onde o font-size do h3 da audiência nasce/morre: computado + regras casadas.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const h3 =
    document.querySelector('h3[class*="audienceLabel"]') || document.querySelector('#para-quem h3');
  if (!h3) return { err: 'h3 ausente' };
  const cs = getComputedStyle(h3);
  const r = h3.getBoundingClientRect();
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule.selectorText && rule.style && rule.style.fontSize) {
        try {
          if (h3.matches(rule.selectorText)) {
            hits.push({ sel: rule.selectorText.slice(0, 80), size: rule.style.fontSize });
          }
        } catch {}
      }
    }
  }
  return {
    cls: h3.className,
    fontSize: cs.fontSize,
    family: cs.fontFamily.slice(0, 40),
    weight: cs.fontWeight,
    w: Math.round(r.width),
    hits,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
