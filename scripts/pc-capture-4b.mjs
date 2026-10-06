/**
 * Proposta C · Sprint 4B — capturas do fechamento público, medidas e contraste.
 *
 * Protocolo da casa: porta própria (3125), `next start` sobre o build atual,
 * env Appwrite zerado quando a captura precisa do estado DESCONECTADO, e o
 * ambiente real do `.env.local` (com AUTH_RATE_LIMIT_VERIFIED/APP_URL) quando
 * a captura precisa do estado que a pessoa vê: acesso habilitado e cadastro
 * legalmente desligado. Antes de fotografar: loading=eager + decode() em toda
 * imagem e uma varredura até o fim da página (o reveal depende de rolagem).
 *
 * Sai daqui: as 13 capturas do brief, os estados honestos que não têm link
 * público (sem token, sem sessão), as medidas de 9 larguras, o contraste dos
 * textos novos e a auditoria de bitmap das imagens novas.
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'artifacts/proposta-c/sprint-4b';
const PORT = '3125';
const BASE = `http://localhost:${PORT}`;

// Estado que a pessoa vê: auth configurada (valores inertes — nenhuma chamada
// de rede nasce do render) e cadastro bloqueado por decisão legal.
const AMBIENTE_LIGADO = {
  AUTH_RATE_LIMIT_VERIFIED: 'true',
  APP_URL: 'https://localhost:3125',
};
// Estado desconectado: é o que os testes de contrato exigem e o único jeito
// honesto de fotografar `/onboarding` sem uma sessão real.
const AMBIENTE_DESLIGADO = {
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};

const LARGURAS = [1920, 1440, 1366, 1280, 1024, 768, 430, 390, 375];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await rm('.next/cache/images', { recursive: true, force: true });

// ------------------------------------------------------------------ servidor --
async function liberarPorta() {
  for (let i = 0; i < 5; i++) {
    let busy = '';
    try {
      busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
    } catch {
      busy = '';
    }
    if (!busy) return;
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
}

async function subirServidor(ambiente) {
  await liberarPorta();
  const server = spawn('npx', ['next', 'start', '-p', PORT], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', PORT, ...ambiente },
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return server;
    } catch {}
    await sleep(1000);
  }
  throw new Error('servidor não respondeu na porta ' + PORT);
}

async function derrubarServidor(server) {
  server.kill();
  await sleep(500);
  await liberarPorta();
}

// ------------------------------------------------------------------ helpers --
const srgb2lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb2lin(r) + 0.7152 * srgb2lin(g) + 0.0722 * srgb2lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgbOf = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

async function fresh(path, width, height, dpr, reduced = true) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  await sleep(400);
  return { browser, page };
}

/** O reveal depende de rolagem: percorre a página e volta ao topo antes do shot. */
async function assentar(page) {
  await page.evaluate(async () => {
    const passo = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 220));
  });
}

async function shot(page, file, fullPage = false) {
  await page.screenshot({ path: `${OUT}/${file}`, fullPage, animations: 'disabled' });
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
  if (!info.currentSrc) return { label, ...info };
  const res = await fetch(info.currentSrc, { headers: { Accept: 'image/avif,image/webp,*/*' } });
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  const [w] = info.displayed.split('x').map(Number);
  const parsed = new globalThis.URL(info.currentSrc, 'http://x');
  const asset = (parsed.searchParams.get('url') ?? parsed.pathname).split('/').pop() ?? '';
  return {
    label,
    asset: decodeURIComponent(asset),
    bitmap: `${meta.width}x${meta.height}`,
    displayed: info.displayed,
    dpr: info.dpr,
    pixelsPorCss: +(meta.width / w).toFixed(3),
    upscale: meta.width < w * info.dpr,
  };
}

/** Contraste medido no bitmap renderizado (p50 = fundo, p95 sem tinta = pior). */
async function contrastOnShot(file, box, inkHex) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.max(0, Math.round(box.x));
  const y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(info.width, Math.round(box.x + box.w));
  const y1 = Math.min(info.height, Math.round(box.y + box.h));
  const px = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      px.push({ rgb, l: lum(rgb[0], rgb[1], rgb[2]) });
    }
  }
  if (!px.length) return null;
  px.sort((a, b) => a.l - b.l);
  const inkRgb = rgbOf(inkHex);
  const sobre = (fundo) => ratio(lum(...inkRgb), lum(...fundo));
  const distancia = (rgb) => Math.hypot(rgb[0] - inkRgb[0], rgb[1] - inkRgb[1], rgb[2] - inkRgb[2]);
  const soFundo = px.filter((a) => distancia(a.rgb) > 90);
  const amostra = soFundo.length ? soFundo : px;
  const claro = amostra[Math.floor(amostra.length * 0.95)].rgb;
  return {
    amostras: px.length,
    fundoP50: hex(px[Math.floor(px.length * 0.5)].rgb),
    fundoP95semTinta: hex(claro),
    contrastePior: +Math.min(sobre(claro), sobre(px[Math.floor(px.length * 0.5)].rgb)).toFixed(2),
  };
}

