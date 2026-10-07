/**
 * Captura CONECTADA da administração — Sprint 7.
 *
 * Sobe a pilha de produção (`next start` + proxy HTTPS) falando com o Appwrite
 * de STAGING e faz a jornada administrativa inteira PELA TELA, com dados
 * marcados: campanha → desafio (rascunho → publicado) → a creator vê, entra e
 * envia → a equipe aprova na fila → a recompensa nasce e o estoque é ajustado.
 *
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/capture-admin.mjs
 *
 * O que este arquivo NÃO faz: inventar dado. Todo número que aparece nas telas
 * foi digitado por ele e aceito pelo núcleo, ou já existia no staging. Tudo o
 * que ele cria leva o `runId` no NOME e é apagado no `finally`, pela fronteira
 * do id e do nome exato — resíduo de rodada anterior não é dele para apagar.
 *
 * A conta de equipe nasce aqui, com membership `admin` em `nuy-admins`, e morre
 * aqui: nenhuma credencial de operação fica no repositório.
 */
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import {
  Account,
  Client,
  ExecutionMethod,
  Functions,
  Permission,
  Query,
  Role,
  TablesDB,
  Teams,
  Users,
} from 'node-appwrite';
import { startConnectedStack } from '../tests/support/staging-stack.mjs';

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const teamId = process.env.APPWRITE_ADMIN_TEAM_ID ?? 'nuy-admins';
const testKey = process.env.APPWRITE_TEST_API_KEY ?? '';
if (!endpoint || !projectId || !testKey)
  throw new Error(
    'Captura conectada exige APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_TEST_API_KEY no ambiente.',
  );

/** Marca técnica: vai no NOME de tudo que nasce nesta execução. */
const runId = `s7cap${Date.now().toString(36)}`;
const OUT = 'artifacts/sprint7';

const SLUG = `${runId}-reels-bastidores`;
const CHALLENGE_NAME = `Reels de bastidores — ${runId}`;
const REWARD_NAME = `Kit de câmera — ${runId}`;
const CAMPAIGN_NAME = `Volta às aulas — ${runId}`;
const PUBLICATION = `https://www.instagram.com/p/${runId}/?utm_source=qa-admin`;
const POINTS = 800;
const REWARD_COST = 250;
const REWARD_STOCK = 3;
const STOCK_AFTER = 5;

const plainClient = () => new Client().setEndpoint(endpoint).setProject(projectId);
const keyClient = () => plainClient().setKey(testKey);
const db = new TablesDB(keyClient());
const teams = new Teams(keyClient());
const users = new Users(keyClient());

let stack;
let browser;
let membershipId = '';
const actors = [];
const sweeps = [];
const runs = [];

const log = (...parts) => console.log('[captura]', ...parts);

/** Data e hora no relógio da operação (Brasília), no formato de `datetime-local`. */
function wallClock(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
    .format(date)
    .replace(' ', 'T')
    .slice(0, 16);
}

async function responseCode(operation) {
  try {
    await operation();
    return 200;
  } catch (error) {
    return error?.code ?? -1;
  }
}

/** Varredura paginada por uma coluna — limpeza completa, não "as primeiras 100". */
async function sweep(tableId, column, values) {
  const removed = [];
  if (!values.length) return removed;
  for (;;) {
    const page = await db.listRows({
      databaseId,
      tableId,
      queries: [Query.equal(column, values), Query.limit(100)],
    });
    let deleted = 0;
    for (const row of page.rows) {
      const code = await responseCode(() =>
        db.deleteRow({ databaseId, tableId, rowId: String(row.$id) }),
      );
      if ([200, 404].includes(code)) {
        deleted += 1;
        removed.push(String(row.$id));
      }
    }
    if (page.rows.length < 100 || deleted === 0) break;
  }
  sweeps.push({ target: `${tableId}.${column}`, removed: removed.length });
  return removed;
}

/** Uma linha pelo nome EXATO marcado — a marca é a fronteira, não a semelhança. */
async function idsNamed(tableId, name) {
  const found = await db.listRows({
    databaseId,
    tableId,
    queries: [Query.equal('name', name), Query.limit(10)],
  });
  return found.rows.map((row) => String(row.$id));
}

