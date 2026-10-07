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
import { levelSeed, tables, team } from '../../infra/appwrite/schema';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { canonicalUrl, digest, rowId } from '../../src/features/workspace/core/ids';
import { levelFor, type Level } from '../../src/features/workspace/domain/levels';
import { startConnectedStack, type ConnectedStack } from '../support/staging-stack.mjs';

/**
 * QA CONECTADO — a jornada operacional inteira, pela TELA, contra o staging.
 *
 * O que este arquivo prova, e que nenhuma das outras suítes prova:
 *
 *  1. o produto, servido em modo produção, executa a OPERAÇÃO REAL — cada
 *     escrita sai da server action, vira `POST /v1/functions/{id}/executions`
 *     com a SESSÃO da usuária e é decidida no runtime do Appwrite;
 *  2. a jornada completa fecha: criadora entra no desafio → envia conteúdo →
 *     equipe aprova na fila → pontos, saldo, nível, ranking e aviso chegam à
 *     criadora → o resgate debita o saldo e NÃO rebaixa a jornada;
 *  3. o isolamento continua valendo no caminho conectado (o painel da equipe
 *     só abre para membership confirmada; a fila mostra o envio pelo papel).
 *
 * Fixtures: as duas contas, o desafio e a recompensa nascem aqui, com o mesmo
 * `runId` no id — é a fronteira da limpeza. Nada é presumido sobre o que já
 * existe no staging: o que este arquivo cria, ele apaga; o que não é dele, não
 * é tocado. Nenhum valor de chave é impresso — só `functionId`, `deploymentId`,
 * status da execução e status HTTP, que SÃO a prova.
 */
const runId = `e2e${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const testKey = process.env.APPWRITE_TEST_API_KEY ?? '';
const CHALLENGE_POINTS = 800;
const REWARD_COST = 100;
const REWARD_STOCK = 3;

const CHALLENGE = `${runId}-desafio`;
const REWARD = `${runId}-recompensa`;
const CHALLENGE_NAME = `Desafio conectado ${runId} (temporário)`;
const REWARD_NAME = `Recompensa conectada ${runId} (temporária)`;
const PUBLICATION = `https://www.instagram.com/p/${runId}/?utm_source=qa-conectado`;

type Actor = { id: string; email: string; password: string; profile: boolean };
type Credential = { kind: 'session'; secret: string } | { kind: 'key' };
type Run = {
  functionId: string;
  deploymentId: string;
  status: string;
  http: number;
  body: string;
};
type Sweep = { target: string; removed: number };

let stack: ConnectedStack;
let db: TablesDB;
let teams: Teams;
let users: Users;
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

/** Colunas obrigatórias do manifesto, com override — fixture não inventa campo. */
function fixtureData(tableId: string, owner: string, key: string): Record<string, unknown> {
  const definition = tables.find((table) => table.id === tableId)!;
  return Object.fromEntries(
    definition.columns
      .filter((column) => column.required)
      .map((column) => [
        column.key,
        column.key === 'userId' || column.key === 'authUserId'
          ? owner
          : column.type === 'datetime'
            ? new Date().toISOString()
            : column.type === 'boolean'
              ? false
              : column.type === 'integer'
                ? 1
                : `${key}-${column.key}`,
      ]),
  );
}

async function fixture(
  tableId: string,
  rowIdValue: string,
  owner: string,
  override: Record<string, unknown> = {},
  permissions: string[] = [],
) {
  await db.createRow({
    databaseId,
    tableId,
    rowId: rowIdValue,
    data: { ...fixtureData(tableId, owner, rowIdValue), ...override },
    permissions,
  });
  return rowIdValue;
}

async function createActor(label: string, withProfile: boolean): Promise<Actor> {
  const id = `${runId}-${label}`;
  const email = `${id}@example.invalid`; // caixa não entregável, de propósito
  const password = randomBytes(24).toString('hex');
  await new Account(plainClient()).create({ userId: id, email, password, name: `QA ${label}` });
  if (withProfile)
    await fixture('profiles', id, id, { name: `Criadora QA ${runId}` }, [
      Permission.read(Role.user(id)),
    ]);
  return { id, email, password, profile: withProfile };
}

const expectedLevel = levelFor(
  CHALLENGE_POINTS,
  levelSeed.map((level, order): Level => ({ ...level, order })),
)!.name;

