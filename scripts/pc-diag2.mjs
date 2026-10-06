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
        const desc = (el, d = 0) => {
          if (!el || d > 3) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 60),
            id: el.id || undefined,
            y: Math.round(r.y + scrollY),
            h: Math.round(r.height),
            mt: cs.marginTop,
            mb: cs.marginBottom,
            pt: cs.paddingTop,
            pb: cs.paddingBottom,
            minH: cs.minHeight,
            display: cs.display,
            pos: cs.position,
            kids: Array.from(el.children)
              .map((c) => desc(c, d + 1))
              .filter(Boolean),
          };
        };
        return {
          body: desc(document.body),
          bodyH: Math.round(document.body.getBoundingClientRect().height),
          docH: document.documentElement.scrollHeight,
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
