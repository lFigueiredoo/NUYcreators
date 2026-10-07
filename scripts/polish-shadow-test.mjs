/** Compara o hero com e sem o `filter: drop-shadow` atual, ampliado. */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => { for (const i of document.images) { i.loading='eager'; await i.decode().catch(()=>{}); } });
await page.waitForTimeout(1200);
const shot = async (name) => {
  const box = await page.locator('[class*=heroStage]').first().boundingBox();
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });
};
await shot('shadow-with');
await page.addStyleTag({ content: '[class*=heroStage] img { filter: none !important }' });
await page.waitForTimeout(300);
await shot('shadow-without');
await browser.close();