async function deleteRows(tableId, ids) {
  let removed = 0;
  for (const id of ids)
    if (
      [200, 404].includes(await responseCode(() => db.deleteRow({ databaseId, tableId, rowId: id })))
    )
      removed += 1;
  sweeps.push({ target: tableId, removed });
}

async function createActor(label, name) {
  const id = `${runId}-${label}`;
  const email = `${id}@example.invalid`; // caixa não entregável, de propósito
  const password = randomBytes(24).toString('hex');
  await new Account(plainClient()).create({ userId: id, email, password, name });
  actors.push(id);
  return { id, email, password };
}

/* ------------------------------------------------------------------ página -- */

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

async function shot(page, name) {
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const heading = await page
    .locator('h1')
    .first()
    .textContent()
    .catch(() => null);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const url = new URL(page.url());
  log(
    `${name}.png · h1=${JSON.stringify(heading?.trim() ?? null)} · ${url.pathname}${url.search}`,
  );
}

/**
 * Espera um texto na tela.
 *
 * Serve para as respostas que FICAM (as ações da administração não navegam: o
 * formulário continua onde está e o aviso continua junto) e para os ESTADOS que
 * substituem o formulário. Não serve para o aviso de uma ação que faz o próprio
 * formulário sair de cena — ali o aviso não chega a ser observável, e quem prova
 * a escrita é o estado novo (é o que a jornada conectada do Sprint 6 mediu).
 */
async function expectVisible(page, text, exact = false) {
  try {
    await page.getByText(text, { exact }).first().waitFor({ state: 'visible', timeout: 60_000 });
  } catch (error) {
    // Diagnóstico: quando o esperado não aparece, o que a tela DISSE é o dado que
    // interessa — "timeout" sozinho não diz se foi recusa, erro ou silêncio.
    const seen = await page
      .locator('[role="status"], [role="alert"]')
      .allInnerTexts()
      .catch(() => []);
    throw new Error(
      `esperava ${JSON.stringify(text)}; a tela respondeu ${JSON.stringify(seen)} — ${String(error).split('\n')[0]}`,
    );
  }
  log(`na tela: ${JSON.stringify(text)}`);
}

async function signIn(page, actor) {
  await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', actor.email);
  await page.fill('input[name="password"]', actor.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 }),
    page.click('button[type="submit"]'),
  ]);
  log('login →', new URL(page.url()).pathname);
}

/** Executa a Function pelo runtime — mesmo caminho da server action. */
async function runFunction(functionId, credential, body = {}) {
  const client = plainClient();
  if (credential.kind === 'session') client.setSession(credential.secret);
  const execution = await new Functions(client).createExecution({
    functionId,
    body: JSON.stringify(body),
    async: false,
    method: ExecutionMethod.POST,
    xpath: '/',
    headers: { 'content-type': 'application/json' },
  });
  const run = {
    functionId,
    deploymentId: execution.deploymentId,
    status: execution.status,
    http: execution.responseStatusCode,
  };
  runs.push(run);
  return { ...run, body: execution.responseBody };
}

/* ------------------------------------------------------------------ jornada -- */

let created = { challengeId: '', rewardId: '', campaignId: '', submissionId: '' };
let adminSecret = '';

