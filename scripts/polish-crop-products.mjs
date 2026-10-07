/** Crop ampliado de cada packshot do hero — leitura honesta do alpha/fundo. */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => { for (const i of document.images) { i.loading='eager'; await i.decode().catch(()=>{}); } });
await page.waitForTimeout(1200);
const imgs = page.locator('[class*=heroStage] img');
for (let i = 0; i < await imgs.count(); i++) {
  const el = imgs.nth(i);
  await el.screenshot({ path: `${OUT}/product-${i}.png`, omitBackground: false });
}
await browser.close();
