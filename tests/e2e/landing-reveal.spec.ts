import { expect, test } from '@playwright/test';

test('o carrossel percorre as fotos pelo teclado com movimento reduzido', async ({
  page,
}) => {
  const mobile = test.info().project.name === 'mobile';
  await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const community = page.locator('#comunidade');
  const track = community.getByRole('group', { name: 'Fotos das criadoras NUY' });
  const progress = community.locator('[aria-live="polite"]');
  const activeStep = community.locator('[data-current="true"]');

  await track.focus();
  await track.press('ArrowRight');
  await expect(track).toBeFocused();
  await expect(activeStep).toHaveAttribute('data-index', '1');
  await track.press('End');
  await expect(progress).toHaveText(/foto 7 de 7/);
  await track.press('ArrowRight');
  await track.press('Home');
});

test('autoplay avança sozinho depois de seis segundos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const community = page.locator('#comunidade');
  const activeStep = community.locator('[data-current="true"]');
  await community.scrollIntoViewIfNeeded();
  await expect(activeStep).toHaveAttribute('data-index', '0');
  await page.waitForTimeout(6300);
  await expect(activeStep).toHaveAttribute('data-index', '1', { timeout: 3500 });
});

test('movimento reduzido mantém o carrossel sem autoplay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const community = page.locator('#comunidade');
  await community.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(6500);
  await expect(community.locator('[data-current="true"]')).toHaveAttribute('data-index', '0');
});

test('o FAQ expande e recolhe por teclado com foco visível', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const details = page.locator('#faq details');
  await expect(details).toHaveCount(6);
  await expect(page.locator('#faq details[open]')).toHaveCount(0);
  const rewards = details.filter({ hasText: 'Como funcionam as recompensas?' });
  const question = rewards.locator('summary');
  await question.focus();
  await question.press('Enter');
  await expect(question).toBeFocused();
  expect(await question.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
    'none',
  );
  await expect(rewards.locator('p')).toBeVisible();
  await expect(rewards.locator('p')).toContainText(/conforme disponibilidade e regras/);
  await expect(rewards.locator('p')).toContainText(/não garante uma recompensa específica/);
  await question.press('Space');
  await expect(rewards.locator('p')).toBeHidden();
});

test('sem JavaScript a página inteira nasce visível e as âncoras funcionam', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const id of ['comunidade', 'o-que-e', 'como-participar', 'faq', 'cta-final']) {
      await expect(page.locator('#' + id)).toBeVisible();
    }
    await page.getByRole('banner').getByRole('link', { name: 'Como participar' }).click();
    await expect(page).toHaveURL(/#como-participar$/);
  } finally {
    await context.close();
  }
});
