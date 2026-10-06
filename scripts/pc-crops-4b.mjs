/**
 * Sprint 4B — recortes para julgamento visual (protocolo da casa: julgar texto
 * pequeno só em crop ampliado, sobre o bitmap realmente servido).
 *
 * O recorte sai da captura `fullPage` da página assentada, cortada por
 * coordenadas de documento (getBoundingClientRect + scroll) — não do
 * screenshot de elemento do Playwright, que rola a página para enquadrar e
 * deixa entrar a faixa do bloco vizinho quando a seção é alta. A ampliação
 * (2×/3× nearest) existe só no arquivo de revisão: o pixel é o do bitmap.
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'artifacts/proposta-c/sprint-4b/crops';
const PORT = '3125';
const BASE = `http://localhost:${PORT}`;

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

const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT,
    AUTH_RATE_LIMIT_VERIFIED: 'true',
    APP_URL: 'https://localhost:3125',
  },
  shell: true,
  stdio: 'ignore',
});
for (let i = 0; i < 90; i++) {
  try {
    if ((await fetch(`${BASE}/`)).ok) break;
  } catch {}
  await sleep(1000);
}

const browser = await chromium.launch();
const evidencias = {};

async function sessao(width, height, dpr, path = '/') {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
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
    await new Promise((r) => setTimeout(r, 200));
  });
  return page;
}

/** Captura completa da página assentada — uma por sessão (cacheada). */
const telas = new WeakMap();
async function tela(page) {
  if (!telas.has(page)) {
    const buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
    telas.set(page, sharp(buf));
  }
  return telas.get(page);
}

async function recorta(page, nome, seletor, escala = 1) {
  const bruto = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    // O bitmap do `fullPage` está em pixels de dispositivo: a régua do DOM é
    // CSS e precisa do fator de densidade para casar com a imagem.
    const d = devicePixelRatio;
    return {
      left: (b.x + scrollX) * d,
      top: (b.y + scrollY) * d,
      width: b.width * d,
      height: b.height * d,
    };
  }, seletor);
  if (!bruto) throw new Error(`seletor sem elemento: ${seletor}`);
  const tela_ = await tela(page);
  const { width: telaW, height: telaH } = await tela_.metadata();
  // Arredondar para baixo no topo e para cima na base: o fim de uma seção que
  // encosta no fim da página arredonda 1px além do bitmap e o sharp recusa.
  const rect = {
    left: Math.min(Math.max(0, Math.floor(bruto.left)), telaW - 1),
    top: Math.min(Math.max(0, Math.floor(bruto.top)), telaH - 1),
    width: Math.round(bruto.width),
    height: Math.round(bruto.height),
  };
  rect.width = Math.min(rect.width, telaW - rect.left);
  rect.height = Math.min(rect.height, telaH - rect.top);
  const file = `${OUT}/${nome}.png`;
  await tela_.clone().extract(rect).toFile(file);
  if (escala !== 1) {
    await sharp(file)
      .resize({ width: Math.round(rect.width * escala), kernel: 'nearest' })
      .toFile(`${OUT}/${nome}@${escala}x.png`);
  }
  return rect;
}

/** Régua de documento: as seções são contíguas (nenhuma cobre a outra). */
async function probe(page) {
  return page.evaluate(() => {
    const box = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY) };
    };
    const secoes = {
      conteudos: box('#conteudos'),
      faq: box('#faq'),
      faqFoot: box('[class*=faqFoot]'),
      ctaFinal: box('#cta-final'),
      footer: box('footer'),
    };
    return {
      ...secoes,
      contiguo:
        secoes.faq.bottom === secoes.ctaFinal.top && secoes.ctaFinal.bottom === secoes.footer.top,
      pagina: document.documentElement.scrollHeight,
    };
  });
}

// ------------------------------------------------------------------ 1920 --
{
  const page = await sessao(1920, 1080, 1);
  evidencias['1920'] = await probe(page);
  await recorta(page, 'conteudos-1920', '#conteudos');
  await recorta(page, 'faq-1920', '#faq');
  await recorta(page, 'cta-final-1920', '#cta-final');
  await recorta(page, 'rodape-1920', 'footer');
  // Ampliados para leitura de glifo: rodapé e a lista da FAQ.
  await recorta(page, 'rodape-legal-1920', 'footer [aria-label=Legal]', 3);
  await recorta(page, 'faq-item-1920', 'details:first-of-type', 2);
  await recorta(page, 'cta-final-acoes-1920', '[class*=ctaFinalActions]', 2);
  await page.close();
}

// ------------------------------------------------------------------- 390 --
{
  const page = await sessao(390, 844, 2);
  evidencias['390'] = await probe(page);
  await recorta(page, 'conteudos-390', '#conteudos');
  await recorta(page, 'faq-390', '#faq');
  await recorta(page, 'cta-final-390', '#cta-final');
  await recorta(page, 'rodape-390', 'footer');
  await page.close();
}

// ------------------------------------------------------- telas de acesso --
for (const [nome, rota] of [
  ['login', '/login'],
  ['recuperar', '/recuperar-senha'],
  ['redefinir', '/redefinir-senha?userId=demo&secret=demo'],
  ['verificar', '/verificar-email?userId=demo&secret=demo'],
]) {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await recorta(page, `form-${nome}-1920`, 'main section', 1.6);
  await page.close();
}

// ------------------------------------------------------ termos/privacidade --
{
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${BASE}/termos`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await recorta(page, 'termos-1920', 'main');
  await page.goto(`${BASE}/privacidade`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await recorta(page, 'privacidade-1920', 'main');
  await page.close();
}

await writeFile(`${OUT}/regua.json`, JSON.stringify(evidencias, null, 2));
console.log(JSON.stringify(evidencias, null, 2));

await browser.close();
server.kill();
await sleep(500);
await liberarPorta();
console.log('recortes em', OUT);
