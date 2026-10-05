// Probe R5: box do CTA por largura + qual imagem fica pendente no mobile.
// Uso: node scripts/probe-resp-cta.mjs 430
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });
const widths = process.argv.slice(2).map(Number).filter(Number.isFinite);

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
    return Array.from(document.images)
      .filter((i) => !i.complete || !i.naturalWidth)
      .map((i) => {
        const b = i.getBoundingClientRect();
        const st = getComputedStyle(i.parentElement);
        return {
          src: (i.currentSrc || i.src || '').slice(-70),
          alt: i.alt,
          box: `${Math.round(b.left)},${Math.round(b.top + scrollY)} ${Math.round(b.width)}x${Math.round(b.height)}`,
          parent: i.parentElement.className,
          parentDisplay: st.display,
          inViewport: b.top + scrollY < scrollY + innerHeight + 400,
        };
      });
  });

for (const width of widths) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height: width < 760 ? 844 : Math.round(width / (16 / 9)) },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  const pend = await eager(page);
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => {
    const el = document.getElementById('cta-final');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top + scrollY), height: Math.round(b.height) };
  });
  console.log(`${width}: cta y${box?.top} h${box?.height}`);
  if (pend.length) console.log(`${width}: PENDENTES ${JSON.stringify(pend, null, 1)}`);
  if (box) {
    const buf = await page.screenshot({
      clip: { x: 0, y: Math.max(0, box.top), width, height: box.height },
      fullPage: true,
    });
    await sharp(buf).png().toFile(`${OUT}/resp-cta-final-${width}.png`);
  }
  await browser.close();
}
