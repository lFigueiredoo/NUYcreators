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

test('as páginas legais usam a chrome pública e informam a vigência oficial', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Os documentos identificam versão e vigência no topo. O gate impede que uma
  // publicação oficial volte a exibir texto de minuta ou política provisória.
  for (const [route, title, notice] of [
    ['/termos', 'Termos de Uso — NUY Creators', /Documento oficial vigente\./],
    ['/privacidade', 'Política de Privacidade — NUY Creators', /Documento oficial vigente\./],
  ] as const) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText(notice)).toBeVisible();
    await expect(page.getByText('SIRMIONE COMERCIO E DISTRIBUICAO LTDA')).toBeVisible();
    await expect(page.getByText(/Minuta|versão provisória/i)).toHaveCount(0);
    // A versão anterior destas páginas não tinha coluna: o texto transbordava a
    // viewport. O documento precisa caber na largura em que está sendo lido.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${route} não pode rolar na horizontal`,
    ).toBe(true);

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

test('a coluna dos documentos legais mantém a medida de leitura', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mobile = test.info().project.name === 'mobile';

  // O que este gate protege é a GEOMETRIA, não a redação de uma medição. A
  // média de caracteres por linha (~68 na rodada legal), a contagem de linhas e
  // o ponto exato das quebras são EVIDÊNCIA daquela rodada — ficam no relatório
  // e nos `probes.json`, e mudam com qualquer palavra nova. O contrato é a
  // largura da coluna: é ela que volta a 720px (~98 caracteres por linha) se
  // alguém apagar o `max-width`, e é ela que este teste trava.
  //
  // A leitura é do elemento REAL que contém os parágrafos, por `data-testid` —
  // o nome da classe é hasheado pelo CSS Module e não serve de âncora. Sem
  // screenshot, sem pixel, sem OCR: `getBoundingClientRect()`.
  for (const route of ['/termos', '/privacidade'] as const) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const geometria = await page.evaluate(() => {
      const corpo = document.querySelector('[data-testid="legal-body"]');
      if (!corpo) return null;
      const moldura = corpo.closest('article');
      return {
        corpo: corpo.getBoundingClientRect().width,
        moldura: moldura ? moldura.getBoundingClientRect().width : null,
        minWidth: getComputedStyle(corpo).minWidth,
        paragrafos: corpo.querySelectorAll('p').length,
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometria, `${route}: corpo jurídico não encontrado`).not.toBeNull();
    const corpo = geometria!.corpo;
    const moldura = geometria!.moldura;

    expect(geometria!.paragrafos, `${route}: o corpo precisa ter parágrafos`).toBeGreaterThan(0);
    // Vale nos dois projetos: o documento cabe na largura em que é lido.
    expect(geometria!.scrollWidth, `${route} não pode rolar na horizontal`).toBeLessThanOrEqual(
      geometria!.viewport,
    );

    // A faixa de 600–640px só pode ser exigida de uma viewport que caiba nela.
    // No celular (390px) e em qualquer viewport estreita, 623px não cabe e a
    // medida legítima é a da moldura — exigir a faixa ali seria exigir uma tela
    // que não existe.
    if (!mobile && geometria!.viewport >= 700) {
      expect(corpo, `${route}: coluna do corpo abaixo da medida de leitura`).toBeGreaterThanOrEqual(
        600,
      );
      expect(
        corpo,
        `${route}: coluna do corpo acima da medida de leitura — o texto voltou à faixa`,
      ).toBeLessThanOrEqual(640);
      // E a coluna para ANTES da moldura: título, linha de versão e aviso de
      // vigência continuam na largura cheia. Se os dois empatarem, o `max-width`
      // saiu do corpo e a medida foi embora com ele.
      expect(corpo, `${route}: o corpo deve ser mais estreito que a moldura`).toBeLessThan(
        moldura ?? Infinity,
      );
    } else {
      // Estreito: o corpo usa toda a largura disponível, sem piso próprio. Um
      // `min-width` em px empurraria a página para além da viewport — e nesse
      // caso o overflow acima já teria caído também.
      expect(
        Math.abs(corpo - (moldura ?? 0)),
        `${route}: no estreito o corpo usa a largura disponível`,
      ).toBeLessThanOrEqual(1);
      expect(parseFloat(geometria!.minWidth) || 0, `${route}: corpo com piso de largura`).toBe(0);
    }
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
