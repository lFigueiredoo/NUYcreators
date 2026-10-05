import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const directory = 'artifacts/vertical/motion-final';
await fs.mkdir(directory, { recursive: true });
// Visible Chromium uses the real GPU; software-only headless capture stutters.
const browser = await chromium.launch({ headless: false });
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1920,
      height = mobile ? 844 : 1080;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'no-preference',
      isMobile: mobile,
      hasTouch: mobile,
      recordVideo: {
        dir: `${directory}/video`,
        size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 810 },
      },
    });
    const page = await context.newPage();
    await page.goto(process.argv[2] || 'http://localhost:3101');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-visual-hero]')?.getAttribute('data-hero-motion-phase') ===
        'ambient',
    );
    if (!mobile) {
      await page.mouse.move(1620, 610, { steps: 20 });
      await page.waitForTimeout(1200);
      await page.mouse.move(400, 520, { steps: 20 });
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, -250);
      await page.waitForTimeout(1500);
    } else await page.waitForTimeout(3500);
    const video = page.video();
    await context.close();
    await video.saveAs(`${directory}/hero-motion-${mobile ? 'mobile' : 'desktop'}.webm`);
  }
} finally {
  await browser.close();
}
