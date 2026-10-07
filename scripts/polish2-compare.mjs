/**
 * Rodada 1 × rodada 2, seção por seção, no mesmo tamanho em que se olha.
 *
 * A rodada 1 deixou as seções capturadas a 1920 (`artifacts/polish-final/`), então
 * a comparação honesta é refazer as MESMAS seções hoje, no mesmo tamanho, com
 * tudo em repouso — e empilhar os pares com etiqueta. Nada de reduzir as duas
 * metades: o que a rodada 2 mexeu é fino demais para sobreviver a uma escala.
 *
 * Uso: node scripts/polish2-compare.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final-2';
const ANTES = 'artifacts/polish-final';
const TEMP = `${OUT}/comparativo`;
await fs.mkdir(TEMP, { recursive: true });

const SECOES = [
  ['hero', '[aria-labelledby="pl-hero-title"]', `${ANTES}/hero-view-final.png`, 'HERO — profundidade: dois planos, respiro e o título mascarado'],
  ['como-participar', '#como-participar', `${ANTES}/region-steps.png`, 'COMO PARTICIPAR — divisor novo, régua dos passos, card aceso'],
  ['faq', '#faq', `${ANTES}/region-faq-2x.png`, 'FAQ — fio ao abrir, texto que desliza, peso do título'],
  ['cta-final', '#cta-final', `${ANTES}/region-cta-2x.png`, 'CTA FINAL — divisor, luz radial e peso do botão'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await page.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.7);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);

const depois = {};
for (const [nome, seletor] of SECOES) {
  await page.evaluate((sel) => {
    const node = document.querySelector(sel);
    const box = node.getBoundingClientRect();
    window.scrollTo(0, Math.max(0, box.top + window.scrollY - Math.max(0, (innerHeight - box.height) / 2)));
  }, seletor);
  await page.waitForTimeout(900);
  const destino = `${TEMP}/${nome}.png`;
  await page.locator(seletor).screenshot({ path: destino, scale: 'css' });
  depois[nome] = destino;
}
await page.close();

const img = async (caminho) =>
  `data:image/png;base64,${(await fs.readFile(caminho)).toString('base64')}`;

const linhas = [];
for (const [nome, , antes, titulo] of SECOES) {
  linhas.push(`
  <section>
    <h2>${titulo}</h2>
    <figure><img src="${await img(antes)}"><figcaption>RODADA 1</figcaption></figure>
    <figure><img src="${await img(depois[nome])}"><figcaption>RODADA 2</figcaption></figure>
  </section>`);
}

const html = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1920px;background:#e8e3d9;font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif;color:#082b55}
  h2{padding:16px 20px 12px;letter-spacing:.16em;font-size:12px;background:#082b55;color:#f8f4ec}
  section{padding-bottom:8px}
  figure{position:relative;background:#fff}
  img{display:block;width:1920px;height:auto}
  figcaption{position:absolute;top:12px;left:14px;padding:5px 11px;border-radius:999px;
    background:rgba(8,43,85,.86);color:#fff;letter-spacing:.14em;font-size:11px}
</style>${linhas.join('')}`;

const shot = await browser.newPage({ viewport: { width: 1920, height: 1000 }, deviceScaleFactor: 1 });
await shot.setContent(html, { waitUntil: 'load' });
await shot.waitForTimeout(600);
await shot.screenshot({ path: `${OUT}/polish-1-vs-polish-2.png`, fullPage: true, scale: 'css' });
await shot.close();
await browser.close();

const { size } = await fs.stat(`${OUT}/polish-1-vs-polish-2.png`);
console.log(`polish-1-vs-polish-2.png — ${(size / 1024 / 1024).toFixed(2)} MB`);
