import { expect, test } from '@playwright/test';

/**
 * Landing clean — movimento discreto (Opção 1).
 *
 * Nada de GSAP cinematográfico, parallax, partículas ou glow: o que existe é
 * um reveal de fade + translateY(8px), uma vez por elemento. Estes testes
 * descrevem esse contrato — inclusive a promessa de que sem JS (ou com
 * movimento reduzido) a página continua legível.
 */

test('o reveal entra uma vez por elemento e nunca deixa conteúdo escondido', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Medida em DPR 1, viewport desktop.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  // Abaixo da dobra o elemento ainda não foi revelado — é assim que o fade
  // existe. "Como participar" fica bem além do fold em 1440×1000.
  const before = await page.evaluate(() => {
    // O `data-pl-reveal` vive no PRÓPRIO card (não num filho): seletor composto.
    const target = document.querySelector<HTMLElement>('[class*=stepCard][data-pl-reveal]')!;
    const style = getComputedStyle(target);
    return {
      visible: target.hasAttribute('data-pl-visible'),
      opacity: style.opacity,
      transform: style.transform,
      duration: style.transitionDuration,
    };
  });
  expect(before.visible).toBe(false);
  expect(before.opacity).toBe('0');
  expect(before.transform).not.toBe('none');
  expect(parseFloat(before.duration)).toBeGreaterThan(0);

  await page.locator('#como-participar').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>('[class*=stepCard][data-pl-reveal]'),
        ).every((target) => target.hasAttribute('data-pl-visible')),
      ),
    )
    .toBe(true);

  // Nada de Lenis/GSAP de volta: o documento é o scroll nativo.
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(
    false,
  );
  expect(errors).toEqual([]);
});

test('com movimento reduzido o reveal não anima, mas o conteúdo aparece igual', async ({
  page,
}) => {
  test.skip(test.info().project.name === 'mobile', 'Medida em DPR 1, viewport desktop.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-pl-reveal]')).map(
      (target) => getComputedStyle(target).transitionDuration,
    ),
  );
  expect(durations.length).toBeGreaterThan(10);
  expect(durations.every((duration) => parseFloat(duration) === 0)).toBe(true);

  // E o conteúdo continua aparecendo: o reveal é enfeite, não pré-requisito.
  await page.locator('#como-participar').scrollIntoViewIfNeeded();
  await expect(page.locator('#pl-how-to-title')).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.getElementById('pl-how-to-title')!).opacity,
    ),
  ).toBe('1');
});

test('sem JavaScript a página inteira nasce visível', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  const hidden = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-pl-reveal]'))
      .filter((target) => getComputedStyle(target).opacity !== '1')
      .map((target) => target.className),
  );
  expect(hidden).toEqual([]);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#pl-how-to-title')).toBeVisible();
  // A âncora do header continua funcionando sem JS.
  await page.locator('header a[href="#como-participar"]').click();
  await expect(page).toHaveURL(/#como-participar$/);
  await context.close();
});
