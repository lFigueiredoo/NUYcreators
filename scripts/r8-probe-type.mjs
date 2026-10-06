// R8 — probe de tipografia do hero V2: mede estilo computado ao vivo.
// Diagnóstico da "descrição pequena" vista na captura de 1920.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const PORT = '3123';

for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
  } catch {
    busy = '';
  }
  if (!busy) break;
  for (const line of busy.split('\n')) {
    const pid = line.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
  }
  await sleep(1000);
}

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
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}`);
      if (res.ok) break;
    } catch {}
    await sleep(1000);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3123/', { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  const probe = await page.evaluate(() => {
    const root = document.querySelector('[data-v2-hero]');
    const cs = (el) => {
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        fontFamily: c.fontFamily
          .split(',')[0]
          .trim()
          .replace(/^["']|["']$/g, ''),
        transform: c.transform,
        opacity: c.opacity,
        box: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      };
    };
    const out = {};
    out.viewport = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio };
    for (const [key, sel] of [
      ['hero', '[data-v2-hero]'],
      ['kicker', '[data-v2-hero] p'],
      ['headline', '[data-hero-headline]'],
      ['h1span', '[data-hero-headline] span'],
      ['h1strong', '[data-hero-headline] strong'],
      ['description', '[data-v2-hero] .description, [class*="description"]'],
      ['actions', '[data-hero-actions]'],
      ['primary', '[data-hero-actions] a:first-child'],
    ]) {
      const el = document.querySelector(sel);
      out[key] = el ? cs(el) : null;
    }
    // p do description tem textContent para confirmar que é o parágrafo certo
    const desc = document.querySelector('[class*="description"]');
    out.descText = desc ? desc.textContent.trim().slice(0, 40) : null;
    // classes reais do p e do hero (pra confirmar matched css)
    out.descClass = desc ? desc.className : null;
    out.heroClass = root ? root.className.slice(0, 120) : null;
    return out;
  });
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
} finally {
  execSync(
    `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /T /PID %a`,
    {
      shell: 'cmd.exe',
      stdio: 'ignore',
    },
  );
  server.kill('SIGTERM');
  await sleep(800);
  try {
    const busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString();
    for (const line of busy.split('\n')) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
    }
  } catch {}
}
