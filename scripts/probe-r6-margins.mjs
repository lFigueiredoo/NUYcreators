import { chromium } from '@playwright/test';

// Esquerda real de cada seção (eyebrow/h2) @1920 vs ritmos da ref
// (ref: hero/01 ~10,4-10,7%w; 02/03/04 ~5,5-6%w).
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const ids = [
    'projeto',
    'como-funciona',
    'para-quem',
    'beneficios',
    'jornada',
    'experiencias',
    'faq',
  ];
  const res = {};
  for (const id of ids) {
    const sec = document.getElementById(id);
    if (!sec) continue;

    let eyebrowLeft = null;
    // Primeiro elemento de texto da seção (label da eyebrow costuma ser o primeiro filho).
    for (const child of sec.querySelectorAll('*')) {
      if (child.textContent.trim() && child.children.length <= 2) {
        const r = child.getBoundingClientRect();
        if (eyebrowLeft === null) eyebrowLeft = Math.round(r.left);
        break;
      }
    }
    const h2 = sec.querySelector('h2');
    res[id] = {
      left: Math.round(sec.getBoundingClientRect().left),
      w: Math.round(sec.getBoundingClientRect().width),
      firstTextLeft: eyebrowLeft,
      h2Left: h2 ? Math.round(h2.getBoundingClientRect().left) : null,
      h2W: h2 ? Math.round(h2.getBoundingClientRect().width) : null,
      h2F: h2 ? getComputedStyle(h2).fontSize : null,
      lines: h2
        ? (() => {
            return Math.round(
              h2.getBoundingClientRect().height / parseFloat(getComputedStyle(h2).lineHeight),
            );
          })()
        : null,
    };
  }
  // Colunas do 03: círculos (spans/svg) e do 04.
  const circles = [...document.querySelectorAll('#para-quem svg')].slice(0, 6).map((s) => {
    const r = s.getBoundingClientRect();
    return Math.round(r.left);
  });
  res.paraQuemCircles = circles;
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
