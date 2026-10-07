import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Account,
  Client,
  ExecutionMethod,
  Functions,
  Query,
  TablesDB,
  Teams,
  Users,
} from 'node-appwrite';
import { randomBytes } from 'node:crypto';
import { team, tables } from '../../infra/appwrite/schema';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { periodKey, rowId } from '../../src/features/workspace/core';
import { rankingTimeZone } from '../../src/features/workspace/domain/ranking';

/**
 * Provas pelo RUNTIME do Appwrite (Sprint 6C, Fase 4).
 *
 * O que estes testes medem está no staging real e passa pelo caminho de produção:
 * a sessão da usuária chama `POST /v1/functions/{id}/executions`, o Appwrite
 * injeta o JWT e o container executa o bundle publicado. Chamar o núcleo direto,
 * um server action do Next ou a function "por dentro" NÃO conta como prova.
 *
 * Cada bloco é independente — cria os próprios fixtures e pode rodar sozinho,
 * function a function (`-t "join-challenge"`), como a publicação progressiva
 * exige —, e o que cria, remove. Nada de credencial é impresso; `functionId`,
 * `deploymentId`, status da execução e status HTTP saem porque SÃO a prova.
 *
 * Fatos medidos nesta rodada, assumidos aqui como contrato:
 *  - execução por SESSÃO injeta `x-appwrite-user-jwt`; quem chama não consegue
 *    forjar cabeçalho `x-appwrite-*` ("Invalid headers: ... cannot start with
 *    x-appwrite");
 *  - `execute` fechado para o papel da sessão faz a PLATAFORMA recusar antes do
 *    container (401/403/404) — recusa de plataforma e recusa de negócio são
 *    medidas separadamente, nunca confundidas;
 *  - o handler exportado RETORNA a resposta: corpo vazio sem status seria falha
 *    de contrato do runtime, não recusa.
 */
