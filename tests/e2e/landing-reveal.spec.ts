import { expect, test } from '@playwright/test';

/**
 * Proposta C — movimento discreto da landing.
 *
 * O design anterior (GSAP + Lenis, órbita, parallax) foi aposentado: o que
 * existe agora é um reveal de fade + translateY, uma vez por elemento, e nada
 * mais. Estes testes descrevem exatamente esse contrato — inclusive a promessa
 * de que sem JS (ou com movimento reduzido) a página continua legível.
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
  // existe. O desafio está bem além do fold em 1440×1000.
  const before = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>('[class*=challengeCopy] [data-pl-reveal]')!;
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

  await page.locator('#desafios').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .querySelector<HTMLElement>('[class*=challengeCopy] [data-pl-reveal]')!
          .hasAttribute('data-pl-visible'),
      ),
    )
    .toBe(true);

  // O fade leva 0,72s: a leitura tem de esperar a transição terminar, não
  // fotografar o meio dela.
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>('[class*=challenge] [data-pl-reveal]'),
        ).every((target) => getComputedStyle(target).opacity === '1'),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.querySelectorAll('[class*=challenge] [data-pl-reveal]').length,
    ),
  ).toBeGreaterThan(3);

  // Nada de lenis/GSAP de volta: o documento é o scroll nativo.
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
  await page.locator('#desafios').scrollIntoViewIfNeeded();
  await expect(page.locator('#pl-challenge-title')).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.getElementById('pl-challenge-title')!).opacity,
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
  await expect(page.locator('#pl-challenge-title')).toBeVisible();
  // A âncora do header continua funcionando sem JS.
  await page.locator('header a[href="#comunidade"]').click();
  await expect(page).toHaveURL(/#comunidade$/);
  await context.close();
});
