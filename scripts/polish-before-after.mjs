/**
 * "Antes" e "depois" do hero num arquivo só, um sobre o outro.
 *
 * As duas capturas saem em DPR 2 (3840 de largura); aqui elas voltam para
 * 1920 — o tamanho em que o hero é realmente visto — e ganham etiqueta.
 *
 * Uso: node scripts/polish-before-after.mjs
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OUT = 'artifacts/polish-final';
const before = (await fs.readFile(`${OUT}/before-hero-1920.png`)).toString('base64');
const after = (await fs.readFile(`${OUT}/after-hero-1920.png`)).toString('base64');

const html = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0}
  body{width:1920px;background:#f8f4ec;font:600 15px/1 ui-sans-serif,system-ui,sans-serif}
  figure{position:relative}
  img{display:block;width:1920px;height:860px}
  figcaption{position:absolute;top:14px;left:18px;padding:6px 12px;border-radius:999px;
    background:rgba(8,43,85,.82);color:#fff;letter-spacing:.14em}
  hr{border:0;height:2px;background:#082b55;opacity:.35}
</style>
<figure><img src="data:image/png;base64,${before}"><figcaption>ANTES</figcaption></figure>
<hr>
<figure><img src="data:image/png;base64,${after}"><figcaption>DEPOIS</figcaption></figure>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1724 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/hero-before-after.png`, fullPage: true });
await browser.close();
console.log('ok — artifacts/polish-final/hero-before-after.png');