const medidas = { capturas: [], responsivo: [], contraste: {}, bitmap: [], alturas: {} };

// caixa de um texto, em coordenadas da viewport (para casar com o shot)
const caixa = async (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);

// ============================================================ 1. LIGADO ====
let server = await subirServidor(AMBIENTE_LIGADO);

// ---------------------------------------------------- landing 1920 e 390 --
{
  const { browser, page } = await fresh('/', 1920, 1080, 1);
  await assentar(page);
  await shot(page, 'landing-1920-full.png', true);

  medidas.alturas = await page.evaluate(() => {
    const alt = (s) => {
      const el = document.querySelector(s);
      return el ? Math.round(el.getBoundingClientRect().height) : null;
    };
    const tam = (s) => {
      const el = document.querySelector(s);
      return el ? +parseFloat(getComputedStyle(el).fontSize).toFixed(1) : null;
    };
    return {
      pagina: document.documentElement.scrollHeight,
      hero: alt('[aria-labelledby="pl-hero-title"]'),
      beneficios: alt('[class*=benefits]'),
      creators: alt('[class*=creators]'),
      desafio: alt('[class*=challenge]'),
      comunidade: alt('[class*=community]'),
      recompensas: alt('[class*=rewards]'),
      conteudos: alt('[class*=contents]'),
      faq: alt('[class*=faq]'),
      ctaFinal: alt('[class*=ctaFinal]'),
      rodape: alt('footer'),
      titulos: {
        conteudos: tam('#pl-contents-title'),
        faq: tam('#pl-faq-title'),
        ctaFinal: tam('#pl-cta-final-title'),
      },
    };
  });

  // Contraste dos textos novos, medidos no bitmap renderizado.
  const alvos = [
    ['[class*=ctaFinalEyebrow]', '#d4b98a', 'cta-final · eyebrow dourado sobre navy'],
    ['#pl-cta-final-title', '#fdfaf5', 'cta-final · título creme sobre navy'],
    ['[class*=ctaFinalBody]', '#fdfaf5', 'cta-final · corpo sobre navy (84%)'],
    ['[class*=ctaFinalSecondary]', '#fdfaf5', 'cta-final · botão contornado'],
    ['[class*=faqAnswer]', '#4a6076', 'faq · resposta sobre creme-soft'],
    ['[class*=faqSummary]', '#0e2a44', 'faq · pergunta sobre creme-soft'],
    ['[class*=contentsNote]', '#4a6076', 'conteúdos · nota sobre creme'],
    ['[class*=footerCopy]', '#4a6076', 'rodapé · copyright sobre creme'],
    [
      '[class*=footerNavLink], footer [class*=navLink]',
      '#0e2a44',
      'rodapé · navegação sobre creme',
    ],
  ];
  for (const [sel, tinta, rotulo] of alvos) {
    const box = await caixa(page, sel);
    if (!box) continue;
    // Primeira linha de glifos: a caixa inteira do corpo dilui o fundo.
    const linha = { x: box.x, y: box.y, w: box.w, h: Math.min(box.h, 34) };
    medidas.contraste[rotulo] = await contrastOnShot(`${OUT}/landing-1920-full.png`, linha, tinta);
  }

  // FAQ fecha com o mesmo desenho do resto: abre pelo nativo e o ícone gira.
  const faqAberta = await page.evaluate(async () => {
    const item = document.querySelector('details');
    if (!item) return null;
    item.open = true;
    await new Promise((r) => setTimeout(r, 260));
    const icone = getComputedStyle(item.querySelector('summary svg')).transform;
    return { aberto: item.open, transform: icone };
  });
  medidas.faq = faqAberta;

  medidas.bitmap.push(await audit(page, '#cta-final img', 'cta-final · products-home'));
  await browser.close();
}

