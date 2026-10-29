/**
 * Captura da área autenticada para a QA visual do Sprint 5.
 *
 * Sobe a pilha de teste (stub de Appwrite + `next start` + proxy HTTPS), entra
 * pela tela de login real com os usuários de fixture e fotografa cada tela.
 *
 *   node scripts/capture-app.mjs                 # todas as telas, 1920 + mobile
 *   node scripts/capture-app.mjs dashboard       # só as telas cujo nome casa
 *   node scripts/capture-app.mjs --user=nova     # usuária sem atividade (empty states)
 *
 * Nada aqui inventa dado: as telas mostram o que os serviços realmente leram
 * das fixtures — as mesmas consultas que rodam contra o Appwrite real.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startStack } from '../tests/support/stack.mjs';

const DESKTOP = { width: 1920, height: 1080 };
const MOBILE = { width: 390, height: 844 };

const SCREENS = [
  { name: 'app-dashboard-1920', path: '/app', viewport: DESKTOP },
  { name: 'app-dashboard-390', path: '/app', viewport: MOBILE },
  { name: 'app-desafios-1920', path: '/app/desafios', viewport: DESKTOP },
  { name: 'app-desafios-participando-1920', path: '/app/desafios?aba=joined', viewport: DESKTOP },
  { name: 'app-desafios-analise-1920', path: '/app/desafios?aba=in_review', viewport: DESKTOP },
  { name: 'app-desafios-concluidos-1920', path: '/app/desafios?aba=done', viewport: DESKTOP },
  { name: 'app-desafios-390', path: '/app/desafios', viewport: MOBILE },
  { name: 'app-desafio-detalhe-1920', path: '/app/desafios/reels-de-verao-nuy', viewport: DESKTOP },
  { name: 'app-desafio-detalhe-390', path: '/app/desafios/reels-de-verao-nuy', viewport: MOBILE },
  { name: 'app-conteudos-1920', path: '/app/conteudos', viewport: DESKTOP },
  { name: 'app-conteudos-390', path: '/app/conteudos', viewport: MOBILE },
  { name: 'app-pontos-1920', path: '/app/pontos', viewport: DESKTOP },
  { name: 'app-pontos-390', path: '/app/pontos', viewport: MOBILE },
  { name: 'app-recompensas-1920', path: '/app/recompensas', viewport: DESKTOP },
  { name: 'app-recompensas-390', path: '/app/recompensas', viewport: MOBILE },
  { name: 'app-ranking-1920', path: '/app/ranking', viewport: DESKTOP },
  { name: 'app-ranking-390', path: '/app/ranking', viewport: MOBILE },
  { name: 'app-regulamento-1920', path: '/app/regulamento', viewport: DESKTOP },
  { name: 'app-regulamento-390', path: '/app/regulamento', viewport: MOBILE },
  { name: 'app-notificacoes-1920', path: '/app/notificacoes', viewport: DESKTOP },
  { name: 'app-notificacoes-390', path: '/app/notificacoes', viewport: MOBILE },
  { name: 'app-perfil-1920', path: '/app/perfil', viewport: DESKTOP },
  { name: 'app-perfil-390', path: '/app/perfil', viewport: MOBILE },
  // Estados vazios: `nova` completou o onboarding e não tem nenhuma atividade —
  // é a prova de que "sem dado" não vira número inventado.
  { name: 'app-vazio-dashboard-1920', path: '/app', viewport: DESKTOP, user: 'nova' },
  {
    name: 'app-vazio-desafios-1920',
    path: '/app/desafios?aba=joined',
    viewport: DESKTOP,
    user: 'nova',
  },
  { name: 'app-vazio-conteudos-1920', path: '/app/conteudos', viewport: DESKTOP, user: 'nova' },
  { name: 'app-vazio-pontos-1920', path: '/app/pontos', viewport: DESKTOP, user: 'nova' },
  { name: 'app-vazio-recompensas-1920', path: '/app/recompensas', viewport: DESKTOP, user: 'nova' },
  {
    name: 'app-vazio-notificacoes-1920',
    path: '/app/notificacoes',
    viewport: DESKTOP,
    user: 'nova',
  },
];

const USERS = {
  ana: { email: 'ana@nuy.test', password: 'senha-de-teste-123' },
  nova: { email: 'nova@nuy.test', password: 'senha-de-teste-789' },
  marina: { email: 'marina@nuy.test', password: 'senha-de-teste-456' },
};

const args = process.argv.slice(2);
const only = args.filter((entry) => !entry.startsWith('--'));
const defaultUser = args.find((entry) => entry.startsWith('--user='))?.split('=')[1] ?? 'ana';
const user = USERS[defaultUser];
if (!user) throw new Error('Usuário de fixture desconhecido.');

const output = 'artifacts/app';

/** Imagens preguiçosas não pintam em fullPage; força o carregamento antes. */
async function settle(page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    for (const image of document.querySelectorAll('img')) image.loading = 'eager';
    await Promise.all(
      [...document.images].map((image) =>
        image.complete
          ? null
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            }),
      ),
    );
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

async function login(page, origin, credentials) {
  await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await settle(page);
}

const stack = await startStack();
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

const selected = SCREENS.filter((screen) =>
  only.length === 0 ? true : only.some((filter) => screen.name.includes(filter)),
);

/**
 * No mobile a captura é da dobra (é o que a pessoa vê no celular) mais uma
 * versão de página inteira. O cromo fixo da barra inferior aparece uma vez só
 * no fullPage — artefato do modo de captura, não do layout.
 */
const shots = selected.flatMap((screen) =>
  screen.viewport === MOBILE
    ? [
        { ...screen, fullPage: false },
        { ...screen, name: `${screen.name}-full`, fullPage: true },
      ]
    : [{ ...screen, fullPage: true }],
);

try {
  for (const [index, shot] of shots.entries()) {
    // Sessão nova por captura: nenhum estado de uma tela vaza para a próxima.
    const context = await browser.newContext({
      viewport: shot.viewport,
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const credentials = USERS[shot.user ?? defaultUser] ?? user;
    await login(page, stack.origin, credentials);
    if (index === 0)
      console.log(
        `[capture] sessão de ${credentials.email} → ${page.url().replace(stack.origin, '')}`,
      );
    await page.goto(`${stack.origin}${shot.path}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const heading = await page
      .locator('h1')
      .first()
      .textContent()
      .catch(() => null);
    await page.screenshot({ path: `${output}/${shot.name}.png`, fullPage: shot.fullPage });
    console.log(
      `[capture] ${shot.name}.png ${shot.viewport.width}px${shot.fullPage ? ' full' : ''} · h1=${JSON.stringify(heading?.trim() ?? null)} · ${new URL(page.url()).pathname}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await stack.close();
}
