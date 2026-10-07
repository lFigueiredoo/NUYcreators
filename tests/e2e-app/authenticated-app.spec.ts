import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { startStack, type StackHandle } from '../support/stack.mjs';

/**
 * QA da área autenticada — a pilha inteira, com sessão de verdade.
 *
 * O que este arquivo protege, em ordem de importância:
 *  1. a guarda de acesso (deslogado → login; onboarding pendente → onboarding);
 *  2. o isolamento entre usuárias (nenhum dado de outra pessoa aparece);
 *  3. a honestidade do produto (saldo ≠ pontos de jornada; vazio ≠ zero;
 *     nenhum sucesso simulado onde o backend ainda não opera);
 *  4. privacidade no ranking (só o nome público, nunca contato);
 *  5. mobile, foco, movimento reduzido e responsividade sem estouro lateral.
 */
const USERS = {
  ana: { email: 'ana@nuy.test', password: 'senha-de-teste-123' },
  nova: { email: 'nova@nuy.test', password: 'senha-de-teste-789' },
  marina: { email: 'marina@nuy.test', password: 'senha-de-teste-456' },
  pendente: { email: 'pendente@nuy.test', password: 'senha-de-teste-321' },
};

const ROUTES = [
  '/app',
  '/app/desafios',
  '/app/conteudos',
  '/app/pontos',
  '/app/recompensas',
  '/app/ranking',
  '/app/notificacoes',
  '/app/perfil',
];

const WIDTHS = [1920, 1440, 1280, 1024, 768, 430, 390, 375];

let stack: StackHandle;

test.beforeAll(async () => {
  stack = await startStack();
});

