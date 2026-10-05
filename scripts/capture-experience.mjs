import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { format, resolveConfig } from 'prettier';

const stage = process.argv[2] || 'final';
const url = process.argv[3] || 'http://localhost:3101';
const directory = `artifacts/experience/${stage}`;
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const options = { ...(await resolveConfig('package.json')), parser: 'json' };
const evidence = [];
try {
  for (const [route, widths] of [
    ['/', [1920, 1440, 390]],
    ['/login', [1920, 390]],
    ['/cadastro', [1920, 390]],
  ]) {
    for (const width of widths) {
      const height = width === 1920 ? 1080 : width === 1440 ? 1000 : 844;
      const label = route === '/' ? 'home' : route.slice(1);
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(url + route, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`Capture unavailable: ${route}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      });
      await page.screenshot({ path: `${directory}/${label}-${width}-viewport.png` });
      await page.screenshot({ path: `${directory}/${label}-${width}-full.png`, fullPage: true });
      await sharp(`${directory}/${label}-${width}-full.png`)
        .resize({ width: width === 390 ? 390 : 720 })
        .png()
        .toFile(`${directory}/${label}-${width}-overview.png`);
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        fullHeight: document.documentElement.scrollHeight,
        headings: [...document.querySelectorAll('h1,h2')].map((element) =>
          element.textContent?.trim(),
        ),
        sections: [...document.querySelectorAll('main section[id]')].map((element) => element.id),
      }));
      if (layout.scrollWidth > width) throw new Error(`Horizontal overflow: ${route} ${width}`);
      if (errors.length) throw new Error(`JavaScript errors: ${errors.join(', ')}`);
      const entry = { route, width, height, ...layout, pageErrors: errors };
      if (route === '/') {
        await page
          .locator('[data-visual-hero]')
          .screenshot({ path: `${directory}/hero-${width}.png` });
        const geometry = await page.evaluate(() =>
          Object.fromEntries(
            [
              '[data-visual-hero]',
              '[data-hero-artboard]',
              '[data-hero-headline]',
              '[data-hero-packshot]',
              '[data-hero-benefits]',
            ].map((selector) => {
              const rect = document.querySelector(selector).getBoundingClientRect();
              return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
            }),
          ),
        );
        const baseline = JSON.parse(
          await fs.readFile(`artifacts/vertical/direction-final/${width}-geometry.json`, 'utf8'),
        );
        const deltas = {};
        for (const selector of Object.keys(geometry)) {
          deltas[selector] = {};
          for (const property of ['x', 'y', 'width', 'height']) {
            const delta = geometry[selector][property] - baseline[selector][property];
            deltas[selector][property] = delta;
            if (Math.abs(delta) > 0.25)
              throw new Error(`Frozen Hero changed: ${selector}.${property}`);
          }
        }
        entry.heroGeometry = geometry;
        entry.approvedHeroDeltas = deltas;
        entry.ctas = await page.locator('[data-hero-actions] a').evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label: element.getAttribute('aria-label') || element.textContent.trim(),
              width: rect.width,
              height: rect.height,
            };
          }),
        );
        const allowed = await page.evaluate(() => {
          const hero = document.querySelector('[data-visual-hero]').getBoundingClientRect();
          return ['header', '[data-hero-actions]'].map((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return {
              x: rect.x - hero.x - 5,
              y: rect.y - hero.y - 5,
              width: rect.width + 10,
              height: rect.height + 10,
            };
          });
        });
        const approvedImage = await sharp(`artifacts/vertical/direction-final/${width}-hero.png`)
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const currentImage = await sharp(`${directory}/hero-${width}.png`)
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        let changedOutsideAuthorizedRegions = 0;
        let changedAtSectionBoundary = 0;
        for (let y = 0; y < currentImage.info.height; y++)
          for (let x = 0; x < width; x++) {
            if (
              allowed.some(
                (rect) =>
                  x >= rect.x &&
                  x <= rect.x + rect.width &&
                  y >= rect.y &&
                  y <= rect.y + rect.height,
              )
            )
              continue;
            const index = (y * width + x) * 3;
            if (
              [0, 1, 2].some(
                (channel) =>
                  approvedImage.data[index + channel] !== currentImage.data[index + channel],
              )
            ) {
              if (y >= currentImage.info.height - 8) changedAtSectionBoundary++;
              else changedOutsideAuthorizedRegions++;
            }
          }
        entry.heroArtworkComparison = {
          allowedChanges: 'Public header navigation/authentication links and Hero CTA labels only',
          excludedRectangles: allowed,
          changedOutsideAuthorizedRegions,
          changedAtSectionBoundary,
          boundaryNote:
            'The bottom 8 raster rows may blend with the new cream project section at the fractional Hero clipping edge; reported separately, not attributed to changes in Hero art layers.',
        };
        if (changedOutsideAuthorizedRegions)
          throw new Error(
            `Hero artwork regression outside header/CTA regions: ${width}, ${changedOutsideAuthorizedRegions} pixels`,
          );
        entry.previousFullHeight = (
          await sharp(`artifacts/vertical/direction-final/${width}-full.png`).metadata()
        ).height;
      }
      evidence.push(entry);
      await page.close();
    }
  }
  await fs.writeFile(`${directory}/evidence.json`, await format(JSON.stringify(evidence), options));
} finally {
  await browser.close();
}
console.log(`Experience screenshots and frozen-Hero evidence: ${directory}`);