const runId = `rt${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const testKey = process.env.APPWRITE_TEST_API_KEY!;

type Actor = { id: string; email: string; password: string; secret: string };
type Credential = { kind: 'session'; actor: Actor } | { kind: 'anonymous' };

type Run = {
  http: number;
  executionStatus: string;
  trigger: string;
  body: string;
  executionId: string;
  deploymentId: string;
  /** Recusa da PLATAFORMA (papel de `execute` fechado): o container nem rodou. */
  platformRefusal: string;
};

const actors = new Map<string, Actor>();
const fixtures: { tableId: string; rowId: string }[] = [];
const userIds: string[] = [];
const membershipIds: string[] = [];
/** Todo id que esta run cunhou — a fronteira da limpeza. */
const linkedIds = new Set<string>();
const proofs: {
  functionId: string;
  deploymentId: string;
  status: string;
  http: number;
  mode: string;
}[] = [];

let adminDb: TablesDB;
let teams: Teams;
let users: Users;

const plainClient = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!);
const keyClient = () => plainClient().setKey(testKey);

function minted(id: string) {
  linkedIds.add(id);
  return id;
}

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
  rowId: string,
  owner: string,
  override: Record<string, unknown> = {},
  permissions: string[] = [],
) {
  minted(rowId);
  fixtures.push({ tableId, rowId });
  await adminDb.createRow({
    databaseId,
    tableId,
    rowId,
    data: { ...fixtureData(tableId, owner, rowId), ...override },
    permissions,
  });
  return rowId;
}

/** Desafio publicado e aberto — o fixture que quase todo bloco precisa. */
async function challenge(suffix: string, override: Record<string, unknown> = {}) {
  const challengeId = `${runId}-${suffix}`;
  await fixture('challenges', challengeId, '', {
    slug: challengeId,
    name: `Desafio de prova ${suffix} (temporário)`,
    description: 'Fixture do runtime.',
    platform: 'instagram',
    startsAt: new Date(Date.now() - 86_400_000).toISOString(),
    endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    points: 100,
    participantCount: 0,
    status: 'published',
    version: 1,
    ...override,
  });
  return challengeId;
}

async function createActor(label: string, roles: string[] = []): Promise<Actor> {
  const id = minted(`${runId}-${label}`);
  const email = `${id}@example.invalid`; // caixa não entregável, de propósito
  const password = randomBytes(24).toString('hex');
  await new Account(plainClient()).create({
    userId: id,
    email,
    password,
    name: `Runtime fixture ${label}`,
  });
  userIds.push(id);
  const session = await new Account(keyClient()).createEmailPasswordSession({ email, password });
  if (!session.secret)
    throw new Error('Sessão de fixture sem segredo: a prova não teria como autenticar.');
  const actor = { id, email, password, secret: session.secret };
  if (roles.length) {
    const membership = await teams.createMembership({ teamId: team.id, userId: id, roles });
    membershipIds.push(membership.$id);
  }
  actors.set(label, actor);
  return actor;
}

/**
 * Estado inicial DECLARADO da conta de pontos.
 *
 * A linha é criada na primeira vez e REESCRITA nas seguintes. Um helper que só
 * cria faz o teste herdar o saldo que o bloco anterior deixou — medido nesta
 * rodada: a corrida pela última unidade terminou com a compradora perdedora
 * ainda com 500, e o caso "sem saldo" virou um resgate aprovado.
 */
async function account(userId: string, availableBalance: number, qualifyingPoints = 0) {
  const data = { userId, availableBalance, qualifyingPoints, levelId: 'exploradora', version: 1 };
  try {
    await fixture('point_accounts', userId, userId, data);
  } catch (error) {
    if ((error as { code?: number }).code !== 409) throw error;
    await adminDb.updateRow({ databaseId, tableId: 'point_accounts', rowId: userId, data });
  }
}

/**
 * Executa a function pelo runtime, com a sessão da usuária.
 *
 * `async: false` devolve a execução JÁ terminada, com `deploymentId`, `trigger`,
 * `status` e o corpo — é o que permite registrar a prova inteira, e não só o
 * efeito no banco.
 */
async function runFunction(
  credential: Credential,
  functionId: string,
  body: Record<string, unknown> = {},
): Promise<Run> {
  const client = plainClient();
  if (credential.kind === 'session') client.setSession(credential.actor.secret);
  const service = new Functions(client);
  const mode = credential.kind === 'session' ? credential.actor.id.slice(-8) : 'anonymous';
  try {
    const execution = await service.createExecution({
      functionId,
      body: JSON.stringify(body),
      async: false,
      method: ExecutionMethod.POST,
      xpath: '/',
      headers: { 'content-type': 'application/json' },
    });
    proofs.push({
      functionId,
      deploymentId: execution.deploymentId,
      status: execution.status,
      http: execution.responseStatusCode,
      mode,
    });
    // Execução que NÃO completou precisa do motivo do container: sem isso o
    // vermelho vira "500, alguma coisa deu errado". O log de erro só sai com
    // chave de servidor, e nada de credencial vem nele.
    if (execution.status !== 'completed') {
      const detail = await new Functions(keyClient())
        .getExecution({ functionId, executionId: execution.$id })
        .catch(() => null);
      if (detail?.errors)
        console.log(`runtime ${functionId}: ${String(detail.errors).slice(0, 800)}`);
    }
    return {
      http: execution.responseStatusCode,
      executionStatus: execution.status,
      trigger: execution.trigger,
      body: execution.responseBody,
      executionId: execution.$id,
      deploymentId: execution.deploymentId,
      platformRefusal: '',
    };
  } catch (error) {
    const failure = error as { code?: number; type?: string };
    proofs.push({
      functionId,
      deploymentId: '',
      status: 'refused_by_platform',
      http: failure.code ?? -1,
      mode,
    });
    return {
      http: failure.code ?? -1,
      executionStatus: 'refused_by_platform',
      trigger: '',
      body: '',
      executionId: '',
      deploymentId: '',
      platformRefusal: failure.type ?? 'unknown',
    };
  }
}

/** A prova é uma execução COMPLETA do container — não uma recusa de plataforma. */
function proved(run: Run) {
  return { http: run.http, executionStatus: run.executionStatus, trigger: run.trigger };
}

function json(run: Run): Record<string, unknown> {
  return run.body ? (JSON.parse(run.body) as Record<string, unknown>) : {};
}

async function countRows(tableId: string, queries: string[]) {
  const page = await adminDb.listRows({
    databaseId,
    tableId,
    queries: [...queries, Query.limit(100)],
  });
  return page.total;
}

/** Varredura paginada por uma coluna — limpeza completa, não "as primeiras 100". */
async function sweep(tableId: string, column: string, values: string[]) {
  if (!values.length) return 0;
  let removed = 0;
  for (;;) {
    const page = await adminDb.listRows({
      databaseId,
      tableId,
      queries: [Query.equal(column, values), Query.limit(100)],
    });
    for (const row of page.rows) {
      const code = await responseCode(() =>
        adminDb.deleteRow({ databaseId, tableId, rowId: String(row.$id) }),
      );
      if ([200, 404].includes(code)) removed += 1;
    }
    if (page.rows.length < 100) return removed;
  }
}

beforeAll(async () => {
  assertTestEnvironment(process.env);
  adminDb = new TablesDB(keyClient());
  teams = new Teams(keyClient());
  users = new Users(keyClient());
  await createActor('creator');
  await createActor('rival');
  await createActor('admin', ['admin']);
  await createActor('moderator', ['moderator']);
  await createActor('target');
  await createActor('ranker');
  await createActor('buyera');
  await createActor('buyerb');
  await createActor('notifyee');
  await createActor('forger');
  await createActor('flow');
});

afterAll(async () => {
  // Drain final ANTES de varrer: notificação nasce no processamento do evento.
  // Sem isto, o evento do resgate fica na fila, é processado pela rodada
  // seguinte e a notificação nasce depois desta limpeza — órfã de uma usuária
  // que já não existe. Best-effort de propósito: falha de drain não pode
  // abortar a limpeza.
  const drainer = actors.get('admin');
  if (drainer)
    await runFunction({ kind: 'session', actor: drainer }, 'process-outbox').catch(() => null);

  // Prova registrada e sanitizada: function, deployment, status e HTTP.
  const grouped = new Map<string, string[]>();
  for (const proof of proofs)
    grouped.set(proof.functionId, [
      ...(grouped.get(proof.functionId) ?? []),
      `${proof.http}/${proof.status}${proof.deploymentId ? `@${proof.deploymentId.slice(0, 6)}…` : '(plataforma)'}`,
    ]);
  console.log(
    `\nRUNTIME (${proofs.length} execuções, run ${runId}):\n` +
      [...grouped.entries()].map(([id, list]) => `  ${id}: ${list.join(' ')}`).join('\n'),
  );
  if (!adminDb) return;
  // A limpeza só toca ids que ESTA run cunhou: usuárias próprias, fixtures
  // próprios e as linhas que as execuções derivaram deles. Nenhum filtro amplo,
  // nenhuma varredura por valor que outra rodada também usaria.
  const ids = [...linkedIds];
  let failures = 0;
  const removed: string[] = [];
  for (const [tableId, column] of [
    ['notifications', 'userId'],
    ['point_transactions', 'userId'],
    ['point_accounts', 'userId'],
    ['ranking_entries', 'userId'],
    ['challenge_submissions', 'userId'],
    ['challenge_participants', 'userId'],
    ['reward_redemptions', 'userId'],
  ] as const)
    removed.push(`${tableId}:${await sweep(tableId, column, userIds)}`);
  removed.push(`submission_history:${await sweep('submission_history', 'submissionId', ids)}`);
  removed.push(`redemption_history:${await sweep('redemption_history', 'redemptionId', ids)}`);
  removed.push(`outbox_events:${await sweep('outbox_events', 'aggregateId', ids)}`);
  // Auditoria: por autor (as nossas) e por entidade (os nossos ids). Snapshots
  // primeiro — `audit_log_snapshots.auditLogId` aponta para o log.
  const auditIds = new Set<string>();
  for (const column of ['actorId', 'entityId', 'affectedUserId']) {
    const page = await adminDb
      .listRows({
        databaseId,
        tableId: 'audit_logs',
        queries: [Query.equal(column, column === 'actorId' ? userIds : ids), Query.limit(500)],
      })
      .catch(() => null);
    for (const row of page?.rows ?? []) auditIds.add(String(row.$id));
  }
  if (auditIds.size) {
    removed.push(
      `audit_log_snapshots:${await sweep('audit_log_snapshots', 'auditLogId', [...auditIds])}`,
    );
    let logs = 0;
    for (const auditLogId of auditIds) {
      const code = await responseCode(() =>
        adminDb.deleteRow({ databaseId, tableId: 'audit_logs', rowId: auditLogId }),
      );
      if ([200, 404].includes(code)) logs += 1;
    }
    removed.push(`audit_logs:${logs}`);
  }
  for (const row of fixtures) {
    const code = await responseCode(() => adminDb.deleteRow({ databaseId, ...row }));
    if (![200, 404].includes(code)) failures++;
  }
  for (const membershipId of membershipIds) {
    const code = await responseCode(() =>
      teams.deleteMembership({ teamId: team.id, membershipId }),
    );
    if (![200, 404].includes(code)) failures++;
  }
  for (const userId of userIds) {
    const code = await responseCode(() => users.delete({ userId }));
    if (![200, 404].includes(code)) failures++;
  }
  console.log(
    `Limpeza (run ${runId}): ${removed.join(' ')} · fixtures ${fixtures.length} · contas ${userIds.length}`,
  );
  if (failures)
    throw new Error(
      `Limpeza incompleta (${failures}) na run ${runId}. Não apague dado de origem não provada.`,
    );
});

describe('join-challenge (runtime)', () => {
  it('entra pela sessão, repete sem criar segunda participação e vende a última vaga uma vez só', async () => {
    const creator = actors.get('creator')!;
    const rival = actors.get('rival')!;
    const challengeId = await challenge('join');

    const first = await runFunction({ kind: 'session', actor: creator }, 'join-challenge', {
      challengeId,
    });
    expect(proved(first)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });
    const participationId = rowId('join', challengeId, creator.id);
    expect(json(first)).toEqual({ participationId, challengeId, created: true });

    const repeat = await runFunction({ kind: 'session', actor: creator }, 'join-challenge', {
      challengeId,
    });
    expect(proved(repeat)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(repeat)).toEqual({ participationId, challengeId, created: false });
    expect(
      await countRows('challenge_participants', [Query.equal('challengeId', challengeId)]),
    ).toBe(1);
    expect(
      (await adminDb.getRow({ databaseId, tableId: 'challenges', rowId: challengeId }))
        .participantCount,
    ).toBe(1);

    // Corrida pela ÚLTIMA vaga: o contador com teto é a barreira, no commit.
    const tinyId = await challenge('tiny', { participantLimit: 1, points: 50 });
    const race = await Promise.all([
      runFunction({ kind: 'session', actor: creator }, 'join-challenge', { challengeId: tinyId }),
      runFunction({ kind: 'session', actor: rival }, 'join-challenge', { challengeId: tinyId }),
    ]);
    for (const run of race) expect(run.executionStatus).toBe('completed');
    expect(race.map((run) => run.http).sort()).toEqual([201, 409]);
    const loser = race.find((run) => run.http === 409)!;
    // A vaga não é vendida duas vezes: a recusa é de capacidade (o contador do
    // desafio é a barreira final) — ou de conflito de versão da mesma escrita.
    expect(['capacity_full', 'conflict']).toContain(json(loser).error);
    expect(await countRows('challenge_participants', [Query.equal('challengeId', tinyId)])).toBe(1);
    expect(
      (await adminDb.getRow({ databaseId, tableId: 'challenges', rowId: tinyId })).participantCount,
    ).toBe(1);

    // Desafio fora do ar não vira participação por payload nenhum.
    const draftId = await challenge('draft', { status: 'draft' });
    const draft = await runFunction({ kind: 'session', actor: creator }, 'join-challenge', {
      challengeId: draftId,
    });
    expect(proved(draft)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(draft).error).toBe('not_published');
  });
});

describe('submit-content (runtime)', () => {
  it('envia pela sessão e trata o MESMO conteúdo como duplicata, não como segundo envio', async () => {
    const creator = actors.get('creator')!;
    const challengeId = await challenge('submit');
    await fixture('challenge_participants', rowId('join', challengeId, creator.id), creator.id, {
      challengeId,
      userId: creator.id,
      joinedAt: new Date().toISOString(),
      status: 'joined',
    });
    const url = `https://www.instagram.com/p/${runId}?utm_source=prova`;

    const first = await runFunction({ kind: 'session', actor: creator }, 'submit-content', {
      challengeId,
      url,
      platform: 'instagram',
    });
    expect(proved(first)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });
    const submissionId = String(json(first).submissionId);
    expect(submissionId).toHaveLength(36);
    minted(submissionId);
    expect(json(first)).toMatchObject({
      challengeId,
      revision: 1,
      created: true,
      status: 'pending',
    });
    const stored = await adminDb.getRow({
      databaseId,
      tableId: 'challenge_submissions',
      rowId: submissionId,
    });
    expect(stored.status).toBe('pending');
    // Canonização: sem rastreio, sem `www` — é o que torna o reenvio duplicata.
    expect(String(stored.canonicalUrl)).toBe(`https://instagram.com/p/${runId}`);
    const history = await adminDb.listRows({
      databaseId,
      tableId: 'submission_history',
      queries: [Query.equal('submissionId', submissionId), Query.limit(10)],
    });
    expect(history.total).toBe(1);
    expect(history.rows[0].previousStatus).toBe('');
    expect(history.rows[0].nextStatus).toBe('pending');

    const duplicate = await runFunction({ kind: 'session', actor: creator }, 'submit-content', {
      challengeId,
      url: `https://instagram.com/p/${runId}`,
      platform: 'instagram',
    });
    // Repetir a MESMA intenção não é erro: devolve o envio que já existe.
    expect(proved(duplicate)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(duplicate)).toEqual({
      submissionId,
      challengeId,
      revision: 1,
      created: false,
      status: 'pending',
    });
    expect(await countRows('challenge_submissions', [Query.equal('userId', creator.id)])).toBe(1);
    expect(await countRows('submission_history', [Query.equal('submissionId', submissionId)])).toBe(
      1,
    );

    // Envio SIMULTÂNEO do mesmo conteúdo: uma linha só. Quem perde ou lê o que
    // já existe (200/created:false) ou esbarra na unicidade (`duplicate_content`).
    const raceChallenge = await challenge('submit-race');
    await fixture('challenge_participants', rowId('join', raceChallenge, creator.id), creator.id, {
      challengeId: raceChallenge,
      userId: creator.id,
      joinedAt: new Date().toISOString(),
      status: 'joined',
    });
    const raceUrl = `https://instagram.com/p/${runId}-race`;
    const race = await Promise.all([
      runFunction({ kind: 'session', actor: creator }, 'submit-content', {
        challengeId: raceChallenge,
        url: raceUrl,
        platform: 'instagram',
      }),
      runFunction({ kind: 'session', actor: creator }, 'submit-content', {
        challengeId: raceChallenge,
        url: raceUrl,
        platform: 'instagram',
      }),
    ]);
    for (const run of race) expect(run.executionStatus).toBe('completed');
    const created = race.filter((run) => run.http === 201);
    expect(created).toHaveLength(1);
    // A submissão que VENCEU a corrida entra na fronteira da limpeza como
    // qualquer outra: sem `minted`, o pai era apagado pela varredura por usuária
    // e as linhas derivadas (histórico + evento) ficavam órfãs — medido, uma
    // linha de cada por rodada.
    const raceSubmissionId = minted(String(json(created[0]).submissionId));
    const other = race.find((run) => run.http !== 201)!;
    expect([200, 409]).toContain(other.http);
    if (other.http === 409) expect(json(other).error).toBe('duplicate_content');
    else expect(json(other).created).toBe(false);
    expect(
      await countRows('challenge_submissions', [Query.equal('challengeId', raceChallenge)]),
    ).toBe(1);
    expect(
      await countRows('submission_history', [Query.equal('submissionId', raceSubmissionId)]),
    ).toBe(1);
  });

  it('recusa envio de quem não entrou no desafio', async () => {
    const outsider = actors.get('flow')!;
    const challengeId = await challenge('submit-outsider');
    const notParticipant = await runFunction(
      { kind: 'session', actor: outsider },
      'submit-content',
      {
        challengeId,
        url: `https://instagram.com/p/${runId}-outsider`,
        platform: 'instagram',
      },
    );
    expect(proved(notParticipant)).toEqual({
      http: 403,
      executionStatus: 'completed',
      trigger: 'http',
    });
    expect(json(notParticipant).error).toBe('not_participant');
  });
});

