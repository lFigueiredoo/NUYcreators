// Identifies which element paints each suspicious rectangle in the hero.
// Usage: node scripts/inspect-hero-dom.mjs [url] [width] [height]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3100/';
const width = Number(process.argv[3] ?? 1920);
const height = Number(process.argv[4] ?? 1080);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const report = await page.evaluate(() => {
  const points = [
    ['rect-sobre-cta', 300, 650],
    ['rect-sob-script', 300, 890],
    ['coluna-esq-1', 60, 600],
    ['coluna-esq-2', 60, 760],
    ['ghost-env', 975, 1020],
    ['violeta-topo', 980, 280],
  ];
  const describe = (el) => {
    if (!el || el === document.documentElement || el === document.body) return null;
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: String(el.className?.baseVal ?? el.className).slice(0, 80),
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        w: Math.round(box.width),
        h: Math.round(box.height),
      },
      bg: cs.backgroundImage === 'none' ? cs.backgroundColor : cs.backgroundImage.slice(0, 90),
      blend: cs.mixBlendMode,
      imgSrc: el.currentSrc ? el.currentSrc.split('/').pop() : null,
    };
  };
  // 1) elementFromPoint chain
  const chains = {};
  for (const [label, x, y] of points) {
    const chain = [];
    let el = document.elementFromPoint(x, y);
    let guard = 0;
    while (el && guard++ < 8) {
      const info = describe(el);
      if (info) chain.push(info);
      el = el.parentElement;
    }
    chains[label] = chain;
  }
  // 2) every image/svg/canvas inside the hero with its box
  const hero = document.querySelector('[data-visual-hero]') ?? document.querySelector('section');
  const layers = [...hero.querySelectorAll('img, svg, figure, span, div')]
    .filter(
      (el) =>
        ['IMG', 'SVG', 'CANVAS'].includes(el.tagName) ||
        getComputedStyle(el).backgroundImage !== 'none',
    )
    .map((el) => describe(el))
    .filter(
      (info) =>
        info &&
        info.box.w > 0 &&
        info.box.h > 0 &&
        info.box.y < 1080 &&
        info.box.y + info.box.h > 0,
    );
  return { chains, layers };
});

console.log(JSON.stringify(report, null, 1));
await browser.close();
