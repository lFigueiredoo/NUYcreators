/**
 * Vídeo do movimento: do topo até o FAQ, sem corte.
 *
 * O brief pede para avaliar o MOVIMENTO, não só o quadro parado — então a
 * rolagem é feita em passos pequenos com o mouse de verdade (nada de
 * `scrollTo` instantâneo), que é o que o IntersectionObserver vê. A câmera
 * começa parada ~1,2s para a entrada do hero acontecer inteira.
 *
 * Uso: node scripts/polish-video.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});

// 1,5s parado: header entra, eyebrow, título, corpo, CTA e os três frascos.
await page.waitForTimeout(1500);

// Rolagem em passos de ~28px a cada 40ms — velocidade de roda de mouse.
const target = await page.evaluate(() => {
  const faq = document.querySelector('section[class*=faq]');
  return faq ? faq.getBoundingClientRect().top + window.scrollY - 120 : 2400;
});
let y = 0;
while (y < target) {
  y = Math.min(target, y + 28);
  await page.mouse.wheel(0, 28);
  await page.waitForTimeout(40);
}
// Para no FAQ e abre uma pergunta para o acordeão aparecer no vídeo.
await page.waitForTimeout(900);
await page.evaluate(async () => {
  const first = document.querySelector('details');
  first?.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 400));
  first?.querySelector('summary')?.click();
});
await page.waitForTimeout(1400);
console.log('rolou até', Math.round(y), 'px');

await context.close();
const files = await fs.readdir(OUT);
const video = files.filter((f) => f.endsWith('.webm')).sort();
console.log('vídeos:', video.join(', '));
await browser.close();
