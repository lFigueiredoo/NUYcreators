import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { execSync } from 'node:child_process';

for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync('netstat -ano | findstr :3123', { shell: 'cmd.exe' }).toString().trim();
  } catch {}
  if (!busy) break;
  for (const line of busy.split('\n')) {
    if (!/\bLISTENING\b/.test(line)) continue;
    const pid = line.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
      } catch {}
    }
  }
  await sleep(1000);
}

const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: '3123',
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};
const server = spawn('npx', ['next', 'start', '-p', '3123'], {
  cwd: process.cwd(),
  env,
  shell: true,
  stdio: 'ignore',
});
try {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch('http://localhost:3123/')).ok) break;
    } catch {}
    await sleep(1000);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3123/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  const out = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        y: Math.round(r.y),
        h: Math.round(r.height),
        w: Math.round(r.width),
        x: Math.round(r.x),
      };
    };
    const hero = document.querySelector('[data-v3-hero]');
    const hs = getComputedStyle(hero);
    return {
      heroBox: pick('[data-v3-hero]'),
      heroStyle: {
        height: hs.height,
        minHeight: hs.minHeight,
        display: hs.display,
        flexDirection: hs.flexDirection,
        overflow: hs.overflow,
      },
      copy: pick('div[class*=copy]'),
      scene: pick('[data-v3-scene]'),
      sceneImg: pick('[data-v3-scene] img'),
      chips: pick('div[class*=chips]'),
      scroll: { sh: document.documentElement.scrollHeight, ih: innerHeight },
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
