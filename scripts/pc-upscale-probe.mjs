/**
 * Diagnóstico de upscale por largura: lista toda imagem cujo bitmap servido é
 * menor que o slot CSS (DPR 1). Usado para calibrar `sizes` sem chutar.
 */
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = '3126';
const url = `http://localhost:${PORT}/`;

const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    APPWRITE_ENDPOINT: '',
    APPWRITE_PROJECT_ID: '',
    APPWRITE_API_KEY: '',
  },
  shell: true,
  stdio: 'ignore',
});

for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {}
  await sleep(1000);
}

const browser = await chromium.launch();
try {
  for (const width of [900, 1024, 1100, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = await page.evaluate(async () => {
      for (const section of Array.from(document.querySelectorAll('main section'))) {
        section.scrollIntoView({ block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      scrollTo(0, 0);
      const rows = [];
      const debug = [];
      try {
        for (const img of Array.from(document.querySelectorAll('main img').values())) {
          const shown = img.width || img.getBoundingClientRect().width;
          const served = Number((img.currentSrc.match(/w=(\d+)/) ?? [])[1] ?? 0);
          const asset = decodeURIComponent(
            (
              new globalThis.URL(img.currentSrc || img.src, 'http://x').searchParams.get('url') ??
              ''
            )
              .split('/')
              .pop() ?? '',
          );
          rows.push({
            asset,
            attrW: img.getAttribute('width'),
            imgW: img.width,
            rectW: Math.round(img.getBoundingClientRect().width),
            shown: Math.round(shown),
            served,
            sizes: img.sizes,
            ok: !served || served + 2 >= Math.round(shown),
          });
        }
      } catch (error) {
        debug.push(String(error));
      }
      return {
        title: document.title,
        total: document.querySelectorAll('main img').length,
        debug,
        rows,
      };
    });
    console.log(width, JSON.stringify(out, null, 0));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
  try {
    for (const line of execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' })
      .toString()
      .split('\n')) {
      if (!/\bLISTENING\b/.test(line)) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
    }
  } catch {}
}
