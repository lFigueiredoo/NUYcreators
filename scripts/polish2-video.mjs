/**
 * Vídeo do movimento da rodada 2 — do topo ao CTA final, parando em cada ato.
 *
 * O que o brief quer ver é a COREOGRAFIA: hero parado o tempo da entrada,
 * rolagem em passos de roda de mouse (nada de `scrollTo` instantâneo, que é o
 * que o IntersectionObserver e o observador de profundidade leem), uma pausa
 * curta em cada seção para a cascata acontecer, e o fim no CTA final com a luz
 * já assentada. ~13s no total.
 *
 * Uso: node scripts/polish2-video.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final-2';
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

// 1,5s parado: header, eyebrow, as duas linhas do título, corpo, CTA e frascos.
await page.waitForTimeout(1500);

const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

/**
 * Rola até `fracao` da página a ~700px/s — o passo de roda do vídeo da rodada
 * 1 — e para `pausa` no destino.
 *
 * O ritmo é medido no RELÓGIO, não no número de passos: cada `mouse.wheel` é
 * uma ida e volta ao navegador e custa ~30ms, então contar passos deixaria a
 * rolagem mais lenta do que a pedida e o vídeo mais longo que o brief.
 */
async function ate(fracao, pausa, velocidade = 700) {
  const alvo = Math.round(max * fracao);
  const inicio = await page.evaluate(() => window.scrollY);
  const t0 = Date.now();
  let y = inicio;
  while (y < alvo) {
    const desejado = Math.min(alvo, inicio + (velocidade * (Date.now() - t0)) / 1000);
    if (desejado > y) {
      await page.mouse.wheel(0, desejado - y);
      y = desejado;
    }
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(pausa);
}

await ate(0.16, 900); // comunidade
await ate(0.31, 1200); // o que é — a cascata dos benefícios leva ~1s
await ate(0.52, 1300); // como participar — cards, régua e etapa acesa
await ate(0.72, 900); // FAQ

// Abre a primeira pergunta — ela já está em quadro, sem rolagem extra.
await page.locator('#faq details summary').first().click();
await page.waitForTimeout(1300);

await ate(1, 1300); // CTA final: a luz assentando

await context.close();

const files = (await fs.readdir(OUT)).filter((f) => f.endsWith('.webm'));
const { size } = await fs.stat(`${OUT}/${files[0]}`);
await fs.rename(`${OUT}/${files[0]}`, `${OUT}/scroll-demo-polish-2.webm`);
console.log(`scroll-demo-polish-2.webm — ${(size / 1024 / 1024).toFixed(2)} MB`);
await browser.close();
