import { expect, test } from '@playwright/test';

test('o carrossel mantém acessibilidade com movimento reduzido', async ({
  page,
}) => {
  const mobile = test.info().project.name === 'mobile';
  await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const community = page.locator('#comunidade');
  const track = community.getByRole('group', { name: 'Fotos das criadoras NUY' });
  const announcement = community.locator('[aria-live="polite"]');

  await track.focus();
  await track.press('ArrowRight');
  await expect(track).toBeFocused();
  await expect(announcement).toHaveText(/@thay_emilyane, foto 1 de 7/);
  await expect(community.locator('#editorial-creator-track > div')).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('o carrossel se move continuamente sem intervalo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const community = page.locator('#comunidade');
  const track = community.locator('#editorial-creator-track > div');
  await community.scrollIntoViewIfNeeded();
  await expect(track).toHaveCSS('animation-name', /editorial-marquee/);
  const before = await track.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(1200);
  const after = await track.evaluate((element) => getComputedStyle(element).transform);
  expect(after).not.toBe(before);
});

test('movimento reduzido desativa o movimento contínuo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const community = page.locator('#comunidade');
  await community.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(community.locator('#editorial-creator-track > div')).toHaveCSS(
    'animation-name',
    'none',
  );
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
