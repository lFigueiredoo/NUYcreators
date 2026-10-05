import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [1440, 1000],
  [1920, 1080],
  [390, 844],
]) {
  test(`editorial landing at ${width}x${height}`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && width > 760,
      'Desktop sizes are captured by the desktop project; mobile keeps its real touch viewport.',
    );
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { name: 'Bem-vinda ao NUY CREATORS' })).toBeVisible();
    await expect(
      page.locator('[data-hero-actions]').getByRole('link', { name: 'Entrar', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Participar abre novas possibilidades.' }),
    ).toBeVisible();
    await expect(page.locator('#ranking, #desafio, #comunidade, #conteudos')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width >= 1440) {
      const artboard = await page.locator('[data-hero-artboard]').boundingBox();
      const headline = await page.locator('[data-hero-headline]').boundingBox();
      const packshot = await page.locator('[data-hero-packshot]').boundingBox();
      const benefits = await page.locator('[data-hero-benefits]').boundingBox();
      expect(artboard).not.toBeNull();
      if (artboard && headline && packshot && benefits) {
        // Referência (painel desktop ×2,217): a artboard da hero é 100vw × 73/160
        // (873px @1920) — não é mais um tabuleiro 1600×900 dentro de 100svh.
        expect(Math.abs(artboard.width / artboard.height - 160 / 73)).toBeLessThan(0.005);
        // Frações medidas no estado aprovado do checkpoint A @1920.
        expect(Math.abs((headline.x - artboard.x) / artboard.width - 0.1055)).toBeLessThan(0.01);
        expect(Math.abs((headline.y - artboard.y) / artboard.height - 0.238)).toBeLessThan(0.01);
        expect(packshot.width / artboard.width).toBeGreaterThan(0.35);
        // Faixa funcional da referência: primeiro ícone ~10,1%w e a faixa
        // fecha ~83,2%w → a barra mede 73,0% da artboard (o antigo 79,2%
        // codificava o desalinhamento que a R7 corrigiu contra a ref).
        expect(benefits.width / artboard.width).toBeGreaterThan(0.71);
        if (width === 1920) {
          // Composição aprovada (checkpoint A), medida viva vs a referência.
          for (const [box, approved] of [
            [artboard, { x: 0, y: 0, width: 1920, height: 876 }],
            [headline, { x: 202.55, y: 208.48, width: 883.19, height: 200.84 }],
            [packshot, { x: 1148.16, y: 43.8, width: 719.03, height: 805.91 }],
            [benefits, { x: 195.83, y: 785.59, width: 1401.63, height: 42.23 }],
          ] as const) {
            for (const key of ['x', 'y', 'width', 'height'] as const)
              expect(Math.abs(box[key] - approved[key])).toBeLessThan(0.25);
          }
        }
      }
      const hero = await page.locator('[data-visual-hero]').boundingBox();
      const campaign = await page.locator('#experiencias').boundingBox();
      const community = await page.locator('#projeto').boundingBox();
      expect(hero).not.toBeNull();
      expect(campaign).not.toBeNull();
      expect(community).not.toBeNull();
      if (hero && campaign && community) {
        expect(hero.x).toBe(0);
        expect(hero.width).toBe(width);
        expect(hero.width).toBeGreaterThanOrEqual(width === 1920 ? 1850 : 1380);
        // Desktop: a alt da artboard da ref (73/160 do vw); mobile: 100svh.
        if (width >= 1024) expect(Math.abs(hero.height - (width * 73) / 160)).toBeLessThan(2);
        else expect(Math.abs(hero.height - height)).toBeLessThan(2);
        expect(campaign.y).toBeGreaterThan(height);
        expect(Math.abs(community.y - hero.y - hero.height)).toBeLessThan(1);
        for (const id of ['para-quem', 'beneficios', 'experiencias']) {
          expect((await page.locator(`#${id}`).boundingBox())?.y).toBeGreaterThan(height);
        }
      }
    }
    const sections = await page.evaluate(() =>
      ['projeto', 'como-funciona', 'para-quem', 'beneficios', 'niveis', 'experiencias', 'faq'].map(
        (id) => document.getElementById(id)!.getBoundingClientRect().top + scrollY,
      ),
    );
    expect(sections.every((y, i) => i === 0 || y > sections[i - 1])).toBe(true);
    expect(await page.locator('main aside').count()).toBe(0);
    const label = page
      .locator('[data-hero-actions]')
      .getByRole('link', { name: 'Entrar', exact: true });
    expect((await label.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    const prefix = `playwright-report/visual/after-${test.info().project.name}-${width}x${height}`;
    await page.screenshot({ path: `${prefix}-hero.png` });
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
    await label.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Bem-vinda de volta.' })).toBeVisible();
  });
}

test('motion cleans up on preference changes and navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vinda ao NUY CREATORS' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis')))
    .toBe(false);
  await page.getByRole('link', { name: 'Fazer parte agora', exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis')))
    .toBe(false);
  expect(errors).toEqual([]);
});

test('landing remains readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await expect(page.getByRole('heading', { name: 'Bem-vinda ao NUY CREATORS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Exploradora NUY' })).toBeVisible();
  await page.getByRole('link', { name: 'O projeto', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#projeto$/);
  await context.close();
});
