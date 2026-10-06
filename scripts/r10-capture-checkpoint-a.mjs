/**
 * R10 · Checkpoint A (OPÇÃO C) — capturas e comparação.
 *
 * Entrega: reference-c.png · implementation-c-1920/1440/390.png ·
 * comparison-c-reference-vs-implementation.png · pares de crop
 * (header, headline, produto, flores, projeto).
 *
 * Protocolo de memória: matar órfãos LISTENING na 3123, loading=eager +
 * decode() antes dos shots, reducedMotion=reduce, env Appwrite desligado.
 * O clip não passa do viewport → mobile capturado em viewport alto.
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT = 'artifacts/r10/checkpoint-a';
const PORT = '3123';
const REF = 'artifacts/r10/reference-c.png';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await copyFile(REF, `${OUT}/reference-c.png`);

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

const box = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  }, sel);

/**
 * Audit de imagem — honesto em DPR:
 * `naturalWidth` de um <img> com srcset é AJUSTADO pela densidade do candidato
 * escolhido (bitmap / (w do candidato ÷ sizes)); usar isso como "resolução real"
 * dá falso upscale. Aqui o bitmap servido é medido de fato: busca-se o
 * `currentSrc` e lê-se as dimensões com sharp (mesmo protocolo do audit do r9).
 */
const audit = async (page, sel, fonteEsperada) => {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { erro: `not found: ${s}` };
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (!img) return { erro: `no img inside: ${s}` };
    const r = img.getBoundingClientRect();
    return {
      displayed: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
      dpr: window.devicePixelRatio,
      currentSrc: img.currentSrc,
    };
  }, sel);
  if (!info.currentSrc) return info;
  const res = await fetch(info.currentSrc, { headers: { Accept: 'image/avif,image/webp,*/*' } });
  const bitmap = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  const displayed = Number(info.displayed.split('x')[0]);
  return {
    fonte: fonteEsperada,
    bitmapServido: `${bitmap.width}x${bitmap.height} (${bitmap.format})`,
    displayed: info.displayed,
    dpr: info.dpr,
    currentSrc: decodeURIComponent(info.currentSrc.split('/').pop()),
    upscaleEmDPR1: bitmap.width < displayed,
    pixelsPorCss: +(bitmap.width / displayed).toFixed(3),
  };
};

