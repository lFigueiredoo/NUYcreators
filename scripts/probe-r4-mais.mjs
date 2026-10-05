// R4 restante: rótulos da jornada (#niveis) e footer — retângulos do DOM vivo.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const out = await page.evaluate(() => {
  const sy = window.scrollY;
  const pick = (el, extra = {}) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      box: `${Math.round(r.x)},${Math.round(r.y + sy)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      font: `${cs.fontSize} / ${cs.lineHeight}`,
      ...extra,
    };
  };
  const sec = document.querySelector('#niveis');
  const out = { section: pick(sec) };
  document.querySelectorAll('#niveis h3').forEach((h, i) => {
    out[`niveis-h3-${i}`] = pick(h, { text: h.textContent.trim().slice(0, 30) });
  });
  const lv = document.querySelector('#niveis .levelJourney, #niveis [class*="levelJourney"]');
  out.levelJourney = pick(lv);
  const foot = document.querySelector('.site-footer, footer');
  out.footer = pick(foot);
  foot?.querySelectorAll('h4, h5, strong, [class*="title"]').forEach((h, i) => {
    out[`footer-t-${i}`] = pick(h, { text: h.textContent.trim().slice(0, 24) });
  });
  out.footerCols = [];
  foot?.querySelectorAll('nav, ul').forEach((n, i) => {
    out.footerCols.push(`col${i}: ${pick(n).box}`);
  });
  return out;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
