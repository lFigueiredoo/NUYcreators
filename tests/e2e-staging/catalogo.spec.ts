import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
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
import { team } from '../../infra/appwrite/schema';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { rowId } from '../../src/features/workspace/core/ids';
import { startConnectedStack, type ConnectedStack } from '../support/staging-stack.mjs';

/**
 * CATÁLOGO ADMINISTRADO — o que a equipe escreve, conferido na LINHA.
 *
 * Esta suíte existe por causa de um defeito real, achado pela integração e
 * corrigido: `saveChallenge` e `saveReward` respondiam `version: 3` enquanto
 * gravavam só os campos do formulário. A linha ficava na versão antiga, e disso
 * saíam dois estragos que a tela não mostra — o `expectedVersion` parava de
 * barrar a segunda edição (a última digitação vencia em silêncio) e publicar um
 * rascunho existente dava permissão de leitura sem trocar o estado.
 *
 * Aqui o caminho é o de produção, ponta a ponta: a tela chama a server action, a
 * action executa a `admin-console` pelo runtime do Appwrite, e o que se confere
 * depois é a LINHA no banco — não a resposta da tela. Uma suíte que só olhasse a
 * resposta teria aprovado o defeito.
 *
 * O que este arquivo prova, e nenhuma outra suíte prova:
 *
 *  1. rascunho nasce invisível à creator — na lista E na URL direta;
 *  2. editar e publicar pela tela troca estado, versão e permissão no MESMO
 *     commit, e a linha passa a dizer o que a tela diz;
 *  3. duas edições partindo da mesma versão: a primeira grava, a segunda é
 *     recusada com `conflict` — nada de last-write-wins silencioso;
 *  4. a recompensa segue a mesma regra (rascunho → editar → ativar);
 *  5. cada escrita desta corrida foi decidida pelo deployment ATIVO da
 *     `admin-console`, e a execução que devolveu 409 é a prova viva do item 3.
 *
 * Fixtures: contas, desafio e recompensa nascem com o `runId` no id e no nome —
 * a marca é a fronteira da limpeza. O que esta rodada cria, ela apaga; o que não
 * é dela, não é tocada. Nenhum valor de credencial é impresso.
 */
