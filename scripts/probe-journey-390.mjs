// Probe da jornada (niveis) no mobile: posição/fonte de h3, halo e li.
import { chromium } from '@playwright/test';

const widths = process.argv.slice(2).map(Number).filter(Number.isFinite);
const BASE = 'http://localhost:3000';

for (const width of widths.length ? widths : [390]) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  const data = await page.evaluate(() => {
    const sec = document.getElementById('niveis');
    if (!sec) return null;
    const dump = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        box: `${Math.round(b.left)},${Math.round(b.top + scrollY)} ${Math.round(b.width)}x${Math.round(b.height)}`,
        pos: c.position + '/' + c.display + '/' + c.flexDirection,
        font: `${c.fontSize}px/${c.lineHeight}`,
        mt: c.marginTop,
      };
    };
    const ol = sec.querySelector('ol');
    const ul = sec.querySelector('ul');
    const items = ol || ul ? (ol || ul).children : [];
    return {
      section: dump(sec),
      wrapper: dump(sec.firstElementChild),
      h2: dump(sec.querySelector('h2')),
      lista: dump(ol || ul),
      tagLista: ol ? 'ol' : ul ? 'ul' : 'nenhuma',
      nItens: items.length,
      itens: Array.from(items)
        .slice(0, 5)
        .map((li) => ({
          li: dump(li),
          h3: dump(li.querySelector('h3')),
          halo: dump(li.querySelector('figure,span,div') || null),
        })),
    };
  });
  console.log(JSON.stringify({ width, ...data }, null, 1));
  await browser.close();
}
