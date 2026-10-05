import { chromium } from '@playwright/test';

/**
 * Reproduces the qafinal fold capture at 390 and contrasts it with a capture
 * taken after the hero entry timeline settles (data-hero-motion-phase 'rest' ->
 * 'ambient'), plus per-span diagnostics for every [data-hero-benefits] item.
 * Decide: garbled strip = mid-flight capture artifact, or a real paint bug.
 */

const base = process.argv[2] || 'http://localhost:3200';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Pass 1 — mirror the qafinal capture: shoot immediately, before settling.
  await page.goto(`${base}/`);
  await page.screenshot({ path: 'artifacts/qafinal/recheck/fold-390-immediate.png' });

  // Pass 2 — wait until the entry timeline reports its resting phase.
  await page.waitForFunction(
    () =>
      ['rest', 'ambient'].includes(
        document.querySelector('[data-visual-hero]')?.getAttribute('data-hero-motion-phase') ?? '',
      ),
    { timeout: 15000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'artifacts/qafinal/recheck/fold-390-settled.png' });
  await page
    .locator('[data-hero-benefits]')
    .screenshot({ path: 'artifacts/qafinal/recheck/strip-390-settled.png' });

  const diagnostics = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('[data-hero-benefits] > span'));
    return {
      phase: document.querySelector('[data-visual-hero]')?.getAttribute('data-hero-motion-phase'),
      fontsStatus: document.fonts.status,
      spans: spans.map((span) => {
        const box = span.getBoundingClientRect();
        return {
          text: span.textContent?.trim(),
          opacity: getComputedStyle(span).opacity,
          transform: getComputedStyle(span).transform,
          clipPath: getComputedStyle(span).clipPath || '',
          visibility: getComputedStyle(span).visibility,
          inlineSize: Math.round(box.width),
          blockSize: Math.round(box.height),
        };
      }),
    };
  });
  console.log(JSON.stringify({ ...diagnostics, pageErrors: errors }, null, 2));
} finally {
  await browser.close();
}