const runId = `e2ecat${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const testKey = process.env.APPWRITE_TEST_API_KEY ?? '';

const SLUG = `${runId}-desafio`;
const CHALLENGE_NAME = `Desafio catálogo ${runId} (temporário)`;
const EDITED_NAME = `Desafio catálogo ${runId} — revisado`;
const REWARD_NAME = `Recompensa catálogo ${runId} (temporária)`;
const REWARD_EDITED_NAME = `Recompensa catálogo ${runId} — revisada`;
const DESCRIPTION = 'Fixture do QA de catálogo — apagada ao fim da corrida.';
const FIRST_EDIT = `Primeira edição da corrida ${runId}.`;
const STALE_EDIT = `Segunda edição, com a versão que já passou — tem que ser recusada.`;
const POINTS = 800;
const EDITED_POINTS = 900;

type Actor = { id: string; email: string; password: string };
type Run = { functionId: string; deploymentId: string; status: string; http: number; body: string };
type Sweep = { target: string; removed: number };

let stack: ConnectedStack;
let db: TablesDB;
let teams: Teams;
let users: Users;
let functions: Functions;
let creator: Actor;
let admin: Actor;
let adminSecret = '';
let membershipId = '';
let startedAt = '';
const runs: Run[] = [];
const sweeps: Sweep[] = [];

const plainClient = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!);
const keyClient = () => plainClient().setKey(testKey);

async function responseCode(operation: () => Promise<unknown>) {
  try {
    await operation();
    return 200;
  } catch (error) {
    return (error as { code?: number }).code ?? -1;
  }
}

/** Data e hora no relógio da operação (Brasília), no formato de `datetime-local`. */
function wallClock(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
    .format(date)
    .replace(' ', 'T')
    .slice(0, 16);
}

async function createActor(label: string, name: string): Promise<Actor> {
  const id = `${runId}-${label}`;
  const email = `${id}@example.invalid`; // caixa não entregável, de propósito
  const password = randomBytes(24).toString('hex');
  await new Account(plainClient()).create({ userId: id, email, password, name });
  return { id, email, password };
}

/** Executa a Function pelo runtime — o mesmo caminho que a server action usa. */
async function runFunction(functionId: string, body: Record<string, unknown>): Promise<Run> {
  const execution = await new Functions(plainClient().setSession(adminSecret)).createExecution({
    functionId,
    body: JSON.stringify(body),
    async: false,
    method: ExecutionMethod.POST,
    xpath: '/',
    headers: { 'content-type': 'application/json' },
  });
  const run: Run = {
    functionId,
    deploymentId: execution.deploymentId,
    status: execution.status,
    http: execution.responseStatusCode,
    body: execution.responseBody,
  };
  runs.push(run);
  return run;
}

async function signIn(page: Page, actor: Actor) {
  await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', actor.email);
  await page.fill('input[name="password"]', actor.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/** Varredura paginada por uma coluna — limpeza completa, não "as primeiras 100". */
async function sweep(tableId: string, column: string, values: string[]): Promise<string[]> {
  const removed: string[] = [];
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
    // Nada saiu nesta passada: a página não esvazia e insistir seria laço infinito.
    if (page.rows.length < 100 || deleted === 0) break;
  }
  sweeps.push({ target: `${tableId}.${column}`, removed: removed.length });
  return removed;
}

/** O que ficou gravado na linha — a leitura que a próxima requisição faria. */
async function row(tableId: string, rowId: string) {
  return db.getRow({ databaseId, tableId, rowId });
}

test.beforeAll(async () => {
  assertTestEnvironment(process.env);
  if (!testKey) throw new Error('APPWRITE_TEST_API_KEY ausente: sem fixtures não há QA conectado.');

  db = new TablesDB(keyClient());
  teams = new Teams(keyClient());
  users = new Users(keyClient());
  functions = new Functions(keyClient());

  creator = await createActor('criadora', `Criadora QA ${runId}`);
  admin = await createActor('equipe', `Equipe QA ${runId}`);
  // Perfil COMPLETO: sem `onboardingCompletedAt` a creator é mandada ao
  // onboarding e nunca chega ao catálogo — medido na primeira execução, em que as
  // asserções de invisibilidade do rascunho passaram por vacuidade, não por regra.
  await db.createRow({
    databaseId,
    tableId: 'profiles',
    rowId: creator.id,
    data: {
      userId: creator.id,
      name: `Criadora QA ${runId}`,
      avatarFileId: '',
      phone: '+55 11 90000-0000',
      city: 'São Paulo',
      state: 'SP',
      birthDate: '1996-04-12',
      niche: 'Moda e estilo',
      creatorType: 'criadora',
      onboardingCompletedAt: new Date().toISOString(),
      publicProfile: true,
    },
    permissions: [Permission.read(Role.user(creator.id))],
  });
  const membership = await teams.createMembership({
    teamId: team.id,
    userId: admin.id,
    roles: ['admin'],
  });
  membershipId = membership.$id;
  adminSecret = (
    await new Account(keyClient()).createEmailPasswordSession({
      email: admin.email,
      password: admin.password,
    })
  ).secret!;

  stack = await startConnectedStack();
  startedAt = new Date().toISOString();
});

test.afterAll(async () => {
  if (!db) return;
  const mine = [creator?.id, admin?.id].filter(Boolean) as string[];

  // Drenar antes de varrer: publicar emite evento, e a notificação dele só nasce
  // no processamento — varrer primeiro deixaria a notificação nascer depois,
  // órfã de contas que já não existem. Best-effort: falha não aborta a limpeza.
  if (adminSecret) await runFunction('process-outbox', {}).catch(() => null);

  const challenges = await db.listRows({
    databaseId,
    tableId: 'challenges',
    queries: [Query.equal('slug', SLUG), Query.limit(10)],
  });
  const challengeIds = challenges.rows.map((item) => String(item.$id));
  const rewards = await db.listRows({
    databaseId,
    tableId: 'rewards',
    queries: [Query.equal('name', [REWARD_NAME, REWARD_EDITED_NAME]), Query.limit(10)],
  });
  const rewardIds = rewards.rows.map((item) => String(item.$id));
  const aggregates = [...challengeIds, ...rewardIds, ...mine];

  const audits = await sweep('audit_logs', 'actorId', mine);
  await sweep('audit_log_snapshots', 'auditLogId', audits);
  await sweep('outbox_events', 'aggregateId', aggregates);
  await sweep('notifications', 'userId', mine);
  await sweep('notifications', 'referenceId', aggregates);
  await sweep('operation_keys', 'actorId', mine);
  await sweep('challenge_requirements', 'challengeId', challengeIds);
  await sweep('challenges', 'slug', [SLUG]);
  await sweep('rewards', 'name', [REWARD_NAME, REWARD_EDITED_NAME]);
  await sweep('profiles', 'userId', mine);

  if (membershipId)
    sweeps.push({
      target: 'team.nuy-admins',
      removed: [200, 404].includes(
        await responseCode(() => teams.deleteMembership({ teamId: team.id, membershipId })),
      )
        ? 1
        : 0,
    });
  for (const user of [creator, admin])
    if (user)
      sweeps.push({
        target: `users.${user.id.slice(-8)}`,
        removed: [200, 404].includes(await responseCode(() => users.delete({ userId: user.id })))
          ? 1
          : 0,
      });

  console.log(`\nLimpeza do QA de catálogo (run ${runId}):`);
  console.table(sweeps);
  await stack?.close();
});

test('rascunho → editar → publicar, com a linha conferida e a concorrência recusada', async ({
  browser,
}) => {
  const now = new Date();
  const startsAt = wallClock(new Date(now.getTime() - 86_400_000));
  const endsAt = wallClock(new Date(now.getTime() + 30 * 86_400_000));

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  await signIn(adminPage, admin);
  await signIn(creatorPage, creator);

  // ------------------------------------------------- 1. o rascunho nasce aqui
  await adminPage.goto(`${stack.origin}/admin/desafios/novo`, { waitUntil: 'domcontentloaded' });
  await adminPage.fill('input[name="name"]', CHALLENGE_NAME);
  await adminPage.fill('input[name="slug"]', SLUG);
  await adminPage.selectOption('select[name="platform"]', 'instagram');
  await adminPage.fill('input[name="startsAt"]', startsAt);
  await adminPage.fill('input[name="endsAt"]', endsAt);
  await adminPage.fill('input[name="points"]', String(POINTS));
  await adminPage.fill('textarea[name="description"]', DESCRIPTION);
  await adminPage.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(adminPage.getByText('Rascunho salvo.')).toBeVisible();

  // O id é DERIVADO, não adivinhado: o mesmo `rowId` que o núcleo cunha. Se a
  // regra de id mudar, a leitura falha aqui — que é o lugar certo para descobrir.
  const draftRow = await row('challenges', rowId('challenge', SLUG));
  expect(draftRow).toMatchObject({ status: 'draft', version: 1 });
  expect(draftRow.$permissions).toEqual([]);

  // A equipe vê o rascunho na lista; o id vem do link, não de suposição.
  await adminPage.goto(`${stack.origin}/admin/desafios`, { waitUntil: 'domcontentloaded' });
  const draftLink = adminPage.getByRole('link', { name: CHALLENGE_NAME }).first();
  await expect(draftLink).toBeVisible();
  const challengeId = (await draftLink.getAttribute('href'))!.split('/').filter(Boolean).pop()!;

  // ---------------------------------- 2. rascunho NÃO é catálogo para a creator
  await creatorPage.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText(CHALLENGE_NAME)).toHaveCount(0);
  await creatorPage.goto(`${stack.origin}/app/desafios/${SLUG}`, { waitUntil: 'domcontentloaded' });
  const draftBody = await creatorPage.locator('body').innerText();
  expect(draftBody).not.toContain(CHALLENGE_NAME);
  expect(draftBody).not.toContain(DESCRIPTION);
  await expect(creatorPage.getByText('Desafio não encontrado.')).toBeVisible();

  // ------------------------------------- 3. editar e publicar pela tela
  await adminPage.goto(`${stack.origin}/admin/desafios/${challengeId}`, {
    waitUntil: 'domcontentloaded',
  });
  // Dois formulários na página (edição e transição): o alvo é o que tem o `slug`.
  const editForm = adminPage.locator('form:has(input[name="slug"])');
  await editForm.locator('input[name="name"]').fill(EDITED_NAME);
  await editForm.locator('input[name="points"]').fill(String(EDITED_POINTS));
  await editForm.getByRole('button', { name: 'Salvar e publicar' }).click();
  await expect(adminPage.getByText('Desafio publicado. As alterações já valem')).toBeVisible();

  // A prova é a LINHA: estado, versão e permissão andaram JUNTOS no mesmo commit.
  // O defeito corrigido respondia versão nova e deixava a linha na antiga.
  const published = await row('challenges', challengeId);
  expect(published).toMatchObject({
    name: EDITED_NAME,
    points: EDITED_POINTS,
    status: 'published',
    version: 2,
  });
  expect(published.$permissions).toContain(Permission.read(Role.any()));

  // A tela concorda com a linha: recarregada, ela já oferece ENCERRAR (só o que
  // está no ar encerra) em vez de publicar de novo.
  await adminPage.reload({ waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('button', { name: 'Encerrar desafio' })).toBeVisible();

  // ------------------------------------------ 4. a creator agora vê o desafio
  await creatorPage.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
  const liveLink = creatorPage.getByRole('link', { name: EDITED_NAME }).first();
  await expect(liveLink).toBeVisible();
  await liveLink.click();
  await expect(creatorPage).toHaveURL(new RegExp(`/app/desafios/${SLUG}$`));
  await expect(creatorPage.getByText(DESCRIPTION)).toBeVisible();

  // ------------------------------- 5. duas edições partindo da MESMA versão
  // O caminho é o runtime, exatamente como a server action faz. Com o defeito, a
  // primeira edição NÃO avançava a versão da linha e a segunda passava — a última
  // digitação vencia em silêncio. A prova é dupla: a recusa E a linha intacta.
  const draft = {
    slug: SLUG,
    name: EDITED_NAME,
    description: FIRST_EDIT,
    platform: 'instagram',
    startsAt,
    endsAt,
    points: EDITED_POINTS,
    imageFileId: '',
    requiredLevelId: '',
    participantLimit: null,
    campaignId: '',
    productId: '',
    hashtags: '',
    mentions: '',
    requirements: [],
  };
  const version = published.version;
  const first = await runFunction('admin-console', {
    action: 'challenge.save',
    draft,
    publish: false,
    expectedVersion: version,
    timeZone: 'America/Sao_Paulo',
  });
  const stale = await runFunction('admin-console', {
    action: 'challenge.save',
    draft: { ...draft, description: STALE_EDIT },
    publish: false,
    expectedVersion: version,
    timeZone: 'America/Sao_Paulo',
  });

  expect({ status: first.status, http: first.http }).toEqual({ status: 'completed', http: 200 });
  expect({ status: stale.status, http: stale.http }).toEqual({ status: 'completed', http: 409 });
  expect(JSON.parse(stale.body || '{}')).toMatchObject({ error: 'conflict' });

  const afterRace = await row('challenges', challengeId);
  expect(afterRace).toMatchObject({ description: FIRST_EDIT, version: version + 1 });

  // ---------------------------------------- 6. a recompensa, a mesma regra
  await adminPage.goto(`${stack.origin}/admin/recompensas/nova`, { waitUntil: 'domcontentloaded' });
  await adminPage.fill('input[name="name"]', REWARD_NAME);
  await adminPage.fill('input[name="type"]', 'produto físico');
  await adminPage.fill('input[name="pointsCost"]', '250');
  await adminPage.fill('input[name="stock"]', '3');
  await adminPage.fill('input[name="perUserLimit"]', '1');
  await adminPage.fill('input[name="startsAt"]', startsAt);
  await adminPage.fill('input[name="endsAt"]', endsAt);
  await adminPage.fill('textarea[name="description"]', DESCRIPTION);
  await adminPage.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(adminPage.getByText('Rascunho de recompensa salvo.')).toBeVisible();

  await adminPage.goto(`${stack.origin}/admin/recompensas`, { waitUntil: 'domcontentloaded' });
  const rewardLink = adminPage.getByRole('link', { name: REWARD_NAME }).first();
  await expect(rewardLink).toBeVisible();
  const rewardId = (await rewardLink.getAttribute('href'))!.split('/').filter(Boolean).pop()!;

  const rewardDraft = await row('rewards', rewardId);
  expect(rewardDraft).toMatchObject({ status: 'draft', version: 1 });
  expect(rewardDraft.$permissions).toEqual([]);

  // A creator não vê recompensa em rascunho — nem na lista, nem no catálogo.
  await creatorPage.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText(REWARD_NAME)).toHaveCount(0);

  await adminPage.goto(`${stack.origin}/admin/recompensas/${rewardId}`, {
    waitUntil: 'domcontentloaded',
  });
  const rewardForm = adminPage.locator('form:has(input[name="name"])');
  await rewardForm.locator('input[name="name"]').fill(REWARD_EDITED_NAME);
  await rewardForm.locator('input[name="pointsCost"]').fill('300');
  await rewardForm.getByRole('button', { name: 'Salvar e ativar' }).click();
  await expect(adminPage.getByText('Recompensa salva.')).toBeVisible();

  const rewardLive = await row('rewards', rewardId);
  expect(rewardLive).toMatchObject({
    name: REWARD_EDITED_NAME,
    pointsCost: 300,
    status: 'published',
    version: 2,
  });
  expect(rewardLive.$permissions).toContain(Permission.read(Role.any()));

  // ------------------------- 7. prova: quem decidiu cada escrita desta corrida
  // A pergunta que esta seção responde não é "a tela funcionou", é "QUEM estava
  // servindo" — todo call desta corrida tem que ter sido decidido pelo deployment
  // ativo agora. Deployment antigo aqui seria sinônimo de defeito de volta.
  const active = await functions.get({ functionId: 'admin-console' });
  const executions = await functions.listExecutions({
    functionId: 'admin-console',
    queries: [Query.orderDesc('$createdAt'), Query.limit(100)],
  });
  const mine = executions.executions.filter(
    (execution) => execution.trigger === 'http' && execution.$createdAt >= startedAt,
  );
  expect(mine.length).toBeGreaterThanOrEqual(3);
  expect(mine.every((execution) => execution.deploymentId === active.deploymentId)).toBe(true);
  expect(mine.every((execution) => execution.status === 'completed')).toBe(true);
  expect(mine.map((execution) => execution.responseStatusCode)).toContain(409);

  console.log(`\nExecuções do runtime desta corrida (run ${runId}, sem credencial):`);
  console.table(
    mine.map((execution) => ({
      functionId: 'admin-console',
      deploymentId: execution.deploymentId,
      status: execution.status,
      http: execution.responseStatusCode,
    })),
  );

  await adminContext.close();
  await creatorContext.close();
});
