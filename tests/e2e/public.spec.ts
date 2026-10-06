import { expect, test } from '@playwright/test';

test('identidade pública e navegação de aquisição', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Rotinas reais\s*que deixam\s*a casa mais viva\./,
  );
  const header = page.locator('header');
  if (test.info().project.name === 'mobile')
    await header.getByRole('button', { name: 'Abrir menu' }).click();
  await header
    .getByRole('link', { name: 'Fazer parte', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(
    page.getByRole('heading', { name: 'Seu lugar no NUY Creators começa aqui.' }),
  ).toBeVisible();
});

test('protected route shells require a real server session', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('honest empty states and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // Estado de pré-lançamento: nenhum bloco operacional inventado na landing.
  await expect(page.locator('#ranking, #desafio')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
  await page.goto('/onboarding');
  await expect(page.getByText('Nenhum perfil foi criado.', { exact: false })).toBeVisible();
});
