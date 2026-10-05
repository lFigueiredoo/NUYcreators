import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { format } from 'prettier';

const url = process.argv[2] || 'http://localhost:3101';
const directory = 'artifacts/vertical/motion-final';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 1000],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'no-preference',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error('Hero indisponível.');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-visual-hero]')?.getAttribute('data-hero-motion-phase') ===
        'rest',
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    // Match the approved small-screen text rasterization capture pipeline.
    if (width === 390) {
      await page.screenshot({ path: `${directory}/${width}-rest-pre-viewport.png` });
      await page.screenshot({ path: `${directory}/${width}-rest-full.png`, fullPage: true });
    }
    await page
      .locator('[data-visual-hero]')
      .screenshot({ path: `${directory}/${width}-rest-hero.png` });
    await page.screenshot({ path: `${directory}/${width}-rest-viewport.png` });
    const geometry = await page.evaluate(() =>
      Object.fromEntries(
        [
          '[data-visual-hero]',
          '[data-hero-artboard]',
          '[data-hero-headline]',
          '[data-hero-packshot]',
          '[data-hero-benefits]',
        ].map((selector) => {
          const element = document.querySelector(selector),
            r = element.getBoundingClientRect();
          return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }];
        }),
      ),
    );
    if (
      (await page.locator('[data-visual-hero]').getAttribute('data-hero-motion-phase')) !== 'rest'
    )
      throw new Error('Capture exceeded the true resting window; no artificial pause used.');
    await fs.writeFile(
      `${directory}/${width}-rest-geometry.json`,
      await format(JSON.stringify(geometry), { parser: 'json' }),
    );
    const approved = JSON.parse(
      await fs.readFile(`artifacts/vertical/direction-final/${width}-geometry.json`, 'utf8'),
    );
    for (const selector of Object.keys(geometry))
      for (const key of ['x', 'y', 'width', 'height'])
        if (Math.abs(geometry[selector][key] - approved[selector][key]) > 0.25)
          throw new Error(`Resting geometry regression: ${selector}.${key}`);
    await page.close();
    const a = await sharp(`artifacts/vertical/direction-final/${width}-hero.png`)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const b = await sharp(`${directory}/${width}-rest-hero.png`)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (a.info.width !== b.info.width || a.info.height !== b.info.height)
      throw new Error('Resting image dimensions changed.');
    const diff = Buffer.alloc(a.data.length);
    let changed = 0,
      total = 0,
      max = 0;
    for (let i = 0; i < diff.length; i++) {
      diff[i] = Math.abs(a.data[i] - b.data[i]);
      total += diff[i];
      max = Math.max(max, diff[i]);
      if (
        i % 3 === 0 &&
        (a.data[i] !== b.data[i] ||
          a.data[i + 1] !== b.data[i + 1] ||
          a.data[i + 2] !== b.data[i + 2])
      )
        changed++;
    }
    await sharp(diff, { raw: { width: a.info.width, height: a.info.height, channels: 3 } })
      .png()
      .toFile(`${directory}/${width}-rest-diff.png`);
    await sharp({
      create: {
        width: a.info.width * 2,
        height: a.info.height,
        channels: 3,
        background: '#040f26',
      },
    })
      .composite([
        { input: `artifacts/vertical/direction-final/${width}-hero.png`, left: 0, top: 0 },
        { input: `${directory}/${width}-rest-hero.png`, left: a.info.width, top: 0 },
      ])
      .png()
      .toFile(`${directory}/${width}-approved-vs-animated-rest.png`);
    await fs.writeFile(
      `${directory}/${width}-comparison.json`,
      await format(
        JSON.stringify({
          comparison:
            'Approved static hero vs normal-motion entry completed, before ambient starts; no animation disabled or artificially paused.',
          width: a.info.width,
          height: a.info.height,
          changedPixels: changed,
          changedPercent: (100 * changed) / (a.info.width * a.info.height),
          meanAbsoluteRGBDifference: total / diff.length,
          maxChannelDifference: max,
          pageErrors: errors,
        }),
        { parser: 'json' },
      ),
    );
    const staticPage = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'reduce',
      javaScriptEnabled: false,
    });
    await staticPage.goto(url, { waitUntil: 'networkidle' });
    if (width === 390) {
      await staticPage.screenshot({ path: `${directory}/${width}-no-js-viewport.png` });
      await staticPage.screenshot({ path: `${directory}/${width}-no-js-full.png`, fullPage: true });
    }
    await staticPage
      .locator('[data-visual-hero]')
      .screenshot({ path: `${directory}/${width}-current-no-js.png` });
    await staticPage.close();
    const current = await sharp(`${directory}/${width}-current-no-js.png`)
      .removeAlpha()
      .raw()
      .toBuffer();
    await fs.writeFile(
      `${directory}/${width}-no-js-vs-rest.json`,
      await format(
        JSON.stringify({
          identical: current.equals(b.data),
          note: 'Current no-JS static HTML/CSS versus normal-motion resting frame; same browser and viewport.',
        }),
        { parser: 'json' },
      ),
    );
    if (!current.equals(b.data)) throw new Error('Animated rest differs from current no-JS base.');
    if (changed) throw new Error('Animated rest differs from the approved static screenshot.');
    if (errors.length) throw new Error('JavaScript errors during motion capture.');
  }
} finally {
  await browser.close();
}
console.log(`True resting-state evidence: ${directory}`);
