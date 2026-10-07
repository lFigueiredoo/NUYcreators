import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.argv[2] ?? 'http://localhost:3100', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const base = q('[class*=heroBase]');
  const group = q('[class*=heroGroup]');
  const cs = base ? getComputedStyle(base) : null;
  return {
    base: rect(base),
    group: rect(group),
    baseBg: cs?.backgroundImage?.slice(0, 120),
    baseOpacity: cs?.opacity,
    baseTransform: cs?.transform,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
