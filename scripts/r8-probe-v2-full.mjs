// R8 — probe completo do hero V2 a 1920×1080 (prod server próprio, Appwrite off).
// Baseado em r8-probe-type.mjs; adiciona header, chips e buttons individuais.
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

  const probe = await page.evaluate(() => {
    const csBox = (el) => {
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        fs: c.fontSize,
        lh: c.lineHeight,
        ls: c.letterSpacing,
        fw: c.fontWeight,
        box: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        text: el.textContent ? el.textContent.trim().slice(0, 30) : undefined,
      };
    };
    const q = (sel) => document.querySelector(sel);
    return {
      vp: { w: innerWidth, h: innerHeight },
      hero: csBox(q('[data-v2-hero]')),
      header: csBox(q('[data-v2-hero] header, [data-v2-hero] [class*="header"]')),
      lockup: csBox(q('[data-v2-hero] [class*="lockup"]')),
      lockupMark: csBox(q('[data-v2-hero] [class*="lockupMark"]')),
      lockupLabel: csBox(q('[data-v2-hero] [class*="lockupLabel"]')),
      nav: csBox(q('[data-v2-hero] [class*="nav"]')),
      navLinks: Array.from(q('[data-v2-hero] [class*="nav"]')?.querySelectorAll('a') ?? []).map(
        (a) => csBox(a),
      ),
      accountZone: csBox(q('[data-v2-hero] [class*="accountZone"]')),
      loginLink: csBox(q('[data-v2-hero] [class*="loginLink"]')),
      headerCta: csBox(q('[data-v2-hero] [class*="headerCta"]')),
      kicker: csBox(q('[data-v2-hero] p[class*="kicker"], [data-v2-hero] p')),
      h1span: csBox(q('[data-hero-headline] span')),
      h1strong: csBox(q('[data-hero-headline] strong')),
      description: csBox(q('[data-v2-hero] p[class*="description"]')),
      actions: csBox(q('[data-hero-actions]')),
      primary: csBox(q('[data-hero-actions] a:first-child')),
      ghost: csBox(q('[data-hero-actions] a:last-child')),
      chips: csBox(q('[data-hero-benefits]')),
      chipSpans: Array.from(q('[data-hero-benefits]')?.querySelectorAll('span') ?? []).map((s) =>
        csBox(s),
      ),
    };
  });
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
  await sleep(800);
  await freePort();
}
