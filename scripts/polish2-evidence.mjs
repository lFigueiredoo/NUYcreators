/**
 * Capturas da rodada 2 — uma por seção, mais o empilhado.
 *
 * A varredura antes de capturar não é decoração: o reveal só acontece quando a
 * seção entra em quadro, e uma captura de página inteira não rola a página
 * (o Chromium compõe fora da viewport). Sem passar por tudo antes, metade do que
 * está abaixo da dobra sairia invisível. As imagens também são forçadas a
 * `eager` e decodificadas — packshot preguiçoso não pinta.
 *
 * Uso: node scripts/polish2-evidence.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final-2';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function prepare(page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  // Passa por tudo para o reveal acontecer, e volta ao topo.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
await prepare(desktop);

/** Centra um seletor na viewport sem passar do fim da página. */
async function centre(page, selector) {
  await page.evaluate((sel) => {
    const node = document.querySelector(sel);
    const box = node.getBoundingClientRect();
    const y = box.top + window.scrollY - Math.max(0, (window.innerHeight - box.height) / 2);
    window.scrollTo(0, Math.max(0, y));
  }, selector);
  await page.waitForTimeout(900);
}

for (const [name, selector] of [
  ['hero', '[aria-labelledby="pl-hero-title"]'],
  ['what-is', '#o-que-e'],
  ['how', '#como-participar'],
  ['cta', '#cta-final'],
]) {
  await centre(desktop, selector);
  await desktop.locator(selector).screenshot({ path: `${OUT}/${name}-polish-2.png`, scale: 'css' });
}

// FAQ: com a primeira pergunta aberta — é o estado que o polish toca.
await centre(desktop, '#faq');
await desktop.evaluate(async () => {
  const first = document.querySelector('#faq details');
  first.querySelector('summary').click();
  await new Promise((r) => setTimeout(r, 700));
});
await desktop.waitForTimeout(500);
await desktop.locator('#faq').screenshot({ path: `${OUT}/faq-polish-2.png`, scale: 'css' });
await desktop.evaluate(() => document.querySelector('#faq details summary').click());

// Página inteira no desktop, para a comparação com a rodada 1.
await desktop.setViewportSize({ width: 1440, height: 1000 });
await desktop.evaluate(() => window.scrollTo(0, 0));
await desktop.waitForTimeout(600);
await desktop.screenshot({ path: `${OUT}/landing-polish-2-1440.png`, fullPage: true, scale: 'css' });
await desktop.close();

// Empilhado: 390 de largura, a página inteira.
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await prepare(mobile);
await mobile.screenshot({ path: `${OUT}/mobile-polish-2.png`, fullPage: true, scale: 'css' });
await mobile.close();

await browser.close();
const files = await fs.readdir(OUT);
console.log(files.filter((f) => f.endsWith('.png')).join('\n'));
