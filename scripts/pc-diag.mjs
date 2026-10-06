import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = '3125';
const URL = `http://localhost:${PORT}/`;
for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
  } catch {
    busy = '';
  }
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
  PORT,
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_API_KEY: '',
};
const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: process.cwd(),
  env,
  shell: true,
  stdio: 'ignore',
});
for (let i = 0; i < 90; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {}
  await sleep(1000);
}

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  console.log(
    JSON.stringify(
      await page.evaluate(() => {
        const landing = document.querySelector('[class*=landing]');
        const benefits = document.querySelector('[class*=benefits]');
        const items = Array.from(document.querySelectorAll('[class*=benefitItem]'));
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { y: Math.round(r.y + scrollY), h: Math.round(r.height) };
        };
        return {
          docScrollHeight: document.documentElement.scrollHeight,
          bodyScrollHeight: document.body.scrollHeight,
          landingHeight: Math.round(landing.getBoundingClientRect().height),
          landingOffsetTop: Math.round(landing.getBoundingClientRect().top + scrollY),
          htmlBg: getComputedStyle(document.documentElement).backgroundColor,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyMarginBottom: getComputedStyle(document.body).marginBottom,
          benefits: box(benefits),
          benefitsBg: benefits ? getComputedStyle(benefits).backgroundColor : null,
          items: items.map((el) => ({
            ...box(el),
            opacity: getComputedStyle(el).opacity,
            visible: el.hasAttribute('data-pl-visible'),
            text: el.textContent.trim(),
          })),
          lastChild: (() => {
            const c = landing.lastElementChild;
            return { cls: c.className, ...box(c) };
          })(),
        };
      }),
      null,
      1,
    ),
  );
  await browser.close();
} finally {
  server.kill();
}
