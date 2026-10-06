import { expect, test } from '@playwright/test';

/**
 * Contrato da identidade pública de acesso (Checkpoint 4A).
 *
 * O que se prova aqui, em ordem: (1) as telas nascem no creme da Proposta C e
 * sem nenhum resto do universo antigo; (2) o acesso e a landing são o MESMO
 * produto — mesmas medidas de tipografia, botão e régua, comparadas entre as
 * duas páginas; (3) campos, foco e leitura de senha são acessíveis; (4) o
 * desktop é editorial em duas colunas e o mobile põe o formulário cedo; (5) a
 * fiação funcional continua a mesma; e (6) nenhum bitmap servido é ampliado.
 */

test('login e cadastro nascem no creme, com o lockup da marca e sem resto do universo antigo', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const path of ['/login', '/cadastro']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);

    // Fundo creme da direção (o navy do global não aparece na tela inteira).
    const shellBackground = await page
      .locator('main')
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(shellBackground).toBe('rgb(249, 245, 239)');

    // Lockup e volta: a marca é a mesma da landing, em texto real.
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'NUY Creators início' })).toBeVisible();
    await expect(header.getByText('NUY', { exact: true })).toBeVisible();
    await expect(header.getByText('CREATORS', { exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Voltar ao site' })).toHaveAttribute('href', '/');

    // Fotografia da direção, com enquadramento próprio, e a frase editorial.
    const photo = page.locator('main figure img');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('alt', /borrifador NUY/);
    await expect(page.getByText('Rotinas reais.')).toBeVisible();
    await expect(page.getByText('Conteúdos que inspiram.')).toBeVisible();

    // Nenhum vestígio do universo/cosmos antigo: nem imagens de referência,
    // nem as classes do layout antigo, nem as órbitas.
    await expect(page.locator('img[src*="/brand/reference/"]')).toHaveCount(0);
    await expect(page.locator('.auth-editorial, .auth-flower, .auth-panel, .orbit')).toHaveCount(0);
    expect(await page.locator('main svg[viewBox="0 0 800 1000"]').count()).toBe(0);
  }

  expect(errors).toEqual([]);
});

test('acesso e landing são o mesmo produto: tipografia, botão e régua medidos nas duas', async ({
  page,
}) => {
  const read = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          family: style.fontFamily,
          size: style.fontSize,
          weight: style.fontWeight,
          tracking: style.letterSpacing,
          color: style.color,
          background: style.backgroundColor,
          radius: style.borderRadius,
        };
      });

  await page.goto('/');
  const landingLockup = await read('header [aria-label="NUY Creators início"] span');
  const landingButton = await read('a[href="/cadastro"]:has-text("Fazer parte da comunidade")');
  const landingGutter = await page
    .locator('header')
    .evaluate((element) => getComputedStyle(element).paddingLeft);

  await page.goto('/login');
  const authLockup = await read('header [aria-label="NUY Creators início"] span');
  const authButton = await read('button[type="submit"]');
  const authGutter = await page
    .locator('header')
    .evaluate((element) => getComputedStyle(element).paddingLeft);

  // Lockup: mesma família, corpo, peso, tracking e cor nas duas páginas.
  expect(authLockup).toEqual(landingLockup);
  // Botão principal: mesmo navy, mesmo raio, mesma família e peso.
  expect(authButton.background).toBe(landingButton.background);
  expect(authButton.radius).toBe(landingButton.radius);
  expect(authButton.family).toBe(landingButton.family);
  expect(authButton.weight).toBe(landingButton.weight);
  // Régua editorial: a mesma calha no topo das duas páginas.
  expect(authGutter).toBe(landingGutter);

  // O enquadramento da foto do acesso não repete o do hero.
  const authPosition = await page
    .locator('main figure img')
    .evaluate((element) => getComputedStyle(element).objectPosition);
  await page.goto('/');
  const heroPosition = await page
    .locator('main figure img')
    .first()
    .evaluate((element) => getComputedStyle(element).objectPosition);
  expect(authPosition).not.toBe(heroPosition);
});

