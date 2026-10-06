// R8 — probe 2: cascata REAL da descrição (quais regras css batem no <p>).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const PORT = '3123';

// Limpeza de porta: só linhas LISTENING, e nunca os PIDs de sistema 0/4.
export async function freePort(port, tries = 5) {
  for (let i = 0; i < tries; i++) {
    let busy = '';
    try {
      busy = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        shell: 'cmd.exe',
      })
        .toString()
        .trim();
    } catch {
      busy = '';
    }
    if (!busy) return true;
    for (const line of busy.split('\n')) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== '4') {
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe', stdio: 'ignore' });
        } catch {}
      }
    }
    await sleep(1000);
  }
  return false;
}

if (!(await freePort(PORT))) throw new Error('porta ' + PORT + ' ainda ocupada');

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

const server = spawn('npx', ['next', ['start', '-p', PORT].join(' ')], {
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

  const out = await page.evaluate(() => {
    const root = document.querySelector('[data-v2-hero]');
    const desc = root.querySelector('p:not([class*="kicker"])') ?? root.querySelector('p');
    const kicker = root.querySelector('p');
    const sheets = [...document.styleSheets].map((s) => s.href ?? '(inline)');
    const rulesFor = (el) => {
      const hits = [];
      try {
        for (const sheet of document.styleSheets) {
          let list;
          try {
            list = sheet.cssRules;
          } catch {
            continue;
          }
          for (const rule of list) {
            if (!rule.selectorText) continue;
            let m = false;
            try {
              m = el.matches(rule.selectorText);
            } catch {
              continue;
            }
            if (m && /font-size/.test(rule.style?.cssText ?? '') === false) continue;
            if (m)
              hits.push({
                sel: rule.selectorText,
                css: rule.style?.fontSize + ' / ' + rule.style?.fontFamily,
                text: rule.cssText.slice(0, 200),
              });
          }
        }
      } catch (e) {
        hits.push({ err: String(e) });
      }
      return hits;
    };
    return {
      descClass: desc?.className,
      kickerClass: kicker?.className,
      computed: {
        kicker: kicker && getComputedStyle(kicker).fontSize,
        desc: desc && getComputedStyle(desc).fontSize,
      },
      sheets,
      descRules: rulesFor(desc),
      kickerRules: rulesFor(kicker),
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
  await sleep(900);
  await freePort(PORT);
}
