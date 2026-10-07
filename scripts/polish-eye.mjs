/** O recorte que o olho vê, em 1:1 — sem ampliar nada. */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const OUT = 'artifacts/polish-final';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(process.argv[2] ?? 'http://localhost:3100', { waitUntil: 'load' });
await page.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/${process.argv[3] ?? 'eye'}.png`, clip: { x: 1020, y: 380, width: 700, height: 380 } });
await browser.close();
