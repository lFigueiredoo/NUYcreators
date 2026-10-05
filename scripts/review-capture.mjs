// R6 visual-review captures (PROD build served on :3102). Zero code changes —
// this reads the site exactly as shipped: fonts ready, images eager+decoded,
// reveals triggered by a scroll walk, then a settle wait before fullPage shots.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'artifacts/round6/review';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3102/';

const browser = await chromium.launch();

const SECTION_IDS = [
  'projeto',
  'como-funciona',
  'para-quem',
  'beneficios',
  'niveis',
  'experiencias',
  'faq',
  'cta-final',
];

const heights = {};

// 1920 + per-section clips (DPR 1 = 1 CSS px por pixel de imagem).
{
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // Scroll walk: dispara os reveals/IO da página real antes das capturas.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((i) => (i.loading = 'eager'));
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(1200);
  const pageH = await page.evaluate(
    () => document.querySelector('[data-visual-hero]').getBoundingClientRect().height,
  );
  // hero = artboard (topo da página, 876px @1920) — fullPage torna o clip
  // page-absolute (clips sem fullPage são limitados ao viewport).
  await page.screenshot({
    clip: { x: 0, y: 0, width: 1920, height: Math.round(pageH) },
    fullPage: true,
    path: `${OUT}/impl-hero-1920.png`,
  });
  for (const id of SECTION_IDS) {
    const b = await page.evaluate((el2id) => {
      const el = document.getElementById(el2id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
    }, id);
    if (!b) {
      console.log(`${id}: NAO ENCONTRADO`);
      continue;
    }
    heights[id] = b.height;
    await page.screenshot({
      clip: { x: 0, y: b.top, width: 1920, height: b.height },
      fullPage: true,
      path: `${OUT}/impl-${id}-1920.png`,
    });
  }
  // footer = o site-footer (vive fora de main)
  const footerH = await page.evaluate(() => {
    const f = document.querySelector('footer.site-footer');
    const r = f.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
  });
  await page.screenshot({
    clip: { x: 0, y: footerH.top, width: 1920, height: footerH.height },
    fullPage: true,
    path: `${OUT}/impl-footer-1920.png`,
  });
  // fullPage 1920 — force all images eager (lazy não pinta em fullPage).
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/impl-full-1920.png`, fullPage: true });
  await page.close();
}

// 1440 full
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((i) => (i.loading = 'eager'));
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/impl-full-1440.png`, fullPage: true });
  await page.close();
}

// 390 full
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((i) => (i.loading = 'eager'));
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 35));
    }
    scrollTo(0, 0);
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/impl-full-390.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log('SECTION HEIGHTS @1920:', JSON.stringify(heights));
console.log('captures written to', OUT);