describe('moderate-submission (runtime)', () => {
  it('lê a fila e aprova UMA vez, creditando os pontos uma única vez', async () => {
    const creator = actors.get('creator')!;
    const admin = actors.get('admin')!;
    const challengeId = await challenge('mod', { points: 120 });
    const submissionId = `${runId}-modsub`.slice(0, 36);
    minted(submissionId);
    await fixture(
      'challenge_submissions',
      submissionId,
      creator.id,
      {
        challengeId,
        userId: creator.id,
        platform: 'instagram',
        canonicalUrl: `https://instagram.com/p/${runId}-mod`,
        contentFingerprint: `${runId}-fingerprint`,
        status: 'pending',
        revision: 1,
        submittedAt: new Date().toISOString(),
      },
      [`read("user:${creator.id}")`],
    );

    const queue = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      action: 'queue',
      limit: 50,
    });
    expect(proved(queue)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    const item = (
      json(queue).items as { submissionId: string; challengeName: string; userId: string }[]
    ).find((candidate) => candidate.submissionId === submissionId);
    expect(item).toBeTruthy();
    expect(item!.challengeName).toBe('Desafio de prova mod (temporário)');
    expect(item!.userId).toBe(creator.id);

    const approve = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      submissionId,
      decision: 'approve',
      expectedRevision: 1,
    });
    expect(proved(approve)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(approve)).toEqual({
      submissionId,
      status: 'approved',
      pointsAwarded: 120,
      credited: true,
    });

    // Repetir a MESMA decisão não credita de novo: o envio já saiu de `pending`.
    const again = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      submissionId,
      decision: 'approve',
      expectedRevision: 1,
    });
    expect(proved(again)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(again).error).toBe('conflict');

    expect(
      await countRows('point_transactions', [
        Query.equal('idempotencyKey', `submission.approved:${submissionId}`),
      ]),
    ).toBe(1);
    const account = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: creator.id,
    });
    expect(account.availableBalance).toBe(120);
    expect(account.qualifyingPoints).toBe(120);
    expect(account.levelId).toBe('exploradora');
    // O crédito alimentou o ranking do ciclo NO MESMO commit — sem job depois.
    const entry = await adminDb.getRow({
      databaseId,
      tableId: 'ranking_entries',
      rowId: rowId('rank', periodKey(new Date(), rankingTimeZone), creator.id),
    });
    expect(entry.earnedPoints).toBe(120);

    // Decisão sobre uma revisão que ninguém viu é recusada, não aplicada em silêncio.
    const stale = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      submissionId,
      decision: 'reject',
      reason: 'conteúdo fora do briefing',
      expectedRevision: 7,
    });
    expect(proved(stale)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(stale).error).toBe('conflict');
  });

  it('deixa o time passar e o núcleo decidir: sem papel, sem fila', async () => {
    const moderator = actors.get('moderator')!;
    const outsider = actors.get('rival')!;
    // A plataforma deixa membership do time entrar; quem apura o papel é o NÚCLEO.
    const allowed = await runFunction(
      { kind: 'session', actor: moderator },
      'moderate-submission',
      {
        action: 'queue',
      },
    );
    expect(proved(allowed)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(Array.isArray(json(allowed).items)).toBe(true);
    const denied = await runFunction({ kind: 'session', actor: outsider }, 'moderate-submission', {
      action: 'queue',
    });
    expect([401, 403, 404]).toContain(denied.http);
    expect(denied.platformRefusal).not.toBe('');
    expect(denied.executionId).toBe(''); // o container nem rodou
  });
});

