import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const w of [390, 768]) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  await page.goto(process.argv[2] ?? 'http://localhost:3000', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const out = await page.evaluate((vw) => {
    const bad = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) {
        const cls = String(el.className).split('__').pop();
        bad.push({ cls: cls || el.tagName, left: Math.round(r.left), right: Math.round(r.right), parent: String(el.parentElement?.className).split('__').pop() });
      }
    }
    return { doc: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 14), total: bad.length };
  }, w);
  console.log(`\n== ${w}px  doc:${out.doc}  filhos fora: ${out.total}`);
  for (const b of out.bad) console.log('  ', JSON.stringify(b));
  await page.close();
}
await browser.close();
