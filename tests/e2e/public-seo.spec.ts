import { expect, test } from '@playwright/test';

for (const [path, title, canonical] of [
  ['/cadastro', 'Fazer parte | NUY Creators', '/cadastro'],
  ['/termos', 'Termos de Uso | NUY Creators', '/termos'],
  ['/privacidade', 'Política de Privacidade | NUY Creators', '/privacidade'],
] as const) {
  test(`${path} publica título e canonical próprios`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${canonical}$`),
    );
  });
}

test('rotas de acesso não promocionais pedem noindex', async ({ page }) => {
  for (const path of ['/login', '/recuperar-senha', '/redefinir-senha', '/verificar-email']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

test('404 é localizada, não indexável e preserva o destino do skip link', async ({ page }) => {
  const response = await page.goto('/rota-inexistente-auditoria');
  expect(response?.status()).toBe(404);
  await expect(page.locator('main#main')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Esta página não foi encontrada.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
