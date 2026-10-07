/**
 * Os microdetalhes, ampliados — ninguém julga uma linha de 2px a 100%.
 *
 * Cada recorte sai em DPR 3 e volta ampliado, com o valor medido ao lado:
 * a linha de progresso em três momentos da rolagem, o fio que cresce sob os
 * links do header, o item de FAQ fechado/aberto, e o card de passo no hover.
 *
 * Uso: node scripts/polish2-details.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final-2/detalhes';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);

/** Recorta um nó, amplia 3× e grava — com a medida do estado atual. */
async function shot(selector, name, pad = 10) {
  const box = await page.locator(selector).first().boundingBox();
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  await page.screenshot({ path: `${OUT}/${name}.png`, clip, scale: 'device' });
}

async function to(y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(450);
}

// --- linha de progresso: no topo, no meio e no fim da página ---
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (const [name, fracao] of [
  ['progresso-topo', 0],
  ['progresso-25', 0.25],
  ['progresso-fim', 1],
]) {
  await to(Math.round(max * fracao));
  const line = page.locator('[class*=headerProgress]');
  await shot('[class*=headerPill]', name, 14);
  console.log(
    name,
    await line.evaluate((n) => {
      const cs = getComputedStyle(n);
      return { opacity: cs.opacity, transform: cs.transform, altura: n.getBoundingClientRect().height };
    }),
  );
}

// --- fio sob o link do header ---
await to(0);
await page.locator('header nav a').first().hover();
await page.waitForTimeout(320);
await shot('header nav', 'link-underline', 12);
await page.mouse.move(10, 700);

// --- FAQ: fechado, hover e aberto ---
await page.evaluate(() => {
  const faq = document.querySelector('#faq');
  window.scrollTo(0, faq.getBoundingClientRect().top + window.scrollY - 60);
});
await page.waitForTimeout(700);
await shot('#faq details:nth-of-type(2)', 'faq-fechado', 12);
await page.locator('#faq details:nth-of-type(2) summary').hover();
await page.waitForTimeout(320);
await shot('#faq details:nth-of-type(2)', 'faq-hover', 12);
await page.evaluate(async () => {
  const item = document.querySelector('#faq details:nth-of-type(2)');
  item.querySelector('summary').click();
  await new Promise((r) => setTimeout(r, 700));
});
await page.mouse.move(10, 700);
await page.waitForTimeout(300);
await shot('#faq details:nth-of-type(2)', 'faq-aberto', 12);

// --- card de passo: repouso e hover ---
await page.evaluate(() => {
  const card = document.querySelector('[class*=stepCard]');
  const box = card.getBoundingClientRect();
  window.scrollTo(0, box.top + window.scrollY - (innerHeight - box.height) / 2);
});
await page.waitForTimeout(700);
await shot('[class*=stepCard]', 'passo-repouso', 14);
await page.locator('[class*=stepCard]').first().hover();
await page.waitForTimeout(420);
await shot('[class*=stepCard]', 'passo-hover', 14);

// --- benefícios: ícone com o traço desenhado ---
await page.evaluate(() => {
  const item = document.querySelector('[class*=benefitItem]');
  window.scrollTo(0, item.getBoundingClientRect().top + window.scrollY - innerHeight / 2);
});
await page.waitForTimeout(1200);
await shot('[class*=benefitList]', 'beneficios', 14);

await browser.close();
console.log('ok — artifacts/polish-final-2/detalhes/');
