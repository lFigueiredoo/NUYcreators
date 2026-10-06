/**
 * Proposta C · Checkpoint 2 — capturas, probes, contraste e auditoria de bitmap.
 *
 * Mesmo protocolo do checkpoint 1: porta própria (3125), env Appwrite zerado,
 * loading=eager + decode() antes dos shots, reducedMotion=reduce e varredura
 * completa da página (o reveal é IntersectionObserver — sem rolar, o que está
 * abaixo da dobra nunca fica visível).
 *
 * Além das capturas: mede a geometria das seções 04/05, o contraste REAL do
 * texto sobre o banner navy (amostrado do bitmap renderizado, não a olho) e
 * audita o bitmap servido de cada imagem (`naturalWidth` mente sob srcset).
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT = 'artifacts/proposta-c/checkpoint-2';
const CROPS = 'artifacts/proposta-c/crops';
const PORT = '3125';
const PAGE_URL = `http://localhost:${PORT}/`;
const SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_35_53-1.png';
const ASSET_SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_36_04-7.png';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await mkdir(CROPS, { recursive: true });

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

for (let i = 0; i < 90; i++) {
  try {
    if ((await fetch(PAGE_URL)).ok) break;
  } catch {}
  await sleep(1000);
}

/**
 * WCAG 2.x de verdade: luminância relativa com sRGB linearizado. A luma crua
 * (`0.2126r + 0.7152g + 0.0722b` sobre sRGB) mente em campo escuro — o dourado
 * #d4b98a sobre o navy mede 4,48 por luma e 8,0:1 por WCAG.
 */
const srgb2lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb2lin(r) + 0.7152 * srgb2lin(g) + 0.0722 * srgb2lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Bitmap realmente servido — `naturalWidth` mente sob srcset. */
async function audit(page, sel, label) {
  const info = await page.evaluate((s) => {
    const img = document.querySelector(s);
    if (!img) return { erro: `not found: ${s}` };
    const r = img.getBoundingClientRect();
    return {
      displayed: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
      dpr: window.devicePixelRatio,
      currentSrc: img.currentSrc,
    };
  }, sel);
  if (!info.currentSrc) return info;
  const res = await fetch(info.currentSrc, { headers: { Accept: 'image/avif,image/webp,*/*' } });
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  const [w, h] = info.displayed.split('x').map(Number);
  // O otimizador devolve /_next/image?url=%2Fbrand%2F…&w=…: o nome do asset
  // está no parâmetro `url`, não no último segmento do caminho.
  const parsed = new globalThis.URL(info.currentSrc, 'http://x');
  const asset = (parsed.searchParams.get('url') ?? parsed.pathname).split('/').pop() ?? '';
  return {
    label,
    bitmap: `${meta.width}x${meta.height}`,
    displayed: info.displayed,
    dpr: info.dpr,
    pixelsPorCss: +(meta.width / w).toFixed(3),
    pixelsPorCssY: +(meta.height / h).toFixed(3),
    upscale: meta.width < w,
    asset: decodeURIComponent(asset),
  };
}

/**
 * Contraste medido no bitmap renderizado. Numa caixa de texto os glifos são a
 * minoria dos pixels: a MEDIANA (p50) é o fundo e o p90 é a própria tinta —
 * reportar o p90 como fundo acusaria contraste 1,1:1 falso.
 */
async function contrastOnShot(file, box, inkHex, alpha = 1, scale = 1) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.max(0, Math.round(box.x * scale));
  const y0 = Math.max(0, Math.round(box.y * scale));
  const x1 = Math.min(info.width, Math.round((box.x + box.w) * scale));
  const y1 = Math.min(info.height, Math.round((box.y + box.h) * scale));
  const px = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      px.push({ rgb, l: lum(rgb[0], rgb[1], rgb[2]) });
    }
  }
  px.sort((a, b) => a.l - b.l);
  const p = (q) => px[Math.min(px.length - 1, Math.floor(px.length * q))];
  const fundo = p(0.5).rgb;
  const ink = parseInt(inkHex.slice(1), 16);
  const inkRgb = [(ink >> 16) & 255, (ink >> 8) & 255, ink & 255];
  // Tinta translúcida compõe em sRGB sobre o fundo ANTES da luminância.
  const inkEff = inkRgb.map((c, i) => alpha * c + (1 - alpha) * fundo[i]);
  return {
    amostras: px.length,
    fundoP50: hex(fundo),
    tinta: `${inkHex}${alpha < 1 ? ` @${alpha}` : ''}`,
    contraste: +ratio(lum(...inkEff), lum(...fundo)).toFixed(2),
  };
}

async function fresh(width, height, dpr = 1) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1000));
  });
  return { browser, page };
}

const rect = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  }, sel);

