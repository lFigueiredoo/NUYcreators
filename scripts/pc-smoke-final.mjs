/**
 * Smoke visual final do fechamento público — só bugs objetivos.
 *
 * Não é rodada de direção de arte: cada verificação abaixo é binária e
 * verificável por máquina (imagem quebrada, overflow, texto cortado, contraste
 * insuficiente, CTA morto, header ausente, 404 de asset, classe antiga, erro de
 * JS/hidratação) + a tabela de destinos do brief. Roda sobre o build de
 * produção, em porta própria (3125). Saída em artifacts/…/smoke/.
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'artifacts/proposta-c/sprint-4b/smoke';
const PORT = '3125';
const BASE = `http://localhost:${PORT}`;

const LIGADO = { AUTH_RATE_LIMIT_VERIFIED: 'true', APP_URL: 'https://localhost:3125' };
const DESLIGADO = {
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

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
async function subir(ambiente) {
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
  throw new Error('servidor não respondeu');
}
async function derrubar(server) {
  server.kill();
  await sleep(500);
  await liberarPorta();
}

const LEGADAS =
  /^(site-header|site-footer|wordmark|desktop-nav|login-link|header-actions|header-cta|menu-button|mobile-nav|auth-layout|auth-editorial|auth-flower|auth-panel|auth-panel-inner|auth-footnote|back-link|form-stack|form-row|form-message|form-success|service-notice|checkbox-label|text-link|empty-state|footer-inner|footer-brand|footer-nav|footer-legal|footer-bottom|footer-copy|eyebrow)$/;

// ---------------------------------------------------------------- verificações
function checarPagina(legadasFonte) {
  const legadas = new RegExp(legadasFonte);
  const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lin = (s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  const lum = (rgb) =>
    0.2126 * lin(rgb[0] / 255) + 0.7152 * lin(rgb[1] / 255) + 0.0722 * lin(rgb[2] / 255);

  const quebradas = Array.from(document.images)
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src);

  const overflow = document.documentElement.scrollWidth > innerWidth;
  const estouros = Array.from(document.querySelectorAll('body *'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2);
    })
    .slice(0, 8)
    .map((el) => `${el.tagName}.${Array.from(el.classList).join('.')}`);

  const cortados = Array.from(document.querySelectorAll('main h1, main h2, main p, main li'))
    .filter((el) => {
      const s = getComputedStyle(el);
      const esconde =
        /^(hidden|clip|auto|scroll)$/.test(s.overflow) ||
        /^(hidden|clip|auto|scroll)$/.test(s.overflowY);
      return el.offsetHeight > 0 && el.scrollHeight > el.clientHeight + 2 && esconde;
    })
    .map((el) => `${el.tagName}.${Array.from(el.classList).join('.')}`);

  const fundoAtras = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const [r, g, b, a] = parse(getComputedStyle(node).backgroundColor);
      if (a > 0.5) return [r, g, b];
      node = node.parentElement;
    }
    return null;
  };
  const contraste = [];
  for (const el of Array.from(
    document.querySelectorAll('h1, h2, h3, p, li, a, label, button, summary'),
  )) {
    if (!el.offsetHeight || (el.textContent ?? '').trim().length < 2) continue;
    if (el.querySelector('h1, h2, h3, p, li')) continue;
    const s = getComputedStyle(el);
    const [r, g, b, a = 1] = parse(s.color);
    if (a < 0.25) continue;
    const fundo = fundoAtras(el);
    if (!fundo) continue; // texto sobre fotografia: fora do teste objetivo
    const tinta = [
      r * a + fundo[0] * (1 - a),
      g * a + fundo[1] * (1 - a),
      b * a + fundo[2] * (1 - a),
    ];
    const l1 = lum(tinta);
    const l2 = lum(fundo);
    const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(s.fontSize);
    const negrito = parseInt(s.fontWeight, 10) >= 700;
    const minimo = px >= 24 || (negrito && px >= 18.66) ? 3 : 4.5;
    if (razao < minimo)
      contraste.push({
        texto: (el.textContent ?? '').trim().slice(0, 40),
        cor: s.color,
        fundo: `rgb(${fundo.join(',')})`,
        px,
        razao: +razao.toFixed(2),
        minimo,
      });
  }

  const botoes = Array.from(document.querySelectorAll('button')).map((b) => ({
    texto: (b.textContent ?? '').trim().slice(0, 30),
    tipo: b.type,
    emForm: Boolean(b.closest('form')),
    desabilitado: b.disabled,
    nome: (b.getAttribute('aria-label') ?? (b.textContent ?? '').trim()).slice(0, 30),
  }));
  const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
    texto: (a.textContent ?? '').trim().slice(0, 40),
    href: a.getAttribute('href') ?? '',
  }));

  const classeAntiga = Array.from(document.querySelectorAll('[class]'))
    .flatMap((el) => Array.from(el.classList))
    .filter((c) => legadas.test(c));

  const h = document.querySelector('header');
  const header = h
    ? {
        altura: Math.round(h.getBoundingClientRect().height),
        links: h.querySelectorAll('a').length,
        lockup: (h.textContent ?? '').includes('NUY') && (h.textContent ?? '').includes('CREATORS'),
      }
    : null;

  return {
    quebradas,
    overflow,
    estouros,
    cortados,
    contraste,
    botoesMortos: botoes.filter((b) => b.tipo === 'submit' && !b.emForm),
    botoesSemNome: botoes.filter((b) => !b.nome),
    botoesDesabilitados: botoes.filter((b) => b.desabilitado),
    linksMortos: links.filter((l) => !l.href || l.href === '#' || l.href.startsWith('javascript:')),
    classeAntiga,
    header,
  };
}

const telas = [];

async function fotografar(browser, tela) {
  const { file, rota, width, height, dpr } = tela;
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  const errosJs = [];
  const errosConsole = [];
  const http = [];
  page.on('pageerror', (e) => errosJs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errosConsole.push(m.text().slice(0, 300));
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE))
      http.push({ url: r.url(), status: r.status() });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
    const passo = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 220));
  });
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true, animations: 'disabled' });
  const resultado = await page.evaluate(checarPagina, LEGADAS.source);
  telas.push({
    file,
    rota,
    viewport: `${width}x${height}`,
    url: page.url(),
    errosJs,
    errosConsole,
    http,
    ...resultado,
  });
  await page.close();
}

const browser = await chromium.launch();

// ------------------------------------------------- passada 1: acesso ligado
let server = await subir(LIGADO);
for (const tela of [
  { file: 'landing-1920.png', rota: '/', width: 1920, height: 1080, dpr: 1 },
  { file: 'landing-390.png', rota: '/', width: 390, height: 844, dpr: 2 },
  { file: 'login-1920.png', rota: '/login', width: 1920, height: 1080, dpr: 1 },
  { file: 'login-390.png', rota: '/login', width: 390, height: 844, dpr: 2 },
  { file: 'cadastro-1920.png', rota: '/cadastro', width: 1920, height: 1080, dpr: 1 },
  { file: 'cadastro-390.png', rota: '/cadastro', width: 390, height: 844, dpr: 2 },
  { file: 'forgot-1920.png', rota: '/recuperar-senha', width: 1920, height: 1080, dpr: 1 },
  { file: 'forgot-390.png', rota: '/recuperar-senha', width: 390, height: 844, dpr: 2 },
  { file: 'verify-1920.png', rota: '/verificar-email', width: 1920, height: 1080, dpr: 1 },
  { file: 'verify-390.png', rota: '/verificar-email', width: 390, height: 844, dpr: 2 },
]) {
  await fotografar(browser, tela);
}

// ---------------------------------------------------------- destinos (§4)
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const destinos = [];
  const conferir = async (rota, alvo, esperado) => {
    await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
    const href = await page
      .getByRole('link', { name: alvo, exact: true })
      .first()
      .getAttribute('href')
      .catch(() => null);
    destinos.push({ rota, alvo, esperado, encontrado: href, ok: href === esperado });
  };
  await conferir('/', 'Entrar', '/login');
  await conferir('/', 'Fazer parte', '/cadastro');
  await conferir('/', 'Fazer parte da comunidade', '/cadastro');
  await conferir('/', 'Quero fazer parte', '/cadastro');
  await conferir('/login', 'Voltar ao site', '/');
  await conferir('/login', 'Criar conta', '/cadastro');
  await conferir('/cadastro', 'Voltar ao site', '/');
  await conferir('/cadastro', 'Entrar', '/login');
  const rotas = [];
  for (const rota of [
    '/',
    '/login',
    '/cadastro',
    '/recuperar-senha',
    '/redefinir-senha',
    '/verificar-email',
    '/termos',
    '/privacidade',
  ])
    rotas.push({ rota, status: (await page.request.get(`${BASE}${rota}`)).status() });
  await page.close();
  telas.push({ file: null, destinos, rotas });
}

await derrubar(server);

// -------------------------------------- passada 2: onboarding (sem Appwrite)
server = await subir(DESLIGADO);
for (const tela of [
  { file: 'onboarding-1920.png', rota: '/onboarding', width: 1920, height: 1080, dpr: 1 },
  { file: 'onboarding-390.png', rota: '/onboarding', width: 390, height: 844, dpr: 2 },
]) {
  await fotografar(browser, tela);
}
await derrubar(server);
await browser.close();

await writeFile(`${OUT}/relatorio.json`, JSON.stringify(telas, null, 2));

// ----------------------------------------------------------------- resumo
const problemas = [];
for (const t of telas) {
  const nome = t.file ?? 'destinos';
  for (const chave of [
    'errosJs',
    'quebradas',
    'cortados',
    'contraste',
    'botoesMortos',
    'botoesSemNome',
    'linksMortos',
    'classeAntiga',
    'http',
  ]) {
    const valor = t[chave];
    if (Array.isArray(valor) && valor.length)
      problemas.push(`${nome}: ${chave} → ${JSON.stringify(valor)}`);
  }
  if (t.overflow === true)
    problemas.push(`${nome}: overflow horizontal — ${JSON.stringify(t.estouros)}`);
  if (t.header === null && t.rota) problemas.push(`${nome}: sem <header>`);
  for (const d of t.destinos ?? [])
    if (!d.ok)
      problemas.push(`destino ${d.rota} "${d.alvo}" → ${d.encontrado} (esperado ${d.esperado})`);
  for (const r of t.rotas ?? [])
    if (r.status >= 400) problemas.push(`rota ${r.rota} → ${r.status}`);
}
console.log(problemas.length ? problemas.join('\n') : 'SEM PROBLEMAS OBJETIVOS');
console.log(`\n${telas.length} entradas de relatório em ${OUT}/relatorio.json`);