try {
  await waitForServer(`http://localhost:${PORT}`);

  async function fresh(width, height, deviceScaleFactor = 1) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
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

  const regions = {};

  // ---------------------------------------------------------------- 1920 DPR1
  // viewport alto o bastante para o clip (hero+projeto): clip não sai do viewport
  {
    const { browser, page } = await fresh(1920, 1800);

    const fonts = await page.evaluate(() => {
      const strong = document.querySelector('[data-hero-headline] strong');
      const family = getComputedStyle(strong)
        .fontFamily.split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');
      return { family, bodoni: document.fonts.check(`400 40px ${JSON.stringify(family)}`) };
    });
    console.log('headline family:', JSON.stringify(fonts));

    const audits = [
      ['[data-v3-scene]', 'public/brand/c/scene-hero-c.webp 1064x1295'],
      ['header img[srcset]', 'public/brand/v2/wordmark-nuy.webp 322x183'],
      ['[data-v3-project] img', 'public/brand/polish/lilac-floral.webp 207x255'],
      ['[data-hero-headline] strong', '— (texto)'],
    ];
    for (const [sel, fonte] of audits) {
      console.log(
        `audit ${sel}:`,
        JSON.stringify(await audit(page, sel, fonte).catch((e) => ({ erro: String(e) }))),
      );
    }

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
      const q = (s) => document.querySelector(s);
      return {
        hero: pick(q('[data-v3-hero]')),
        logo: pick(q('header a')),
        nav: pick(q('header nav')),
        headerCta: pick(q('header a[class*=headerCta]')),
        kicker: pick(q('p[class*=kicker]')),
        l1: pick(q('[data-hero-headline] span')),
        l2: pick(q('[data-hero-headline] strong')),
        description: pick(q('p[class*=description]')),
        primary: pick(q('a[class*=primaryButton]')),
        outline: pick(q('a[class*=outlineButton]')),
        signature: pick(q('p[class*=signature]')),
        chips: pick(q('div[class*=chips]')),
        chip1: pick(q('div[class*=chips] span')),
        chip2: pick(q('div[class*=chips] span:nth-child(2)')),
        scene: pick(q('[data-v3-scene] img')),
        project: pick(q('[data-v3-project]')),
        projectTitle: pick(q('h2[class*=projectTitle]')),
        projectText: pick(q('div[class*=projectText]')),
        projectBloom: pick(q('[data-v3-project] img')),
      };
    });
    console.log('DOM probe:', JSON.stringify(probe, null, 1));
    regions.probe = probe;

    // linhas reais do título do projeto (referência: 3 linhas, L1 a 40,35% da largura)
    const titleLines = await page.evaluate(() => {
      const el = document.querySelector('h2[class*=projectTitle]');
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()]
        .filter((r) => r.height > 0)
        .map((r) => ({ x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width) }));
    });
    console.log('projectTitle linhas:', JSON.stringify(titleLines));

    const heroH = probe.hero.h;
    const full = {
      x: 0,
      y: 0,
      width: 1920,
      height: heroH + probe.project.h,
    };
    await page.screenshot({ path: `${OUT}/implementation-c-1920.png`, clip: full });
    regions.full1920 = full;
    regions.hero1920 = { x: 0, y: 0, width: 1920, height: heroH };

    await page.screenshot({
      path: `${OUT}/crop-1920-header.png`,
      clip: { x: 0, y: 0, width: 1920, height: 240 },
    });
    await page.screenshot({
      path: `${OUT}/crop-1920-headline.png`,
      clip: {
        x: 0,
        y: Math.max(0, probe.kicker.y - 30),
        width: Math.round(1920 * 0.62),
        height: probe.signature.y + probe.signature.h + 30 - Math.max(0, probe.kicker.y - 30),
      },
    });
    await page.screenshot({
      path: `${OUT}/crop-1920-produto.png`,
      clip: {
        x: Math.round(1920 * 0.42),
        y: 0,
        width: Math.round(1920 * 0.58),
        height: heroH,
      },
    });
    await page.screenshot({
      path: `${OUT}/crop-1920-chips.png`,
      clip: {
        x: 0,
        y: probe.chips.y - 40,
        width: 1920,
        height: heroH - (probe.chips.y - 40),
      },
    });
    await page.screenshot({
      path: `${OUT}/crop-1920-projeto.png`,
      clip: { x: 0, y: probe.project.y, width: 1920, height: probe.project.h },
    });
    await page.screenshot({
      path: `${OUT}/crop-1920-flores.png`,
      clip: {
        x: Math.round(probe.projectBloom.x - 160),
        y: probe.project.y,
        width: Math.round(1920 - (probe.projectBloom.x - 160)),
        height: probe.project.h,
      },
    });

    await browser.close();
  }

  // ------------------------------------------------------------------- 1440
  {
    const { browser, page } = await fresh(1440, 1900);
    const hero = await box(page, '[data-v3-hero]');
    const project = await box(page, '[data-v3-project]');
    await page.screenshot({
      path: `${OUT}/implementation-c-1440.png`,
      clip: { x: 0, y: 0, width: 1440, height: hero.h + project.h },
    });
    await browser.close();
  }

  // ------------------------------------------------------------------- 390
  {
    const { browser, page } = await fresh(390, 1900);
    const hero = await box(page, '[data-v3-hero]');
    console.log('mobile hero box:', JSON.stringify(hero));
    await page.screenshot({
      path: `${OUT}/implementation-c-390.png`,
      clip: { x: 0, y: 0, width: 390, height: Math.min(hero.h, 1900) },
    });
    await browser.close();
  }

  // ------------------------------------------------- comparação e crops
  const refMeta = await sharp(REF).metadata();
  const RW = refMeta.width; // 342
  // região da referência: hero (32-312) + projeto (313-411)
  const REF_REGION = { left: 0, top: 30, width: RW, height: 384 };

  const label = async (w, text, size = 15) =>
    sharp({ create: { width: w, height: 26, channels: 3, background: { r: 242, g: 236, b: 226 } } })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${w}" height="26" xmlns="http://www.w3.org/2000/svg"><text x="8" y="18" font-family="Arial" font-size="${size}" fill="#1b2333">${text}</text></svg>`,
          ),
        },
      ])
      .png()
      .toBuffer();

  const stack = async (parts, out, bg = { r: 8, g: 12, b: 28 }) => {
    let y = 0;
    const composites = [];
    let width = 0;
    for (const p of parts) {
      const meta = await sharp(p).metadata();
      width = Math.max(width, meta.width);
      composites.push({ input: p, left: 0, top: y });
      y += meta.height + 6;
    }
    await sharp({ create: { width, height: y, channels: 3, background: bg } })
      .composite(composites)
      .png()
      .toFile(out);
  };

  // full page: referência (escala 1920) sobre a implementação
  const refFull = await sharp(REF)
    .extract(REF_REGION)
    .resize({ width: 1920, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const implFull = await sharp(`${OUT}/implementation-c-1920.png`)
    .resize({ width: 1920 })
    .png()
    .toBuffer();
  await stack(
    [
      await label(1920, 'REFERÊNCIA C (OPÇÃO C · mockup 342×1536 → 1920 de largura)'),
      refFull,
      await label(1920, 'IMPLEMENTAÇÃO (hero + 01 O PROJETO @1920 DPR1 · hero com teto de 1200px)'),
      implFull,
    ],
    `${OUT}/comparison-c-reference-vs-implementation.png`,
  );

  // pares de crop: referência (mesma largura do crop da implementação) sobre impl
  const pair = async (name, refRegion, implPath, title) => {
    const implMeta = await sharp(implPath).metadata();
    const refCrop = await sharp(REF)
      .extract(refRegion)
      .resize({ width: implMeta.width, kernel: 'lanczos3' })
      .png()
      .toBuffer();
    await stack(
      [
        await label(implMeta.width, `${title} — REFERÊNCIA C`, 14),
        refCrop,
        await label(implMeta.width, `${title} — IMPLEMENTAÇÃO @1920`, 14),
        await sharp(implPath).png().toBuffer(),
      ],
      `${OUT}/crop-${name}-ref-vs-impl.png`,
    );
  };

  await pair(
    'header',
    { left: 0, top: 34, width: RW, height: 44 },
    `${OUT}/crop-1920-header.png`,
    'HEADER',
  );
  await pair(
    'headline',
    { left: 10, top: 100, width: 200, height: 180 },
    `${OUT}/crop-1920-headline.png`,
    'HERO · COPY',
  );
  await pair(
    'produto',
    { left: 145, top: 40, width: 197, height: 272 },
    `${OUT}/crop-1920-produto.png`,
    'HERO · PRODUTO',
  );
  await pair(
    'chips',
    { left: 0, top: 283, width: RW, height: 30 },
    `${OUT}/crop-1920-chips.png`,
    'HERO · FAIXA INFERIOR',
  );
  await pair(
    'projeto',
    { left: 0, top: 313, width: RW, height: 99 },
    `${OUT}/crop-1920-projeto.png`,
    '01 · O PROJETO',
  );
  await pair(
    'flores',
    { left: 300, top: 340, width: 42, height: 72 },
    `${OUT}/crop-1920-flores.png`,
    'PROJETO · FLOR NA BORDA',
  );

  console.log('CAPTURES DONE');
} finally {
  server.kill('SIGTERM');
}