try {
  await mkdir(OUT, { recursive: true });
  const now = new Date();

  // ---------------------------------------------------------------- fixtures --
  const admin = await createActor('equipe', `Equipe QA ${runId} (temporária)`);
  const creator = await createActor('criadora', `Criadora QA ${runId} (temporária)`);
  const membership = await teams.createMembership({ teamId, userId: admin.id, roles: ['admin'] });
  membershipId = membership.$id;
  log('membership admin:', membershipId, '· confirm =', membership.confirm);

  // Perfil completo: a lista da administração lê `onboardingCompletedAt` não-nulo.
  await db.createRow({
    databaseId,
    tableId: 'profiles',
    rowId: creator.id,
    data: {
      userId: creator.id,
      name: `Ana QA ${runId}`,
      avatarFileId: '',
      phone: '+55 11 90000-0000',
      city: 'São Paulo',
      state: 'SP',
      birthDate: '1996-04-12',
      niche: 'Moda e estilo',
      creatorType: 'criadora',
      onboardingCompletedAt: now.toISOString(),
      publicProfile: true,
    },
    permissions: [Permission.read(Role.user(creator.id))],
  });
  sweeps.push({ target: 'profiles (fixture)', removed: 1 });

  adminSecret = (
    await new Account(keyClient()).createEmailPasswordSession({
      email: admin.email,
      password: admin.password,
    })
  ).secret;

  stack = await startConnectedStack();
  browser = await chromium.launch();

  const contextOptions = {
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  };

  const adminContext = await browser.newContext(contextOptions);
  const adminPage = await adminContext.newPage();
  adminPage.on('console', (message) => {
    if (message.type() === 'error') log('[browser:error]', message.text().slice(0, 200));
  });
  const creatorContext = await browser.newContext(contextOptions);
  const creatorPage = await creatorContext.newPage();

  await signIn(adminPage, admin);

  // 0. Visão geral antes de qualquer escrita desta rodada: o que estiver ali é o
  // acervo real do staging, e zero é resposta — não ausência.
  await adminPage.goto(`${stack.origin}/admin`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-visao-geral-inicial');

  // 1. Campanha — cadastro puro, sem semântica de bônus.
  await adminPage.goto(`${stack.origin}/admin/campanhas`, { waitUntil: 'domcontentloaded' });
  await adminPage.fill('input[name="name"]', CAMPAIGN_NAME);
  await adminPage.selectOption('select[name="status"]', 'published');
  await adminPage.fill('input[name="startsAt"]', wallClock(new Date(now.getTime() - 86_400_000)));
  await adminPage.fill('input[name="endsAt"]', wallClock(new Date(now.getTime() + 30 * 86_400_000)));
  await adminPage.fill(
    'textarea[name="description"]',
    'Agrupamento da campanha de volta às aulas. A equipe usa para acompanhar os desafios do período.',
  );
  await adminPage.getByRole('button', { name: 'Criar campanha' }).click();
  await expectVisible(adminPage, 'Campanha criada.');

  // 2. Desafio: formulário preenchido com o conteúdo REAL desta rodada (#3 da entrega).
  await adminPage.goto(`${stack.origin}/admin/desafios/novo`, { waitUntil: 'domcontentloaded' });
  await adminPage.fill('input[name="name"]', CHALLENGE_NAME);
  await adminPage.fill('input[name="slug"]', SLUG);
  await adminPage.selectOption('select[name="platform"]', 'instagram');
  await adminPage.fill('input[name="startsAt"]', wallClock(new Date(now.getTime() - 86_400_000)));
  await adminPage.fill('input[name="endsAt"]', wallClock(new Date(now.getTime() + 30 * 86_400_000)));
  await adminPage.fill('input[name="points"]', String(POINTS));
  await adminPage.selectOption('select[name="campaignId"]', { label: CAMPAIGN_NAME });
  await adminPage.fill('input[name="hashtags"]', '#nuycreators #voltaasaulas');
  await adminPage.fill('input[name="mentions"]', '@nuycreators');
  await adminPage.fill(
    'textarea[name="description"]',
    'Grave um reel mostrando os bastidores da sua rotina de criação: o que você prepara antes de publicar um conteúdo. Conte a história em até 60 segundos e use as hashtags do desafio.',
  );
  await adminPage.getByRole('button', { name: 'Adicionar requisito' }).click();
  await adminPage.getByRole('button', { name: 'Adicionar requisito' }).click();
  await adminPage.locator('select[name="requirementType"]').first().selectOption('hashtag');
  await adminPage
    .locator('input[name="requirementConfig"]')
    .first()
    .fill('{"value":"#nuycreators"}');
  await adminPage.locator('select[name="requirementType"]').nth(1).selectOption('link');
  await adminPage
    .locator('input[name="requirementConfig"]')
    .nth(1)
    .fill('{"value":"link da publicação no Instagram"}');
  await shot(adminPage, 'admin-desafio-formulario');

  await adminPage.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expectVisible(adminPage, 'Rascunho salvo.');

  // 3. A equipe VÊ o rascunho na lista; a creator não (provado logo abaixo).
  await adminPage.goto(`${stack.origin}/admin/desafios`, { waitUntil: 'domcontentloaded' });
  created.challengeId = await adminPage
    .getByRole('link', { name: CHALLENGE_NAME })
    .first()
    .getAttribute('href')
    .then((href) => href?.split('/').filter(Boolean).pop() ?? '');
  await shot(adminPage, 'admin-desafios-rascunho');

  // Rascunho não é catálogo: a creator não encontra na lista NEM digitando a URL.
  await signIn(creatorPage, creator);
  await creatorPage.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
  const leaked = await creatorPage.getByText(CHALLENGE_NAME).count();
  if (leaked)
    throw new Error('Rascunho apareceu no catálogo da creator — a barreira de catálogo falhou.');
  const draftDetail = await creatorPage.goto(`${stack.origin}/app/desafios/${SLUG}`, {
    waitUntil: 'domcontentloaded',
  });
  const draftBody = await creatorPage.locator('body').innerText();
  const leakedText = [CHALLENGE_NAME, 'Grave um reel mostrando os bastidores'].filter((needle) =>
    draftBody.includes(needle),
  );
  if (leakedText.length)
    throw new Error(
      `Rascunho vazou para a creator na URL direta: ${JSON.stringify(leakedText)} — HTTP ${draftDetail?.status()}`,
    );
  log(`rascunho invisível à creator · /app/desafios/${SLUG} → HTTP ${draftDetail?.status()}`);

  // 4. Publicar pela tela de detalhe — a transição que muda o que a creator vê.
  await adminPage.goto(`${stack.origin}/admin/desafios/${created.challengeId}`, {
    waitUntil: 'domcontentloaded',
  });
  await shot(adminPage, 'admin-desafio-rascunho-publicar');
  await adminPage.getByRole('button', { name: 'Publicar desafio' }).click();
  await expectVisible(adminPage, 'Desafio publicado.');
  await adminPage.reload({ waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-desafio-detalhe');

  // (#2 da entrega) Catálogo da equipe com o desafio publicado.
  await adminPage.goto(`${stack.origin}/admin/desafios`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-desafios');

  // 5. A creator vê, entra e envia.
  await creatorPage.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
  const challengeLink = creatorPage.getByRole('link', { name: CHALLENGE_NAME }).first();
  await challengeLink.waitFor({ state: 'visible', timeout: 30_000 });
  await shot(creatorPage, 'app-desafio-publicado');
  await challengeLink.click();
  await creatorPage.waitForURL(new RegExp(`/app/desafios/${SLUG}$`), { timeout: 30_000 });
  await creatorPage.getByRole('button', { name: 'Participar do desafio' }).click();
  // O aviso de sucesso mora DENTRO do formulário, e o formulário sai de cena
  // quando a participação existe: quem prova a escrita é o ESTADO novo.
  await expectVisible(creatorPage, 'Participando', true);
  await creatorPage.fill('input[name="url"]', PUBLICATION);
  await creatorPage.getByRole('button', { name: 'Enviar para análise' }).click();
  await expectVisible(creatorPage, 'Em análise', true);

  // (#1 da entrega) Visão geral com o envio na fila.
  await adminPage.goto(`${stack.origin}/admin`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-visao-geral');

  // 6. (#4 da entrega) Fila de submissões → detalhe → aprovar.
  await adminPage.goto(`${stack.origin}/admin/submissoes`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-submissoes');
  const row = adminPage.locator('tr', { hasText: CHALLENGE_NAME }).first();
  created.submissionId =
    (await row.getByRole('link', { name: 'Analisar' }).getAttribute('href'))?.split('/').pop() ?? '';
  await row.getByRole('link', { name: 'Analisar' }).click();
  await adminPage.waitForURL(new RegExp(`/admin/submissoes/${created.submissionId}$`), {
    timeout: 30_000,
  });
  await shot(adminPage, 'admin-submissao');
  await adminPage.fill('input[name="reason"]', 'Conteúdo confere com o briefing do desafio.');
  await adminPage.getByRole('button', { name: 'Aprovar' }).click();
  await expectVisible(adminPage, 'Envio aprovado.');

  // 7. (#5 da entrega) Creators — o saldo creditado aparece na lista.
  await adminPage.goto(`${stack.origin}/admin/creators`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-creators');
  await adminPage.getByRole('link', { name: `Ana QA ${runId}` }).first().click();
  await adminPage.waitForURL(new RegExp(`/admin/creators/${creator.id}$`), { timeout: 30_000 });
  await shot(adminPage, 'admin-creator');

  // 8. (#7 da entrega) Formulário de recompensa, preenchido com o conteúdo desta rodada.
  await adminPage.goto(`${stack.origin}/admin/recompensas/nova`, { waitUntil: 'domcontentloaded' });
  await adminPage.fill('input[name="name"]', REWARD_NAME);
  await adminPage.fill('input[name="type"]', 'produto físico');
  await adminPage.fill('input[name="pointsCost"]', String(REWARD_COST));
  await adminPage.fill('input[name="stock"]', String(REWARD_STOCK));
  await adminPage.fill('input[name="perUserLimit"]', '1');
  await adminPage.fill('input[name="startsAt"]', wallClock(new Date(now.getTime() - 86_400_000)));
  await adminPage.fill('input[name="endsAt"]', wallClock(new Date(now.getTime() + 30 * 86_400_000)));
  await adminPage.fill(
    'textarea[name="description"]',
    'Kit de câmera com tripé e ring light, enviado para o endereço cadastrado em até 15 dias após o resgate.',
  );
  await shot(adminPage, 'admin-recompensa-formulario');
  await adminPage.getByRole('button', { name: 'Criar e ativar' }).click();
  await expectVisible(adminPage, 'Recompensa criada e ativada no catálogo.');

  // (#6 da entrega) Catálogo de recompensas da equipe.
  await adminPage.goto(`${stack.origin}/admin/recompensas`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-recompensas');
  created.rewardId = await adminPage
    .getByRole('link', { name: REWARD_NAME })
    .first()
    .getAttribute('href')
    .then((href) => href?.split('/').filter(Boolean).pop() ?? '');

  // Estoque: valor absoluto + motivo, e a auditoria registra quem ajustou.
  await adminPage.goto(`${stack.origin}/admin/recompensas/${created.rewardId}`, {
    waitUntil: 'domcontentloaded',
  });
  // Dois campos `stock` na página, de propósito: o do formulário de edição é
  // SOMENTE LEITURA (estoque de recompensa existente só muda com motivo, no
  // formulário de ajuste). O alvo é o do formulário que tem o motivo.
  const stockForm = adminPage.locator('form:has(input[name="reason"])');
  await stockForm.locator('input[name="stock"]').fill(String(STOCK_AFTER));
  await stockForm.locator('input[name="reason"]').fill(`Reposição do lote — ${runId}`);
  await adminPage.getByRole('button', { name: 'Ajustar estoque' }).click();
  await expectVisible(adminPage, `Estoque ajustado para ${STOCK_AFTER}`);
  await adminPage.reload({ waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-recompensa-detalhe');

  await adminPage.goto(`${stack.origin}/admin/campanhas`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-campanhas');

  // 9. (#8 da entrega) Relatórios.
  await adminPage.goto(`${stack.origin}/admin/relatorios`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-relatorios');

  // 10. Fechamento: a visão geral com tudo o que a jornada produziu.
  await adminPage.goto(`${stack.origin}/admin`, { waitUntil: 'domcontentloaded' });
  await shot(adminPage, 'admin-visao-geral-final');

  // ------------------------------------------------------- prova: o caminho --
  // Cada escrita da tela é uma EXECUÇÃO real, criada DEPOIS do início da corrida.
  const functionsService = new Functions(keyClient());
  const proofs = [];
  for (const functionId of [
    'admin-console',
    'join-challenge',
    'submit-content',
    'moderate-submission',
  ]) {
    const page = await functionsService.listExecutions({
      functionId,
      queries: [Query.orderDesc('$createdAt'), Query.limit(50)],
    });
    const mine = page.executions.filter(
      (execution) => execution.trigger === 'http' && execution.$createdAt >= now.toISOString(),
    );
    proofs.push({
      functionId,
      execucoes: mine.length,
      ultima: mine[0]?.status ?? '—',
      http: mine[0]?.responseStatusCode ?? '—',
    });
  }
  console.log('\nExecuções do runtime criadas por esta jornada:');
  console.table(proofs);

  await adminContext.close();
  await creatorContext.close();
} finally {
  await browser?.close();
  await stack?.close();

  // Drain ANTES de varrer: o evento da aprovação só vira notificação no
  // processamento, e varrer primeiro deixaria a notificação nascer depois —
  // órfã de uma conta que já não existe. Best-effort: falha não aborta limpeza.
  if (adminSecret)
    await runFunction('process-outbox', { kind: 'session', secret: adminSecret }).catch(() => null);

  if (db) {
    // O id que a tela devolve só existe se a jornada chegou até lá. Se ela parou
    // antes, o que foi criado é reconhecido pelo NOME marcado — a marca é a
    // fronteira da limpeza, não o caminho que a rodada percorreu.
    if (!created.challengeId) {
      const found = await db.listRows({
        databaseId,
        tableId: 'challenges',
        queries: [Query.equal('slug', SLUG), Query.limit(10)],
      });
      created.challengeId = found.rows.map((row) => String(row.$id))[0] ?? '';
    }
    created.rewardId ||= (await idsNamed('rewards', REWARD_NAME))[0] ?? '';
    created.campaignId ||= (await idsNamed('campaigns', CAMPAIGN_NAME))[0] ?? '';

    const mine = actors;
    const submissions = await sweep('challenge_submissions', 'userId', mine);
    await sweep('submission_history', 'submissionId', submissions);
    const redemptions = await sweep('reward_redemptions', 'userId', mine);
    await sweep('redemption_history', 'redemptionId', redemptions);
    const audits = await sweep('audit_logs', 'affectedUserId', mine);
    const byActor = await sweep('audit_logs', 'actorId', mine);
    await sweep('audit_log_snapshots', 'auditLogId', [...audits, ...byActor]);
    // O agregado do outbox é POLIMÓRFICO: desafio, submissão, recompensa e
    // criadora apontam para ids diferentes — cada um entra explicitamente.
    const aggregates = [
      ...[created.challengeId, created.submissionId, created.rewardId].filter(Boolean),
      ...mine,
      ...redemptions,
    ];
    await sweep('outbox_events', 'aggregateId', aggregates);
    await sweep('notifications', 'userId', mine);
    await sweep('notifications', 'referenceId', [
      ...[created.submissionId].filter(Boolean),
      ...redemptions,
    ]);
    await sweep('operation_keys', 'actorId', mine);
    await sweep('ranking_entries', 'userId', mine);
    await sweep('point_transactions', 'userId', mine);
    await sweep('point_accounts', 'userId', mine);
    await sweep('challenge_participants', 'userId', mine);
    await sweep('profiles', 'userId', mine);
    await sweep('challenge_requirements', 'challengeId', [created.challengeId].filter(Boolean));
    await sweep('challenges', 'slug', [SLUG]);
    await deleteRows('rewards', [created.rewardId].filter(Boolean));
    await deleteRows('campaigns', [created.campaignId].filter(Boolean));

    if (membershipId)
      sweeps.push({
        target: 'team.nuy-admins',
        removed: [200, 404].includes(
          await responseCode(() => teams.deleteMembership({ teamId, membershipId })),
        )
          ? 1
          : 0,
      });
    for (const id of actors)
      sweeps.push({
        target: `users.${id}`,
        removed: [200, 404].includes(await responseCode(() => users.delete({ userId: id })))
          ? 1
          : 0,
      });

    console.log(`\nLimpeza da captura (run ${runId}) — só o que nasceu nesta rodada:`);
    console.table(sweeps);
  }
}
