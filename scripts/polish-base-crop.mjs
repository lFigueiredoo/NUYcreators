/** Crop ampliado da faixa de base do hero (onde as sombras acontecem). */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 3 });
await page.goto(process.argv[2] ?? 'http://localhost:3000', { waitUntil: 'load' });
await page.evaluate(async () => { for (const i of document.images) { i.loading='eager'; await i.decode().catch(()=>{}); } });
await page.waitForTimeout(1500);
const box = await page.locator('[class*=heroStage]').first().boundingBox();
await page.screenshot({
  path: `${OUT}/base-band.png`,
  clip: { x: box.x - 30, y: box.y + box.height - 150, width: box.width + 60, height: 150 },
});
// Amostra a cor ao longo de uma linha horizontal na altura da base.
const row = await page.evaluate((y) => {
  const out = [];
  for (let x = 980; x < 1620; x += 20) {
    const el = document.elementFromPoint(x, y);
    const cs = el ? getComputedStyle(el) : null;
    out.push(`${x}:${el?.className?.toString().split('__').pop() ?? el?.tagName}`);
  }
  return out.join(' ');
}, 660);
console.log(row);
await browser.close();