{
  const { browser, page } = await fresh('/', 390, 844, 2);
  await assentar(page);
  await shot(page, 'landing-390-full.png', true);
  medidas.bitmap.push(await audit(page, '#cta-final img', 'cta-final · products-home @390'));
  await browser.close();
}

// --------------------------------------------- acesso 1920: login/cadastro --
for (const [file, rota] of [
  ['login-1920.png', '/login'],
  ['signup-1920.png', '/cadastro'],
  ['forgot-1920.png', '/recuperar-senha'],
  ['reset-1920.png', '/redefinir-senha?userId=demo&secret=demo'],
  ['verify-1920.png', '/verificar-email?userId=demo&secret=demo'],
]) {
  const { browser, page } = await fresh(rota, 1920, 1080, 1);
  await shot(page, file);
  medidas.capturas.push({
    file,
    rota,
    titulo: await page.locator('h1').innerText(),
    primeiroCampo: await page.evaluate(() => {
      const el = document.querySelector('form input:not([type=hidden])');
      return el ? Math.round(el.getBoundingClientRect().top) : null;
    }),
    campos: await page.$$eval('form input:not([type=hidden])', (els) =>
      els.map((e) => e.getAttribute('name')),
    ),
    cta: await page.$$eval('form button,[class*=submit]', (els) =>
      els.map((e) => (e.textContent ?? '').trim()).filter(Boolean),
    ),
  });
  await browser.close();
}

// ------------------------------------- acesso 390: login/cadastro/forgot --
for (const [file, rota] of [
  ['login-390.png', '/login'],
  ['signup-390.png', '/cadastro'],
  ['forgot-390.png', '/recuperar-senha'],
  ['reset-390.png', '/redefinir-senha?userId=demo&secret=demo'],
  ['verify-390.png', '/verificar-email?userId=demo&secret=demo'],
]) {
  const { browser, page } = await fresh(rota, 390, 844, 2);
  await shot(page, file);
  medidas.capturas.push({
    file,
    rota,
    primeiroCampoDobra: await page.evaluate(() => {
      const el = document.querySelector('form input:not([type=hidden])');
      return el ? Math.round(el.getBoundingClientRect().top) < innerHeight : null;
    }),
    faixa: await page.evaluate(() => {
      const el = document.querySelector('main figure');
      return el ? Math.round(el.getBoundingClientRect().height) : null;
    }),
  });
  await browser.close();
}

// ------------------------------------------- medidas em 9 larguras (landing) --
for (const largura of LARGURAS) {
  const { browser, page } = await fresh('/', largura, largura === 375 ? 667 : 1080, 1);
  await assentar(page);
  const m = await page.evaluate(() => {
    const secao = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    // Elementos que estouram a régua: nenhum pode passar da viewport.
    const estouros = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2);
      })
      .slice(0, 6)
      .map((el) => `${el.tagName}.${Array.from(el.classList).join('.')}`);
    return {
      pagina: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      secoes: {
        conteudos: secao('#conteudos'),
        faq: secao('#faq'),
        ctaFinal: secao('#cta-final'),
        rodape: secao('footer'),
      },
      estouros,
    };
  });
  medidas.responsivo.push({ largura, ...m });
  await browser.close();
}

// ========================================================= 2. DESLIGADO ====
await derrubarServidor(server);
server = await subirServidor(AMBIENTE_DESLIGADO);

for (const [file, rota] of [
  ['onboarding-1920.png', '/onboarding'],
  ['reset-sem-link-1920.png', '/redefinir-senha'],
  ['verify-sem-link-1920.png', '/verificar-email'],
  ['login-desconectado-1920.png', '/login'],
  ['signup-desligado-1920.png', '/cadastro'],
]) {
  const { browser, page } = await fresh(rota, 1920, 1080, 1);
  await shot(page, file);
  medidas.capturas.push({
    file,
    rota,
    url: page.url(),
    titulo: await page.locator('h1').innerText(),
    aviso: await page
      .locator('[role=status]')
      .first()
      .innerText()
      .catch(() => '(sem aviso)'),
  });
  await browser.close();
}

for (const [file, rota] of [['onboarding-390.png', '/onboarding']]) {
  const { browser, page } = await fresh(rota, 390, 844, 2);
  await shot(page, file);
  medidas.capturas.push({ file, rota, url: page.url() });
  await browser.close();
}

// -------------------------------------------------- relatório das capturas --
await writeFile(`${OUT}/medidas.json`, JSON.stringify(medidas, null, 2));
console.log(JSON.stringify(medidas, null, 2));

await derrubarServidor(server);