describe('adjust-points (runtime)', () => {
  it('ajusta o saldo com a chave de operação e não aplica duas vezes', async () => {
    const admin = actors.get('admin')!;
    const target = actors.get('target')!;
    await account(target.id, 0, 250);
    const key = `${runId}-adjust`;

    const first = await runFunction({ kind: 'session', actor: admin }, 'adjust-points', {
      userId: target.id,
      amount: 500,
      reason: 'Crédito de prova do runtime',
      referenceId: `${runId}-ticket`,
      key,
    });
    expect(proved(first)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(first)).toEqual({ userId: target.id, availableBalance: 500, applied: true });

    const repeat = await runFunction({ kind: 'session', actor: admin }, 'adjust-points', {
      userId: target.id,
      amount: 500,
      reason: 'Crédito de prova do runtime',
      referenceId: `${runId}-ticket`,
      key,
    });
    expect(proved(repeat)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(repeat).error).toBe('conflict');
    const updated = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: target.id,
    });
    expect(updated.availableBalance).toBe(500);
    // Ajuste NÃO é conquista: jornada e ranking intactos.
    expect(updated.qualifyingPoints).toBe(250);

    // O papel é do núcleo: moderador passa na plataforma (é do time) e cai aqui.
    const moderator = actors.get('moderator')!;
    const denied = await runFunction({ kind: 'session', actor: moderator }, 'adjust-points', {
      userId: target.id,
      amount: 10,
      reason: 'tentativa sem capacidade',
      referenceId: `${runId}-ticket-2`,
      key: `${runId}-adjust-2`,
    });
    expect(proved(denied)).toEqual({ http: 403, executionStatus: 'completed', trigger: 'http' });
    expect(json(denied).error).toBe('forbidden');
    expect(
      (await adminDb.getRow({ databaseId, tableId: 'point_accounts', rowId: target.id }))
        .availableBalance,
    ).toBe(500);
  });
});