test('campos com rótulo visível, foco discreto e leitura de senha acessível', async ({ page }) => {
  await page.goto('/login');

  // Rótulo sempre visível — o placeholder não é a única pista.
  for (const label of ['E-mail', 'Senha']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    const text = await page.locator('label', { hasText: label }).first().innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  }

  // Foco: borda navy + ring discreto (sem glow). A borda tem transição de
  // 0,2s — o poll espera o valor assentado em vez de ler o meio da animação.
  const email = page.getByLabel('E-mail', { exact: true });
  await email.focus();
  await expect
    .poll(() => email.evaluate((element) => getComputedStyle(element).borderColor))
    .toBe('rgb(14, 42, 68)');
  const focused = await email.evaluate((element) => {
    const style = getComputedStyle(element);
    return { ring: style.boxShadow, outline: style.outlineStyle };
  });
  expect(focused.ring).toContain('3px');

  // Leitura de senha: alterna o tipo, anuncia o estado e volta.
  const password = page.getByLabel('Senha', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  const toggle = page.getByRole('button', { name: 'Mostrar senha' });
  await toggle.click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  const hide = page.getByRole('button', { name: 'Ocultar senha' });
  await expect(hide).toHaveAttribute('aria-pressed', 'true');
  await expect(hide).toBeVisible();
  await hide.click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('desktop em duas colunas editoriais e mobile com o formulário cedo', async ({ page }) => {
  const geometry = async () => {
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => {
      const shell = document.querySelector('main')!.getBoundingClientRect();
      const visual = document.querySelector('main figure')!.getBoundingClientRect();
      const firstInput = document.querySelector('form input')!.getBoundingClientRect();
      return {
        ratio: visual.width / shell.width,
        band: Math.round(visual.height),
        firstInputTop: Math.round(firstInput.top),
        viewportHeight: innerHeight,
      };
    });
  };

  await page.goto('/login');
  const login = await geometry();
  await page.goto('/cadastro');
  const signup = await geometry();

  if (test.info().project.name === 'mobile') {
    // Empilhado: a faixa de lifestyle é uma tira, não uma tela, e o primeiro
    // campo aparece no primeiro viewport em LOGIN e CADASTRO.
    expect(login.ratio).toBeGreaterThan(0.98);
    expect(signup.ratio).toBeGreaterThan(0.98);
    expect(login.band).toBeGreaterThanOrEqual(160);
    expect(login.band).toBeLessThanOrEqual(260);
    // O cadastro prioriza o formulário: faixa menor que a do login.
    expect(signup.band).toBeLessThan(login.band);
    expect(login.firstInputTop).toBeLessThan(login.viewportHeight);
    expect(signup.firstInputTop).toBeLessThan(signup.viewportHeight);
  } else {
    // Desktop: fotografia ≈ 55% e formulário ≈ 45%.
    expect(login.ratio).toBeGreaterThan(0.5);
    expect(login.ratio).toBeLessThan(0.58);
    expect(signup.ratio).toBeGreaterThan(0.5);
    expect(signup.ratio).toBeLessThan(0.58);
  }
});

test('a fiação funcional do login e do cadastro continua a mesma', async ({ page }) => {
  for (const [path, names] of [
    ['/login', ['email', 'password']],
    ['/cadastro', ['name', 'email', 'password', 'terms']],
  ] as const) {
    await page.goto(path);
    const form = page.locator('form');
    // O React serializa a ação como `method="POST"` em maiúsculas.
    expect((await form.getAttribute('method'))?.toLowerCase()).toBe('post');
    // Sem JavaScript a ação vai no `action`; com JavaScript, o React 19
    // entrega a server action pelos inputs ocultos `$ACTION_*`.
    const hidden = await form
      .locator('input[type="hidden"]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('name') ?? ''));
    expect(hidden.some((name) => name.startsWith('$ACTION'))).toBe(true);
    // Os campos de verdade continuam exatamente os mesmos de antes.
    const fields = await form
      .locator('input:not([type="hidden"])')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('name')));
    expect(fields).toEqual([...names]);
  }

  // Ambiente de teste é desconectado: a ação continua desabilitada, como antes.
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
  await expect(page.getByText('O acesso está temporariamente indisponível.')).toBeVisible();
  await page.goto('/cadastro');
  await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeDisabled();
});

test('nenhum bitmap servido é ampliado (DPR 1 no desktop, DPR 3 no mobile)', async ({ page }) => {
  for (const path of ['/login', '/cadastro']) {
    await page.goto(path);
    const upscaled = await page.evaluate(async () => {
      const samples: Array<{ src: string; bitmap: number; shown: number; dpr: number }> = [];
      for (const img of Array.from(document.querySelectorAll<HTMLImageElement>('main img'))) {
        if (!img.currentSrc) continue;
        const shown = Math.round(img.getBoundingClientRect().width * devicePixelRatio);
        if (shown < 200) continue;
        const response = await fetch(img.currentSrc);
        const bitmap = await createImageBitmap(await response.blob());
        samples.push({
          src: img.currentSrc.split('/').pop() ?? img.src,
          bitmap: bitmap.width,
          shown,
          dpr: devicePixelRatio,
        });
        bitmap.close();
      }
      return samples.filter((sample) => sample.bitmap + 2 < sample.shown);
    });
    expect(upscaled).toEqual([]);
  }
});
