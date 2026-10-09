/**
 * §19 — vídeos de fluidez do NUY Creators.
 *
 * Chromium VISÍVEL: GPU real. Headless em software engasga e o vídeo sairia
 * provando o contrário do que o sprint entregou (mesmo motivo do
 * `record-hero-motion.mjs`).
 *
 * A pilha é a mesma da suíte da área autenticada — stub de Appwrite + build de
 * produção + proxy HTTPS (`tests/support/stack.mjs`). A sessão nasce do
 * formulário de login com uma usuária de fixture: nenhuma senha real entra aqui.
 *
 * Ao lado de cada vídeo sai uma sonda numérica de quadros (intervalo entre
 * quadros via `requestAnimationFrame`). A §16 pede fluidez perto de 60fps e a
 * §19 diz que imagem estática não é prova de fluidez — o JSON é a prova.
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { startStack } from '../tests/support/stack.mjs';

const DIR = 'artifacts/creator-motion-v1';
const USER = { email: 'ana@nuy.test', password: 'senha-de-teste-123' };

/**
 * `node scripts/capture-motion-v1.mjs b-navegacao-1440` grava só o clipe pedido;
 * `node scripts/capture-motion-v1.mjs sondas` roda só as sondas de repouso.
 */
const ONLY = process.argv.slice(2).filter((argument) => !argument.startsWith('-'));
const SO_SONDAS = ONLY.length > 0 && ONLY.every((argument) => argument === 'sondas');
const SO_CLIPES = ONLY.length > 0 && !SO_SONDAS;

const ROUTES = [
  '/app',
  '/app/desafios',
  '/app/conteudos',
  '/app/pontos',
  '/app/recompensas',
  '/app/ranking',
  '/app/notificacoes',
  '/app/perfil',
];