describe('rebuild-ranking (runtime)', () => {
  it('reconstrói a projeção a partir do extrato e conserta uma entrada corrompida', async () => {
    const admin = actors.get('admin')!;
    const ranker = actors.get('ranker')!;
    const now = new Date();
    const cycle = periodKey(now, rankingTimeZone);
    // Carimbos ancorados no INÍCIO do ciclo (São Paulo é UTC-3 o ano inteiro):
    // ficam garantidamente no mesmo período, em ordem conhecida e DISTINTOS —
    // dois créditos no mesmo milissegundo não distinguiriam "primeiro" de
    // "último" carimbo, que é justamente o que a projeção precisa provar.
    const cycleStart = new Date(`${cycle}-01T00:00:00-03:00`).getTime();
    const earnedAt = new Date(cycleStart + 3_600_000).toISOString();
    const secondAt = new Date(cycleStart + 7_200_000).toISOString();
    // Extrato verdadeiro: 40 + 60 de delta elegível no ciclo, o mais antigo primeiro.
    for (const [index, delta] of [40, 60].entries())
      await fixture('point_transactions', `${runId}-ptx-${index}`, ranker.id, {
        userId: ranker.id,
        type: 'earn',
        amount: delta,
        referenceId: `${runId}-ref-${index}`,
        referenceType: 'challenge_submission',
        description: 'Crédito de prova do runtime',
        createdAt: index === 0 ? earnedAt : secondAt,
        idempotencyKey: `${runId}-ptx-key-${index}`,
        rankingDelta: delta,
        actorId: ranker.id,
      });
    // Projeção corrompida de propósito: o job reescreve com o valor do LEDGER.
    const entryId = rowId('rank', cycle, ranker.id);
    await fixture('ranking_entries', entryId, ranker.id, {
      periodKey: cycle,
      userId: ranker.id,
      earnedPoints: 999_999,
      lastEarnedAt: now.toISOString(),
    });

    const run = await runFunction({ kind: 'session', actor: admin }, 'rebuild-ranking', {
      period: cycle,
    });
    expect(proved(run)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    const body = json(run) as {
      periods: { periodKey: string; entries: number; earnedPoints: number }[];
      scanned: number;
      truncated: boolean;
    };
    expect(body.truncated).toBe(false);
    const forCycle = body.periods.find((period) => period.periodKey === cycle);
    // `periods[].earnedPoints` é o TOTAL do período, somando TODAS as usuárias que
    // pontuaram nele — e o ciclo da prova é o mês corrente de um staging
    // compartilhado. Medido nesta rodada: veio 600, sendo 100 da prova e 500 de
    // resíduo de rodada anterior. A reconstrução se prova POR USUÁRIA, na linha
    // reparada abaixo; o agregado só é conferido como piso.
    expect(forCycle?.earnedPoints).toBeGreaterThanOrEqual(100);
    const repaired = await adminDb.getRow({
      databaseId,
      tableId: 'ranking_entries',
      rowId: entryId,
    });
    // A projeção corrompida (999999) é reescrita com a soma do ledger: 40 + 60.
    expect(repaired.earnedPoints).toBe(100);
    // Empate é desempatado por quem chegou primeiro: o carimbo é o do PRIMEIRO
    // crédito (o mais antigo), nunca o do último. A conferência é por INSTANTE:
    // o Appwrite devolve datetime como `+00:00`, não como `Z`.
    expect(new Date(String(repaired.lastEarnedAt)).getTime()).toBe(new Date(earnedAt).getTime());

    // Sessão sem papel não entra: a plataforma fecha antes do container.
    const outsider = actors.get('rival')!;
    const denied = await runFunction({ kind: 'session', actor: outsider }, 'rebuild-ranking', {
      period: cycle,
    });
    expect([401, 403, 404]).toContain(denied.http);
    expect(denied.platformRefusal).not.toBe('');
  });
});

describe('process-outbox (runtime)', () => {
  it('drena a fila e entrega a notificação uma única vez', async () => {
    const admin = actors.get('admin')!;
    const notifyee = actors.get('notifyee')!;
    const eventKey = `runtime.proof:${runId}`;
    const eventId = rowId('outbox', eventKey);
    const payload = { userId: notifyee.id, points: 120 };
    await fixture('outbox_events', eventId, notifyee.id, {
      eventKey,
      type: 'submission.approved',
      aggregateId: notifyee.id,
      payloadJson: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const run = await runFunction({ kind: 'session', actor: admin }, 'process-outbox');
    expect(proved(run)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    const outcome = json(run) as { processed: number; failed: number };
    expect(outcome.failed).toBe(0);
    expect(outcome.processed).toBeGreaterThanOrEqual(1);

    const notificationId = rowId('notify', notifyee.id, eventKey);
    const notification = await adminDb.getRow({
      databaseId,
      tableId: 'notifications',
      rowId: notificationId,
    });
    expect(notification.userId).toBe(notifyee.id);
    expect(notification.eventKey).toBe(eventKey);
    expect(String(notification.title)).toBe('Conteúdo aprovado');
    expect(String(notification.body)).toContain('120');
    expect(
      (await adminDb.getRow({ databaseId, tableId: 'outbox_events', rowId: eventId })).status,
    ).toBe('processed');

    // Reprocessar não duplica entrega: a mesma chave é a mesma linha.
    const again = await runFunction({ kind: 'session', actor: admin }, 'process-outbox');
    expect(proved(again)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(await countRows('notifications', [Query.equal('eventKey', eventKey)])).toBe(1);
  });
});

describe('redeem-reward (runtime)', () => {
  it('vende a última unidade uma vez só e devolve o MESMO pedido na repetição da chave', async () => {
    const buyera = actors.get('buyera')!;
    const buyerb = actors.get('buyerb')!;
    await account(buyera.id, 500, 77);
    await account(buyerb.id, 500, 0);
    const rewardId = `${runId}-reward`;
    await fixture('rewards', rewardId, '', {
      name: 'Recompensa de prova (temporária)',
      type: 'physical',
      description: 'Fixture do runtime.',
      pointsCost: 100,
      stock: 1,
      perUserLimit: 0,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'active',
      version: 1,
    });
    const keyA = `${runId}-redeem-a`;
    const keyB = `${runId}-redeem-b`;

    // Corrida pela ÚLTIMA unidade: o decremento com piso decide no commit.
    const race = await Promise.all([
      runFunction({ kind: 'session', actor: buyera }, 'redeem-reward', {
        rewardId,
        idempotencyKey: keyA,
        expectedCost: 100,
      }),
      runFunction({ kind: 'session', actor: buyerb }, 'redeem-reward', {
        rewardId,
        idempotencyKey: keyB,
        expectedCost: 100,
      }),
    ]);
    for (const run of race) expect(run.executionStatus).toBe('completed');
    expect(race.map((run) => run.http).sort()).toEqual([201, 409]);
    const winnerIndex = race.findIndex((run) => run.http === 201);
    const winner = winnerIndex === 0 ? buyera : buyerb;
    const winnerKey = winnerIndex === 0 ? keyA : keyB;
    const redemptionId = String(json(race[winnerIndex]).redemptionId);
    minted(redemptionId);
    expect(json(race[winnerIndex])).toMatchObject({
      rewardId,
      cost: 100,
      status: 'requested',
      created: true,
    });
    // Quem perdeu recebe o motivo REAL: o estoque já é zero no banco.
    expect(json(race[1 - winnerIndex]).error).toBe('out_of_stock');
    expect((await adminDb.getRow({ databaseId, tableId: 'rewards', rowId: rewardId })).stock).toBe(
      0,
    );
    const debited = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: winner.id,
    });
    expect(debited.availableBalance).toBe(400);
    // Gastar saldo não rebaixa conquista.
    expect(debited.qualifyingPoints).toBe(winnerIndex === 0 ? 77 : 0);

    // Repetir a MESMA intenção devolve o mesmo pedido — não é um segundo resgate,
    // nem mesmo com o estoque já zerado.
    const repeat = await runFunction({ kind: 'session', actor: winner }, 'redeem-reward', {
      rewardId,
      idempotencyKey: winnerKey,
      expectedCost: 100,
    });
    expect(proved(repeat)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(repeat)).toMatchObject({ redemptionId, created: false });
    expect(await countRows('reward_redemptions', [Query.equal('rewardId', rewardId)])).toBe(1);
    expect(
      await countRows('point_transactions', [
        Query.equal('idempotencyKey', `reward.redeemed:${winnerKey}`),
      ]),
    ).toBe(1);
  });

  it('recusa preço que mudou desde a tela e respeita o limite por pessoa contado no banco', async () => {
    const buyer = actors.get('buyera')!;
    // Saldo suficiente para UM resgate de 250 — declarado, não herdado.
    await account(buyer.id, 500, 77);
    const rewardId = `${runId}-reward-limit`;
    await fixture('rewards', rewardId, '', {
      name: 'Recompensa de limite (temporária)',
      type: 'physical',
      description: 'Fixture do runtime.',
      pointsCost: 250,
      stock: 5,
      perUserLimit: 1,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'active',
      version: 1,
    });

    const stale = await runFunction({ kind: 'session', actor: buyer }, 'redeem-reward', {
      rewardId,
      idempotencyKey: `${runId}-redeem-price`,
      expectedCost: 100,
    });
    expect(proved(stale)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(stale).error).toBe('price_changed');

    const allowed = await runFunction({ kind: 'session', actor: buyer }, 'redeem-reward', {
      rewardId,
      idempotencyKey: `${runId}-redeem-limit`,
      expectedCost: 250,
    });
    expect(proved(allowed)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });
    minted(String(json(allowed).redemptionId));
    const overLimit = await runFunction({ kind: 'session', actor: buyer }, 'redeem-reward', {
      rewardId,
      idempotencyKey: `${runId}-redeem-limit-2`,
      expectedCost: 250,
    });
    expect(proved(overLimit)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(overLimit).error).toBe('limit_reached');

    // Sem saldo não há resgate — e o saldo não fica negativo.
    const broker = actors.get('buyerb')!;
    await account(broker.id, 10, 0);
    const poor = await runFunction({ kind: 'session', actor: broker }, 'redeem-reward', {
      rewardId,
      idempotencyKey: `${runId}-redeem-poor`,
      expectedCost: 250,
    });
    expect(proved(poor)).toEqual({ http: 409, executionStatus: 'completed', trigger: 'http' });
    expect(json(poor).error).toBe('insufficient_points');
    const untouched = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: broker.id,
    });
    expect(untouched.availableBalance).toBe(10);
  });

  it('corrida de SALDO da mesma usuária: o piso no commit deixa passar um resgate só', async () => {
    const spender = actors.get('buyerb')!;
    // Saldo exato para UM resgate: duas intenções simultâneas não cabem, e a
    // perdedora não pode virar saldo negativo.
    await account(spender.id, 100, 0);
    const rewardId = `${runId}-reward-balance`;
    await fixture('rewards', rewardId, '', {
      name: 'Recompensa de saldo (temporária)',
      type: 'physical',
      description: 'Fixture do runtime.',
      pointsCost: 100,
      stock: 5,
      perUserLimit: 0,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'active',
      version: 1,
    });

    const race = await Promise.all([
      runFunction({ kind: 'session', actor: spender }, 'redeem-reward', {
        rewardId,
        idempotencyKey: `${runId}-balance-a`,
        expectedCost: 100,
      }),
      runFunction({ kind: 'session', actor: spender }, 'redeem-reward', {
        rewardId,
        idempotencyKey: `${runId}-balance-b`,
        expectedCost: 100,
      }),
    ]);
    for (const run of race) expect(run.executionStatus).toBe('completed');
    expect(race.map((run) => run.http).sort()).toEqual([201, 409]);
    const winnerIndex = race.findIndex((run) => run.http === 201);
    minted(String(json(race[winnerIndex]).redemptionId));
    // O motivo é o REAL: o saldo já é zero no estado commitado pela vencedora.
    expect(json(race[1 - winnerIndex]).error).toBe('insufficient_points');
    const settled = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: spender.id,
    });
    expect(settled.availableBalance).toBe(0);
    expect(await countRows('reward_redemptions', [Query.equal('rewardId', rewardId)])).toBe(1);
    // Ainda sobram 4 unidades: quem decidiu a corrida foi o SALDO, não o estoque.
    expect((await adminDb.getRow({ databaseId, tableId: 'rewards', rowId: rewardId })).stock).toBe(
      4,
    );
  });
});

