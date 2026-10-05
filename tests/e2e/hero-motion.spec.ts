import { expect, test } from '@playwright/test';

test('hero entry settles without JavaScript errors or persistent transforms', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const hero = page.locator('[data-visual-hero]');
  await expect(hero).toHaveAttribute('data-hero-motion-phase', 'rest');
  const state = await page.evaluate(() => {
    const selectors = [
      'header',
      '[data-hero-headline]',
      '[data-hero-packshot]',
      '[data-hero-actions] a',
      '[data-hero-benefits] span',
    ];
    return selectors.map((selector) => {
      const element = document.querySelector(selector)!;
      const style = getComputedStyle(element);
      return { opacity: style.opacity, clip: style.clipPath, transform: style.transform };
    });
  });
  expect(state.every((value) => value.opacity === '1' && value.clip === 'none')).toBe(true);
  expect(state.every((value) => value.transform === 'none')).toBe(true);
  expect(errors).toEqual([]);
  await expect(hero).toHaveAttribute('data-hero-motion-phase', 'ambient');
  expect(errors).toEqual([]);
});

test('runtime reduced motion restores the approved static hero and native scroll', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-visual-hero]')).toHaveAttribute(
    'data-hero-motion-phase',
    'ambient',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-visual-hero]')).toHaveAttribute(
    'data-hero-motion-phase',
    'static',
  );
  const state = await page.evaluate(() => {
    const elements = document.querySelectorAll(
      '[data-hero-headline], [data-hero-packshot], [data-hero-benefits] span',
    );
    return {
      native: !document.documentElement.classList.contains('lenis'),
      styles: [...elements].map((element) => {
        const style = getComputedStyle(element);
        return { transform: style.transform, opacity: style.opacity, clip: style.clipPath };
      }),
      energy: getComputedStyle(document.querySelector('[data-hero-orbit-energy]')!).opacity,
    };
  });
  expect(state.native).toBe(true);
  expect(
    state.styles.every(
      (value) => value.transform === 'none' && value.opacity === '1' && value.clip === 'none',
    ),
  ).toBe(true);
  expect(state.energy).toBe('0');
  expect(errors).toEqual([]);
});

test('touch mobile has no pointer depth or scroll parallax', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Touch-only regression.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-visual-hero]')).toHaveAttribute(
    'data-hero-motion-phase',
    'rest',
  );
  await page.mouse.move(350, 500);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect
    .poll(() =>
      page
        .locator('[data-hero-packshot]')
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe('none');
  expect(
    await page
      .locator('[data-visual-hero] img')
      .evaluateAll((elements) =>
        elements.every((element) => !(element as HTMLElement).style.translate),
      ),
  ).toBe(true);
});

test('desktop depth is bounded and returns on pointer leave', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Touch has no cursor tracking.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-visual-hero]')).toHaveAttribute(
    'data-hero-motion-phase',
    'rest',
  );
  await page.mouse.move(1820, 800);
  await expect
    .poll(() =>
      page
        .locator('[data-hero-packshot]')
        .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41),
    )
    .toBeGreaterThan(1);
  const depth = await page.locator('[data-hero-packshot]').evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
  expect(Math.abs(depth.x)).toBeLessThanOrEqual(6.01);
  expect(Math.abs(depth.y)).toBeLessThanOrEqual(5.01);
  // The hero now owns the whole first viewport (100svh), so the pointer can no
  // longer leave it through a bare mouse move; a real user exits by scrolling.
  // Dispatch the same production event the pointer would raise.
  await page.evaluate(() => {
    document
      .querySelector('[data-visual-hero]')
      ?.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
  });
  await expect
    .poll(() =>
      page.locator('[data-hero-packshot]').evaluate((element) => {
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return Math.abs(matrix.m41) + Math.abs(matrix.m42);
      }),
    )
    .toBeLessThan(0.05);
});
