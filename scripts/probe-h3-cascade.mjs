import { chromium } from '@playwright/test';

// Cascata real de TODOS os h3 da landing @1920: computado + regras casadas.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const res = [];
  for (const h3 of document.querySelectorAll('h3')) {
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
            if (h3.matches(rule.selectorText))
              hits.push(`${rule.selectorText} → ${rule.style.fontSize}`);
          } catch {}
        }
      }
    }
    const cs = getComputedStyle(h3);
    res.push({
      text: h3.textContent.slice(0, 24),
      sec:
        h3.closest('section')?.id ||
        h3.closest('[class*="journey"], [class*="levelSection"]')?.className.slice(0, 30) ||
        '?',
      size: cs.fontSize,
      hits,
    });
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
