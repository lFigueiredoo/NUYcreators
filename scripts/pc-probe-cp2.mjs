import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const PORT = '3126';
const U = `http://localhost:${PORT}/`;
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT,
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_API_KEY: '',
};
const server = spawn('npx', ['next', 'start', '-p', PORT], { shell: true, env, stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(U)).ok) break;
    } catch {}
    await sleep(1000);
  }
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(U, { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (const i of document.images) {
      i.loading = 'eager';
      await i.decode().catch(() => {});
    }
  });
  await p.evaluate(async () => {
    const s = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += s) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 900));
  });
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const c = (s) => document.querySelector(`[class*=${s}]`);
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return {
            y: Math.round(r.y + scrollY),
            h: Math.round(r.height),
            x: Math.round(r.x),
            w: Math.round(r.width),
          };
        };
        const sec = c('creators');
        const cs = getComputedStyle(sec);
        const eyebrow = c('sectionEyebrow');
        const head = c('sectionHead');
        const title = document.getElementById('pl-creators-title');
        const body = c('sectionBody');
        const grid = c('creatorsGrid');
        const note = c('gridNote');
        return {
          creators: box(sec),
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          head: box(head),
          eyebrow: box(eyebrow),
          title: box(title),
          body: box(body),
          grid: box(grid),
          note: box(note),
          headMargin: getComputedStyle(head).margin,
          titleMargin: getComputedStyle(title).margin,
          eyebrowMargin: getComputedStyle(eyebrow).margin,
          bodyMargin: getComputedStyle(body).margin,
          revealed: document.querySelectorAll('[data-pl-visible]').length,
          totalReveal: document.querySelectorAll('[data-pl-reveal]').length,
          hiddenSample: Array.from(document.querySelectorAll('[data-pl-reveal]'))
            .filter((e) => !e.hasAttribute('data-pl-visible'))
            .map((e) => e.className)
            .slice(0, 6),
        };
      }),
      null,
      1,
    ),
  );
  await b.close();
} finally {
  server.kill();
}
