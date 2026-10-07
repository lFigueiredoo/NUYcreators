/**
 * Probe do hero (rodada de polish).
 *
 * Mede geometria real (rects, transforms, fontes) dos produtos e devolve um
 * crop ampliado do grupo — a leitura visual das sombras pequenas só é honesta
 * com magnificação, e a cor de fundo só é confiável amostrada no DOM.
 *
 * Uso: node scripts/polish-probe.mjs [base] [largura]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? process.env.POLISH_BASE ?? 'http://localhost:3000';
const WIDTH = Number(process.argv[3] ?? 1920);
const HEIGHT = WIDTH >= 900 ? 1080 : 844;
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  reducedMotion: 'no-preference',
  deviceScaleFactor: 1,
});
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await page.waitForTimeout(1800);

const data = await page.evaluate(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), b: round(r.bottom) };
  };
  const stage = document.querySelector('[class*=heroStage]');
  const hero = document.querySelector('main section');
  const imgs = Array.from(document.querySelectorAll('[class*=heroStage] img')).map((img) => ({
    file: img.currentSrc.split('%2F').pop()?.split('&')[0] ?? img.currentSrc,
    rect: rect(img),
    natural: `${img.naturalWidth}x${img.naturalHeight}`,
    transform: getComputedStyle(img).transform,
    z: getComputedStyle(img).zIndex,
  }));
  const items = Array.from(stage.querySelectorAll('*'))
    .filter((el) => el.tagName !== 'IMG')
    .map((el) => ({
      cls: Array.from(el.classList).join('.') || el.tagName,
      rect: rect(el),
      transform: getComputedStyle(el).transform,
      z: getComputedStyle(el).zIndex,
      bg: getComputedStyle(el).backgroundImage.slice(0, 60),
    }));
  // Amostra de cor: fundo do hero em vários pontos, para detectar faixas.
  const samples = [40, 200, 420, 620, 820, 1000].map((y) => {
    const el = document.elementFromPoint(60, y);
    return { y, el: el?.tagName + '.' + (Array.from(el?.classList ?? []).join('.') || ''), bg: el ? getComputedStyle(el).backgroundColor : null };
  });
  return {
    hero: rect(hero),
    stage: stage ? rect(stage) : null,
    imgs,
    items,
    samples,
    reveal: Array.from(document.querySelectorAll('[data-pl-reveal]')).length,
    depth: getComputedStyle(document.querySelector('main section')).getPropertyValue('--pl-depth'),
  };
});

console.log(JSON.stringify(data, null, 2));

const stage = page.locator('[class*=heroStage]').first();
const box = await stage.boundingBox();
if (box) {
  const pad = 40;
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: Math.min(WIDTH - Math.max(0, box.x - pad), box.width + pad * 2),
    height: Math.min(HEIGHT - Math.max(0, box.y - pad), box.height + pad * 2),
  };
  await page.screenshot({ path: `${OUT}/probe-stage-${WIDTH}.png`, clip });
}

await browser.close();