describe('matriz de segurança (runtime)', () => {
  it('não deixa sessão anônima executar nada: a plataforma recusa antes do container', async () => {
    for (const functionId of ['join-challenge', 'submit-content', 'redeem-reward']) {
      const anonymous = await runFunction({ kind: 'anonymous' }, functionId, {});
      expect(anonymous.http).toBe(401);
      expect(anonymous.platformRefusal).not.toBe('');
      expect(anonymous.executionId).toBe('');
    }
  });

  it('identidade NÃO vem do payload: userId forjado no corpo é ignorado', async () => {
    const forger = actors.get('forger')!;
    const victim = actors.get('rival')!;
    const challengeId = await challenge('forge');
    const forged = await runFunction({ kind: 'session', actor: forger }, 'join-challenge', {
      challengeId,
      userId: victim.id,
    });
    expect(proved(forged)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });
    // A participação é da SESSÃO, nunca do corpo.
    expect(
      await responseCode(() =>
        adminDb.getRow({
          databaseId,
          tableId: 'challenge_participants',
          rowId: rowId('join', challengeId, forger.id),
        }),
      ),
    ).toBe(200);
    expect(
      await responseCode(() =>
        adminDb.getRow({
          databaseId,
          tableId: 'challenge_participants',
          rowId: rowId('join', challengeId, victim.id),
        }),
      ),
    ).toBe(404);
  });

  it('a criadora lê o que é dela pela sessão e não alcança o de ninguém', async () => {
    const creator = actors.get('creator')!;
    const other = actors.get('target')!;
    await fixture(
      'notifications',
      `${runId}-notify-other`,
      other.id,
      {
        userId: other.id,
        type: 'submission.approved',
        title: 'Aviso de outra pessoa',
        body: 'Fixture do runtime.',
        referenceId: '',
        eventKey: `${runId}-other`,
      },
      [`read("user:${other.id}")`],
    );
    const session = new TablesDB(plainClient().setSession(creator.secret));
    const mine = await session.listRows({
      databaseId,
      tableId: 'notifications',
      queries: [Query.equal('userId', other.id), Query.limit(10)],
    });
    expect(mine.total).toBe(0);
    expect(
      await responseCode(() =>
        session.getRow({ databaseId, tableId: 'notifications', rowId: `${runId}-notify-other` }),
      ),
    ).toBe(404);
    // E o extrato alheio também não: a leitura do ledger é do dono.
    const ledger = await session.listRows({
      databaseId,
      tableId: 'point_transactions',
      queries: [Query.equal('userId', other.id), Query.limit(10)],
    });
    expect(ledger.total).toBe(0);
  });
});

