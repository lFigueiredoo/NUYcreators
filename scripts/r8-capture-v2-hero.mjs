import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// R8 checkpoint A captures: V2 hero vs the official mockup reference.
// Protocol (memory): force loading=eager + decode() before shots — lazy images
// never paint under fullPage; disconnected Appwrite env like the e2e server.
const ROOT = process.cwd();
const OUT = 'artifacts/r8/checkpoint-a';
const PORT = '3123';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Windows: npx→cmd→node chain means SIGTERM only kills the wrapper and the
// child keeps serving a stale build (run 2 captured against an orphaned
// server). Require the port to be free first, killing any listener's tree.
for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
  } catch {
    busy = '';
  }
  if (!busy) break;
  for (const line of busy.split('\n')) {
    // só listener real: TIME_WAIT tem PID 0→System e o taskkill explode em
    // "processo de sistema crítico" derrubando a captura inteira
    if (!/\bLISTENING\b/.test(line)) continue;
    const pid = line.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
      } catch {
        /* porta ocupada por processo privilegiado — segue o jogo */
      }
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
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};

async function waitForServer(url, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  throw new Error('production server did not start');
}

const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: ROOT,
  env,
  shell: true,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://localhost:${PORT}`);

  async function fresh(width, height, deviceScaleFactor = 1) {
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor,
    });
    await page.goto('http://localhost:3123/', { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of Array.from(document.images)) {
        img.loading = 'eager';
        await img.decode().catch(() => {});
      }
    });
    return { browser, page };
  }

  const heroBoxAt = (page, sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }, sel);

  // --- 1920 DPR1 + fonts gate -------------------------------------------------
  {
    const { browser, page } = await fresh(1920, 1080);
    const fonts = await page.evaluate(() => {
      const h1 = document.querySelector('[data-hero-headline]');
      const family = getComputedStyle(h1)
        .fontFamily.split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');
      return {
        family,
        bodoni: document.fonts.check(`400 40px ${JSON.stringify(family)}`),
        count: document.fonts.size,
      };
    });
    console.log('headline family:', JSON.stringify(fonts));
    const hero = await heroBoxAt(page, '[data-v2-hero]');
    await page.screenshot({
      path: `${OUT}/v2-hero-1920.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });

    // 1:1 crops (DPR1 native pixels from the hero capture source coords).
    const crops = {
      logo: { x: 130, y: 20, width: 320, height: 120 },
      floralEsquerda: { x: 980, y: 420, width: 340, height: 330 },
      produto: { x: 1290, y: 480, width: 380, height: 330 },
      floralDireita: { x: 1650, y: 380, width: 270, height: 380 },
      beneficios: { x: 180, y: 770, width: 900, height: 90 },
    };
    for (const [name, box] of Object.entries(crops)) {
      await page.screenshot({ path: `${OUT}/crop-1to1-${name}.png`, clip: box });
    }

    // DPR2 detail pass (same viewport, doubled density).
    await page.close();
    const browser2 = await chromium.launch();
    const page2 = await browser2.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    await page2.goto('http://localhost:3123/', { waitUntil: 'networkidle' });
    await page2.emulateMedia({ reducedMotion: 'reduce' });
    await page2.evaluate(async () => {
      await document.fonts.ready;
      for (const img of Array.from(document.images)) {
        img.loading = 'eager';
        await img.decode().catch(() => {});
      }
    });
    const hero2 = await heroBoxAt(page2, '[data-v2-hero]');
    await page2.screenshot({
      path: `${OUT}/hero-dpr2-detail.png`,
      clip: { x: hero2.x, y: hero2.y, width: 960, height: hero2.h },
    });
    await browser2.close();
    await browser.close();
  }

  // --- 1440 -------------------------------------------------------------------
  {
    const { browser, page } = await fresh(1440, 1000);
    const hero = await heroBoxAt(page, '[data-v2-hero]');
    await page.screenshot({
      path: `${OUT}/v2-hero-1440.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });
    await browser.close();
  }

  // --- 390 mobile -------------------------------------------------------------
  {
    const { browser, page } = await fresh(390, 844);
    const hero = await heroBoxAt(page, '[data-v2-hero]');
    await page.screenshot({
      path: `${OUT}/v2-hero-390.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });
    await browser.close();
  }

  // --- side-by-side: referência (painel esquerdo) vs V2 @1920 -----------------
  {
    const refCropped = await sharp('artifacts/r8/reference/source-mockup.png')
      .extract({ left: 0, top: 0, width: 864, height: 410 })
      .resize({ width: 1920, kernel: 'lanczos3' })
      .png()
      .toBuffer();
    const refMeta = await sharp(refCropped).metadata();
    const v2 = await sharp(`${OUT}/v2-hero-1920.png`).resize({ width: 1920 }).png().toBuffer();
    const v2Meta = await sharp(v2).metadata();
    const totalH = refMeta.height + 8 + v2Meta.height + 30;
    const label = await sharp({
      create: { width: 1920, height: 22, channels: 3, background: { r: 244, g: 237, b: 223 } },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="1920" height="22" xmlns="http://www.w3.org/2000/svg"><text x="8" y="16" font-size="14" fill="#111">topo: referência oficial (painel desktop 864→1920) · baixo: V2 checkpoint A @1920 DPR1</text></svg>`,
          ),
          density: 72,
        },
      ])
      .png()
      .toBuffer();
    const canvas = await sharp({
      create: { width: 1920, height: totalH, channels: 3, background: { r: 10, g: 12, b: 30 } },
    })
      .composite([
        { input: refCropped, left: 0, top: 0 },
        { input: label, left: 0, top: refMeta.height },
        { input: v2, left: 0, top: refMeta.height + 30 },
      ])
      .png()
      .toFile(`${OUT}/hero-reference-vs-v2.png`);
    console.log('side-by-side ok');
  }

  console.log('CAPTURES DONE');
} finally {
  server.kill('SIGTERM');
}
