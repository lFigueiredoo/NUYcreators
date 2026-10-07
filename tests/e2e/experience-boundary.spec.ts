import { expect, test } from '@playwright/test';

/**
 * Fronteira da experiência pública (Sprint 4B): o que pode existir sem sessão.
 *
 * Três coisas são contratuais aqui: (1) a landing só tem blocos editoriais e
 * nenhuma seção operacional voltou; (2) todo link público termina em rota real
 * — nada de `#` solto e nada de destino que responda erro; (3) as telas de
 * acesso declaram o estado honesto quando a integração não está disponível, em
 * vez de fingir um envio que não aconteceu.
 */

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/onboarding',
  '/termos',
  '/privacidade',
] as const;

test('a landing pública contém só blocos editoriais e links de aquisição', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Inventário de seções da landing: o REDESIGN CLEAN reduz a página a cinco
  // blocos editoriais, em ordem de documento — comunidade (pré-lançamento), o
  // que é, como participar, FAQ e CTA final. A lista é exata: nenhum bloco
  // operacional (desafios, recompensas, conteúdos, manifesto) pode voltar.
  const planned = ['comunidade', 'o-que-e', 'como-participar', 'faq', 'cta-final'];
  const ids = await page
    .locator('main section[id]')
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(ids).toEqual(planned);

  await expect(
    page.locator('main a[href="/ranking"],main a[href="/recompensas"],main a[href="/desafios"]'),
  ).toHaveCount(0);

  const header = page.locator('header');
  if (test.info().project.name === 'mobile')
    await header.getByRole('button', { name: 'Abrir menu' }).click();
  // Três âncoras discretas, não a barra de sete itens do layout antigo.
  for (const label of ['O que é', 'Como participar', 'FAQ']) {
    await expect(
      header.getByRole('link', { name: label, exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  }
  await expect(header.getByRole('link', { name: 'Ir para meu painel' })).toHaveCount(0);
  await expect(
    header.getByRole('link', { name: 'CRIAR CONTA', exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('o rodapé fecha a página pública com rotas reais', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'NUY Creators início' })).toHaveAttribute(
    'href',
    '/',
  );
  // Rodapé mínimo: FAQ e as páginas legais, com o acesso no fim — deslogado,
  // é o login.
  expect(
    await footer
      .locator('nav[aria-label="Rodapé"] a')
      .evaluateAll((links) => links.map((link) => [link.textContent, link.getAttribute('href')])),
  ).toEqual([
    ['FAQ', '#faq'],
    ['Termos', '/termos'],
    ['Privacidade', '/privacidade'],
    ['Entrar', '/login'],
  ]);
  await expect(footer.getByText('© 2026 NUY Creators')).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Privacidade' })).toHaveAttribute(
    'href',
    '/privacidade',
  );
  await expect(footer.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos');
});

test('nenhum link público é morto: sem "#" solto e sem destino quebrado', async ({ page }) => {
  test.slow();
  const destinations = new Set<string>();

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      expect(href, `link sem destino em ${route}`).not.toMatch(/^(#|javascript:|)$/);
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      const url = new URL(href, 'http://placeholder.test');
      destinations.add(url.pathname + url.search);
    }
  }

  // Todo destino interno responde: âncora de seção resolve na própria landing.
  for (const destination of destinations) {
    const response = await page.request.get(destination);
    expect(response.status(), `${destination} não responde`).toBeLessThan(400);
  }
  expect(destinations.size).toBeGreaterThan(5);
});

test('as páginas legais usam a chrome pública e mantêm o aviso honesto', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [route, title, notice] of [
    [
      '/termos',
      'Termos de uso',
      /Os termos definitivos aguardam aprovação jurídica\. Esta página não constitui uma política legal final\./,
    ],
    [
      '/privacidade',
      'Privacidade',
      /O aviso de privacidade definitivo aguarda aprovação jurídica\./,
    ],
  ] as const) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText(notice)).toBeVisible();

    // Fora da landing as âncoras ficam absolutas: o header não pode apontar
    // para um `#` que não existe nesta rota.
    const header = page.locator('header');
    if (test.info().project.name === 'mobile')
      await header.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(
      header.getByRole('link', { name: 'FAQ', exact: true }).filter({ visible: true }).first(),
    ).toHaveAttribute('href', '/#faq');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/#faq');
    await expect(footer.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    await expect(footer.getByText('© 2026 NUY Creators')).toBeVisible();
  }
});

test('as telas de acesso declaram o estado honesto, sem fingir integração', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Recuperação: o convite e a saída, com o campo que a action espera.
  await page.goto('/recuperar-senha');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vamos recuperar seu acesso.');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar instruções' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute(
    'href',
    '/login',
  );

  // Sem token não existe formulário: a tela diz o que falta, não inventa um
  // envio. As duas frases são as mesmas do estado sem link em produção.
  await page.goto('/redefinir-senha');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crie uma nova senha.');
  await expect(page.getByRole('status')).toHaveText(
    'Este endereço precisa do link enviado por e-mail para funcionar.',
  );
  await expect(page.locator('form input:not([type="hidden"])')).toHaveCount(0);

  await page.goto('/verificar-email');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Só falta confirmar seu e-mail.',
  );
  await expect(page.getByRole('status')).toHaveText(
    'Abra o link que enviamos para o seu e-mail para confirmar o endereço.',
  );

  expect(errors).toEqual([]);
});

test('auth has compact accessible fields, legal links and no JavaScript errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['/login', '/cadastro']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
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

test('nenhuma classe da experiência pública antiga voltou', async ({ page }) => {
  // Os nomes exatos que a rodada anterior publicava. A comparação é ancorada:
  // `footerNav` (hash do CSS Module) não pode casar com `footer-nav`.
  const legacyNames =
    /^(site-header|site-footer|wordmark|desktop-nav|login-link|header-actions|header-cta|menu-button|mobile-nav|auth-layout|auth-editorial|auth-flower|auth-panel|auth-panel-inner|auth-footnote|back-link|form-stack|form-row|form-message|form-success|service-notice|checkbox-label|text-link|empty-state|footer-inner|footer-brand|footer-nav|footer-legal|footer-bottom|footer-copy|eyebrow)$/;

  for (const route of ['/', '/login', '/termos'] as const) {
    await page.goto(route);
    const found = await page.evaluate((source) => {
      const pattern = new RegExp(source);
      return Array.from(document.querySelectorAll('[class]'))
        .flatMap((element) => Array.from(element.classList))
        .filter((className) => pattern.test(className));
    }, legacyNames.source);
    expect(found, `classe antiga em ${route}`).toEqual([]);
  }
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
