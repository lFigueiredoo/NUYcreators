import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// A15 entregas: full-page nas 10 larguras, crops por seção — em PRODUÇÃO :3100
// (o dev server do usuário permanece intocado em :3000).
// Lazy-load: força loading=eager em todas as <img> e aguarda os decodes — sem
// sweep de scroll (duas rodadas travaram em 1024; e sem o eager o retrato do
// CTA não pinta no fullPage, o que falsificou a primeira entrega).
const BASE = 'http://localhost:3100';
const OUT = 'artifacts/delivery';
mkdirSync(OUT, { recursive: true });

const to = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label} (${ms}ms)`)), ms)),
  ]);

// eager em todas as imagens + decode; devolve quantas continuaram incompletas.
async function eagerImages(page) {
  return page.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => {
      i.loading = 'eager';
    });
    await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})));
    let guardas = 0;
    while (
      Array.from(document.images).some((i) => !i.complete || !i.naturalWidth) &&
      guardas < 60
    ) {
      await new Promise((r) => setTimeout(r, 250));
      guardas++;
    }
    return Array.from(document.images).filter((i) => !i.complete || !i.naturalWidth).length;
  });
}

async function caps(width, height, suffix) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  console.log(`${width}: abrindo…`);
  try {
    await to(page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 }), 50000, `goto ${width}`);
    await to(
      page.evaluate(() => document.fonts.ready),
      15000,
      'fonts',
    );
    const pendentes = await to(eagerImages(page), 40000, 'eager');
    if (pendentes > 0) console.log(`${width}: imagens pendentes pós-eager: ${pendentes}`);
    await page.waitForTimeout(500);
    await to(
      page.screenshot({ path: `${OUT}/a15-full-${suffix}.png`, fullPage: true }),
      90000,
      'shot',
    );
    const sw = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
    }));
    console.log(`${width}: full ok (${sw.sw}/${sw.iw} → ${sw.sw <= sw.iw ? 'OK' : 'OVERFLOW!'})`);
  } catch (e) {
    console.log(`${width}: FALHA — ${String(e.message).slice(0, 120)}`);
  }
  await browser.close();
}

const widths = process.argv.slice(2).map(Number);
const lista = widths.length ? widths : [1024, 768, 430, 390, 375, 1920, 1600, 1440, 1366, 1280];
for (const w of lista) {
  await caps(w, w < 760 ? 844 : Math.round(w / (16 / 9)), `${w}`);
}

// Crops por seção (1920) — pulados quando o CLI passa larguras específicas.
if (widths.length) {
  process.exit(0);
}
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'reduce',
});
await to(page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 }), 50000, 'goto crops');
await to(
  page.evaluate(() => document.fonts.ready),
  15000,
  'fonts',
);
await to(eagerImages(page), 40000, 'eager');
await page.waitForTimeout(500);
const boxes = await page.evaluate(() => {
  const out = {};
  for (const id of [
    'hero',
    'projeto',
    'como-funciona',
    'para-quem',
    'beneficios',
    'niveis',
    'experiencias',
    'faq',
  ]) {
    const el =
      id === 'hero' ? document.querySelector('[data-visual-hero]') : document.getElementById(id);
    const b = el.getBoundingClientRect();
    out[id] = { top: Math.round(b.top + scrollY), height: Math.round(b.height) };
  }
  const footer = document.querySelector('.site-footer').getBoundingClientRect();
  out.footer = { top: Math.round(footer.top + scrollY), height: Math.round(footer.height) };
  const finalSec = Array.from(document.querySelectorAll('section')).find((s) =>
    /finalCta/.test(s.className),
  );
  out.cta = {
    top: Math.round(finalSec.getBoundingClientRect().top + scrollY),
    height: Math.round(finalSec.getBoundingClientRect().height),
  };
  return out;
});
for (const [id, b] of Object.entries(boxes)) {
  const buf = await to(
    page.screenshot({
      clip: { x: 0, y: Math.max(0, b.top), width: 1920, height: b.height },
      fullPage: true,
    }),
    90000,
    `crop ${id}`,
  );
  await sharp(buf).png().toFile(`${OUT}/a15-secao-${id}-1920.png`);
  console.log(`crop ${id}: y${b.top} h${b.height}`);
}
await page.close();
await browser.close();
console.log('capturas a15 prontas em', OUT);