/** Executa a Function pelo runtime — mesma rota que a server action usa. */
async function runFunction(
  functionId: string,
  credential: Credential,
  body: Record<string, unknown> = {},
): Promise<Run> {
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

test.beforeAll(async () => {
  assertTestEnvironment(process.env);
  if (!testKey) throw new Error('APPWRITE_TEST_API_KEY ausente: sem fixtures não há QA conectado.');

  db = new TablesDB(keyClient());
  teams = new Teams(keyClient());
  users = new Users(keyClient());

  creator = await createActor('criadora', true);
  admin = await createActor('equipe', false);
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

  await fixture(
    'challenges',
    CHALLENGE,
    '',
    {
      slug: CHALLENGE,
      name: CHALLENGE_NAME,
      description: 'Fixture do QA conectado — apagada ao fim da jornada.',
      platform: 'instagram',
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      points: CHALLENGE_POINTS,
      participantCount: 0,
      status: 'published',
      hashtags: '#nuy',
      version: 1,
    },
    [Permission.read(Role.users())],
  );
  await fixture('challenge_requirements', `${CHALLENGE}-req`, CHALLENGE, {
    // Explícito: o preenchimento automático só mapeia `userId`/`authUserId` para
    // o dono, e `challengeId` cairia em `<rowId>-challengeId` — medido na
    // primeira execução, que deixou uma linha órfã (limpa em `artifacts/`).
    challengeId: CHALLENGE,
    type: 'link',
    configJson: JSON.stringify({ note: 'envie o link da publicação' }),
    order: 1,
    required: true,
  });
  await fixture(
    'rewards',
    REWARD,
    '',
    {
      name: REWARD_NAME,
      type: 'physical',
      description: 'Fixture do QA conectado — apagada ao fim da jornada.',
      pointsCost: REWARD_COST,
      stock: REWARD_STOCK,
      perUserLimit: 1,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'active',
      version: 1,
    },
    [Permission.read(Role.users())],
  );

  stack = await startConnectedStack();
  startedAt = new Date().toISOString();
});

/**
 * Limpeza: tudo o que este arquivo cunhou, e só isso.
 *
 * A fronteira é a origem PROVADA — os dois `userId` deste `runId`, o desafio, a
 * recompensa e as linhas que apontam para eles. Nada é apagado por semelhança
 * de nome, data ou conteúdo: resíduo de rodada anterior não é nosso para apagar.
 * As linhas de histórico e de auditoria não têm id previsível (o id depende da
 * transação), então a varredura coleta os ids apagados e remove os filhos por
 * referência — nenhum órfão fica para trás.
 */
test.afterAll(async () => {
  if (!db) return;
  const mine = [creator?.id, admin?.id].filter(Boolean) as string[];

  // Drain final ANTES de varrer. O resgate emite evento e a notificação dele só
  // nasce no processamento: sem drenar aqui, o evento fica na fila, é processado
  // pela rodada seguinte e a notificação nasce DEPOIS desta varredura — órfã de
  // uma usuária que já não existe. Medido: uma notificação por rodada ficou
  // exatamente assim. Best-effort: falha de drain não pode abortar a limpeza.
  if (adminSecret)
    await runFunction('process-outbox', { kind: 'session', secret: adminSecret }).catch(() => null);

  // Mesmo fingerprint do servidor — o canônico e o hash vêm do próprio núcleo,
  // então o id determinístico da submissão é reproduzido, não adivinhado.
  const canonical = canonicalUrl(PUBLICATION)!;
  const submissionId = creator
    ? rowId('sub', CHALLENGE, creator.id, digest(CHALLENGE, creator.id, canonical))
    : '';
  await sweep('submission_history', 'submissionId', submissionId ? [submissionId] : []);

  const redemptions = await sweep('reward_redemptions', 'userId', mine);
  await sweep('redemption_history', 'redemptionId', redemptions);

  const audits = await sweep('audit_logs', 'affectedUserId', mine);
  const byActor = await sweep('audit_logs', 'actorId', mine);
  await sweep('audit_log_snapshots', 'auditLogId', [...audits, ...byActor]);

  // Agregado do outbox NÃO é só usuária: o evento do desafio aponta o DESAFIO e
  // os de submissão/resgate apontam o id da submissão/resgate — cada um entra na
  // lista explicitamente (medido: o agregado do desafio escapava da varredura).
  const aggregates = [CHALLENGE, ...mine, ...(submissionId ? [submissionId] : []), ...redemptions];
  await sweep('outbox_events', 'aggregateId', aggregates);
  await sweep('notifications', 'userId', mine);
  // A notificação do resgate não tem a usuária no campo de referência: ela
  // aponta o RESGATE. Sem esta varredura, ela sobrevive à limpeza.
  await sweep('notifications', 'referenceId', [
    ...redemptions,
    ...(submissionId ? [submissionId] : []),
  ]);
  await sweep('operation_keys', 'actorId', mine);
  await sweep('ranking_entries', 'userId', mine);
  await sweep('point_transactions', 'userId', mine);
  await sweep('point_accounts', 'userId', mine);
  await sweep('challenge_participants', 'userId', mine);
  await sweep('challenge_submissions', 'userId', mine);
  await sweep('profiles', 'userId', mine);

  await sweep('challenge_requirements', 'challengeId', [CHALLENGE]);
  await sweep('challenges', 'slug', [CHALLENGE]);
  // A recompensa não tem coluna única por onde varrer: o id é a própria fronteira.
  sweeps.push({
    target: 'rewards',
    removed: [200, 404].includes(
      await responseCode(() => db.deleteRow({ databaseId, tableId: 'rewards', rowId: REWARD })),
    )
      ? 1
      : 0,
  });

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

  console.log(`\nLimpeza do QA conectado (run ${runId}):`);
  console.table(sweeps);
  await stack?.close();
});

test('jornada operacional de ponta a ponta, pela tela, com o runtime do Appwrite decidindo', async ({
  browser,
}) => {
  const canonical = canonicalUrl(PUBLICATION)!;

  // ---------------------------------------------------------------- criadora
  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  await signIn(creatorPage, creator);
  await expect(creatorPage).toHaveURL(/\/app/);

  // Antes de pontuar, a jornada é VAZIA — e vazio não é zero.
  await creatorPage.goto(`${stack.origin}/app/pontos`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText('Sua jornada começa aqui.')).toBeVisible();

  // Catálogo → desafio publicado por este QA.
  await creatorPage.goto(`${stack.origin}/app/desafios`, { waitUntil: 'domcontentloaded' });
  const challengeLink = creatorPage.getByRole('link', { name: CHALLENGE_NAME }).first();
  await expect(challengeLink).toBeVisible();
  await challengeLink.click();
  await expect(creatorPage).toHaveURL(new RegExp(`/app/desafios/${CHALLENGE}$`));
  await expect(creatorPage.getByText('Como participar')).toBeVisible();

  // 1. entrar no desafio — escrita transacional pelo runtime
  await creatorPage.getByRole('button', { name: 'Participar do desafio' }).click();
  // O aviso de sucesso vive DENTRO do formulário, e o formulário sai de cena
  // quando a participação existe (a página é revalidada com o dado novo). A
  // confirmação durável é o ESTADO: "Participando" e o envio liberado.
  await expect(creatorPage.getByText('Participando', { exact: true })).toBeVisible();
  await expect(creatorPage.getByRole('button', { name: 'Participar do desafio' })).toHaveCount(0);

  // 2. enviar conteúdo — link canonizado, fingerprint contra repetição
  await expect(creatorPage.locator('input[name="url"]')).toBeVisible();
  await creatorPage.fill('input[name="url"]', PUBLICATION);
  await creatorPage.getByRole('button', { name: 'Enviar para análise' }).click();
  // A pílula "Em análise" aparece no painel do envio e no cartão do desafio: o
  // estado é o mesmo, medido uma vez.
  await expect(creatorPage.getByText('Em análise', { exact: true }).first()).toBeVisible();
  // O link mostrado é o CANÔNICO: o rastreio que a criadora colou não sobrevive.
  await expect(creatorPage.getByRole('link', { name: 'Abrir publicação' }).first()).toHaveAttribute(
    'href',
    canonical,
  );
  await expect(creatorPage.getByRole('button', { name: 'Enviar para análise' })).toHaveCount(0);

  // ------------------------------------------------------------------ equipe
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, admin);
  await adminPage.goto(`${stack.origin}/admin/submissoes`, { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'Submissões', level: 1 })).toBeVisible();

  // A lista consolidada é lida pela Function (papel apurado no runtime) e mostra
  // o envio pela linha — criadora, desafio, estado. O link canônico NÃO mora
  // aqui: ele mora na tela do envio, que é onde a equipe decide.
  const queueRow = adminPage.locator('tr', { hasText: CHALLENGE_NAME });
  await expect(queueRow).toBeVisible();
  await expect(queueRow.getByRole('link', { name: `Criadora QA ${runId}` })).toBeVisible();
  await expect(queueRow.getByText('Em análise', { exact: true })).toBeVisible();
  await queueRow.getByRole('link', { name: 'Analisar' }).click();
  await expect(adminPage).toHaveURL(/\/admin\/submissoes\/.+/);

  // Na tela do envio, o conteúdo aparece como ele ficou gravado: o link é o
  // CANÔNICO, não o cru com rastreio que a criadora colou.
  await expect(adminPage.getByRole('link', { name: canonical })).toBeVisible();
  await adminPage.fill('input[name="reason"]', 'Conteúdo confere com o briefing do desafio.');
  await adminPage.getByRole('button', { name: 'Aprovar' }).click();
  // O aviso vive no formulário, mas é o ESTADO que fica: a pílula vira
  // "Aprovado" e o histórico ganha a decisão. O crédito é conferido logo abaixo,
  // na tela da criadora, que é onde ele tem que aparecer.
  await expect(adminPage.getByText('Envio aprovado.')).toBeVisible();
  await expect(adminPage.getByText('Aprovado', { exact: true }).first()).toBeVisible();

  // 3. a fila de eventos entrega o aviso — caminho de MÁQUINA (é o que o
  // agendamento faz em produção; não existe botão de tela para drenar a fila).
  const drained = await runFunction('process-outbox', { kind: 'session', secret: adminSecret });
  expect({ status: drained.status, http: drained.http }).toEqual({
    status: 'completed',
    http: 200,
  });

  // ------------------------------------------------- pontos, nível, ranking
  await creatorPage.goto(`${stack.origin}/app/pontos`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.locator('p:has-text("Pontos disponíveis") + p')).toContainText('800');
  await expect(creatorPage.locator('p:has-text("Pontos de jornada") + p')).toContainText('800');
  await expect(creatorPage.locator('p:has-text("Nível atual") + p')).toContainText(expectedLevel);
  await expect(creatorPage.getByText(`+800`)).toBeVisible();

  await creatorPage.goto(`${stack.origin}/app/ranking`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText(/800 pontos/).first()).toBeVisible();

  // 4. o aviso da aprovação, entregue pela fila
  await creatorPage.goto(`${stack.origin}/app/notificacoes`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText('Conteúdo aprovado')).toBeVisible();
  await expect(creatorPage.getByText('Você ganhou 800 pontos.')).toBeVisible();

  // -------------------------------------------------------------- resgate
  await creatorPage.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });
  const rewardCard = creatorPage.locator('article', { hasText: REWARD_NAME });
  await expect(rewardCard).toContainText('100 pontos');
  await expect(rewardCard).toContainText('Disponível para resgate');
  await rewardCard.getByRole('button', { name: 'Resgatar' }).click();
  // Mesma regra do envio: o aviso mora no formulário e o formulário sai quando o
  // resgate existe. O que fica é o estado — pílula "Solicitado" e limite da
  // recompensa atingido (o `perUserLimit` é 1 nesta fixture).
  await expect(rewardCard.getByText('Solicitado', { exact: true })).toBeVisible();
  await expect(rewardCard.getByText('Limite atingido')).toBeVisible();
  await expect(rewardCard.getByRole('button', { name: 'Resgatar' })).toHaveCount(0);

  // O resgate gasta saldo e NÃO rebaixa a jornada: dois números, duas regras.
  await creatorPage.goto(`${stack.origin}/app/pontos`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.locator('p:has-text("Pontos disponíveis") + p')).toContainText('700');
  await expect(creatorPage.locator('p:has-text("Pontos de jornada") + p')).toContainText('800');
  await expect(creatorPage.locator('p:has-text("Nível atual") + p')).toContainText(expectedLevel);

  await creatorPage.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });
  await expect(creatorPage.getByText('Meus resgates')).toBeVisible();
  const redemptionItem = creatorPage.locator('li', { hasText: REWARD_NAME });
  await expect(redemptionItem).toBeVisible();
  await expect(redemptionItem.getByText('Solicitado', { exact: true })).toBeVisible();

  // ------------------------------------------- prova: o runtime foi o caminho
  // Cada escrita da tela é uma EXECUÇÃO real, criada DEPOIS do início da corrida.
  const proofs: { functionId: string; deploymentId: string; status: string; http: number }[] = [];
  const functionsService = new Functions(keyClient());
  for (const functionId of [
    'join-challenge',
    'submit-content',
    'moderate-submission',
    'process-outbox',
    'redeem-reward',
  ]) {
    const page = await functionsService.listExecutions({
      functionId,
      queries: [Query.orderDesc('$createdAt'), Query.limit(25)],
    });
    const mineExecution = page.executions.find(
      (execution) => execution.trigger === 'http' && execution.$createdAt >= startedAt,
    );
    expect(mineExecution, `nenhuma execução HTTP de ${functionId} nesta corrida`).toBeDefined();
    proofs.push({
      functionId,
      deploymentId: mineExecution!.deploymentId,
      status: mineExecution!.status,
      http: mineExecution!.responseStatusCode,
    });
  }
  expect(proofs.every((proof) => proof.status === 'completed' && proof.http < 400)).toBe(true);

  console.log(`\nExecuções do runtime criadas pela jornada (run ${runId}, sem credencial):`);
  console.table(proofs);
  console.log(`\nExecuções disparadas por este arquivo (Function, execução, HTTP):`);
  console.table(
    runs.map((run) => ({ functionId: run.functionId, status: run.status, http: run.http })),
  );

  await creatorContext.close();
  await adminContext.close();
});