describe('fluxo completo pelo runtime (criadora → envio → moderação → pontos → ranking → notificação)', () => {
  it('leva a criadora da entrada ao saldo, com a equipe aprovando e a fila entregando o aviso', async () => {
    const creator = actors.get('flow')!;
    const admin = actors.get('admin')!;
    const challengeId = await challenge('flow', { points: 300 });

    // 1. a criadora entra no desafio
    const joined = await runFunction({ kind: 'session', actor: creator }, 'join-challenge', {
      challengeId,
    });
    expect(proved(joined)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });

    // 2. envia o conteúdo
    const submitted = await runFunction({ kind: 'session', actor: creator }, 'submit-content', {
      challengeId,
      url: `https://instagram.com/p/${runId}-flow`,
      platform: 'instagram',
    });
    expect(proved(submitted)).toEqual({ http: 201, executionStatus: 'completed', trigger: 'http' });
    const submissionId = String(json(submitted).submissionId);
    minted(submissionId);

    // 3. a equipe vê a fila e aprova
    const queue = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      action: 'queue',
    });
    expect(
      (json(queue).items as { submissionId: string }[]).some(
        (item) => item.submissionId === submissionId,
      ),
    ).toBe(true);
    const approved = await runFunction({ kind: 'session', actor: admin }, 'moderate-submission', {
      submissionId,
      decision: 'approve',
    });
    expect(proved(approved)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    expect(json(approved)).toMatchObject({
      status: 'approved',
      pointsAwarded: 300,
      credited: true,
    });

    // 4. a fila entrega o aviso da aprovação
    const drained = await runFunction({ kind: 'session', actor: admin }, 'process-outbox');
    expect(proved(drained)).toEqual({ http: 200, executionStatus: 'completed', trigger: 'http' });
    const notificationId = rowId('notify', creator.id, `submission.approved:${submissionId}`);
    const notification = await adminDb.getRow({
      databaseId,
      tableId: 'notifications',
      rowId: notificationId,
    });
    expect(notification.type).toBe('submission.approved');
    expect(String(notification.body)).toContain('300');

    // 5. o que a criadora enxerga bate com o banco
    const account = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: creator.id,
    });
    expect(account.availableBalance).toBe(300);
    expect(account.qualifyingPoints).toBe(300);
    expect(account.levelId).toBe('exploradora');
    const entry = await adminDb.getRow({
      databaseId,
      tableId: 'ranking_entries',
      rowId: rowId('rank', periodKey(new Date(), rankingTimeZone), creator.id),
    });
    expect(entry.earnedPoints).toBe(300);
    const session = new TablesDB(plainClient().setSession(creator.secret));
    const own = await session.listRows({
      databaseId,
      tableId: 'notifications',
      queries: [Query.equal('userId', creator.id), Query.limit(10)],
    });
    expect(own.rows.some((row) => row.$id === notificationId)).toBe(true);
  });
});
