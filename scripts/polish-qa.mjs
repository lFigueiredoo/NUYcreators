/**
 * QA da rodada de polish — números, não impressões.
 *
 * Mede, em cada largura: deslocamento de layout (CLS), estouro horizontal,
 * quantos alvos de reveal ainda estão escondidos depois da varredura, se o
 * header compacta, se o FAQ abre, se o foco de teclado aparece e se sobra
 * alguma animação infinita rodando. E, com movimento reduzido, se TUDO nasce
 * visível e parado.
 *
 * Uso: node scripts/polish-qa.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch();
const report = {};

/** Observa CLS desde o primeiro paint. */
const CLS_INIT = () => {
  window.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

async function sweep(page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
  });
  await page.waitForTimeout(1900);
}

for (const [width, height, name] of [
  [1920, 1080, '1920'],
  [1440, 1000, '1440'],
  [390, 844, '390'],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  await page.addInitScript(CLS_INIT);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1600);

  const clsAfterHero = await page.evaluate(() => window.__cls);
  await sweep(page);

  const out = await page.evaluate(() => {
    const hidden = Array.from(document.querySelectorAll('[data-pl-reveal]')).filter(
      (el) => !el.hasAttribute('data-pl-visible'),
    ).length;
    const total = document.querySelectorAll('[data-pl-reveal]').length;
    return {
      hidden,
      total,
      docWidth: document.documentElement.scrollWidth,
      winWidth: innerWidth,
      docHeight: document.documentElement.scrollHeight,
      animations: document.getAnimations().length,
      running: document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => a.animationName ?? a.effect?.target?.className ?? '?'),
      cls: window.__cls,
    };
  });

  // Header compacta depois de ~96px?
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  const compacted = await page.evaluate(() => {
    const header = document.querySelector('header');
    const pill = header?.querySelector('div');
    return {
      attr: header?.hasAttribute('data-pl-scrolled') ?? null,
      paddingTop: pill ? getComputedStyle(pill).paddingTop : null,
      shadow: pill ? getComputedStyle(pill).boxShadow : null,
    };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const resting = await page.evaluate(() => {
    const header = document.querySelector('header');
    const pill = header?.querySelector('div');
    return {
      attr: header?.hasAttribute('data-pl-scrolled') ?? null,
      paddingTop: pill ? getComputedStyle(pill).paddingTop : null,
    };
  });

  // FAQ abre e o conteúdo aparece?
  const faq = await page.evaluate(async () => {
    const item = document.querySelector('details');
    if (!item) return null;
    item.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 300));
    const summary = item.querySelector('summary');
    summary?.click();
    await new Promise((r) => setTimeout(r, 500));
    const body = item.querySelector('p, div:not(:first-child)');
    const rect = body ? body.getBoundingClientRect() : null;
    const open = item.hasAttribute('open');
    const height = item.getBoundingClientRect().height;
    summary?.click();
    await new Promise((r) => setTimeout(r, 500));
    return {
      abriu: open,
      alturaAberto: Math.round(height),
      alturaFechado: Math.round(item.getBoundingClientRect().height),
      textoVisivel: rect ? Math.round(rect.height) > 0 : null,
    };
  });

  // Foco de teclado: o primeiro Tab precisa mostrar anel.
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      el: el.tagName + '.' + String(el.className).slice(0, 30),
      outline: cs.outlineStyle + ' ' + cs.outlineWidth,
    };
  });

  report[name] = {
    clsHero: +clsAfterHero.toFixed(4),
    clsTotal: +out.cls.toFixed(4),
    reveal: `${out.total - out.hidden}/${out.total}`,
    overflowX: out.docWidth - out.winWidth,
    alturaPagina: out.docHeight,
    animacoes: out.animations,
    rodando: out.running,
    headerCompacto: compacted,
    headerRepouso: resting,
    faq,
    foco: focus,
  };
  await page.close();
}

// Movimento reduzido: tudo visível, nada animando, régua inteira.
{
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.addInitScript(CLS_INIT);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  report.reduzido = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('[data-pl-reveal]'));
    // `transform: scale(.92)` computa como `matrix(0.92, 0, 0, 0.92, 0, 0)` —
    // comparar com 'none' acusaria os 45 alvos como escondidos mesmo parados.
    // O que denuncia o estado escondido é a TRANSLADA (f = var(--pl-rise)), não
    // a escala: a escala de repouso é composição de profundidade e continua
    // valendo sob movimento reduzido.
    const transladado = (t) => {
      if (t === 'none') return false;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return true;
      const [, f] = m[1].split(',').map(Number).slice(4);
      return Math.abs(f) > 0.5;
    };
    const escondidos = targets.filter((el) => {
      const cs = getComputedStyle(el);
      return (
        cs.opacity !== '1' ||
        transladado(cs.transform) ||
        cs.transitionDuration.split(',')[0] !== '0s'
      );
    });
    const line = document.querySelector('[data-pl-reveal="line"]');
    const heroGroup = document.querySelector('[class*=heroGroup]');
    return {
      alvos: targets.length,
      escondidosAoLigar: escondidos.length,
      amostra: escondidos.slice(0, 3).map((el) => ({
        cls: String(el.className).split('__').pop(),
        opacity: getComputedStyle(el).opacity,
        transform: getComputedStyle(el).transform,
      })),
      regua: line ? getComputedStyle(line).transform : null,
      profundidadeHero: heroGroup?.style.getPropertyValue('--pl-depth') || '(vazio)',
      animacoesRodando: document.getAnimations().filter((a) => a.playState === 'running').length,
    };
  });
  await page.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
