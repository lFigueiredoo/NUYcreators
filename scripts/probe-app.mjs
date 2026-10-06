/**
 * Sonda de DOM da área autenticada: mede o que está na tela, em pixels reais.
 *
 * Serve para conferir layout (larguras, alturas, sobreposição) sem depender de
 * leitura visual de captura — a mesma prática usada na landing.
 *
 *   node scripts/probe-app.mjs /app "h1, .grid > *, nav a" [largura]
 */
import { chromium } from 'playwright';
import { startStack } from '../tests/support/stack.mjs';

const [route = '/app', selectors = 'h1', width = '1920'] = process.argv.slice(2);

const stack = await startStack();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: Number(width), height: 1000 },
  ignoreHTTPSErrors: true,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  reducedMotion: 'reduce',
});
const page = await context.newPage();

await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[name="email"]', 'ana@nuy.test');
await page.fill('input[name="password"]', 'senha-de-teste-123');
await Promise.all([
  page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
await page.goto(`${stack.origin}${route}`, { waitUntil: 'load' });
await page.waitForTimeout(600);

const report = await page.evaluate((list) => {
  const output = [];
  for (const selector of list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      output.push({
        selector,
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className.slice(0, 90) : '',
        text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        display: style.display,
        fontSize: style.fontSize,
        columns: style.gridTemplateColumns,
      });
    }
  }
  return output;
}, selectors);

console.log(`${route} @${width}px`);
for (const row of report)
  console.log(
    [
      `${row.x},${row.y}`.padEnd(12),
      `${row.w}x${row.h}`.padEnd(11),
      row.tag.padEnd(7),
      (row.className || '-').padEnd(30),
      row.text.padEnd(40).slice(0, 62),
      row.columns && row.columns !== 'none' ? `cols=${row.columns} ` : '',
      row.display === 'none' ? 'DISPLAY:NONE' : '',
    ].join(' '),
  );

await browser.close();
await stack.close();
