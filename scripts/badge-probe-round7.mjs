/**
 * §15 — probe limpo do badge "1 Issue" (R7).
 * Só leitura: abre a página num Chromium limpo (sem extensões), coleta
 * console/page errors, procura o portal do Next.js Dev Tools no DOM e
 * registra a presença de overlays fora do DOM do app.
 * Dev :3000 é do usuário — nada é clicado além do carregamento.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'artifacts/round7/badge-probe';
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'dev-3000', url: 'http://localhost:3000' },
  { name: 'prod-3102', url: 'http://localhost:3102' },
];

const browser = await chromium.launch({ args: ['--disable-extensions'] });
for (const t of targets) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
  try {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const probe = await page.evaluate(() => {
      const portal = document.querySelector('nextjs-portal');
      const devTools = document.querySelector(
        '[data-nextjs-dev-tools-button], #__next-dev-tools-indicator__, [data-next-mark]',
      );
      const badge = [...document.querySelectorAll('shadow-host, nextjs-portal *')].filter((el) =>
        /issue|error/i.test(el.textContent ?? ''),
      );
      const bodyText = document.body.innerText.slice(0, 200);
      return {
        url: location.href,
        nextjsPortal: !!portal,
        portalOpen: portal
          ? portal.shadowRoot
            ? [...portal.shadowRoot.querySelectorAll('button,aside,div')]
                .map((n) => (n.textContent ?? '').trim())
                .filter(Boolean)
                .slice(0, 8)
            : []
          : [],
        devToolsNode: !!devTools,
        badgeNodes: badge.length,
        bodyText,
        domErrorOutlines: document.querySelectorAll('[data-nextjs-error], .nextjs-toast-errors')
          .length,
      };
    });
    // shadowRoot do nextjs-portal: o badge morre dentro do shadow DOM.
    const shadow = await page.evaluate(() => {
      const portal = document.querySelector('nextjs-portal');
      if (!portal?.shadowRoot) return null;
      const walk = (root, depth = 0) => {
        const out = [];
        for (const el of root.querySelectorAll('*')) {
          if (depth > 3) break;
          if (el.shadowRoot) out.push(...walk(el.shadowRoot, depth + 1));
        }
        const txt = (root.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
        return [...out, { depth, txt }];
      };
      return walk(portal.shadowRoot);
    });
    await page.screenshot({
      path: `${OUT}/${t.name}-fold.png`,
      clip: { x: 0, y: 0, width: 480, height: 320 },
    });
    console.log(`\n=== ${t.name} (${t.url}) ===`);
    console.log(
      JSON.stringify(
        { ...probe, shadowIssues: shadow?.filter((s) => /issue|error/i.test(s.txt ?? '')) },
        null,
        2,
      ),
    );
    console.log('console:', consoleMsgs.length ? consoleMsgs : '(limpo)');
    console.log('pageErrors:', pageErrors.length ? pageErrors : '(nenhum)');
  } catch (e) {
    console.log(`\n=== ${t.name} (${t.url}) === ERRO: ${String(e).slice(0, 200)}`);
  }
  await context.close();
}
await browser.close();