test.afterAll(async () => {
  await stack?.close();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function openApp(page: Page, path: string) {
  await page.goto(`${stack.origin}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toBeVisible();
}

test('sem sessão, /app devolve para o login', async ({ page }) => {
  await page.goto(`${stack.origin}/app/ranking`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/);
});

test('sessão sem onboarding concluído volta para o onboarding', async ({ page }) => {
  await signIn(page, USERS.pendente.email, USERS.pendente.password);
  await page.goto(`${stack.origin}/app`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/onboarding/);
  // Nada da área autenticada foi montado.
  await expect(page.locator('nav[aria-label="Navegação principal"]')).toHaveCount(0);
});

test('sem membership em nuy-admins, o /admin nega — e nada do painel é montado', async ({
  page,
}) => {
  // A guarda da administração é a membership da SESSÃO, apurada no servidor: a
  // criadora autenticada é devolvida à área dela, com o aviso, e o painel não
  // chega a existir. (O papel nunca vem de campo, cookie ou parâmetro.)
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await page.goto(`${stack.origin}/admin`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/app\?access=denied/);
  await expect(page.locator('nav[aria-label="Administração"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toHaveCount(0);
});

test('sessão com onboarding entra na área e vê a própria jornada', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app');
  await expect(page.locator('h1')).toHaveText('Olá, Ana.');
  const nav = page.locator('nav[aria-label="Navegação principal"]').first();
  await expect(nav.getByRole('link', { name: 'Recompensas' })).toBeVisible();
  // Sidebar e barra inferior marcam o destino atual; a primeira é a da sidebar.
  await expect(page.locator('a[aria-current="page"]').first()).toContainText('Início');
});

test('saldo disponível e pontos de jornada são números diferentes', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);

  await openApp(page, '/app/pontos');
  const pontos = page.locator('main');
  await expect(pontos).toContainText('Pontos disponíveis');
  await expect(pontos).toContainText('Pontos de jornada');
  await expect(pontos).toContainText('1.480');
  await expect(pontos).toContainText('2.080');
  await expect(pontos).toContainText('não diminuem quando você resgata');
  // O extrato é o ledger real: entrada de +300 e saída de −600 da fixture.
  await expect(pontos).toContainText('Reels de verão NUY');
  await expect(pontos).toContainText('−600');

  await openApp(page, '/app/recompensas');
  await expect(page.locator('main')).toContainText('Seu saldo');
  await expect(page.locator('main')).toContainText('1.480');
  // Resgate não pode ser simulado: a tela diz que ainda não está disponível.
  await expect(page.locator('main')).toContainText('Resgate ainda não disponível');
  await expect(page.getByRole('button', { name: 'Resgatar' })).toHaveCount(0);
});

test('ranking é do ciclo, por pontos ganhos, e não vaza contato', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app/ranking');
  const main = page.locator('main');
  await expect(main).toContainText('Sua posição');
  await expect(main).toContainText('11º');
  await expect(main).toContainText('300 pontos ganhos');
  await expect(page.locator('h1')).toContainText('Ranking');
  await expect(main).toContainText('Outubro de 2026');
  // Empate divide posição (1, 2, 2, 4): duas linhas em 8º.
  await expect(main.locator('[class*="rankPosition"]', { hasText: '8º' })).toHaveCount(2);
  // Privacidade: nada de e-mail, telefone ou cidade na tela pública.
  const text = (await main.textContent()) ?? '';
  expect(text).not.toContain('@');
  expect(text).not.toContain('São Paulo');
  expect(text).not.toContain('nuy.test');
});

test('isolamento: cada sessão vê só os próprios dados', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app/conteudos');
  await expect(page.locator('main')).toContainText('Carrossel de rotina');
  await expect(page.locator('main')).not.toContainText('Clara Novaes');

  await signIn(page, USERS.nova.email, USERS.nova.password);
  await openApp(page, '/app/conteudos');
  await expect(page.locator('main')).not.toContainText('Carrossel de rotina');
  await expect(page.locator('main')).toContainText('Você ainda não enviou conteúdo');
  await openApp(page, '/app/notificacoes');
  await expect(page.locator('main')).toContainText('Nenhum aviso por aqui');
  await expect(page.locator('main')).not.toContainText('Pontos creditados');

  await signIn(page, USERS.marina.email, USERS.marina.password);
  await openApp(page, '/app/perfil');
  await expect(page.locator('main')).toContainText('Marina Costa');
  await expect(page.locator('main')).not.toContainText('Ana Beatriz Souza');
  await expect(page.locator('main')).not.toContainText('São Paulo');
});

test('leitura de linha nunca usa a chave administrativa', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  for (const route of ROUTES) await openApp(page, route);
  const adminReads = stack.stub.journal.filter(
    (entry) => entry.admin && entry.path.includes('/tablesdb/'),
  );
  expect(adminReads).toEqual([]);
});

test('sem atividade, a tela mostra o próprio vazio — nunca zero', async ({ page }) => {
  await signIn(page, USERS.nova.email, USERS.nova.password);

  await openApp(page, '/app');
  await expect(page.locator('main')).toContainText('Sua jornada começa aqui.');
  await expect(page.locator('main')).toContainText('Explorar desafios');

  await openApp(page, '/app/pontos');
  expect((await page.locator('main').textContent()) ?? '').not.toMatch(/\b0\b/);
  await expect(page.locator('main')).toContainText('Sua jornada começa aqui.');

  await openApp(page, '/app/recompensas');
  // Sem conta de pontos não existe "saldo 0": a tela é o próprio vazio.
  await expect(page.locator('main')).toContainText('Sua jornada começa aqui.');
  await expect(page.locator('main')).not.toContainText('Seu saldo');
  await expect(page.locator('main')).not.toContainText('Resgate ainda não disponível');
});

test('desafio: participação e envio não fingem integração', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app/desafios');
  await expect(page.locator('nav[aria-label="Filtrar desafios"]')).toBeVisible();

  // Um desafio em que a Ana ainda não participa: aqui dá para ver o que a tela
  // diz sobre entrar e enviar sem que a fixture já tenha um envio real.
  await openApp(page, '/app/desafios/encontro-nuy-edicao-especial');
  const main = page.locator('main');
  await expect(main).toContainText('Briefing');
  await expect(main).toContainText('Requisitos');
  // A entrada e o envio dependem da integração com as redes: a tela diz isso em
  // vez de fingir que funcionam.
  await expect(main).toContainText(
    'A entrada em desafios pela plataforma será liberada quando a integração',
  );
  await expect(main).toContainText(
    'O envio de conteúdo pela plataforma será liberado quando a integração',
  );
  await expect(page.getByRole('button', { name: /participar|enviar/i })).toHaveCount(0);
});

test('mobile: sem sidebar, barra inferior com cinco destinos', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app');

  await expect(page.locator('aside')).toBeHidden();
  const bottom = page.locator('nav[aria-label="Navegação principal"]').last();
  await expect(bottom).toBeVisible();
  for (const label of ['Início', 'Desafios', 'Conteúdos', 'Pontos', 'Perfil']) {
    await expect(bottom.getByRole('link', { name: label })).toBeVisible();
  }
  await bottom.getByRole('link', { name: 'Desafios' }).click();
  await expect(page).toHaveURL(/\/app\/desafios$/);
  await context.close();
});

test('acessibilidade: atalho de conteúdo, foco visível e estado atual', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app');

  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main');

  // Do atalho, o Tab cai no primeiro elemento do shell: o foco ali é o anel
  // NUY (mauve), não o contorno padrão do navegador — prova que a folha global
  // da superfície autenticada está aplicada.
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || !active.closest('.nuy-app')) return null;
    const style = getComputedStyle(active);
    return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
  });
  expect(ring).not.toBeNull();
  expect(ring?.style).toBe('solid');
  expect(ring?.width).toBe('2px');
  expect(ring?.color).toBe('rgb(157, 108, 133)');

  // Todo link de navegação tem nome acessível; o ativo se anuncia.
  const links = page.locator('nav[aria-label="Navegação principal"] a');
  for (const link of await links.all()) {
    expect((await link.getAttribute('aria-label')) ?? (await link.textContent()) ?? '').not.toBe(
      '',
    );
  }
  await expect(page.locator('a[aria-current="page"]').first()).toBeVisible();
  // A contagem de não lidas chega como texto, não só como cor.
  await expect(page.locator('a[aria-label*="Notificações"]').first()).toBeVisible();
});

/**
 * O link da sidebar é o alvo certo para medir movimento: existe desde o
 * primeiro paint (não depende do Suspense do corpo) e tem transição declarada
 * (`.navLink`), então dá para provar os dois lados — com movimento normal ela
 * acontece; com `prefers-reduced-motion: reduce` ela é zerada.
 */
function navMotion(page: Page) {
  return page.evaluate(() => {
    const link = document.querySelector('nav[aria-label="Navegação principal"] a');
    if (!link) return null;
    const style = getComputedStyle(link);
    return {
      transition: style.transitionDuration,
      animation: style.animationName,
    };
  });
}

test('movimento reduzido: a interface continua inteira e sem animação', async ({
  page,
  browser,
}) => {
  // Controle: sem preferência declarada, a transição existe.
  await signIn(page, USERS.ana.email, USERS.ana.password);
  await openApp(page, '/app');
  const normal = await navMotion(page);
  expect(normal).not.toBeNull();
  expect(normal?.transition).not.toBe('0s');

  const context: BrowserContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const reducedPage = await context.newPage();
  await signIn(reducedPage, USERS.ana.email, USERS.ana.password);
  await openApp(reducedPage, '/app');

  const reduced = await reducedPage.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  expect(reduced).toBe(true);

  const motion = await navMotion(reducedPage);
  expect(motion).not.toBeNull();
  expect(motion?.transition).toBe('0s');
  expect(motion?.animation).toBe('none');

  // A tela continua inteira: o conteúdo real chega mesmo sem animação.
  await expect(reducedPage.locator('main')).toContainText('Pontos disponíveis');
  await context.close();
});

test('de 1920 a 375: nenhuma tela estoura na horizontal', async ({ page }) => {
  await signIn(page, USERS.ana.email, USERS.ana.password);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await openApp(page, route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${route} em ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});
