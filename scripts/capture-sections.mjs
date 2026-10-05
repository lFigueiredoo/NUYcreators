import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Captura seções (por id) em 1920 — dev :3000, HMR reflete os edits.
// Uso: node scripts/capture-sections.mjs como-funciona para-quem beneficios
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['como-funciona', 'para-quem', 'beneficios', 'niveis', 'experiencias', 'faq'];
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
  await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})));
});
await page.waitForTimeout(400);
for (const id of ids) {
  const b = await page.evaluate((el2id) => {
    // Aceita id simples ("faq") ou seletor (".landingFlow footer" para o footer).
    const el =
      (!el2id.includes('.') && !el2id.includes(' ') && document.getElementById(el2id)) ||
      document.querySelector(el2id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
  }, id);
  if (!b) {
    console.log(`${id}: NÃO ENCONTRADO`);
    continue;
  }
  const buf = await page.screenshot({
    clip: { x: 0, y: b.top, width: 1920, height: b.height },
    fullPage: true,
  });
  await sharp(buf).png().toFile(`${OUT}/impl-secao-${id}-1920.png`);
  console.log(`${id}: y${b.top} h${b.height}`);
}
await browser.close();
