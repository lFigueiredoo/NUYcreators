import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const PORT = '3125';
const URL = `http://localhost:${PORT}/`;
try {
  execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' });
} catch {}
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  console.log(
    JSON.stringify(
      await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          const bottom = r.bottom + scrollY;
          if (bottom > 1010)
            out.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 48),
              top: Math.round(r.top + scrollY),
              bottom: Math.round(bottom),
              h: +r.height.toFixed(1),
              pos: getComputedStyle(el).position,
            });
        }
        const htmlCS = getComputedStyle(document.documentElement);
        return {
          htmlMargin: htmlCS.margin,
          htmlPadding: htmlCS.padding,
          htmlOverflow: htmlCS.overflowY,
          bodyOverflow: getComputedStyle(document.body).overflowY,
          htmlRect: +document.documentElement.getBoundingClientRect().height.toFixed(1),
          elBottom: out.sort((a, b) => b.bottom - a.bottom).slice(0, 8),
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
