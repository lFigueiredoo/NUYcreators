import { chromium } from '@playwright/test';
// A2 baseline: header crop + wordmark optical-ink measurement (PNG alpha scan).
const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1040 },
  reducedMotion: 'reduce',
});
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const metrics = await page.evaluate(() => {
  const brand =
    document.querySelector('.site-header [class*=wordmark]') ??
    document.querySelector('[class*=wordmark]');
  const img = brand?.querySelector('img');
  const span = brand?.querySelector('span');
  const nav = document.querySelector('.desktop-nav');
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return {
      l: Math.round(b.left * 10) / 10,
      t: Math.round(b.top * 10) / 10,
      w: Math.round(b.width * 10) / 10,
      h: Math.round(b.height * 10) / 10,
    };
  };
  const links = nav
    ? Array.from(nav.querySelectorAll('a')).map((a) => ({ t: a.textContent, box: box(a) }))
    : [];
  const actions = document.querySelector('.header-actions');
  const fs = span ? getComputedStyle(span).fontSize : null;
  const ls = span ? getComputedStyle(span).letterSpacing : null;
  return {
    box: box(brand),
    img: box(img),
    span: box(span),
    nav: box(nav),
    links,
    actions: box(actions),
    spanFont: fs,
    spanLS: ls,
    gap: brand ? getComputedStyle(brand).gap : null,
  };
});
console.log(JSON.stringify(metrics, null, 2));
// screenshot of the hero copy block too (A3 baseline)
await page
  .locator('[data-hero-artboard]')
  .screenshot({ path: 'artifacts/delivery/a3-baseline-hero-1920.png' });
// PNG ink scan: load the wordmark asset and find first/last ink columns.
const src = await page.evaluate(
  () =>
    document.querySelector('.site-header img')?.currentSrc ??
    document.querySelector('.site-header img')?.src,
);
console.log('asset:', src);
await browser.close();
