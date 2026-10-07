/**
 * Auditoria da landing clean:
 *  1. contraste real de todo texto (cor efetiva × fundo opaco mais próximo)
 *  2. upscale real de imagem (bitmap SERVIDO em pixels crus × px de dispositivo)
 *  3. overflow horizontal
 * naturalWidth/naturalHeight mentem sob `srcset` (vêm divididos pela densidade
 * do descritor w): a medida honesta é recarregar `currentSrc` num Image() limpo.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.CLEAN_BASE ?? 'http://localhost:3210';
const browser = await chromium.launch();

const VIEWPORTS = [
  ['desktop-1920@1x', 1920, 1080, 1],
  ['desktop-1920@2x', 1920, 1080, 2],
  ['mobile-390@2x', 390, 844, 2],
];

for (const [label, w, h, dpr] of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dpr,
    isMobile: w < 500,
    hasTouch: w < 500,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 20));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    if (document.fonts) await document.fonts.ready;
  });

  const res = await page.evaluate(async () => {
    // ---- 1. tamanho CRU do bitmap servido
    const raw = async (url) =>
      new Promise((r) => {
        const im = new Image();
        im.onload = () => r({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => r(null);
        im.src = url;
      });
    const imgs = [];
    for (const img of document.images) {
      const r = img.getBoundingClientRect();
      const bitmap = await raw(img.currentSrc);
      imgs.push({
        name: decodeURIComponent(img.currentSrc.split('url=')[1] ?? '')
          .split('%2F')
          .pop(),
        css: `${Math.round(r.width)}x${Math.round(r.height)}`,
        needPx: Math.round(r.width * devicePixelRatio),
        bitmap: bitmap ? `${bitmap.w}x${bitmap.h}` : 'ERR',
        upscale: bitmap ? +(Math.round(r.width * devicePixelRatio) / bitmap.w).toFixed(2) : null,
      });
    }

    // ---- 2. contraste
    const parse = (c) => {
      const m = c.match(/[\d.]+/g).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
    };
    const over = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const l1 = lum(a),
        l2 = lum(b);
      return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
    };
    const bgOf = (el) => {
      let node = el;
      let acc = { r: 0, g: 0, b: 0, a: 0 };
      const layers = [];
      while (node && node !== document.documentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c.a > 0) layers.push(c);
        if (c.a === 1) break;
        node = node.parentElement;
      }
      layers.push({ r: 255, g: 255, b: 255, a: 1 });
      let base = layers.pop();
      while (layers.length) base = over(layers.pop(), base);
      return base;
    };
    const text = [];
    for (const el of document.querySelectorAll('p,h1,h2,h3,h4,summary,span,a,li,button')) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const fg = parse(cs.color);
      const bg = bgOf(el);
      const eff = over(fg, bg);
      const cr = ratio(eff, bg);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const min = large ? 3 : 4.5;
      if (cr < min)
        text.push({
          tag: el.tagName,
          text: el.textContent.trim().slice(0, 42),
          color: cs.color,
          bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
          size: Math.round(size),
          ratio: cr,
          need: min,
        });
    }

    const de = document.documentElement;
    return { imgs, text, overflow: de.scrollWidth - de.clientWidth };
  });

  console.log(`\n======== ${label}  overflowX=${res.overflow}px`);
  const over = res.imgs.filter((i) => i.upscale > 1.05);
  console.log('-- upscale > 1.05x:', over.length ? '' : 'nenhum');
  if (over.length) console.table(over);
  console.log('-- contraste abaixo do mínimo:', res.text.length ? '' : 'nenhum');
  if (res.text.length) console.table(res.text);
  await ctx.close();
}

await browser.close();
