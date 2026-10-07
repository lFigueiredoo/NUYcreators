/**
 * Medidas que a rodada 2 precisa ANTES de desenhar.
 *
 * - altura de cada seção contra os limites do teste de "ritmo enxuto"
 *   (hero ≤1100, comunidade ≤900, o-que-é ≤900, como-participar ≤800, faq ≤900,
 *   cta ≤800, rodapé ≤240, página <5600): quanto sobra para rótulo e divisor;
 * - comprimento real dos traços dos ícones lucide (para o draw-in do §10 — sem
 *   esse número o `stroke-dashoffset` ou não esconde ou esconde demais);
 * - geometria da pílula do header e do palco do hero.
 *
 * Uso: node scripts/polish2-probe.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const out = await page.evaluate(() => {
  const h = (selector) => {
    const node = document.querySelector(selector);
    return node ? Math.round(node.getBoundingClientRect().height) : null;
  };
  const limits = {
    hero: 1100,
    comunidade: 900,
    'o-que-e': 900,
    'como-participar': 800,
    faq: 900,
    'cta-final': 800,
    footer: 240,
  };
  const alturas = {};
  for (const [id, limite] of Object.entries(limits)) {
    const valor = id === 'hero' ? h('[aria-labelledby="pl-hero-title"]') : h(`#${id}`);
    alturas[id] = { atual: valor, limite, sobra: valor === null ? null : limite - valor };
  }
  alturas.pagina = { atual: document.documentElement.scrollHeight, limite: 5600 };

  // Traços dos ícones de benefício: comprimento de cada filho do svg.
  const icons = Array.from(document.querySelectorAll('[class*=benefitIcon]'));
  const tracos = icons.map((svg) =>
    Array.from(svg.children).map((child) => {
      try {
        return child.tagName === 'circle' || child.tagName === 'rect' || child.tagName === 'line'
          ? Math.round(child.getTotalLength?.() ?? -1)
          : Math.round(child.getTotalLength());
      } catch {
        return -1;
      }
    }),
  );

  const pill = document.querySelector('[class*=headerPill]');
  const heroStage = document.querySelector('[class*=heroStage]');
  const cta = document.querySelector('#cta-final');
  return {
    alturas,
    tracosIcones: tracos,
    pilula: pill ? { altura: Math.round(pill.getBoundingClientRect().height), sombra: getComputedStyle(pill).boxShadow } : null,
    heroStage: heroStage ? { altura: Math.round(heroStage.getBoundingClientRect().height) } : null,
    cta: cta ? { altura: Math.round(cta.getBoundingClientRect().height), position: getComputedStyle(cta).position } : null,
    passoCard: Array.from(document.querySelectorAll('[class*=stepCard]')).map((c) => Math.round(c.getBoundingClientRect().height)),
    beneficios: Array.from(document.querySelectorAll('[class*=benefitItem]')).map((b) => Math.round(b.getBoundingClientRect().height)),
  };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
