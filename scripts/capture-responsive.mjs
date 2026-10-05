// Varredura responsiva (R5) no DEV :3000 — estado atual, com as mudanças de hoje.
// Uso: node scripts/capture-responsive.mjs 1280 1024 768 430 390  [id1 id2 …]
// Full-page por largura + crops por seção p/ comparativo; check de overflow,
// eager + decode (lazy não pinta no fullPage — lição da entrega).
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = 'http://localhost:3000';
const OUT = 'artifacts/round6';
const args = process.argv.slice(2).map(Number);
let widths = args.filter((n) => Number.isFinite(n) && n > 200);
let ids = [];
const rawIds = process.argv
  .slice(2)
  .map(String)
  .filter((s) => /^[a-z-]+$/i.test(s) && Number.isNaN(Number(s)));
ids = rawIds.length
  ? rawIds
  : [
      'projeto',
      'como-funciona',
      'para-quem',
      'beneficios',
      'niveis',
      'experiencias',
      'faq',
      'cta-final',
      'footer',
    ];
if (!widths.length) widths = [1280, 1024, 768, 430, 390];

const eager = (page) =>
  page.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
    await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})));
    let guardas = 0;
    while (
      Array.from(document.images).some((i) => !i.complete || !i.naturalWidth) &&
      guardas < 40
    ) {
      await new Promise((r) => setTimeout(r, 250));
      guardas++;
    }
    return Array.from(document.images).filter((i) => !i.complete || !i.naturalWidth).length;
  });

for (const width of widths) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height: width < 760 ? 844 : Math.round(width / (16 / 9)) },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  console.log(`${width}: abrindo…`);
  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    const pend = await eager(page);
    await page.waitForTimeout(400);
    const sw = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
    }));
    console.log(
      `${width}: overflow ${sw.sw}/${sw.iw} → ${sw.sw <= sw.iw ? 'OK' : 'OVERFLOW'}` +
        (pend ? ` · imgs pendentes ${pend}` : ' · imgs ok'),
    );
    await page.screenshot({ path: `${OUT}/resp-full-${width}.png`, fullPage: true });
    for (const id of ids) {
      const box = await page.evaluate((s) => {
        let el =
          s === 'footer' ? document.querySelector('.site-footer') : document.getElementById(s);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { top: Math.round(b.top + scrollY), height: Math.round(b.height) };
      }, id);
      if (!box || box.height < 4) {
        console.log(`  ${id}: ausente/collapsado @${width}`);
        continue;
      }
      const buf = await page.screenshot({
        clip: { x: 0, y: Math.max(0, box.top), width, height: box.height },
        fullPage: true,
      });
      await sharp(buf).png().toFile(`${OUT}/resp-${id}-${width}.png`);
      console.log(`  ${id}: y${box.top} h${box.height}`);
    }
  } catch (e) {
    console.log(`${width}: FALHA — ${String(e.message).slice(0, 140)}`);
  }
  await browser.close();
}
console.log('varredura responsiva pronta em', OUT);
