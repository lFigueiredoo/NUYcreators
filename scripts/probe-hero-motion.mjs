import fs from 'node:fs/promises';
import { format } from 'prettier';
import { chromium } from '@playwright/test';

const headless = process.argv.includes('--headless');
const browser = await chromium.launch({ headless });
try {
  const browserSession = await browser.newBrowserCDPSession();
  const hardware = await browserSession.send('SystemInfo.getInfo');
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'no-preference',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://localhost:3101');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-visual-hero]')?.getAttribute('data-hero-motion-phase') ===
      'ambient',
  );
  await page.waitForTimeout(1200);
  const sample = await page.evaluate(async () => {
    const intervals = [],
      longTasks = [];
    const observer = new PerformanceObserver((list) =>
      longTasks.push(...list.getEntries().map((entry) => entry.duration)),
    );
    observer.observe({ type: 'longtask', buffered: false });
    await new Promise((resolve) => {
      let previous;
      const frame = (time) => {
        if (previous !== undefined) intervals.push(time - previous);
        previous = time;
        if (intervals.length < 180) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    observer.disconnect();
    const sorted = [...intervals].sort((a, b) => a - b),
      mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    return {
      sampleCount: intervals.length,
      meanIntervalMs: mean,
      p95IntervalMs: sorted[Math.floor(sorted.length * 0.95)],
      estimatedRafHz: 1000 / mean,
      framesOver25ms: intervals.filter((value) => value > 25).length,
      longTasksMs: longTasks,
      note: 'Local Chromium requestAnimationFrame sampling with ambient motion active, after compositor warm-up. Not a cross-device guarantee or GPU frame-time trace.',
    };
  });
  await page
    .locator('[data-visual-hero]')
    .screenshot({ path: 'artifacts/vertical/motion-final/1920-ambient-hero.png' });
  await fs.writeFile(
    `artifacts/vertical/motion-final/performance-${headless ? 'software-headless' : 'hardware-desktop'}.json`,
    await format(
      JSON.stringify({
        ...sample,
        headless,
        gpu: hardware.gpu.devices,
        featureStatus: hardware.gpu.featureStatus,
        pageErrors: errors,
      }),
      { parser: 'json' },
    ),
  );
} finally {
  await browser.close();
}
