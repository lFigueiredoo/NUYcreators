// R8 — probe de larguras de texto (Range) + herança que escala (zoom/transform).
// Mede o que o olho vê: extents de cada linha do headline, kicker, descrição,
// botões e chips dentro do hero V2 @1920.
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const PORT = '3123';

async function freePort() {
  for (let i = 0; i < 5; i++) {
    let busy = '';
    try {
      busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
    } catch {
      busy = '';
    }
    if (!busy) return;
    for (const line of busy.split('\n')) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) {
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe', stdio: 'ignore' });
        } catch {}
      }
    }
    await sleep(1000);
  }
}

await freePort();

const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT,
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};

const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: ROOT,
  env,
  shell: true,
  stdio: 'ignore',
});
try {
  let up = false;
  for (let i = 0; i < 90 && !up; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}`);
      up = res.ok;
    } catch {}
    if (!up) await sleep(1000);
  }
  if (!up) throw new Error('server did not start');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3123/', { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  const out = await page.evaluate(() => {
    const textRect = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects()).map((r) => ({
        x: +r.x.toFixed(1),
        y: +r.y.toFixed(1),
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
      }));
      return rects;
    };
    const zoomChain = (el) => {
      const chain = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = getComputedStyle(n);
        const z = c.zoom && c.zoom !== '1' ? `zoom(${c.zoom})` : '';
        const t = c.transform && c.transform !== 'none' ? `transform(${c.transform})` : '';
        if (z || t)
          chain.push(
            `${n.tagName}.${(n.className.baseVal ?? n.className).toString().split(' ')[0]} ${z}${t}`,
          );
      }
      return chain;
    };
    const pick = (sel) => document.querySelector(sel);
    const res = {};
    res.zoomChainCopy = zoomChain(pick('[data-v2-hero] p[class*="kicker"]'));
    res.kicker = { rects: textRect(pick('[data-v2-hero] p[class*="kicker"]')) };
    res.h1span = { rects: textRect(pick('[data-hero-headline] span')) };
    res.h1strong = { rects: textRect(pick('[data-hero-headline] strong')) };
    res.description = { rects: textRect(pick('[data-v2-hero] p[class*="description"]')) };
    res.primary = { rects: textRect(pick('[data-hero-actions] a:first-child')) };
    res.chip0 = { rects: textRect(pick('[data-hero-benefits] span')) };
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
  await sleep(800);
  await freePort();
}
