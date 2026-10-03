import { expect, test } from '@playwright/test';
test('public identity and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Crie. Compartilhe. Conquiste.' })).toBeVisible();
  await page.getByRole('link', { name: 'Fazer parte' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Seu próximo capítulo começa aqui.' }),
  ).toBeVisible();
});
test('honest empty states and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByText('A comunidade está começando a florescer.')).toBeVisible();
  await expect(
    page.getByText('Nenhum desafio foi publicado nesta versão.', { exact: false }),
  ).toBeVisible();
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
