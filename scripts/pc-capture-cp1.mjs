/**
 * Proposta C · Checkpoint 1 — capturas, probe, auditoria de bitmap e censo de cor.
 *
 * Protocolo da casa: porta própria (3125) para não tocar no dev server do
 * usuário em :3000, env Appwrite zerado, loading=eager + decode() antes dos
 * shots (lazy não pinta em fullPage), reducedMotion=reduce.
 *
 * O reveal é dirigido por IntersectionObserver: `captureBeyondViewport` não
 * rola a página, então nada abaixo da dobra nunca ficava visível nas capturas.
 * Antes de fotografar, a página é percorrida até o fim e volta ao topo — o
 * estado retratado é o assentado, que é o que se quer julgar.
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT = 'artifacts/proposta-c/checkpoint-1';
const CROPS = 'artifacts/proposta-c/crops';
const PORT = '3125';
const URL = `http://localhost:${PORT}/`;
const SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_35_53-1.png';
const MOBILE_SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_36_04-7.png';

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
    if ((await fetch(URL)).ok) break;
  } catch {}
  await sleep(1000);
}

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
  const shown = Number(info.displayed.split('x')[0]);
  return {
    label,
    bitmapServido: `${meta.width}x${meta.height} (${meta.format})`,
    displayed: info.displayed,
    dpr: info.dpr,
    currentSrc: decodeURIComponent(info.currentSrc.split('/').pop()),
    pixelsPorCss: +(meta.width / shown).toFixed(3),
    upscale: meta.width < shown,
  };
}

/**
 * Censo de cor da página SEM a fotografia: a foto carrega a palette dela e
 * mascararia a conta. O que o brief pede (70/20/10) é sobre a superfície do
 * design — fundo, texto, botões.
 */
async function colourCensus(file, exclude, scale) {
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const box = exclude
    ? {
        x0: exclude.x * scale,
        x1: (exclude.x + exclude.w) * scale,
        y0: exclude.y * scale,
        y1: (exclude.y + exclude.h) * scale,
      }
    : null;
  let claro = 0;
  let navy = 0;
  let detalhe = 0;
  let ignorado = 0;
  let total = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (box && x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1) {
        ignorado++;
        continue;
      }
      const i = (y * info.width + x) * info.channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total++;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (lum < 90) navy++;
      else if (lum > 200 && sat < 0.16) claro++;
      else if (sat > 0.18 && max - min > 26) detalhe++;
    }
  }
  const pct = (n) => +((n / total) * 100).toFixed(1);
  return {
    imagem: `${meta.width}x${meta.height}`,
    semFoto: {
      claro: pct(claro),
      navy: pct(navy),
      detalhe: pct(detalhe),
      resto: pct(total - claro - navy - detalhe),
    },
  };
}

