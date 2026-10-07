/**
 * Os portões da rodada 2 que ainda não estavam medidos.
 *
 *   §29  página PARADA: dois segundos sem rolar, sem mouse e sem clique, nada
 *        pode estar animando;
 *   §30  movimento reduzido: sem linha de progresso, sem parallax, sem máscara
 *        — e nada escondido;
 *   §23  empilhado: parallax e luz reativa desligados.
 *
 * Uso: node scripts/polish2-gates.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch();
const report = {};

/** O estado de repouso da página: nenhuma animação rodando, dois segundos. */
async function repouso(page) {
  await page.waitForTimeout(2000);
  return page.evaluate(() => {
    const rodando = document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => a.animationName ?? a.effect?.target?.className ?? '?');
    const cta = document.querySelector('#cta-final');
    const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
    return {
      rodando,
      depthHero: hero?.style.getPropertyValue('--pl-depth') || '(vazio)',
      depthCta: cta?.style.getPropertyValue('--pl-depth') || '(vazio)',
      profundidade: getComputedStyle(document.querySelector('[class*=heroGroup]')).transform,
    };
  });
}

// --- desktop -----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  report.desktopRepouso = await repouso(page);

  // Rolagem parada no meio da página, sem mouse: a profundidade assenta e para.
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(1200);
  const meio = await page.evaluate(() => {
    const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
    return {
      depthHero: hero.style.getPropertyValue('--pl-depth'),
      frascos: getComputedStyle(document.querySelector('[class*=heroGroup]')).transform,
    };
  });
  await page.waitForTimeout(1800);
  const depois = await page.evaluate(() => {
    const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
    return {
      depthHero: hero.style.getPropertyValue('--pl-depth'),
      frascos: getComputedStyle(document.querySelector('[class*=heroGroup]')).transform,
      rodando: document.getAnimations().filter((a) => a.playState === 'running').length,
    };
  });
  report.desktopParadoNoMeio = { ...meio, depoisDe2s: depois };
  await page.close();
}

// --- movimento reduzido ------------------------------------------------------
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(1200);
  report.reduzido = await page.evaluate(() => {
    const linha = document.querySelector('[class*=headerProgress]');
    const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
    const titulo = document.querySelector('[class*=headlineText]');
    return {
      linhaDeProgresso: linha ? getComputedStyle(linha).display : null,
      depthHero: hero?.style.getPropertyValue('--pl-depth') || '(vazio)',
      depthCta: document.querySelector('#cta-final')?.style.getPropertyValue('--pl-depth') || '(vazio)',
      tituloOpacity: getComputedStyle(titulo).opacity,
      escondidos: Array.from(document.querySelectorAll('[data-pl-reveal]')).filter(
        (el) => getComputedStyle(el).opacity !== '1',
      ).length,
    };
  });
  await page.close();
}

// --- empilhado ---------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const row = document.querySelector('[class*=progressRow]');
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - innerHeight / 2);
    await new Promise((r) => setTimeout(r, 800));
  });
  await page.waitForTimeout(800);
  report.empilhado = await page.evaluate(() => {
    const hero = document.querySelector('[data-pl-depth]:not([data-pl-depth="view"])');
    return {
      depthHero: hero?.style.getPropertyValue('--pl-depth') || '(vazio)',
      depthCta: document.querySelector('#cta-final')?.style.getPropertyValue('--pl-depth') || '(vazio)',
      linhaDeProgresso: getComputedStyle(document.querySelector('[class*=headerProgress]')).opacity,
    };
  });
  await page.close();
}

console.log(JSON.stringify(report, null, 1));
await browser.close();