const PROBE = () => {
  const p = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const c = (s) => document.querySelector(`[class*=${s}]`);
  const grid = c('creatorsGrid');
  const cards = Array.from(document.querySelectorAll('[class*=creatorCard]'));
  return {
    docScrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    hero: p(c('hero')),
    benefits: p(c('benefits')),
    creators: p(c('creators')),
    creatorsTitle: p(document.getElementById('pl-creators-title')),
    creatorsGrid: p(grid),
    gridDisplay: grid ? getComputedStyle(grid).display : null,
    gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    cardCount: cards.length,
    cards: cards.map(p),
    challenge: p(c('challenge')),
    challengeMedia: p(c('challengeMedia')),
    challengeImage: p(c('challengeImage')),
    challengeCopy: p(c('challengeCopy')),
    challengeTitle: p(document.getElementById('pl-challenge-title')),
    challengeCta: p(c('challengeCta')),
    challengeNote: p(c('challengeNote')),
    challengeBg: getComputedStyle(c('challenge')).backgroundColor,
    titleFont: (() => {
      const t = document.getElementById('pl-challenge-title');
      return t ? getComputedStyle(t).fontFamily.split(',')[0].replace(/["']/g, '') : null;
    })(),
    titlePx: (() => {
      const t = document.getElementById('pl-challenge-title');
      return t ? getComputedStyle(t).fontSize : null;
    })(),
  };
};

try {
  // ------------------------------------------------------------- 1920 DPR1
  {
    const { browser, page } = await fresh(1920, 1080);
    await page.screenshot({ path: `${OUT}/implementation-1920-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1920.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 1920:', JSON.stringify(probe));

    for (const [sel, label] of [
      ['[class*=heroImage]', 'hero-lifestyle'],
      ['[class*=creatorImage]', 'creator-01'],
      ['[class*=challengeImage]', 'products-floral'],
    ]) {
      console.log('audit @DPR1:', JSON.stringify(await audit(page, sel, label)));
    }

    const copy = await rect(page, '[class*=challengeCopy]');
    const title = await rect(page, '#pl-challenge-title');
    const body = await rect(page, '[class*=challengeBody]');
    const note = await rect(page, '[class*=challengeNote]');
    console.log(
      'contraste título sobre o banner:',
      JSON.stringify(await contrastOnShot(`${OUT}/implementation-1920.png`, title, '#fdfaf5')),
    );
    console.log(
      'contraste corpo sobre o banner:',
      JSON.stringify(await contrastOnShot(`${OUT}/implementation-1920.png`, body, '#fdfaf5', 0.84)),
    );
    console.log(
      'contraste nota sobre o banner:',
      JSON.stringify(await contrastOnShot(`${OUT}/implementation-1920.png`, note, '#d4b98a', 1)),
    );
    console.log(
      'contraste eyebrow sobre o banner:',
      JSON.stringify(
        await contrastOnShot(
          `${OUT}/implementation-1920.png`,
          await rect(page, '[class*=challengeEyebrow]'),
          '#d4b98a',
        ),
      ),
    );
    const ctaBox = await rect(page, '[class*=challengeCta]');
    console.log(
      'contraste CTA (tinta navy no pill creme):',
      JSON.stringify(await contrastOnShot(`${OUT}/implementation-1920.png`, ctaBox, '#0e2a44')),
    );
    console.log('caixa copy:', JSON.stringify(copy));

    await browser.close();
  }

  // ------------------------------------------------------------- 1440 DPR1
  {
    const { browser, page } = await fresh(1440, 1000);
    await page.screenshot({ path: `${OUT}/implementation-1440-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1440.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 1440:', JSON.stringify(probe));
    await browser.close();
  }

  // -------------------------------------------------------------- 390 DPR2
  {
    const { browser, page } = await fresh(390, 844, 2);
    await page.screenshot({ path: `${OUT}/implementation-390.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 390:', JSON.stringify(probe));
    const grid = await page.evaluate(() => {
      const g = document.querySelector('[class*=creatorsGrid]');
      return {
        display: getComputedStyle(g).display,
        overflowX: getComputedStyle(g).overflowX,
        snap: getComputedStyle(g).scrollSnapType,
        scrollWidth: g.scrollWidth,
        clientWidth: g.clientWidth,
      };
    });
    console.log('carrossel 390:', JSON.stringify(grid));
    await browser.close();
  }

  // ---------------------------------------------------- legibilidade sem JS
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await ctx.newPage();
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    console.log(
      'sem JS:',
      JSON.stringify(
        await page.evaluate(() => {
          const op = (sel) =>
            Array.from(document.querySelectorAll(sel)).map((el) => getComputedStyle(el).opacity);
          return {
            h1Opacity: getComputedStyle(document.querySelector('h1')).opacity,
            creatorCards: op('[class*=creatorCard]'),
            challengeCopy: op('[class*=challengeCopy] [data-pl-reveal]'),
          };
        }),
      ),
    );
    await browser.close();
  }

  // ------------------------------------------------------- recortes e comparações
  await copyFile(SHEET, `${OUT}/reference-proposal-c.png`);
  await copyFile(ASSET_SHEET, `${OUT}/reference-imagens-a-utilizar.png`);

  const shot1920 = await sharp(`${OUT}/implementation-1920.png`).metadata();
  const clamp = (v, max) => Math.max(0, Math.min(v, max));

  for (const [sel, name] of [
    ['[class*=creators]', '04-creators'],
    ['[class*=challenge]', '05-desafio'],
  ]) {
    const box = await rectOf(await fresh(1920, 1080), sel);
    if (box) {
      await sharp(`${OUT}/implementation-1920.png`)
        .extract({
          left: clamp(box.x, shot1920.width ?? 0),
          top: clamp(box.y, shot1920.height ?? 0),
          width: clamp(box.w, (shot1920.width ?? 0) - box.x),
          height: Math.min(box.h, (shot1920.height ?? 0) - box.y),
        })
        .png()
        .toFile(`${CROPS}/impl-${name}-1920.png`);
    }
  }

  console.log('\ncapturas em', OUT);
} finally {
  server.kill();
}

/** O rect precisa de página viva; abre uma e fecha em seguida. */
async function rectOf({ browser, page }, sel) {
  const box = await rect(page, sel);
  await browser.close();
  return box;
}
