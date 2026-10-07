/**
 * Verificação da rodada 2 — o que só se sabe olhando o DOM rodando.
 *
 * Confere, na ordem do brief: linha de progresso do header (comprimento e
 * acender), planos do hero nos primeiros 500px, cascata dos benefícios, os dois
 * divisores, a luz do CTA e as alturas de seção contra os limites do teste de
 * ritmo.
 *
 * A etapa acesa saiu no fechamento da rodada 2 — não há mais `[data-pl-focus]`
 * nem `[data-pl-active]` para medir.
 *
 * Uso: node scripts/polish2-verify.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);

const report = {};

report.estrutura = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent,
  linhas: document.querySelectorAll('[class*=headlineLine]').length,
  textos: document.querySelectorAll('[class*=headlineText]').length,
  rotulos: Array.from(document.querySelectorAll('[class*=sectionLabel]')).map((n) =>
    n.textContent.trim(),
  ),
  titulos: Array.from(document.querySelectorAll('#o-que-e h2, #faq h2, #cta-final h2')).map((n) =>
    n.className.includes('sectionTitle'),
  ),
  divisores: document.querySelectorAll('[class*=divider]').length,
  progresso: !!document.querySelector('[class*=headerProgress]'),
  luzCta: document.querySelector('#cta-final [class*=ctaGlow]')?.className ?? null,
}));

// Header no topo: linha existe, mas não se vê.
report.headerTopo = await page.evaluate(() => {
  const line = document.querySelector('[class*=headerProgress]');
  const cs = line ? getComputedStyle(line) : null;
  return {
    opacity: cs?.opacity ?? null,
    scaleX: cs?.transform ?? null,
    progress: document.querySelector('header')?.style.getPropertyValue('--pl-progress'),
  };
});

await page.evaluate(() => window.scrollTo(0, 350));
await page.waitForTimeout(250);
report.header350 = await page.evaluate(() => {
  const line = document.querySelector('[class*=headerProgress]');
  return {
    opacity: getComputedStyle(line).opacity,
    progress: document.querySelector('header')?.style.getPropertyValue('--pl-progress'),
    depthHero: document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])')?.style.getPropertyValue('--pl-depth'),
  };
});

// 700px: a linha está inteira.
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(250);
report.header700 = await page.evaluate(() => ({
  opacity: getComputedStyle(document.querySelector('[class*=headerProgress]')).opacity,
}));

// Planos do hero: cada um com o seu deslocamento.
report.planos = await page.evaluate(async () => {
  const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
  const read = () => ({
    depth: hero.style.getPropertyValue('--pl-depth'),
    respiro: getComputedStyle(hero, '::after').transform,
    luz: getComputedStyle(document.querySelector('[class*=heroLightField] > *')).transform,
    frascos: getComputedStyle(document.querySelector('[class*=heroGroup]')).transform,
  });
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
  const zero = read();
  window.scrollTo(0, 500);
  await new Promise((r) => setTimeout(r, 400));
  const fim = read();
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 300));
  return { zero, fim };
});

// Cascata dos benefícios: quem entra primeiro e com que atraso.
report.beneficios = await page.evaluate(() => {
  const itens = Array.from(document.querySelectorAll('[class*=benefitItem]'));
  return itens.map((item) => ({
    classe: item.className.split(' ')[0].length > 0,
    variante: item.getAttribute('data-pl-reveal'),
    delay: item.style.getPropertyValue('--pl-delay'),
    icon: item.querySelector('[class*=benefitIcon]')?.getAttribute('data-pl-index') ?? null,
    titulo: item.querySelector('[class*=benefitTitle]')?.getAttribute('data-pl-index') ?? null,
    texto: item.querySelector('[class*=benefitText]')?.getAttribute('data-pl-index') ?? null,
  }));
});

// A fileira dos cinco passos no meio da tela: os cinco iguais, cascata só.
await page.evaluate(() => {
  const row = document.querySelector('[class*=progressRow]');
  const y = row.getBoundingClientRect().top + window.scrollY - (window.innerHeight - row.offsetHeight) / 2;
  window.scrollTo(0, y);
});
await page.waitForTimeout(500);
report.passos = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[class*=stepCard]'));
  const iguais = (prop) => new Set(cards.map((c) => getComputedStyle(c)[prop])).size;
  const numeros = cards.map((c) => c.querySelector('[class*=stepNumber]'));
  return {
    quantos: cards.length,
    ordem: cards.map((c) => c.querySelector('[class*=stepNumber]')?.textContent?.trim()),
    indices: cards.map((c) => c.getAttribute('data-pl-index')),
    bordasDistintas: iguais('borderColor'),
    fundosDistintos: iguais('backgroundColor'),
    numeroOpacidades: Array.from(new Set(numeros.map((n) => getComputedStyle(n).opacity))),
    numeroEscalas: Array.from(new Set(numeros.map((n) => getComputedStyle(n).transform))),
    luzCta: document.querySelector('#cta-final')?.style.getPropertyValue('--pl-depth') ?? '(vazio)',
  };
});

// Alturas contra o orçamento do teste de ritmo.
report.alturas = await page.evaluate(() => {
  const limits = { hero: 1100, comunidade: 900, 'o-que-e': 900, 'como-participar': 800, faq: 900, 'cta-final': 800, footer: 240 };
  const out = {};
  for (const [id, limite] of Object.entries(limits)) {
    const node =
      id === 'hero'
        ? document.querySelector('[aria-labelledby="pl-hero-title"]')
        : id === 'footer'
          ? document.querySelector('footer')
          : document.querySelector(`#${id}`);
    const valor = node ? Math.round(node.getBoundingClientRect().height) : null;
    out[id] = `${valor}/${limite}`;
  }
  out.pagina = `${document.documentElement.scrollHeight}/5600`;
  out.overflowX = document.documentElement.scrollWidth - window.innerWidth;
  return out;
});

console.log(JSON.stringify(report, null, 1));
await browser.close();
