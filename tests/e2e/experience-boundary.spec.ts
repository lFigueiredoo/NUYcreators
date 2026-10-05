import { expect, test } from '@playwright/test';

test('acquisition landing contains only editorial sections and acquisition links', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page
      .locator('main > div > section[id]')
      .evaluateAll((elements) => elements.map((element) => element.id)),
  ).toEqual([
    'projeto',
    'como-funciona',
    'para-quem',
    'beneficios',
    'niveis',
    'experiencias',
    'faq',
    'cta-final',
  ]);
  await expect(
    page.locator('main a[href="/ranking"],main a[href="/recompensas"],main a[href="/desafios"]'),
  ).toHaveCount(0);
  await expect(page.locator('#faq details')).toHaveCount(8);
  await expect(page.locator('#niveis').getByText(/pontos|saldo|progresso/i)).toHaveCount(0);
  await expect(
    page.getByText(/Prazo|Requisitos|Placeholders artísticos|Ver recompensas/),
  ).toHaveCount(0);
  const header = page.locator('header');
  if (test.info().project.name === 'mobile')
    await header.getByRole('button', { name: 'Abrir menu' }).click();
  for (const label of ['O projeto', 'Como funciona', 'Benefícios', 'FAQ'])
    await expect(
      header.getByRole('link', { name: label, exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  await expect(header.getByRole('link', { name: 'Ir para meu painel' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Entrar', exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('every workspace URL and legacy operational URL requires a server session', async ({
  page,
}) => {
  for (const path of [
    '/app',
    '/app/desafios',
    '/app/conteudos',
    '/app/pontos',
    '/app/recompensas',
    '/app/ranking',
    '/app/notificacoes',
    '/app/perfil',
    '/desafios',
    '/recompensas',
    '/ranking',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Bem-vinda de volta.' })).toBeVisible();
    await expect(page.getByText('Área preparada · integração pendente')).toHaveCount(0);
  }
});

test('auth has compact accessible fields, legal links and no JavaScript errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['/login', '/cadastro']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    expect(
      await page.locator('form input:not([type="checkbox"]):not([type="hidden"])').count(),
    ).toBe(path === '/login' ? 2 : 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('link', { name: 'Privacidade', exact: true })).toBeVisible();
    if (path === '/login')
      await expect(page.getByRole('link', { name: 'Esqueci minha senha' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
