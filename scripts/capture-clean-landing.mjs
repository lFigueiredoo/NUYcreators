/**
 * Capturas + auditoria da landing clean.
 * Mede, no DOM real: upscale de packshot (naturalWidth vs px de dispositivo),
 * overflow horizontal e alvos visíveis. Salva em artifacts/redesign/.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.CLEAN_BASE ?? 'http://localhost:3210';
const OUT = 'artifacts/redesign';
fs.mkdirSync(OUT, { recursive: true });

const only = process.argv[2];

const browser = await chromium.launch();

async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
    await new Promise((r) => setTimeout(r, 60));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    if (document.fonts) await document.fonts.ready;
  });
  await page.waitForTimeout(350);
}

async function audit(page, label) {
  const data = await page.evaluate(async () => {
    const dpr = window.devicePixelRatio;
    // `naturalWidth` mentem sob `srcset`: vem dividido pela densidade do
    // descritor w. Recarregar `currentSrc` num Image() limpo devolve o bitmap cru.
    const rawSize = async (url) =>
      new Promise((r) => {
        const im = new Image();
        im.onload = () => r({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => r(null);
        im.src = url;
      });
    const imgs = [];
    for (const img of document.images) {
      const r = img.getBoundingClientRect();
      const need = Math.round(r.width * dpr);
      const bitmap = await rawSize(img.currentSrc);
      imgs.push({
        src: img.currentSrc.split('url=')[1]?.split('%2F').pop() ?? img.currentSrc,
        bitmap: bitmap ? `${bitmap.w}x${bitmap.h}` : 'ERR',
        css: `${Math.round(r.width)}x${Math.round(r.height)}`,
        needDevicePx: need,
        scale: bitmap ? +(need / bitmap.w).toFixed(2) : null,
        broken: img.naturalWidth === 0,
      });
    }
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        // Um carrossel horizontal deixa os filhos fora da viewport DE PROPÓSITO:
        // o que importa é o ancestral que rola, não cada card dentro dele.
        let scrolls = false;
        for (let p = el; p && p !== de; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
            scrolls = true;
            break;
          }
        }
        if (scrolls) continue;
        wide.push(
          `${el.tagName}.${(el.className || '').toString().split(' ')[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`,
        );
      }
    }
    return {
      dpr,
      imgs,
      overflow,
      wide: wide.slice(0, 12),
      height: document.body.scrollHeight,
      title: document.title,
    };
  });
  const worst = Math.max(...data.imgs.map((i) => i.scale));
  console.log(
    `\n### ${label}  dpr=${data.dpr}  pageH=${data.height}  overflowX=${data.overflow}px  worstUpscale=${worst}x`,
  );
  console.table(data.imgs);
  if (data.wide.length) console.log('  overflow elements:', data.wide);
  return data;
}

// ---- desktop passes
for (const [w, h, name] of [
  [1920, 1080, 'landing-clean-1920'],
  [1440, 900, 'landing-clean-1440'],
]) {
  if (only && only !== name) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await settle(page);
  await audit(page, name);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${name}-fold.png` });
  await ctx.close();
}

// ---- mobile passes
if (!only || only === 'mobile') {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await settle(page);
  await audit(page, 'mobile-390');
  await page.screenshot({ path: `${OUT}/landing-clean-390.png` });
  await page.screenshot({ path: `${OUT}/landing-clean-390-full.png`, fullPage: true });
  await ctx.close();
}

// ---- section shots (1920)
if (!only || only === 'sections') {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await settle(page);
  const sections = [
    ['hero', 'section[aria-labelledby="pl-hero-title"]'],
    ['community', '#comunidade'],
    ['what-is', '#o-que-e'],
    ['how-it-works', '#como-participar'],
    ['faq', '#faq'],
    ['cta-final', '#cta-final'],
  ];
  for (const [name, sel] of sections) {
    const el = page.locator(sel).first();
    if (!(await el.count())) {
      console.log('missing', sel);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await el.screenshot({ path: `${OUT}/${name}-clean-1920.png` });
  }
  await ctx.close();
}

await browser.close();
console.log('\ncaptures ->', OUT);
