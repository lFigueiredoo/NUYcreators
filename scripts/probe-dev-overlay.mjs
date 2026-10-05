import { chromium } from '@playwright/test';

/**
 * Reads the Next.js dev overlay (nextjs-portal custom element, shadow DOM) on a
 * running dev server and reports the issue count plus each issue's text.
 * Usage: node scripts/probe-dev-overlay.mjs [base url] [out dir]
 */

const base = process.argv[2] || 'http://localhost:3000';
const outDir = process.argv[3] || 'artifacts/issues';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: `${outDir}/overlay-1440.png`,
    clip: { x: 960, y: 560, width: 480, height: 340 },
  });

  const overlay = await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal');
    const root = portal?.shadowRoot;
    const read = (element) => (element?.textContent ?? '').trim();
    // The build/activity indicator lives in its own container; count badges.
    const badge =
      read(root?.querySelector('[data-issues-count]')) ||
      read(root?.querySelector('.build-icons-wrapper'));
    const texts = Array.from(root?.querySelectorAll('button, [data-nextjs-dev-tools-button]') ?? [])
      .map((el) => read(el))
      .filter(Boolean);
    return {
      hasPortal: Boolean(portal),
      badge,
      texts,
      html: (root?.innerHTML ?? '').slice(0, 4000),
    };
  });
  console.log(JSON.stringify({ overlay, pageErrors: errors, consoleErrors }, null, 2));
} finally {
  await browser.close();
}