/** Instalado antes de qualquer script da página: conta quadros desde a primeira pintura. */
const probe = () => {
  window.__frames = [];
  const tick = (time) => {
    if (window.__frames.length < 4000) window.__frames.push(time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/**
 * Intervalo entre quadros. `acima33ms` é o que passa de dois quadros a 60Hz.
 *
 * `picosEmMs` guarda ONDE cada engasgo caiu, medido do primeiro quadro da
 * gravação: um pico aos 40ms é a primeira pintura carregando a página (não é
 * animação), e um pico aos 3000ms é a coreografia — a diferença importa para
 * saber o que a §16 está medindo.
 */
function stats(frames) {
  const deltas = [];
  for (let index = 1; index < frames.length; index += 1) {
    deltas.push(frames[index] - frames[index - 1]);
  }
  if (deltas.length === 0) return null;
  const sorted = [...deltas].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const picos = [];
  for (let index = 0; index < deltas.length; index += 1) {
    if (deltas[index] > 33.4) {
      picos.push({
        emMs: Math.round(frames[index + 1] - frames[0]),
        ms: Number(deltas[index].toFixed(1)),
      });
    }
  }
  return {
    quadros: frames.length,
    p50: Number(at(0.5).toFixed(2)),
    p95: Number(at(0.95).toFixed(2)),
    max: Number(Math.max(...deltas).toFixed(2)),
    acima20ms: deltas.filter((value) => value > 20).length,
    acima33ms: deltas.filter((value) => value > 33.4).length,
    picosEmMs: picos,
  };
}

await fs.mkdir(`${DIR}/video`, { recursive: true });
const stack = await startStack();
const browser = await chromium.launch({ headless: false });
const report = { origem: stack.origin, clipes: {} };

/** Grava a cada clipe: uma falha adiante não pode apagar a evidência de trás. */
const save = () => fs.writeFile(`${DIR}/quadros.json`, `${JSON.stringify(report, null, 2)}\n`);

async function signIn(page) {
  await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', USER.email);
  await page.fill('input[name="password"]', USER.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/**
 * Um clipe = um contexto = um vídeo. A sonda de quadros é instalada no contexto
 * inteiro, então ela pega a navegação (o App Router navega no mesmo documento e
 * a contagem sobrevive) inclusive do primeiro quadro da tela de destino.
 */
async function clip(name, options, scenario) {
  if (SO_SONDAS || (SO_CLIPES && !ONLY.includes(name))) return;
  const { width, height, mobile = false, reduced = false, authenticated = true } = options;
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    recordVideo: { dir: `${DIR}/video`, size: { width, height } },
  });
  await context.addInitScript(probe);
  const page = await context.newPage();
  try {
    if (authenticated) await signIn(page);
    await scenario(page);
    const frames = await page.evaluate(() => window.__frames);
    report.clipes[name] = {
      ...options,
      quadros: stats(frames),
    };
    const video = page.video();
    await context.close();
    await video.saveAs(`${DIR}/${name}.webm`);
    const quadros = report.clipes[name].quadros;
    await save();
    console.log(
      `[${name}] ${quadros?.quadros ?? 0} quadros · p50 ${quadros?.p50}ms · ` +
        `p95 ${quadros?.p95}ms · max ${quadros?.max}ms · >20ms ${quadros?.acima20ms}`,
    );
  } catch (error) {
    report.clipes[name] = { ...options, erro: String(error) };
    await save();
    await context.close();
    throw error;
  }
}

/**
 * Link da sidebar por rota — o alvo que a creator clica.
 *
 * Três armadilhas do DOM real, as três resolvidas aqui: o `<aside>` da casca
 * contém também o link da MARCA, que aponta para `/app` (o logo e o "Início" são
 * dois alvos distintos para a mesma rota); a sidebar tem DUAS `nav` — a principal
 * e a "Conta", onde vivem notificações e perfil; e a barra inferior do mobile
 * reusa o `aria-label="Navegação principal"` da sidebar, então um seletor por
 * rótulo casa com as duas (o oculto por CSS também casa).
 */
const navLink = (page, route) => page.locator(`aside[class*="sidebar"] nav a[href="${route}"]`);

const settle = (page, ms = 1400) => page.waitForTimeout(ms);

try {
  // A. Painel carregando — saudação, faixa, indicadores, destaques, colunas.
  await clip('a-painel-1440', { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${stack.origin}/app`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 2600);
  });

  // B. Navegação entre as oito telas — clicando na sidebar, como a creator faz.
  await clip('b-navegacao-1440', { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${stack.origin}/app`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1200);
    for (const route of ROUTES) {
      await navLink(page, route).click();
      await page.waitForURL((url) => url.pathname === route, { timeout: 15_000 });
      // Fora da sidebar: o ponteiro parado em cima do link não interfere no
      // movimento do conteúdo, que é o que o vídeo precisa mostrar.
      await page.mouse.move(720, 700);
      await settle(page, 1500);
    }
  });

  // C. Hover nos cards — desafios e catálogo de recompensas.
  await clip('c-cards-hover-1440', { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1200);
    const cards = page.locator('main article');
    const count = await cards.count();
    for (let index = 0; index < Math.min(count, 4); index += 1) {
      await cards.nth(index).hover();
      await settle(page, 700);
    }
    await page.mouse.move(20, 700);
    await settle(page, 400);
    await page.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1200);
    const rewards = page.locator('main article');
    const total = await rewards.count();
    for (let index = 0; index < Math.min(total, 4); index += 1) {
      await rewards.nth(index).hover();
      await settle(page, 700);
    }
    await page.mouse.move(20, 700);
    await settle(page, 500);
  });

  // D. Abas de desafios — a pílula ativa chega em vez de piscar, e a lista não re-anima.
  await clip('d-abas-desafios-1440', { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1200);
    const tabs = page.locator('nav[aria-label="Filtrar desafios"] a');
    const count = await tabs.count();
    for (let index = 1; index < count; index += 1) {
      await tabs.nth(index).click();
      await settle(page, 1300);
    }
    await tabs.first().click();
    await settle(page, 1300);
  });

  // E. Recompensas — catálogo, cascata posicional e rolagem até "Meus resgates".
  await clip('e-recompensas-1440', { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 2400);
    await page.mouse.wheel(0, 600);
    await settle(page, 1200);
    await page.mouse.wheel(0, -600);
    await settle(page, 900);
  });

  // F. Mobile — abrir, fechar por Escape, abrir de novo e sair por um destino.
  await clip('f-mais-390', { width: 390, height: 844, mobile: true }, async (page) => {
    await page.goto(`${stack.origin}/app`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1600);
    const more = page.getByRole('button', { name: 'Mais' });
    await more.click();
    await settle(page, 1200);
    await page.keyboard.press('Escape');
    await settle(page, 900);
    await more.click();
    await settle(page, 1000);
    await page.locator('#mais-secoes a').first().click();
    await settle(page, 1600);
  });

  // G. Landing — reveal por seção durante a rolagem (sem sessão: página pública).
  await clip('g-landing-1440', { width: 1440, height: 900, authenticated: false }, async (page) => {
    await page.goto(`${stack.origin}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    for (let step = 0; step < 7; step += 1) {
      await page.mouse.wheel(0, 620);
      await settle(page, 1100);
    }
    await page.mouse.wheel(0, -4200);
    await settle(page, 900);
  });

  // R. Movimento reduzido — o controle da §15: a interface inteira, sem animação.
  await clip('r-reduce-1440', { width: 1440, height: 900, reduced: true }, async (page) => {
    await page.goto(`${stack.origin}/app`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await settle(page, 1400);
    for (const route of ['/app/desafios', '/app/recompensas', '/app/perfil']) {
      await navLink(page, route).click();
      await page.waitForURL((url) => url.pathname === route, { timeout: 15_000 });
      await settle(page, 1200);
    }
  });

  // Sondas de repouso, ainda com o navegador vivo.
  await sondar('repouso-1440', { width: 1440, height: 900 });
  await sondar('repouso-390', { width: 390, height: 844, mobile: true });
  await sondar('repouso-1440-reduce', { width: 1440, height: 900, reduced: true });
} finally {
  await browser.close();
  await stack.close();
}

/**
 * Sondas de repouso (§19).
 *
 * O que a suíte NÃO mede e importa aqui: a entrada tem de terminar sem deixar
 * `transform` no repouso. Um `translateY(0px)` residual não é "invisível" — ele
 * cria contexto de pilha e bloco contentor, e um `position: fixed` dentro de um
 * cartão passaria a se posicionar pelo cartão. Por isso os keyframes fecham em
 * `transform: none`, e é isto que prova.
 */
function restProbe() {
  const describe = (node) => {
    const style = getComputedStyle(node);
    return {
      tag: node.tagName.toLowerCase(),
      // O nome local sobrevive ao hash do CSS Module: `...__enter ...__i3`.
      classes: [...node.classList].filter((name) => /__(enter|i\d)$/.test(name)).join(' '),
      transform: style.transform,
      animationName: style.animationName,
      animationPlayState: style.animationPlayState,
      rodando: node
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
        .map((animation) => animation.animationName),
    };
  };
  const nodes = [...document.querySelectorAll('[class*="__enter"]')];
  const residuals = nodes.map(describe).filter((element) => element.transform !== 'none');
  return {
    elementosComEntrada: nodes.length,
    transformResidual: residuals.length,
    residuais: residuals,
    animacoesRodando: document.getAnimations().filter((a) => a.playState === 'running').length,
    overflowHorizontal: document.documentElement.scrollWidth - window.innerWidth,
  };
}

async function sondar(name, options) {
  if (SO_CLIPES) return;
  const { width, height, mobile = false, reduced = false } = options;
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  try {
    await signIn(page);
    const rotas = {};
    for (const route of ROUTES) {
      await page.goto(`${stack.origin}${route}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      // Além do maior atraso possível da cascata (200ms) + a duração (360ms).
      await page.waitForTimeout(1400);
      // A régua dura, não o relógio: espera o navegador declarar que não há mais
      // NENHUMA animação rodando. O `waitForTimeout` acima mede o que se vê; esta
      // espera mede o repouso de verdade (o painel monta o herói antes dos dados,
      // então o `h1` aparecer cedo não garante a cascata terminada).
      await page
        .waitForFunction(
          () => document.getAnimations().every((animation) => animation.playState !== 'running'),
          null,
          { timeout: 10_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(120);
      rotas[route] = await page.evaluate(restProbe);
    }
    report.sondas = { ...(report.sondas ?? {}), [name]: { ...options, rotas } };
    await save();
    const piorResidual = Math.max(...Object.values(rotas).map((r) => r.transformResidual));
    const piorOverflow = Math.max(...Object.values(rotas).map((r) => r.overflowHorizontal));
    console.log(
      `[${name}] residual máx ${piorResidual} · overflow máx ${piorOverflow}px · ` +
        `entradas por tela ${Object.values(rotas)
          .map((r) => r.elementosComEntrada)
          .join('/')}`,
    );
    for (const [route, medida] of Object.entries(rotas)) {
      if (medida.transformResidual === 0) continue;
      console.log(`  ${route}: ${medida.transformResidual} residual(is)`);
      for (const item of medida.residuais) {
        console.log(
          `    <${item.tag} class="${item.classes}"> transform=${item.transform} ` +
            `animação=${item.animationName} estado=${item.animationPlayState} rodando=[${item.rodando}]`,
        );
      }
    }
  } finally {
    await context.close();
  }
}

await save();
console.log(`\n[entrega] ${DIR}/quadros.json`);
