/**
 * Proposta C · Checkpoint 3 — capturas, probes, contraste e auditoria de bitmap.
 *
 * Mesmo protocolo dos checkpoints 1 e 2: porta própria (3125), env Appwrite
 * zerado, loading=eager + decode() antes dos shots, reducedMotion=reduce e
 * varredura completa da página (o reveal é IntersectionObserver — sem rolar, o
 * que está abaixo da dobra nunca fica visível).
 *
 * Além das capturas: mede a geometria das seções 06/07, o contraste REAL do
 * texto novo (amostrado do bitmap renderizado), audita o bitmap servido de cada
 * imagem nova e fecha com a prova de regressão — o topo da página (01–05) tem
 * de continuar byte a byte igual à captura do checkpoint 2.
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT = 'artifacts/proposta-c/checkpoint-3';
const CROPS = 'artifacts/proposta-c/crops';
const CP2 = 'artifacts/proposta-c/checkpoint-2';
const PORT = '3125';
const PAGE_URL = `http://localhost:${PORT}/`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await mkdir(CROPS, { recursive: true });

// O otimizador de imagem indexa por URL+w+q, não pelo conteúdo do arquivo: um
// recorte regerado no mesmo nome continua servindo os bytes antigos do cache.
await rm('.next/cache/images', { recursive: true, force: true });

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
 * (`0.2126r + 0.7152g + 0.0722b` sobre sRGB) mente em campo escuro.
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
 * minoria dos pixels: a MEDIANA (p50) é o fundo e o p90 é a própria tinta.
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
  const cards = Array.from(document.querySelectorAll('[class*=rewardCard]'));
  const marks = Array.from(document.querySelectorAll('[class*=communityMark]'));
  return {
    docScrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    sectionIds: Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id),
    challenge: p(c('challenge')),
    community: p(c('community')),
    communityBg: getComputedStyle(c('community')).backgroundColor,
    communityCopy: p(c('communityCopy')),
    communityTitle: p(document.getElementById('pl-community-title')),
    communityMedia: p(c('communityMedia')),
    communityImage: p(c('communityImage')),
    communityCta: p(c('communityCta')),
    communityMarks: marks.map(p),
    communityTitleFont: getComputedStyle(document.getElementById('pl-community-title'))
      .fontFamily.split(',')[0]
      .replace(/["']/g, ''),
    communityTitlePx: getComputedStyle(document.getElementById('pl-community-title')).fontSize,
    rewards: p(c('rewards')),
    rewardsBg: getComputedStyle(c('rewards')).backgroundColor,
    rewardsCopy: p(c('rewardsCopy')),
    rewardsTitle: p(document.getElementById('pl-rewards-title')),
    rewardsCards: p(c('rewardsCards')),
    rewardCardCount: cards.length,
    rewardCards: cards.map(p),
    rewardImages: Array.from(document.querySelectorAll('[class*=rewardImage]')).map(p),
    rewardsTitlePx: getComputedStyle(document.getElementById('pl-rewards-title')).fontSize,
    sectionGap: (() => {
      const a = c('challenge')?.getBoundingClientRect().bottom ?? 0;
      const b = c('community')?.getBoundingClientRect().top ?? 0;
      return Math.round(b - a);
    })(),
  };
};

// Toda medida sai também em JSON: é a fonte de verdade dos relatórios e das
// comparações — nada de número digitado a olho em doc.
const relatorio = {};

try {
  // ------------------------------------------------------------- 1920 DPR1
  {
    const { browser, page } = await fresh(1920, 1080);
    await page.screenshot({ path: `${OUT}/implementation-1920-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1920.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 1920:', JSON.stringify(probe));
    relatorio['1920'] = { probe, audits: [], contraste: [], ancora: null };

    for (const [sel, label] of [
      ['[class*=communityImage]', 'cozy-home (06)'],
      ['[class*=rewardCard]:nth-child(1) [class*=rewardImage]', 'reward-products'],
      ['[class*=rewardCard]:nth-child(2) [class*=rewardImage]', 'reward-kits'],
      ['[class*=rewardCard]:nth-child(3) [class*=rewardImage]', 'reward-experiences'],
    ]) {
      const linha = await audit(page, sel, label);
      console.log('audit @DPR1:', JSON.stringify(linha));
      relatorio['1920'].audits.push(linha);
    }

    // Contraste do texto novo — medido no bitmap, não a olho.
    const alvos = [
      ['título 06 sobre o navy', '[class*=communityTitle]', '#fdfaf5', 1],
      ['corpo 06 sobre o navy', '[class*=communityBody]', '#fdfaf5', 0.84],
      ['eyebrow 06 (dourado)', '[class*=communityEyebrow]', '#d4b98a', 1],
      ['marca 06 (creme)', '[class*=communityMark]', '#fdfaf5', 0.92],
      ['título 07 sobre o creme', '[class*=rewardsTitle]', '#0e2a44', 1],
      ['corpo 07 sobre o creme', '[class*=rewardsBody]', '#4a6076', 1],
      ['nota 07 sobre o creme', '[class*=rewardsNote]', '#4a6076', 1],
      ['título de card 07', '[class*=rewardTitle]', '#0e2a44', 1],
      ['microcopy de card 07', '[class*=rewardText]', '#4a6076', 1],
    ];
    for (const [nome, sel, tinta, alpha] of alvos) {
      const box = await rect(page, sel);
      if (!box) {
        console.log('contraste', nome, 'não encontrado');
        continue;
      }
      const medida = await contrastOnShot(`${OUT}/implementation-1920.png`, box, tinta, alpha);
      console.log(`contraste ${nome}:`, JSON.stringify(medida));
      relatorio['1920'].contraste.push({ alvo: nome, caixa: box, ...medida });
    }

    // Âncora do header para a seção nova.
    const anchor = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('header a')).find(
        (a) => a.getAttribute('href') === '#recompensas',
      );
      link?.click();
      const box = document.getElementById('recompensas')?.getBoundingClientRect();
      return {
        link: Boolean(link),
        top: box ? Math.round(box.top) : null,
        emVista: box ? box.top < innerHeight && box.bottom > 0 : null,
      };
    });
    console.log('âncora #recompensas:', JSON.stringify(anchor));
    relatorio['1920'].ancora = anchor;
    await browser.close();
  }

  // ------------------------------------------------------------- 1440 DPR1
  {
    const { browser, page } = await fresh(1440, 1000);
    await page.screenshot({ path: `${OUT}/implementation-1440-fold.png` });
    await page.screenshot({ path: `${OUT}/implementation-1440.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 1440:', JSON.stringify(probe));
    relatorio['1440'] = { probe };
    await browser.close();
  }

  // -------------------------------------------------------------- 390 DPR2
  {
    const { browser, page } = await fresh(390, 844, 2);
    await page.screenshot({ path: `${OUT}/implementation-390.png`, fullPage: true });
    const probe = await page.evaluate(PROBE);
    console.log('probe 390:', JSON.stringify(probe));
    relatorio['390'] = { probe, audits: [] };

    // A 390 o DPR é 2: o slot de 1 coluna pede o DOBRO de pixels do que em
    // 1920. É aqui que um recorte pequeno viraria upscale — então audita.
    for (const [sel, label] of [
      ['[class*=communityImage]', 'cozy-home (06)'],
      ['[class*=rewardCard]:nth-child(1) [class*=rewardImage]', 'reward-products'],
      ['[class*=rewardCard]:nth-child(2) [class*=rewardImage]', 'reward-kits'],
      ['[class*=rewardCard]:nth-child(3) [class*=rewardImage]', 'reward-experiences'],
    ]) {
      const linha = await audit(page, sel, label);
      console.log('audit @DPR2/390:', JSON.stringify(linha));
      relatorio['390'].audits.push(linha);
    }
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
    const semJs = await page.evaluate(() => {
      const op = (sel) =>
        Array.from(document.querySelectorAll(sel)).map((el) => getComputedStyle(el).opacity);
      return {
        communityCopy: op('[class*=communityCopy] [data-pl-reveal]'),
        rewardCards: op('[class*=rewardCard]'),
        rewardCardCount: document.querySelectorAll('[class*=rewardCard]').length,
      };
    });
    console.log('sem JS:', JSON.stringify(semJs));
    relatorio.semJs = semJs;
    await browser.close();
  }

  // ------------------------------------------------- recortes das seções 06/07
  const clamp = (v, max) => Math.max(0, Math.min(v, max));

  for (const view of [1920, 1440]) {
    const shot = await sharp(`${OUT}/implementation-${view}.png`).metadata();
    const { browser, page } = await fresh(view, view === 1920 ? 1080 : 1000);
    for (const [sel, nome] of [
      ['[class*=community]', '06-community'],
      ['[class*=rewards]', '07-rewards'],
    ]) {
      const box = await rect(page, sel);
      if (!box) continue;
      await sharp(`${OUT}/implementation-${view}.png`)
        .extract({
          left: clamp(box.x, shot.width ?? 0),
          top: clamp(box.y, shot.height ?? 0),
          width: Math.min(box.w, (shot.width ?? 0) - box.x),
          height: Math.min(box.h, (shot.height ?? 0) - box.y),
        })
        .png()
        .toFile(`${OUT}/${nome}-${view}.png`);
    }
    await browser.close();
  }

  // 390: recorte de cada seção (a captura está em DPR 2).
  {
    const shot = await sharp(`${OUT}/implementation-390.png`).metadata();
    const { browser, page } = await fresh(390, 844, 2);
    for (const [sel, nome] of [
      ['[class*=community]', '06-community'],
      ['[class*=rewards]', '07-rewards'],
    ]) {
      const box = await rect(page, sel);
      if (!box) continue;
      await sharp(`${OUT}/implementation-390.png`)
        .extract({
          left: 0,
          top: clamp(box.y * 2, shot.height ?? 0),
          width: 780,
          height: Math.min(box.h * 2, (shot.height ?? 0) - box.y * 2),
        })
        .png()
        .toFile(`${OUT}/${nome}-390.png`);
    }
    await browser.close();
  }

  // -------------------------------------------------------- prova de regressão
  // O topo da página (01–05) tem de continuar idêntico ao checkpoint 2: o
  // recorte vai da linha 0 até o começo da seção 06 nas duas capturas.
  {
    const { browser, page } = await fresh(1920, 1080);
    const inicio06 = (await rect(page, '[class*=community]'))?.y ?? 0;
    await browser.close();

    const c2 = await sharp(`${CP2}/implementation-1920.png`).metadata();
    const altura = Math.min(inicio06, c2.height ?? 0);
    const a = await sharp(`${CP2}/implementation-1920.png`)
      .extract({ left: 0, top: 0, width: 1920, height: altura })
      .raw()
      .toBuffer();
    const b = await sharp(`${OUT}/implementation-1920.png`)
      .extract({ left: 0, top: 0, width: 1920, height: altura })
      .raw()
      .toBuffer();
    let max = 0;
    let soma = 0;
    let diferentes = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > max) max = d;
      soma += d;
      if (d > 2) diferentes++;
    }
    const regressao = {
      alturaComparada: altura,
      deltaMax: max,
      deltaMedio: +(soma / a.length).toFixed(4),
      pixelsDiferentes: diferentes,
      totalPixels: a.length / 3,
    };
    console.log('regressão 01–05 @1920:', JSON.stringify(regressao));
    relatorio.regressao = regressao;

    // Diff visual: só os pixels que mudaram, em vermelho.
    const W = 1920;
    const diff = Buffer.alloc(W * altura * 3);
    for (let p = 0; p < W * altura; p++) {
      const i = p * 3;
      const d = Math.max(
        Math.abs(a[i] - b[i]),
        Math.abs(a[i + 1] - b[i + 1]),
        Math.abs(a[i + 2] - b[i + 2]),
      );
      diff[i] = d > 2 ? 255 : 249;
      diff[i + 1] = d > 2 ? 0 : 245;
      diff[i + 2] = d > 2 ? 0 : 239;
    }
    await sharp(diff, { raw: { width: W, height: altura, channels: 3 } })
      .png()
      .toFile(`${OUT}/regressao-01-05-1920.png`);
  }

  await copyFile(`${CP2}/implementation-390.png`, `${OUT}/cp2-implementation-390.png`);
  await writeFile(`${OUT}/probe.json`, JSON.stringify(relatorio, null, 2));

  console.log('\ncapturas em', OUT);
} finally {
  server.kill();
}
