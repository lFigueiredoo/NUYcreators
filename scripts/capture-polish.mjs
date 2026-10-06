import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] ?? 'after';
const base = process.env.NUY_CAPTURE_URL ?? 'http://localhost:3000';
const out = `artifacts/visual-polish/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const audit = [];
for (const [width, dpr] of [
  [1920, 1],
  [1440, 2],
  [1024, 1],
  [768, 1],
  [390, 3],
  [375, 1],
]) {
  const page = await browser.newPage({
    viewport: { width, height: 1080 },
    deviceScaleFactor: dpr,
    reducedMotion: 'reduce',
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of document.images) img.loading = 'eager';
    for (const section of document.querySelectorAll('main section')) {
      section.scrollIntoView();
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  audit.push(
    await page.evaluate(async () => ({
      width: innerWidth,
      dpr: devicePixelRatio,
      overflow: document.documentElement.scrollWidth > innerWidth,
      clippedText: [...document.querySelectorAll('main h1, main h2, main h3, main p, main li')]
        .filter(
          (el) =>
            el.clientHeight &&
            el.scrollHeight > el.clientHeight + 2 &&
            /hidden|clip/.test(getComputedStyle(el).overflowY),
        )
        .map((el) => el.textContent),
      images: await Promise.all(
        [...document.querySelectorAll('main img')].map(async (img) => {
          const bitmap = await createImageBitmap(await (await fetch(img.currentSrc)).blob());
          const result = {
            src: img.currentSrc,
            sizes: img.sizes,
            cssWidth: img.width,
            cssHeight: img.height,
            bitmapWidth: bitmap.width,
            bitmapHeight: bitmap.height,
          };
          bitmap.close();
          return result;
        }),
      ),
    })),
  );
  if ([1920, 390].includes(width)) {
    for (const [name, selector] of Object.entries({
      hero: '[data-visual-hero]',
      projeto: '#projeto',
      jornada: '#niveis',
      experiencias: '#experiencias',
      cta: '#cta-final',
    })) {
      await page
        .locator(selector)
        .screenshot({ path: `${out}/${name}-${width}.png`, scale: 'css' });
    }
    await page.locator('#niveis').scrollIntoViewIfNeeded();
    const box = await page.locator('#experiencias').boundingBox();
    await page.screenshot({
      path: `${out}/transition-${width}.png`,
      fullPage: true,
      scale: 'css',
      clip: {
        x: 0,
        y: Math.max(0, box.y + (await page.evaluate(() => scrollY)) - 160),
        width,
        height: 320,
      },
    });
    await page.screenshot({ path: `${out}/full-${width}.png`, fullPage: true, scale: 'css' });
  }
  await page.close();
}
await writeFile(`${out}/audit.json`, JSON.stringify(audit, null, 2));
await browser.close();
console.log(
  audit.map(({ width, dpr, overflow, clippedText }) => ({ width, dpr, overflow, clippedText })),
);
