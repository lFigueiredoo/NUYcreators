/**
 * Capturas da rodada de polish (hero apoiado + movimento).
 *
 * Uso: node scripts/polish-capture.mjs <label> [base]
 *   label  "before" | "after"
 *   base   URL do servidor (default http://localhost:3000)
 *
 * Salva em artifacts/polish-final/. O hero é capturado com o movimento já
 * assentado (o reveal do IntersectionObserver precisa de um instante para
 * terminar) — sem isso o PNG sai com o produto a meio caminho.
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const label = process.argv[2] ?? 'after';
const BASE = process.argv[3] ?? process.env.POLISH_BASE ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

/** Carrega, força todas as imagens e espera fontes + reveal assentarem. */
async function open(page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  // Deixa o reveal do hero (stagger + duração) terminar antes de fotografar.
  await page.waitForTimeout(1800);
}

for (const [width, height, name] of [
  [1920, 1080, '1920'],
  [1440, 1000, '1440'],
  [390, 844, '390'],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: 'no-preference',
    deviceScaleFactor: 2,
  });
  await open(page);

  const hero = await page.locator('main section').first().boundingBox();
  await page.screenshot({
    path: `${OUT}/${label}-hero-${name}.png`,
    clip: { x: 0, y: 0, width, height: Math.min(height, Math.max(hero?.height ?? height, 520)) },
  });

  // Página inteira: varre para disparar todo reveal antes do fullPage.
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 130));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
  await page.screenshot({ path: `${OUT}/${label}-landing-${name}.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log(`ok — artifacts/polish-final/${label}-*.png`);