try {
  async function fresh(width, height, dpr = 1) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of Array.from(document.images)) {
        img.loading = 'eager';
        await img.decode().catch(() => {});
      }
    });
    // Percorre a página inteira para o IntersectionObserver revelar tudo e
    // volta ao topo; espera o fim da transição de 720ms.
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

  const rectOf = (page, sel) =>
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

  // ------------------------------------------------------------- 1920 DPR1
  {
    const { browser, page } = await fresh(1920, 1080);
    await page.screenshot({ path: `${OUT}/implementation-1920-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1920.png`, fullPage: true });

    const fonts = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const p = document.querySelector('main p');
      const fam = (el) =>
        getComputedStyle(el)
          .fontFamily.split(',')[0]
          .trim()
          .replace(/^["']|["']$/g, '');
      const scriptEl = document.querySelector('[data-pl-script]');
      return {
        headlineFamily: fam(h1),
        bodyFamily: fam(p),
        scriptFamily: scriptEl ? fam(scriptEl) : null,
        scriptColor: scriptEl ? getComputedStyle(scriptEl).color : null,
        playfairLoaded: document.fonts.check('500 40px ' + JSON.stringify(fam(h1))),
        interLoaded: document.fonts.check('400 16px ' + JSON.stringify(fam(p))),
      };
    });
    console.log('fontes:', JSON.stringify(fonts));

    const probe = await page.evaluate(() => {
      const p = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      };
      const q = (s) => document.querySelector(s);
      const c = (s) => document.querySelector(`[class*=${s}]`);
      const landing = q('[class*=landing]');
      return {
        docScrollHeight: document.documentElement.scrollHeight,
        landingHeight: Math.round(landing.getBoundingClientRect().height),
        header: p(q('header')),
        nav: p(q('header nav')),
        headerCta: p(c('headerCta')),
        hero: p(c('hero')),
        copy: p(c('heroCopy')),
        eyebrow: p(c('eyebrow')),
        headline: p(q('h1')),
        body: p(c('body')),
        primary: p(c('primaryButton')),
        social: p(c('socialProof')),
        image: p(c('heroImage')),
        script: p(q('[data-pl-script]')),
        benefits: p(c('benefits')),
        benefitItems: Array.from(document.querySelectorAll('[class*=benefitItem]')).map(p),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    console.log('probe 1920:', JSON.stringify(probe));
    console.log(
      'audit hero @DPR1:',
      JSON.stringify(await audit(page, '[class*=heroImage]', 'hero-lifestyle')),
    );

    const photo = await rectOf(page, '[class*=heroImage]');
    console.log(
      'censo 1920 (sem a foto):',
      JSON.stringify(await colourCensus(`${OUT}/implementation-1920.png`, photo, 1)),
    );

    // A tarja navy do rodapé: nenhum pixel escuro nos últimos 12px da página.
    const shot = await sharp(`${OUT}/implementation-1920.png`).metadata();
    const tail = await sharp(`${OUT}/implementation-1920.png`)
      .extract({
        left: 0,
        top: Math.max(0, (shot.height ?? 0) - 12),
        width: 1920,
        height: 1,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const darkest = Math.min(
      ...Array.from({ length: tail.info.width }, (_, x) => {
        const i = x * tail.info.channels;
        return 0.2126 * tail.data[i] + 0.7152 * tail.data[i + 1] + 0.0722 * tail.data[i + 2];
      }),
    );
    console.log('rodapé da página — luminância mínima dos últimos 12px:', Math.round(darkest));

    await browser.close();
  }

  // ------------------------------------------------------------- 1920 DPR2
  {
    const { browser, page } = await fresh(1920, 1080, 2);
    console.log(
      'audit hero @DPR2:',
      JSON.stringify(await audit(page, '[class*=heroImage]', 'hero-lifestyle')),
    );
    await browser.close();
  }

  // ------------------------------------------------------------- 1440 DPR1
  {
    const { browser, page } = await fresh(1440, 1000);
    await page.screenshot({ path: `${OUT}/implementation-1440-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1440.png`, fullPage: true });
    console.log(
      'overflow 1440:',
      JSON.stringify(
        await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        })),
      ),
    );
    await browser.close();
  }

  // -------------------------------------------------------------- 390 DPR2
  {
    const { browser, page } = await fresh(390, 844, 2);
    await page.screenshot({ path: `${OUT}/implementation-390.png`, fullPage: true });
    console.log(
      'probe 390:',
      JSON.stringify(
        await page.evaluate(() => {
          const p = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
              x: Math.round(r.x),
              y: Math.round(r.y + window.scrollY),
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          };
          const c = (s) => document.querySelector(`[class*=${s}]`);
          const landing = c('landing');
          return {
            docScrollHeight: document.documentElement.scrollHeight,
            landingHeight: Math.round(landing.getBoundingClientRect().height),
            headerCta: p(c('headerCta')),
            script: p(document.querySelector('[data-pl-script]')),
            scriptDisplay: getComputedStyle(document.querySelector('[data-pl-script]')).display,
            headline: p(document.querySelector('h1')),
            primary: p(c('primaryButton')),
            social: p(c('socialProof')),
            image: p(c('heroImage')),
            benefits: p(c('benefits')),
            items: Array.from(document.querySelectorAll('[class*=benefitItem]')).map(
              (el) => getComputedStyle(el).opacity,
            ),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          };
        }),
      ),
    );
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
    await page.goto(URL, { waitUntil: 'load' });
    console.log(
      'sem JS:',
      JSON.stringify(
        await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const s = getComputedStyle(h1);
          const items = Array.from(document.querySelectorAll('[class*=benefitItem]')).map(
            (el) => getComputedStyle(el).opacity,
          );
          return {
            headline: {
              opacity: s.opacity,
              transform: s.transform,
              text: h1.textContent.slice(0, 40),
            },
            benefitItems: items,
          };
        }),
      ),
    );
    await browser.close();
  }

  // ------------------------------------------------------- recortes e lado-a-lado
  await copyFile(SHEET, `${OUT}/reference-proposal-c.png`);
  await sharp(SHEET)
    .extract({ left: 0, top: 60, width: 1122, height: 430 })
    .resize({ width: 1920, kernel: 'lanczos3' })
    .png()
    .toFile(`${CROPS}/ref-hero-band.png`);
  await sharp(MOBILE_SHEET)
    .extract({ left: 300, top: 1160, width: 215, height: 242 })
    .resize({ width: 780, kernel: 'lanczos3' })
    .png()
    .toFile(`${CROPS}/mock-mobile.png`);

  console.log('\ncapturas em', OUT);
} finally {
  server.kill();
}
