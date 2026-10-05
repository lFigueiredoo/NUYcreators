// R7 — identifica o elemento que pinta o retângulo "nova" no topo-esquerda
// do #projeto (leitura, sem mutação da página).
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto('http://localhost:3102/', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  for (const s of Array.from(document.querySelectorAll('main section'))) {
    s.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 40));
  }
  scrollTo(0, 0);
});
await page.waitForTimeout(600);

const hits = await page.evaluate(() => {
  const zone = { x1: 0, y1: 880, x2: 260, y2: 1100 };
  const out = [];
  const walk = (el) => {
    for (const child of el.children) walk(child);
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    if (r.width < 4 || r.height < 4) return;
    if (r.right < zone.x1 || r.left > zone.x2 || top + r.height < zone.y1 || top > zone.y2) return;
    const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '');
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: String(cls).slice(0, 60),
      src: el.currentSrc ? el.currentSrc.split('/').pop() : undefined,
      box: {
        left: Math.round(r.left),
        top: Math.round(top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
    });
  };
  walk(document.body);
  return out;
});
console.log(JSON.stringify(hits, null, 1));
await browser.close();
