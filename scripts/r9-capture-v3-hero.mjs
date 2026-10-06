import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// R9 checkpoint A captures: V3 hero vs a NOVA referência oficial (1024×1536,
// banda hero 0-385 → prato 1920×722). Protocolo de memória: loading=eager +
// decode() antes dos shots; ambiente Appwrite desconectado como no e2e.
const ROOT = process.cwd();
const OUT = 'artifacts/r9/checkpoint-a';
const PORT = '3123';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
  } catch {
    busy = '';
  }
  if (!busy) break;
  for (const line of busy.split('\n')) {
    // só listener real: TIME_WAIT tem PID 0→System e o taskkill explode
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

  // probe de upscale + fontes: naturalWidth × displayedSize × DPR
  // (aceita container: se o seletor não for um <img>, busca o img interno)
  const audit = (page, sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return { erro: `not found: ${s}` };
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) return { erro: `no img inside: ${s}` };
      const r = img.getBoundingClientRect();
      return {
        natural: { w: img.naturalWidth, h: img.naturalHeight },
        displayed: { w: r.width, h: r.height },
        dpr: window.devicePixelRatio,
        currentSrc: img.currentSrc.split('/').pop(),
        upscale: img.naturalWidth < r.width * window.devicePixelRatio,
      };
    }, sel);

  // --- 1920 DPR1 + gates --------------------------------------------------------
  {
    const { browser, page } = await fresh(1920, 1080);
    const fonts = await page.evaluate(() => {
      const strong = document.querySelector('[data-hero-headline] strong');
      const family = getComputedStyle(strong)
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

    const sceneAudit = await audit(page, '[data-v3-scene]').catch((e) => ({ erro: String(e) }));
    console.log('scene asset audit:', JSON.stringify(sceneAudit));

    const garlandAudit = await audit(page, 'section img[srcset]').catch((e) => ({
      erro: String(e),
    }));
    console.log('garland audit (1a img do hero):', JSON.stringify(garlandAudit));

    // probe DOM: posições dos elementos-chave (calibração). Classes são
    // hastedas — localizar por substring de data ou classe.
    const probe = await page.evaluate(() => {
      const pick = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      };
      return {
        hero: pick(document.querySelector('[data-v3-hero]')),
        logo: pick(document.querySelector('header a')),
        nav: pick(document.querySelector('header nav')),
        headerCta: pick(document.querySelector('header a[class*=headerCta]')),
        kicker: pick(
          document.querySelector('[data-hero-headline] p[class*=kicker]') ||
            document.querySelector('p[class*=kicker]'),
        ),
        l1: pick(document.querySelector('[data-hero-headline] span')),
        l2: pick(document.querySelector('[data-hero-headline] strong')),
        description: pick(
          document.querySelector('[data-hero-reveal].description') ||
            document.querySelector('div[class*=copy] > p[class*=description]'),
        ),
        primary: pick(document.querySelector('div[class*=copy] a[class*=primaryButton]')),
        outline: pick(document.querySelector('div[class*=copy] a[class*=outlineButton]')),
        signature: pick(document.querySelector('div[class*=copy] > p[class*=signature]')),
        chips: pick(document.querySelector('div[class*=chips]')),
        chip1text: pick(document.querySelector('div[class*=chips] span')),
        scene: pick(document.querySelector('[data-v3-scene] img')),
      };
    });
    console.log('DOM probe:', JSON.stringify(probe, null, 1));

    const hero = await heroBoxAt(page, '[data-v3-hero]');
    await page.screenshot({
      path: `${OUT}/v3-hero-1920.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });

    await browser.close();
  }

  // --- 1440 -------------------------------------------------------------------
  {
    const { browser, page } = await fresh(1440, 1000);
    const hero = await heroBoxAt(page, '[data-v3-hero]');
    await page.screenshot({
      path: `${OUT}/v3-hero-1440.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });
    await browser.close();
  }

  // --- 390 mobile -------------------------------------------------------------
  // viewport mais alto que o hero dobrado (~1010): o clip não passa do viewport
  {
    const { browser, page } = await fresh(390, 1020);
    const hero = await heroBoxAt(page, '[data-v3-hero]');
    await page.screenshot({
      path: `${OUT}/v3-hero-390.png`,
      clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h },
    });
    await browser.close();
  }

  // --- side-by-side: referência (prato 1920) vs V3 @1920 -----------------------
  {
    const refPlate = await sharp('artifacts/r9/reference-hero.png').png().toBuffer();
    const refMeta = await sharp(refPlate).metadata();
    const v3 = await sharp(`${OUT}/v3-hero-1920.png`).resize({ width: 1920 }).png().toBuffer();
    const v3Meta = await sharp(v3).metadata();
    const totalH = refMeta.height + 8 + v3Meta.height + 30;
    const label = await sharp({
      create: { width: 1920, height: 22, channels: 3, background: { r: 244, g: 237, b: 223 } },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="1920" height="22" xmlns="http://www.w3.org/2000/svg"><text x="8" y="16" font-size="14" fill="#111">topo: referência oficial (banda hero ×1,875 = 1920×722) · baixo: V3 checkpoint A @1920 DPR1</text></svg>`,
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
        { input: refPlate, left: 0, top: 0 },
        { input: label, left: 0, top: refMeta.height },
        { input: v3, left: 0, top: refMeta.height + 30 },
      ])
      .png()
      .toFile(`${OUT}/reference-vs-v3-hero.png`);
    console.log('side-by-side ok');
  }

  console.log('CAPTURES DONE');
} finally {
  server.kill('SIGTERM');
}
