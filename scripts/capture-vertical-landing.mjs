import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { format } from 'prettier';

const stage = process.argv[2] || 'final';
const url = process.argv[3] || 'http://localhost:3000';
const directory = `artifacts/vertical/${stage}`;
await fs.mkdir(directory, { recursive: true });
const reference = 'artifacts/visual/hero-reference.png';
await fs.copyFile(reference, 'artifacts/vertical/hero-reference.png');
const browser = await chromium.launch();
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 1000],
    ...(stage === 'hero-first' ? [] : [[390, 844]]),
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error('Landing indisponível; captura recusada.');
    await page.evaluate(() => document.fonts.ready);
    const ancestors = await page.evaluate(() => {
      const result = [];
      let element = document.querySelector('[data-visual-hero]');
      while (element) {
        const style = getComputedStyle(element),
          rect = element.getBoundingClientRect();
        result.push({
          tag: element.tagName,
          className: element.className,
          x: rect.x,
          width: rect.width,
          height: rect.height,
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          gridColumn: style.gridColumn,
          widthCSS: style.width,
          maxWidth: style.maxWidth,
          flexBasis: style.flexBasis,
          aspectRatio: style.aspectRatio,
          overflow: style.overflow,
          padding: style.padding,
          border: style.border,
          borderRadius: style.borderRadius,
          siblings: Array.from(element.parentElement?.children || [])
            .filter((sibling) => sibling !== element)
            .map((sibling) => ({
              tag: sibling.tagName,
              className: sibling.className,
              x: sibling.getBoundingClientRect().x,
              y: sibling.getBoundingClientRect().y,
              width: sibling.getBoundingClientRect().width,
              height: sibling.getBoundingClientRect().height,
            })),
        });
        element = element.parentElement;
      }
      return result;
    });
    await fs.writeFile(
      `${directory}/${width}-ancestors.json`,
      await format(JSON.stringify(ancestors), { parser: 'json' }),
    );
    const heroBox = ancestors[0];
    if (
      width > 760 &&
      (heroBox.width < (width === 1920 ? 1850 : 1380) ||
        heroBox.height < (width === 1920 ? 900 : 850))
    )
      throw new Error('Hero abaixo dos critérios geométricos: overlay recusado.');
    if (width === 390 && heroBox.width !== 390) throw new Error('Regressão de largura mobile.');
    await page.screenshot({ path: `${directory}/${width}-viewport.png` });
    await page.screenshot({ path: `${directory}/${width}-full.png`, fullPage: true });
    await page.locator('[data-visual-hero]').screenshot({ path: `${directory}/${width}-hero.png` });
    const geometry = await page.evaluate(() =>
      Object.fromEntries(
        [
          '[data-visual-hero]',
          '[data-hero-artboard]',
          '[data-hero-headline]',
          '[data-hero-packshot]',
          '[data-hero-benefits]',
          'header',
          '#comunidade',
          '#como-funciona',
          '#desafio',
          '#recompensas',
          '#niveis',
          '#ranking',
          '#conteudos',
        ].map((selector) => {
          const e = document.querySelector(selector);
          if (!e) return [selector, null];
          const r = e.getBoundingClientRect();
          return [
            selector,
            { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height },
          ];
        }),
      ),
    );
    await fs.writeFile(
      `${directory}/${width}-geometry.json`,
      await format(JSON.stringify(geometry), { parser: 'json' }),
    );
    if (stage.startsWith('direction-')) {
      const baseline = JSON.parse(
        await fs.readFile(`artifacts/vertical/artboard-final/${width}-geometry.json`, 'utf8'),
      );
      const deltas = {};
      for (const selector of [
        '[data-visual-hero]',
        '[data-hero-artboard]',
        '[data-hero-headline]',
        '[data-hero-packshot]',
        '[data-hero-benefits]',
      ]) {
        deltas[selector] = Object.fromEntries(
          ['x', 'y', 'width', 'height'].map((key) => [
            key,
            geometry[selector][key] - baseline[selector][key],
          ]),
        );
        if (Object.values(deltas[selector]).some((delta) => Math.abs(delta) > 0.25))
          throw new Error(`Approved geometry changed: ${selector}`);
      }
      await fs.writeFile(
        `${directory}/${width}-geometry-freeze.json`,
        await format(JSON.stringify(deltas), { parser: 'json' }),
      );
    }
    if (width > 760) {
      const options = { width: 1920, height: 1080, fit: 'contain', background: '#040f26' };
      const a = await sharp(reference).resize(options).removeAlpha().raw().toBuffer();
      const b = await sharp(`${directory}/${width}-hero.png`)
        .resize(options)
        .removeAlpha()
        .raw()
        .toBuffer();
      const overlay = Buffer.alloc(a.length),
        diff = Buffer.alloc(a.length);
      for (let i = 0; i < a.length; i++) {
        overlay[i] = Math.round((a[i] + b[i]) / 2);
        diff[i] = Math.abs(a[i] - b[i]);
      }
      const raw = { width: 1920, height: 1080, channels: 3 };
      await sharp(a, { raw }).png().toFile(`${directory}/${width}-reference-normalized.png`);
      await sharp(b, { raw }).png().toFile(`${directory}/${width}-implementation-normalized.png`);
      await sharp(overlay, { raw }).png().toFile(`${directory}/${width}-hero-overlay.png`);
      await sharp(diff, { raw }).png().toFile(`${directory}/${width}-hero-diff.png`);
      await sharp({ create: { width: 3840, height: 1080, channels: 3, background: '#040f26' } })
        .composite([
          { input: await sharp(a, { raw }).png().toBuffer(), left: 0, top: 0 },
          { input: await sharp(b, { raw }).png().toBuffer(), left: 1920, top: 0 },
        ])
        .png()
        .toFile(`${directory}/${width}-hero-comparison.png`);
      if (width === 1920) {
        await fs.copyFile(
          `${directory}/${width}-reference-normalized.png`,
          `${directory}/hero-reference-normalized-1920.png`,
        );
        await fs.copyFile(
          `${directory}/${width}-hero-comparison.png`,
          `${directory}/hero-reference-vs-final.png`,
        );
        await fs.copyFile(
          `${directory}/${width}-hero-overlay.png`,
          `${directory}/hero-overlay-50.png`,
        );
        const left = await sharp(a, { raw }).blur(32).png().toBuffer();
        const right = await sharp(b, { raw }).blur(32).png().toBuffer();
        await fs.writeFile(`${directory}/blur-reference.png`, left);
        await fs.writeFile(`${directory}/blur-implementation.png`, right);
        await fs.copyFile(
          `${directory}/${width}-reference-normalized.png`,
          `${directory}/reference-1920.png`,
        );
        await fs.copyFile(
          `${directory}/${width}-implementation-normalized.png`,
          `${directory}/implementation-1920.png`,
        );
        await fs.copyFile(`${directory}/hero-overlay-50.png`, `${directory}/overlay-50.png`);
        const grayReference = await sharp(a, { raw }).grayscale().png().toBuffer();
        const grayImplementation = await sharp(b, { raw }).grayscale().png().toBuffer();
        await fs.writeFile(`${directory}/hero-reference-grayscale.png`, grayReference);
        await fs.writeFile(`${directory}/hero-final-grayscale.png`, grayImplementation);
        await sharp({ create: { width: 3840, height: 1080, channels: 3, background: '#040f26' } })
          .composite([
            { input: grayReference, left: 0, top: 0 },
            { input: grayImplementation, left: 1920, top: 0 },
          ])
          .png()
          .toFile(`${directory}/hero-grayscale-comparison.png`);
        const luminanceAreas = {
          left: { left: 0, top: 0, width: 640, height: 1080 },
          center: { left: 640, top: 0, width: 640, height: 1080 },
          right: { left: 1280, top: 0, width: 640, height: 1080 },
          base: { left: 0, top: 780, width: 1920, height: 300 },
        };
        const luminance = async (pixels, region) => {
          const data = await sharp(pixels, { raw }).extract(region).raw().toBuffer();
          let linearSum = 0,
            encodedSum = 0;
          const linear = (c) => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          for (let i = 0; i < data.length; i += 3) {
            linearSum +=
              0.2126 * linear(data[i]) +
              0.7152 * linear(data[i + 1]) +
              0.0722 * linear(data[i + 2]);
            encodedSum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          }
          return {
            linearMean: linearSum / (data.length / 3),
            encodedMean255: encodedSum / (data.length / 3),
          };
        };
        const luminanceResults = {};
        for (const [name, region] of Object.entries(luminanceAreas))
          luminanceResults[name] = {
            region,
            reference: await luminance(a, region),
            implementation: await luminance(b, region),
          };
        await fs.writeFile(
          `${directory}/luminance-regions.json`,
          await format(
            JSON.stringify({
              method:
                'Mean Rec.709 luminance; linear sRGB and encoded 0–255, normalized full frames including registration margins; regions overlap at base.',
              regions: luminanceResults,
            }),
            { parser: 'json' },
          ),
        );
        const quarter = Buffer.alloc(a.length);
        for (let i = 0; i < a.length; i++) quarter[i] = Math.round(a[i] * 0.25 + b[i] * 0.75);
        await sharp(quarter, { raw }).png().toFile(`${directory}/overlay-25.png`);
        const palette = async (pixels) => {
          const data = await sharp(pixels, { raw }).resize(320, 180).raw().toBuffer();
          const histogram = new Map();
          for (let i = 0; i < data.length; i += 3) {
            const rgb = [data[i], data[i + 1], data[i + 2]].map(
              (c) => Math.floor(c / 32) * 32 + 16,
            );
            const key = rgb.join(',');
            histogram.set(key, (histogram.get(key) || 0) + 1);
          }
          return [...histogram.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([rgb, count]) => ({
              rgb: rgb.split(',').map(Number),
              percent: (count / (data.length / 3)) * 100,
            }));
        };
        await fs.writeFile(
          `${directory}/color-histogram.json`,
          await format(
            JSON.stringify({
              method:
                'RGB bins of 32, normalized frames sampled at 320×180; includes registration navy',
              reference: await palette(a),
              implementation: await palette(b),
            }),
            { parser: 'json' },
          ),
        );
        await fs.copyFile(
          `${directory}/color-histogram.json`,
          `${directory}/color-histogram-final.json`,
        );
        const referenceBoxes = {
          headline: { x: 43 / 744, y: 106 / 410, width: 390 / 744, height: 82 / 410 },
          packshot: { x: 426 / 744, y: 56 / 410, width: 316 / 744, height: 354 / 410 },
          benefits: { x: 40 / 744, y: 378 / 410, width: 620 / 744, height: 22 / 410 },
        };
        const board = geometry['[data-hero-artboard]'];
        const measured = {};
        for (const [name, selector] of [
          ['headline', '[data-hero-headline]'],
          ['packshot', '[data-hero-packshot]'],
          ['benefits', '[data-hero-benefits]'],
        ]) {
          const box = geometry[selector];
          measured[name] = {
            x: (box.x - board.x) / board.width,
            y: (box.y - board.y) / board.height,
            width: box.width / board.width,
            height: box.height / board.height,
          };
        }
        await fs.writeFile(
          `${directory}/regional-proportions.json`,
          await format(
            JSON.stringify({
              referenceMeasuredApproximate: referenceBoxes,
              implementation: measured,
              note: 'Reference headline differs in text; packshot bbox is the modular artwork container, not an opaque-pixel segmentation.',
            }),
            { parser: 'json' },
          ),
        );
        await sharp({ create: { width: 3840, height: 1080, channels: 3, background: '#040f26' } })
          .composite([
            { input: left, left: 0, top: 0 },
            { input: right, left: 1920, top: 0 },
          ])
          .png()
          .toFile(`${directory}/hero-blur-comparison.png`);
        const regions = {
          header: { left: 0, top: 0, width: 1920, height: 170 },
          copy: { left: 80, top: 180, width: 1000, height: 560 },
          headline: { left: 80, top: 220, width: 1050, height: 320 },
          packshot: { left: 1070, top: 150, width: 850, height: 820 },
          flowers: { left: 830, top: 480, width: 1090, height: 490 },
          light: { left: 1000, top: 20, width: 920, height: 540 },
          cta: { left: 80, top: 650, width: 900, height: 220 },
          benefits: { left: 0, top: 960, width: 1920, height: 120 },
        };
        await fs.writeFile(
          `${directory}/regions.json`,
          await format(JSON.stringify(regions), { parser: 'json' }),
        );
        for (const [name, region] of Object.entries(regions)) {
          const l = await sharp(a, { raw }).extract(region).png().toBuffer();
          const r = await sharp(b, { raw }).extract(region).png().toBuffer();
          await sharp({
            create: {
              width: region.width * 2,
              height: region.height,
              channels: 3,
              background: '#040f26',
            },
          })
            .composite([
              { input: l, left: 0, top: 0 },
              { input: r, left: region.width, top: 0 },
            ])
            .png()
            .toFile(`${directory}/region-${name}-comparison.png`);
        }
      }
    }
    await fs.copyFile(`${directory}/${width}-viewport.png`, `${directory}/hero-final-${width}.png`);
    await fs.copyFile(
      `${directory}/${width}-geometry.json`,
      `${directory}/geometry-final-${width}.json`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  `Captured ${directory}; geometric target: hero-reference only, not presentation board.`,
);
