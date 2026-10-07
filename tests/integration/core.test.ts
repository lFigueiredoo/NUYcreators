import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Account, Client, Permission, Query, Role, TablesDB, Users } from 'node-appwrite';
import { randomBytes } from 'node:crypto';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { snapshotRowId } from '../../src/lib/appwrite/data/contract';
import type { AdminRole } from '../../src/lib/security/permissions';
import { periodKey, rowId } from '../../src/features/workspace/core';
import { rankingTimeZone } from '../../src/features/workspace/domain/ranking';
import {
  adjustPoints,
  adminChallenges,
  adminCreator,
  adminCreators,
  adminOverview,
  adminReward,
  closeChallenge,
  deliverNotification,
  joinChallenge,
  markAllNotificationsRead,
  moderateSubmission,
  processOutbox,
  publishChallenge,
  publishReward,
  rebuildRanking,
  redeemReward,
  saveCampaign,
  saveChallenge,
  saveReward,
  setNotificationRead,
  setRewardStock,
  submitContent,
  syncPublicProfile,
  updateOwnProfile,
  type CoreContext,
  type CoreResult,
} from '../../src/features/workspace/core';

/**
 * Núcleo operacional contra o staging REAL.
 *
 * O cliente de teste (`APPWRITE_TEST_API_KEY`) faz o papel da chave de operação:
 * legítimo em teste e NUNCA usado pelo app. O que este arquivo prova:
 *
 *  - cada fluxo grava o que promete e recusa o que promete recusar;
 *  - aprovação credita UMA vez, inclusive em aprovação simultânea;
 *  - resgate gasta `availableBalance` e não rebaixa nível (`qualifyingPoints`
 *    intocado);
 *  - corrida de estoque unitário e de saldo tem UM commit — o banco recusa o
 *    outro, e nada parcial fica gravado;
 *  - sessão de usuária não lê linha privada de outra, nem escreve ledger,
 *    estoque, ranking ou status de moderação pelo SDK;
 *  - repetir a mesma intenção devolve o mesmo resultado, sem cobrar de novo.
 *
 * Nenhuma credencial é impressa; fixtures nascem e morrem nesta rodada.
 */
const runId = `c${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const endpoint = process.env.APPWRITE_ENDPOINT!;
const project = process.env.APPWRITE_PROJECT_ID!;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const clients = () => new Client().setEndpoint(endpoint).setProject(project);

let ops: TablesDB;
let adminUsers: Users;
let actorA: { id: string; email: string; password: string; secret: string };
let actorB: { id: string; email: string; password: string; secret: string };
let correlation = 0;
/** Guardado para a prova de entrega do evento de aprovação. */
let approvedSubmissionId = '';
let approvedEventKey = '';

const cleanup: { tableId: string; rowId: string }[] = [];
const transactions: string[] = [];

function track(tableId: string, id: string) {
  cleanup.push({ tableId, rowId: id });
  return id;
}

/** Contexto do núcleo: identidade e papéis vêm de fora, nunca do formulário. */
function context(userId: string, roles: AdminRole[] = []): CoreContext {
  correlation += 1;
  return {
    tables: ops,
    databaseId,
    actor: { userId, roles },
    now: new Date(),
    correlationId: `${runId}-${correlation}`,
  };
}

function staff(roles: AdminRole[] = ['admin']) {
  return context(actorA.id, roles);
}

async function responseCode(operation: () => Promise<unknown>) {
  try {
    await operation();
    return 200;
  } catch (error) {
    return (error as { code?: number }).code ?? -1;
  }
}

/** Recusa medida: status HTTP e tipo do AppwriteException — nunca só "falhou". */
async function rejection(operation: () => Promise<unknown>) {
  try {
    await operation();
    return { status: 200, code: 200, type: '', message: '' };
  } catch (error) {
    const failure = error as { code?: number; type?: string; message?: string };
    return {
      status: failure.code ?? -1,
      code: failure.code ?? -1,
      type: failure.type ?? '',
      message: failure.message ?? '',
    };
  }
}

async function count(tableId: string, queries: string[]) {
  const result = await ops.listRows({ databaseId, tableId, queries: [...queries, Query.limit(1)] });
  return result.total;
}

async function readRow(tableId: string, id: string) {
  try {
    return await ops.getRow({ databaseId, tableId, rowId: id });
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}

async function fixture(tableId: string, id: string, data: Record<string, unknown>) {
  await ops.createRow({ databaseId, tableId, rowId: id, data, permissions: [] });
  return track(tableId, id);
}

/** Falha de negócio sem exceção: devolve o código para a asserção. */
function codeOf<T>(result: CoreResult<T>) {
  return result.ok ? 'ok' : result.failure.code;
}

const open = {
  startsAt: new Date(Date.now() - 86_400_000).toISOString(),
  endsAt: new Date(Date.now() + 86_400_000).toISOString(),
};
const challengeIds = {
  open: `${runId}-chopen`,
  gated: `${runId}-chgate`,
  full: `${runId}-chfull`,
  submit: `${runId}-chsub`,
  revision: `${runId}-chrev`,
};
const rewardIds = { one: `${runId}-rw1`, two: `${runId}-rw2`, three: `${runId}-rw3` };

beforeAll(async () => {
  assertTestEnvironment(process.env);
  const key = process.env.APPWRITE_TEST_API_KEY!;
  ops = new TablesDB(clients().setKey(key));
  adminUsers = new Users(clients().setKey(key));

  for (const [index, slot] of [0, 1].entries()) {
    const id = `${runId}-u${slot}`;
    const email = `${id}@example.invalid`; // nunca um endereço real
    const password = randomBytes(24).toString('hex');
    await new Account(clients()).create({
      userId: id,
      email,
      password,
      name: 'Isolated core fixture',
    });
    const session = await new Account(clients().setKey(key)).createEmailPasswordSession({
      email,
      password,
    });
    if (!session.secret) throw new Error('Sessão de teste sem secret: verifique sessions.write.');
    const actor = { id, email, password, secret: session.secret };
    if (index === 0) actorA = actor;
    else actorB = actor;
  }

  await fixture('challenges', challengeIds.open, {
    slug: `${runId}-aberto`,
    name: 'Desafio aberto (teste isolado)',
    description: 'Fixture de teste de integração.',
    platform: 'instagram',
    ...open,
    points: 500,
    participantCount: 0,
    status: 'published',
    version: 1,
  });
  await fixture('challenges', challengeIds.gated, {
    slug: `${runId}-nivel`,
    name: 'Desafio com nível exigido (teste isolado)',
    description: 'Fixture de teste de integração.',
    platform: 'tiktok',
    ...open,
    points: 100,
    requiredLevelId: 'criadora',
    participantCount: 0,
    status: 'published',
    version: 1,
  });
  await fixture('challenges', challengeIds.full, {
    slug: `${runId}-lotado`,
    name: 'Desafio de uma vaga (teste isolado)',
    description: 'Fixture de teste de integração.',
    platform: 'youtube',
    ...open,
    points: 100,
    participantLimit: 1,
    participantCount: 0,
    status: 'published',
    version: 1,
  });
  await fixture('challenges', challengeIds.submit, {
    slug: `${runId}-envio`,
    name: 'Desafio de envio (teste isolado)',
    description: 'Fixture de teste de integração.',
    platform: 'instagram',
    ...open,
    points: 40,
    participantCount: 0,
    status: 'published',
    version: 1,
  });
  await fixture('challenges', challengeIds.revision, {
    slug: `${runId}-revisao`,
    name: 'Desafio de revisão (teste isolado)',
    description: 'Fixture de teste de integração.',
    platform: 'tiktok',
    ...open,
    points: 100,
    participantCount: 0,
    status: 'published',
    version: 1,
  });
  await fixture('rewards', rewardIds.one, {
    name: 'Recompensa unitária (teste isolado)',
    type: 'product',
    description: 'Fixture de teste de integração.',
    pointsCost: 200,
    stock: 1,
    perUserLimit: 1,
    ...open,
    status: 'published',
    version: 1,
  });
  await fixture('rewards', rewardIds.two, {
    name: 'Recompensa A (teste isolado)',
    type: 'product',
    description: 'Fixture de teste de integração.',
    pointsCost: 200,
    stock: 5,
    perUserLimit: 2,
    ...open,
    status: 'published',
    version: 1,
  });
  await fixture('rewards', rewardIds.three, {
    name: 'Recompensa B (teste isolado)',
    type: 'product',
    description: 'Fixture de teste de integração.',
    pointsCost: 200,
    stock: 5,
    perUserLimit: 2,
    ...open,
    status: 'published',
    version: 1,
  });
  await fixture('profiles', actorA.id, {
    userId: actorA.id,
    name: 'Fixture A',
    phone: '11999999999',
    city: 'São Paulo',
    state: 'SP',
    birthDate: '1995-04-12',
    niche: 'beleza',
    creatorType: 'criadora',
    publicProfile: false,
    onboardingCompletedAt: new Date().toISOString(),
  });
});

afterAll(async () => {
  if (!ops) return;
  let failures = 0;
  for (const transactionId of transactions) {
    const code = await responseCode(() => ops.deleteTransaction({ transactionId }));
    if (![200, 404].includes(code)) failures++;
  }

  // Tudo o que esta rodada escreveu é alcançado pelo vínculo com um id que ela
  // mesma criou: participantes, envios, resgates e as pontas de auditoria
  // (identificadas pela correlação) que carregam o resto.
  const subjects = new Set<string>([
    actorA.id,
    actorB.id,
    ...Object.values(challengeIds),
    ...Object.values(rewardIds),
  ]);
  for (const row of cleanup)
    if (
      [
        'challenge_submissions',
        'reward_redemptions',
        'challenge_participants',
        'notifications',
      ].includes(row.tableId)
    )
      subjects.add(row.rowId);
  const ids = [...subjects];

  const derived: { tableId: string; column: string; values: string[] }[] = [
    { tableId: 'outbox_events', column: 'aggregateId', values: ids },
    { tableId: 'submission_history', column: 'submissionId', values: ids },
    { tableId: 'redemption_history', column: 'redemptionId', values: ids },
    { tableId: 'notifications', column: 'userId', values: [actorA.id, actorB.id] },
    { tableId: 'ranking_entries', column: 'userId', values: [actorA.id, actorB.id] },
  ];
  for (const { tableId, column, values } of derived) {
    const found = await ops.listRows({
      databaseId,
      tableId,
      queries: [Query.equal(column, values), Query.limit(500)],
    });
    for (const row of found.rows) track(tableId, String(row.$id));
  }

  const logs = await ops.listRows({
    databaseId,
    tableId: 'audit_logs',
    queries: [Query.startsWith('correlationId', runId), Query.limit(500)],
  });
  for (const log of logs.rows) {
    track('audit_log_snapshots', snapshotRowId(String(log.$id), 'before'));
    track('audit_log_snapshots', snapshotRowId(String(log.$id), 'after'));
    track('audit_logs', String(log.$id));
  }

  for (const row of cleanup.reverse()) {
    const code = await responseCode(() => ops.deleteRow({ databaseId, ...row }));
    if (![200, 404].includes(code)) failures++;
  }
  for (const actor of [actorA, actorB]) {
    if (!actor) continue;
    const code = await responseCode(() => adminUsers.delete({ userId: actor.id }));
    if (![200, 404].includes(code)) failures++;
  }
  if (failures)
    throw new Error(
      `Limpeza incompleta (${failures} linhas). Revise a rodada ${runId}; não apague dados alheios.`,
    );
});

describe('entrada em desafio', () => {
  it('cria a participação uma vez e repete sem duplicar', async () => {
    const first = await joinChallenge(context(actorA.id), { challengeId: challengeIds.open });
    expect(first.ok).toBe(true);
    if (first.ok) track('challenge_participants', first.value.participationId);
    const again = await joinChallenge(context(actorA.id), { challengeId: challengeIds.open });
    expect(again.ok && again.value.created).toBe(false);
    expect(
      await count('challenge_participants', [
        Query.equal('challengeId', challengeIds.open),
        Query.equal('userId', actorA.id),
      ]),
    ).toBe(1);
    expect((await readRow('challenges', challengeIds.open))?.participantCount).toBe(1);
  });

  it('recusa nível exigido que a conta não alcança', async () => {
    const result = await joinChallenge(context(actorB.id), { challengeId: challengeIds.gated });
    expect(codeOf(result)).toBe('level_required');
    expect(
      await count('challenge_participants', [
        Query.equal('challengeId', challengeIds.gated),
        Query.equal('userId', actorB.id),
      ]),
    ).toBe(0);
  });

  it('não vende a última vaga duas vezes', async () => {
    const winner = await joinChallenge(context(actorA.id), { challengeId: challengeIds.full });
    expect(winner.ok).toBe(true);
    if (winner.ok) track('challenge_participants', winner.value.participationId);
    const loser = await joinChallenge(context(actorB.id), { challengeId: challengeIds.full });
    expect(codeOf(loser)).toBe('capacity_full');
    expect(
      await count('challenge_participants', [Query.equal('challengeId', challengeIds.full)]),
    ).toBe(1);
    expect((await readRow('challenges', challengeIds.full))?.participantCount).toBe(1);
  });
});

describe('envio de conteúdo', () => {
  const url = 'https://www.instagram.com/p/TESTE-NUY/';

  it('exige participação antes do envio', async () => {
    const result = await submitContent(context(actorB.id), {
      challengeId: challengeIds.submit,
      url,
    });
    expect(codeOf(result)).toBe('not_participant');
  });

  it('registra o envio, canoniza o link e não duplica o mesmo conteúdo', async () => {
    const join = await joinChallenge(context(actorB.id), { challengeId: challengeIds.submit });
    expect(join.ok).toBe(true);
    if (join.ok) track('challenge_participants', join.value.participationId);

    const first = await submitContent(context(actorB.id), {
      challengeId: challengeIds.submit,
      url: 'https://instagram.com/p/TESTE-NUY?utm_source=ig&igshid=xyz',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.created).toBe(true);
    expect(first.value.status).toBe('pending');
    track('challenge_submissions', first.value.submissionId);
    // Link canonizado: sem rastreio, host normalizado.
    expect((await readRow('challenge_submissions', first.value.submissionId))?.canonicalUrl).toBe(
      'https://instagram.com/p/TESTE-NUY',
    );

    const repeat = await submitContent(context(actorB.id), {
      challengeId: challengeIds.submit,
      url,
    });
    expect(repeat.ok && repeat.value.created).toBe(false);
    expect(
      await count('challenge_submissions', [
        Query.equal('userId', actorB.id),
        Query.equal('challengeId', challengeIds.submit),
      ]),
    ).toBe(1);

    const other = await submitContent(context(actorB.id), {
      challengeId: challengeIds.submit,
      url: 'https://www.instagram.com/p/OUTRO-NUY/',
    });
    // Já existe conteúdo em análise: o ciclo só sai de `pending` pela moderação.
    expect(codeOf(other)).toBe('conflict');
  });
});

describe('moderação e pontos', () => {
  it('aprova, credita uma vez e projeta nível e ranking', async () => {
    const join = await joinChallenge(context(actorB.id), { challengeId: challengeIds.open });
    expect(join.ok).toBe(true);
    if (join.ok) track('challenge_participants', join.value.participationId);
    const submission = await submitContent(context(actorB.id), {
      challengeId: challengeIds.open,
      url: 'https://www.tiktok.com/@nuy/video/1',
    });
    expect(submission.ok).toBe(true);
    if (!submission.ok) return;
    const submissionId = track('challenge_submissions', submission.value.submissionId);
    approvedSubmissionId = submissionId;
    approvedEventKey = `submission.approved:${submissionId}`;

    const approved = await moderateSubmission(staff(['moderator']), {
      submissionId,
      decision: 'approve',
      reason: '',
      expectedRevision: 1,
    });
    expect(approved.ok).toBe(true);
    if (approved.ok) {
      expect(approved.value.credited).toBe(true);
      expect(approved.value.pointsAwarded).toBe(500);
    }

    track('point_accounts', actorB.id);
    const account = await readRow('point_accounts', actorB.id);
    expect(account?.availableBalance).toBe(500);
    expect(account?.qualifyingPoints).toBe(500);
    expect(account?.levelId).toBe('exploradora');
    track('point_transactions', rowId('ptx', approvedEventKey));
    expect(await count('point_transactions', [Query.equal('referenceId', submissionId)])).toBe(1);

    const period = periodKey(new Date(), rankingTimeZone);
    track('ranking_entries', rowId('rank', period, actorB.id));
    const ranking = await readRow('ranking_entries', rowId('rank', period, actorB.id));
    expect(ranking?.earnedPoints).toBe(500);
    expect(ranking?.periodKey).toBe(period);

    // Segunda aprovação do MESMO envio não paga de novo.
    const again = await moderateSubmission(staff(['moderator']), {
      submissionId,
      decision: 'approve',
    });
    expect(codeOf(again)).toBe('conflict');
    expect(await count('point_transactions', [Query.equal('referenceId', submissionId)])).toBe(1);
    expect((await readRow('point_accounts', actorB.id))?.availableBalance).toBe(500);
  });

  it('decide sobre a revisão que viu e recusa decisão sem motivo', async () => {
    // Desafio próprio: aprovação é terminal no fluxo (docs/flows.md), então
    // reenviar onde já houve decisão não é o que este caso mede.
    const join = await joinChallenge(context(actorB.id), { challengeId: challengeIds.revision });
    expect(join.ok).toBe(true);
    if (join.ok) track('challenge_participants', join.value.participationId);
    const submission = await submitContent(context(actorB.id), {
      challengeId: challengeIds.revision,
      url: 'https://www.tiktok.com/@nuy/video/2',
    });
    expect(submission.ok).toBe(true);
    if (!submission.ok) return;
    const submissionId = track('challenge_submissions', submission.value.submissionId);

    expect(
      codeOf(
        await moderateSubmission(staff(['moderator']), {
          submissionId,
          decision: 'reject',
          reason: '',
        }),
      ),
    ).toBe('invalid');
    // Revisão que a equipe NÃO viu: recusa em vez de decidir sobre outra coisa.
    expect(
      codeOf(
        await moderateSubmission(staff(['moderator']), {
          submissionId,
          decision: 'approve',
          expectedRevision: 7,
        }),
      ),
    ).toBe('conflict');
    expect((await readRow('challenge_submissions', submissionId))?.status).toBe('pending');

    const revision = await moderateSubmission(staff(['moderator']), {
      submissionId,
      decision: 'request_revision',
      reason: 'Ajuste a legenda e reenvie.',
      expectedRevision: 1,
    });
    expect(revision.ok).toBe(true);
    expect((await readRow('challenge_submissions', submissionId))?.status).toBe(
      'revision_requested',
    );

    // Transição documentada `revision_requested -> pending`: o reenvio mantém o
    // ID lógico, incrementa a revisão e NÃO cria uma segunda linha de envio.
    const resend = await submitContent(context(actorB.id), {
      challengeId: challengeIds.revision,
      url: 'https://www.tiktok.com/@nuy/video/2',
    });
    expect(resend.ok).toBe(true);
    if (resend.ok) {
      expect(resend.value.created).toBe(false);
      expect(resend.value.revision).toBe(2);
      expect(resend.value.submissionId).toBe(submissionId);
    }
    expect(
      await count('challenge_submissions', [
        Query.equal('userId', actorB.id),
        Query.equal('challengeId', challengeIds.revision),
      ]),
    ).toBe(1);
    expect(await count('submission_history', [Query.equal('submissionId', submissionId)])).toBe(3);

    // A moderação decide sobre a revisão que viu: a revisão 1 já não é a atual.
    expect(
      codeOf(
        await moderateSubmission(staff(['moderator']), {
          submissionId,
          decision: 'request_revision',
          reason: 'Revisão vencida.',
          expectedRevision: 1,
        }),
      ),
    ).toBe('conflict');

    // Quem não tem papel de moderação não decide nada.
    expect(
      codeOf(
        await moderateSubmission(context(actorB.id, ['fulfillment']), {
          submissionId,
          decision: 'approve',
        }),
      ),
    ).toBe('forbidden');
  });

  it('aprovação simultânea credita exatamente uma vez', async () => {
    const join = await joinChallenge(context(actorA.id), { challengeId: challengeIds.submit });
    expect(join.ok).toBe(true);
    if (join.ok) track('challenge_participants', join.value.participationId);
    const submission = await submitContent(context(actorA.id), {
      challengeId: challengeIds.submit,
      url: 'https://www.instagram.com/p/CORRIDA-NUY/',
    });
    expect(submission.ok).toBe(true);
    if (!submission.ok) return;
    const submissionId = track('challenge_submissions', submission.value.submissionId);
    track('challenge_participants', rowId('join', challengeIds.submit, actorA.id));
    track('point_transactions', rowId('ptx', `submission.approved:${submissionId}`));
    track('point_accounts', actorA.id);
    track('ranking_entries', rowId('rank', periodKey(new Date(), rankingTimeZone), actorA.id));

    const results = await Promise.all([
      moderateSubmission(staff(['moderator']), { submissionId, decision: 'approve' }),
      moderateSubmission(staff(['moderator']), { submissionId, decision: 'approve' }),
    ]);
    // Uma credita; a outra perde — e o extrato tem UM lançamento. É isso que
    // impede pagar duas vezes por duas decisões simultâneas da equipe.
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const loser = results.find((result) => !result.ok);
    expect(loser && codeOf(loser)).toBe('conflict');
    expect(await count('point_transactions', [Query.equal('referenceId', submissionId)])).toBe(1);
    expect(
      await count('point_transactions', [
        Query.equal('idempotencyKey', `submission.approved:${submissionId}`),
      ]),
    ).toBe(1);
    expect((await readRow('point_accounts', actorA.id))?.availableBalance).toBe(40);
  });
});

describe('resgate', () => {
  it('debita só o saldo disponível e mantém o nível', async () => {
    const before = await readRow('point_accounts', actorB.id);
    const result = await redeemReward(context(actorB.id), {
      rewardId: rewardIds.one,
      expectedCost: 200,
      idempotencyKey: `${runId}-rw1`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(result.value.cost).toBe(200);
    track('reward_redemptions', result.value.redemptionId);
    track('point_transactions', rowId('ptx', `reward.redeemed:${runId}-rw1`));

    const after = await readRow('point_accounts', actorB.id);
    expect(after?.availableBalance).toBe((before?.availableBalance ?? 0) - 200);
    // Nível nunca cai por gasto: `qualifyingPoints` intocado.
    expect(after?.qualifyingPoints).toBe(before?.qualifyingPoints);
    expect(after?.levelId).toBe(before?.levelId);
    expect((await readRow('rewards', rewardIds.one))?.stock).toBe(0);

    const debit = await readRow('point_transactions', rowId('ptx', `reward.redeemed:${runId}-rw1`));
    expect(debit?.amount).toBe(-200);
    expect(debit?.rankingDelta).toBe(0);

    const replay = await redeemReward(context(actorB.id), {
      rewardId: rewardIds.one,
      expectedCost: 200,
      idempotencyKey: `${runId}-rw1`,
    });
    expect(replay.ok && replay.value.created).toBe(false);
    expect(replay.ok && replay.value.redemptionId).toBe(result.value.redemptionId);
    expect((await readRow('point_accounts', actorB.id))?.availableBalance).toBe(
      after?.availableBalance,
    );
    expect(await count('reward_redemptions', [Query.equal('rewardId', rewardIds.one)])).toBe(1);
  });

  it('não cobra valor que a tela não confirmou', async () => {
    const result = await redeemReward(context(actorB.id), {
      rewardId: rewardIds.two,
      expectedCost: 999,
      idempotencyKey: `${runId}-preco`,
    });
    expect(codeOf(result)).toBe('price_changed');
    expect(await count('reward_redemptions', [Query.equal('rewardId', rewardIds.two)])).toBe(0);
  });

  it('corrida de estoque unitário: um resgate passa, o outro recebe esgotado', async () => {
    const prize = `${runId}-rwrace`;
    await fixture('rewards', prize, {
      name: 'Recompensa de corrida (teste isolado)',
      type: 'product',
      description: 'Fixture de teste de integração.',
      pointsCost: 100,
      stock: 1,
      perUserLimit: 1,
      ...open,
      status: 'published',
      version: 1,
    });
    for (const [actor, slot] of [
      [actorA, 'a'],
      [actorB, 'b'],
    ] as const) {
      const adjust = await adjustPoints(staff(), {
        userId: actor.id,
        amount: 100,
        reason: 'Fixture de concorrência',
        referenceId: runId,
        key: `${runId}-ajuste-${slot}`,
      });
      expect(adjust.ok).toBe(true);
      track('point_transactions', rowId('ptx', `points.adjusted:${runId}-ajuste-${slot}`));
      track('point_accounts', actor.id);
    }

    const results = await Promise.all([
      redeemReward(context(actorA.id), { rewardId: prize, idempotencyKey: `${runId}-corrida-a` }),
      redeemReward(context(actorB.id), { rewardId: prize, idempotencyKey: `${runId}-corrida-b` }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const loser = results.find((result) => !result.ok);
    expect(loser && codeOf(loser)).toBe('out_of_stock');
    // Estoque unitário: um passa, zero sobra — e nunca fica negativo.
    expect((await readRow('rewards', prize))?.stock).toBe(0);
    expect(await count('reward_redemptions', [Query.equal('rewardId', prize)])).toBe(1);
    for (const key of [`${runId}-corrida-a`, `${runId}-corrida-b`])
      track('point_transactions', rowId('ptx', `reward.redeemed:${key}`));
    track('reward_redemptions', rowId('redeem', actorA.id, `${runId}-corrida-a`));
    track('reward_redemptions', rowId('redeem', actorB.id, `${runId}-corrida-b`));
  });

  it('corrida de saldo: nunca gasta mais do que tem', async () => {
    const account = await readRow('point_accounts', actorA.id);
    const balance = typeof account?.availableBalance === 'number' ? account.availableBalance : 0;
    if (balance !== 200) {
      const adjust = await adjustPoints(staff(), {
        userId: actorA.id,
        amount: 200 - balance,
        reason: 'Nivelamento de fixture',
        referenceId: runId,
        key: `${runId}-nivel-a`,
      });
      expect(adjust.ok).toBe(true);
      track('point_transactions', rowId('ptx', `points.adjusted:${runId}-nivel-a`));
    }
    const results = await Promise.all([
      redeemReward(context(actorA.id), {
        rewardId: rewardIds.two,
        idempotencyKey: `${runId}-saldo-a`,
      }),
      redeemReward(context(actorA.id), {
        rewardId: rewardIds.three,
        idempotencyKey: `${runId}-saldo-b`,
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const loser = results.find((result) => !result.ok);
    expect(loser && codeOf(loser)).toBe('insufficient_points');
    const after = await readRow('point_accounts', actorA.id);
    expect(after?.availableBalance).toBe(0);
    expect((after?.availableBalance ?? -1) >= 0).toBe(true);

    // A perdedora não deixou rastro: nem pedido, nem lançamento no extrato.
    const lostKey = results[0].ok ? `${runId}-saldo-b` : `${runId}-saldo-a`;
    const wonKey = results[0].ok ? `${runId}-saldo-a` : `${runId}-saldo-b`;
    expect(await readRow('reward_redemptions', rowId('redeem', actorA.id, lostKey))).toBe(null);
    expect(await readRow('point_transactions', rowId('ptx', `reward.redeemed:${lostKey}`))).toBe(
      null,
    );
    track('point_transactions', rowId('ptx', `reward.redeemed:${wonKey}`));
    track('reward_redemptions', rowId('redeem', actorA.id, wonKey));
    for (const result of results)
      if (result.ok) track('reward_redemptions', result.value.redemptionId);
  });

  it('desfaz a transação inteira quando o débito não passa', async () => {
    const rewardId = `${runId}-rwatomic`;
    await fixture('rewards', rewardId, {
      name: 'Recompensa atômica (teste isolado)',
      type: 'product',
      description: 'Fixture de teste de integração.',
      pointsCost: 5000,
      stock: 1,
      perUserLimit: 1,
      ...open,
      status: 'published',
      version: 1,
    });
    const result = await redeemReward(context(actorB.id), {
      rewardId,
      idempotencyKey: `${runId}-atomico`,
    });
    expect(codeOf(result)).toBe('insufficient_points');
    // O estoque é decrementado ANTES do débito: se a transação não fosse
    // atômica, a unidade teria sumido sem ninguém resgatar.
    expect((await readRow('rewards', rewardId))?.stock).toBe(1);
    expect(await count('reward_redemptions', [Query.equal('rewardId', rewardId)])).toBe(0);
    expect(
      await readRow('point_transactions', rowId('ptx', `reward.redeemed:${runId}-atomico`)),
    ).toBe(null);
    track('reward_redemptions', rowId('redeem', actorB.id, `${runId}-atomico`));
  });
});

describe('ajuste de pontos', () => {
  it('exige papel, motivo e referência e é idempotente', async () => {
    const key = `${runId}-ajuste`;

    // Papel de moderação não ajusta saldo: capacidades são separadas.
    expect(
      codeOf(
        await adjustPoints(context(actorB.id, ['moderator']), {
          userId: actorB.id,
          amount: 10,
          reason: 'tentativa de moderadora',
          referenceId: runId,
          key: `${key}-x`,
        }),
      ),
    ).toBe('forbidden');
    expect(
      codeOf(
        await adjustPoints(staff(), {
          userId: actorB.id,
          amount: 10,
          reason: 'sem referência',
          referenceId: '',
          key: `${key}-y`,
        }),
      ),
    ).toBe('invalid');

    const applied = await adjustPoints(staff(), {
      userId: actorB.id,
      amount: 30,
      reason: 'Cortesia de teste',
      referenceId: runId,
      key,
    });
    expect(applied.ok).toBe(true);
    track('point_transactions', rowId('ptx', `points.adjusted:${key}`));
    const before = await readRow('point_accounts', actorB.id);

    // Repetição da mesma intenção: nada de crédito em dobro.
    const again = await adjustPoints(staff(), {
      userId: actorB.id,
      amount: 30,
      reason: 'Cortesia de teste',
      referenceId: runId,
      key,
    });
    expect(codeOf(again)).toBe('conflict');
    expect((await readRow('point_accounts', actorB.id))?.availableBalance).toBe(
      before?.availableBalance,
    );
    // Ajuste não infla ranking: `rankingDelta` é zero por desenho.
    expect(
      (await readRow('point_transactions', rowId('ptx', `points.adjusted:${key}`)))?.rankingDelta,
    ).toBe(0);
  });
});

describe('ranking reconstruído do extrato', () => {
  it('recompõe a projeção a partir dos créditos elegíveis', async () => {
    const period = periodKey(new Date(), rankingTimeZone);
    const result = await rebuildRanking(staff(), { period });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entry = result.value.periods.find((item) => item.periodKey === period);
    expect(entry).toBeDefined();
    // O valor esperado vem dos lançamentos que ESTA rodada criou, lidos pelo id
    // derivado da chave de idempotência — não de uma conta feita à mão.
    const expected =
      (await readRow('point_transactions', rowId('ptx', approvedEventKey)))?.rankingDelta ?? 0;
    expect((await readRow('ranking_entries', rowId('rank', period, actorB.id)))?.earnedPoints).toBe(
      expected,
    );
    expect((await readRow('ranking_entries', rowId('rank', period, actorA.id)))?.earnedPoints).toBe(
      40,
    );
  });
});

describe('notificações', () => {
  it('entrega uma vez, respeita a dona e registra leitura', async () => {
    const eventKey = `${runId}-evento`;
    const notificationId = track(
      'notifications',
      await deliverNotification(staff(), {
        userId: actorA.id,
        eventKey,
        type: 'submission.approved',
        title: 'Envio aprovado',
        body: 'Seu envio foi aprovado.',
        referenceId: runId,
      }),
    );

    expect(
      await count('notifications', [Query.equal('userId', actorA.id), Query.isNull('readAt')]),
    ).toBeGreaterThan(0);

    // Não é da outra pessoa: "não é sua" responde como inexistente.
    expect(
      codeOf(await setNotificationRead(context(actorB.id), { notificationId, read: true })),
    ).toBe('not_found');
    expect((await readRow('notifications', notificationId))?.readAt).toBe(null);

    const read = await setNotificationRead(context(actorA.id), { notificationId, read: true });
    expect(read.ok).toBe(true);
    expect((await readRow('notifications', notificationId))?.readAt).toBeTruthy();

    // Desmarcar volta a coluna para NULO: a contagem de não lidas continua certa.
    const unreadAgain = await setNotificationRead(context(actorA.id), {
      notificationId,
      read: false,
    });
    expect(unreadAgain.ok).toBe(true);
    expect((await readRow('notifications', notificationId))?.readAt).toBe(null);

    const all = await markAllNotificationsRead(context(actorA.id));
    expect(all.ok).toBe(true);
    expect(
      await count('notifications', [Query.equal('userId', actorA.id), Query.isNull('readAt')]),
    ).toBe(0);
  });

  it('processa a fila e entrega o evento de aprovação uma única vez', async () => {
    // O job é reprocessável por desenho: algumas passagens esvaziam a fila.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const outcome = await processOutbox(staff(), { limit: 50 });
      expect(outcome.ok).toBe(true);
      const row = await readRow('outbox_events', rowId('outbox', approvedEventKey));
      if (row?.status === 'processed') break;
    }
    const event = await readRow('outbox_events', rowId('outbox', approvedEventKey));
    expect(event?.status).toBe('processed');
    // A entrega é uma notificação real, com a chave do fato — não um contador.
    const delivered = await ops.listRows({
      databaseId,
      tableId: 'notifications',
      queries: [Query.equal('eventKey', approvedEventKey), Query.limit(10)],
    });
    expect(delivered.total).toBe(1);
    expect(delivered.rows[0]?.userId).toBe(actorB.id);

    // Rodar de novo não entrega segunda vez: a chave da notificação é a mesma.
    await processOutbox(staff(), { limit: 50 });
    expect(
      (
        await ops.listRows({
          databaseId,
          tableId: 'notifications',
          queries: [Query.equal('eventKey', approvedEventKey), Query.limit(10)],
        })
      ).total,
    ).toBe(1);
  });
});

describe('perfil', () => {
  it('grava só os campos editáveis e mantém a projeção pública coerente', async () => {
    const updated = await updateOwnProfile(context(actorA.id), {
      name: 'Fixture A editada',
      phone: '11988887777',
      city: 'Campinas',
      state: 'SP',
      birthDate: '1995-04-12',
      niche: 'lifestyle',
      creatorType: 'ugc',
      publicProfile: true,
    });
    expect(updated.ok).toBe(true);
    const published = await syncPublicProfile(context(actorA.id), {
      displayName: 'Fixture A editada',
      publicProfile: true,
    });
    expect(published.ok).toBe(true);
    track('public_creator_profiles', actorA.id);
    expect((await readRow('public_creator_profiles', actorA.id))?.displayName).toBe(
      'Fixture A editada',
    );

    // A linha editada é sempre a do `userId` da sessão: quem não tem perfil
    // recebe `not_found` em vez de criar um — e o perfil de A não foi tocado.
    expect((await readRow('profiles', actorA.id))?.name).toBe('Fixture A editada');
    expect(await readRow('profiles', actorB.id)).toBe(null);
    expect(
      codeOf(
        await updateOwnProfile(context(actorB.id), {
          name: 'Invasão',
          phone: '11988887777',
          city: 'Campinas',
          state: 'SP',
          birthDate: '1995-04-12',
          niche: 'lifestyle',
          creatorType: 'ugc',
          publicProfile: false,
        }),
      ),
    ).toBe('not_found');

    const hidden = await syncPublicProfile(context(actorA.id), {
      displayName: 'Fixture A editada',
      publicProfile: false,
    });
    expect(hidden.ok).toBe(true);
    expect((await readRow('public_creator_profiles', actorA.id))?.displayName).toBe('');
    // O perfil privado mantém o dado real; só a projeção pública foi retirada.
    expect((await readRow('profiles', actorA.id))?.city).toBe('Campinas');
  });
});

describe('matriz de permissões da sessão', () => {
  const sessionA = () => new TablesDB(clients().setSession(actorA.secret));

  it('não lê a linha privada de outra pessoa', async () => {
    const other = await rejection(() =>
      sessionA().getRow({ databaseId, tableId: 'point_accounts', rowId: actorB.id }),
    );
    // A linha é privada: a sessão de outra pessoa não a lê por nenhum caminho.
    expect(other.status).toBeGreaterThanOrEqual(400);
  });

  it('não escreve ledger, estoque, ranking nem status de moderação', async () => {
    // Estado ANTES das tentativas: o que esta matriz prova é "nada mudou", e o
    // valor de referência é o real da rodada — não um número fixo no teste.
    const stockBefore = (await readRow('rewards', rewardIds.two))?.stock;
    const balanceBefore = (await readRow('point_accounts', actorA.id))?.availableBalance;
    const statusBefore = (await readRow('challenge_submissions', approvedSubmissionId))?.status;
    const writes = [
      () =>
        sessionA().createRow({
          databaseId,
          tableId: 'point_transactions',
          rowId: `${runId}-proibido`,
          data: {
            userId: actorA.id,
            type: 'earn',
            amount: 999999,
            referenceId: runId,
            referenceType: 'self',
            description: 'autocredito',
            createdAt: new Date().toISOString(),
            idempotencyKey: `${runId}-proibido`,
            rankingDelta: 999999,
          },
          permissions: [Permission.read(Role.user(actorA.id))],
        }),
      () =>
        sessionA().updateRow({
          databaseId,
          tableId: 'point_accounts',
          rowId: actorA.id,
          data: { availableBalance: 999999 },
        }),
      () =>
        sessionA().updateRow({
          databaseId,
          tableId: 'rewards',
          rowId: rewardIds.two,
          data: { stock: 999 },
        }),
      () =>
        sessionA().createRow({
          databaseId,
          tableId: 'ranking_entries',
          rowId: `${runId}-rank-proibido`,
          data: {
            periodKey: `${runId}-falso`,
            userId: actorA.id,
            earnedPoints: 999999,
            lastEarnedAt: new Date().toISOString(),
          },
        }),
      () =>
        sessionA().updateRow({
          databaseId,
          tableId: 'challenge_submissions',
          rowId: approvedSubmissionId,
          data: { status: 'approved' },
        }),
    ];
    for (const write of writes) {
      const measured = await rejection(write);
      expect(measured.status).toBeGreaterThanOrEqual(400);
    }
    // Nada mudou apesar das tentativas.
    expect((await readRow('rewards', rewardIds.two))?.stock).toBe(stockBefore);
    expect((await readRow('point_accounts', actorA.id))?.availableBalance).toBe(balanceBefore);
    expect((await readRow('challenge_submissions', approvedSubmissionId))?.status).toBe(
      statusBefore,
    );
    expect(await readRow('ranking_entries', `${runId}-rank-proibido`)).toBe(null);
    expect(await readRow('point_transactions', `${runId}-proibido`)).toBe(null);
  });

  it('lê o que é dela', async () => {
    expect(
      await responseCode(() =>
        sessionA().getRow({ databaseId, tableId: 'point_accounts', rowId: actorA.id }),
      ),
    ).toBe(200);
    // Linha que ela não tem permissão de ver simplesmente não aparece.
    const ranking = await sessionA().listRows({
      databaseId,
      tableId: 'point_transactions',
      queries: [Query.equal('userId', actorB.id), Query.limit(10)],
    });
    expect(ranking.total).toBe(0);
  });
});

/**
 * Catálogo administrado — o que a equipe cria, publica, encerra e ajusta.
 *
 * A administração inteira se apoia em três promessas que só o banco de verdade
 * pode confirmar:
 *
 *  1. **Rascunho não vaza.** A linha nasce com `permissions: []`; a sessão da
 *     criadora não a lê nem sabendo o id. Publicar é o que troca a permissão, no
 *     MESMO commit da mudança de estado — não há janela em que o desafio está no
 *     ar e invisível, nem o contrário.
 *  2. **Encerrado sai do ar sem apagar.** Quem já participou continua lendo o
 *     desafio (e o próprio histórico); entrar nele, não.
 *  3. **A leitura administrativa lê o esquema pelo nome da COLUNA.** A tela chama
 *     dois números de "pontos"; o banco os chama `availableBalance` e
 *     `qualifyingPoints`. Ler o nome da tela devolveria `undefined` — e o zero
 *     resultante tem cara de resposta. Este bloco trava isso contra o schema real.
 */
describe('catálogo administrado pela equipe', () => {
  const adminSlug = `${runId}-admin`;
  const adminChallenge = rowId('challenge', adminSlug);
  const adminRewardKey = `${runId}-chave-admin`;
  const managedReward = rowId('reward', adminRewardKey);
  const draftRewardKey = `${runId}-chave-rascunho`;
  const draftReward = rowId('reward', draftRewardKey);
  const adminCampaignKey = `${runId}-chave-campanha`;
  const adminCampaign = rowId('campaign', adminCampaignKey);
  const requirementIds = [0, 1].map((index) => rowId('requirement', adminChallenge, index));
  const sessionB = () => new TablesDB(clients().setSession(actorB.secret));

  const challengeDraft = (name: string) => ({
    slug: adminSlug,
    name,
    description: 'Fixture do teste de integração — apagada ao fim da rodada.',
    platform: 'instagram',
    startsAt: '2026-10-01T09:00',
    endsAt: '2026-11-01T23:59',
    points: 120,
    imageFileId: '',
    requiredLevelId: '',
    participantLimit: null,
    campaignId: '',
    productId: '',
    hashtags: '#nuycreators',
    mentions: '@nuycreators',
    requirements: [
      { type: 'hashtag', required: true, configJson: '{"value":"#nuycreators"}' },
      { type: 'link', required: true, configJson: '{"value":"link da publicação"}' },
    ],
  });

  it('rascunho nasce sem permissão: a sessão não lê a linha nem sabendo o id', async () => {
    const created = await saveChallenge(staff(), {
      draft: challengeDraft('Desafio administrado (teste isolado)'),
      publish: false,
      timeZone: rankingTimeZone,
    });
    expect(codeOf(created)).toBe('ok');
    expect(created.ok && created.value).toMatchObject({
      challengeId: adminChallenge,
      status: 'draft',
      created: true,
      version: 1,
    });
    track('challenges', adminChallenge);
    for (const id of requirementIds) track('challenge_requirements', id);

    const row = await readRow('challenges', adminChallenge);
    expect(row?.status).toBe('draft');
    // O rascunho não é "escondido na tela": ele não tem permissão nenhuma.
    expect(row?.$permissions).toEqual([]);
    // A criadora da rodada não o alcança — nem por id direto.
    const denied = await rejection(() =>
      sessionB().getRow({ databaseId, tableId: 'challenges', rowId: adminChallenge }),
    );
    expect(denied.status).toBeGreaterThanOrEqual(400);

    // E o rascunho aparece para a equipe, que é quem trabalha nele.
    const listed = await adminChallenges(staff(), { status: 'draft' });
    expect(
      listed.ok && listed.value.items.some((item) => item.challengeId === adminChallenge),
    ).toBe(true);
    // Moderar não é administrar catálogo: o papel não abre esta porta.
    expect(codeOf(await adminChallenges(staff(['moderator'])))).toBe('forbidden');
  });

  it('publicar troca a permissão no mesmo commit: a criadora passa a ler, e os requisitos junto', async () => {
    const published = await publishChallenge(staff(), {
      challengeId: adminChallenge,
      expectedVersion: 1,
    });
    expect(published.ok && published.value).toMatchObject({ status: 'published', version: 2 });

    const row = await readRow('challenges', adminChallenge);
    expect(row?.$permissions).toEqual([Permission.read(Role.any())]);
    expect(
      await responseCode(() =>
        sessionB().getRow({ databaseId, tableId: 'challenges', rowId: adminChallenge }),
      ),
    ).toBe(200);
    // Requisito publicado sem permissão seria exigência que a criadora não lê.
    for (const id of requirementIds) {
      const requirement = await readRow('challenge_requirements', id);
      expect(requirement?.$permissions).toEqual([Permission.read(Role.any())]);
      expect(
        await responseCode(() =>
          sessionB().getRow({ databaseId, tableId: 'challenge_requirements', rowId: id }),
        ),
      ).toBe(200);
    }
    // Publicar duas vezes com a mesma versão não passa: a segunda é conflito.
    expect(
      codeOf(await publishChallenge(staff(), { challengeId: adminChallenge, expectedVersion: 1 })),
    ).toBe('conflict');
  });

  it('editar exige a versão que a tela viu, e não inventa estado', async () => {
    expect(
      codeOf(
        await saveChallenge(staff(), {
          draft: challengeDraft('Desafio administrado — revisado (teste isolado)'),
          publish: false,
          expectedVersion: 1,
          timeZone: rankingTimeZone,
        }),
      ),
    ).toBe('conflict');

    const edited = await saveChallenge(staff(), {
      draft: challengeDraft('Desafio administrado — revisado (teste isolado)'),
      publish: false,
      expectedVersion: 2,
      timeZone: rankingTimeZone,
    });
    expect(edited.ok && edited.value.version).toBe(3);
    // A versão da LINHA anda junto com a resposta — foi um defeito real: a edição
    // gravava só os campos do formulário, a linha ficava na versão antiga e o
    // `expectedVersion` deixava de barrar a segunda edição de quem estava com a
    // tela aberta. A prova aqui é a linha, não o retorno.
    expect((await readRow('challenges', adminChallenge))?.version).toBe(3);
    // Salvar sem publicar NÃO tira do ar quem já está no ar.
    expect((await readRow('challenges', adminChallenge))?.status).toBe('published');

    // A auditoria guarda o que MUDOU e fica presa à correlação desta rodada.
    const logs = await ops.listRows({
      databaseId,
      tableId: 'audit_logs',
      queries: [
        Query.equal('entityId', adminChallenge),
        Query.orderDesc('occurredAt'),
        Query.limit(10),
      ],
    });
    const actions = logs.rows.map((log) => String(log.action));
    expect(actions).toContain('challenge.created');
    expect(actions).toContain('challenge.published');
    expect(actions).toContain('challenge.updated');
    const updated = logs.rows.find((log) => log.action === 'challenge.updated');
    expect(updated?.actorId).toBe(actorA.id);
    expect(String(updated?.correlationId).startsWith(runId)).toBe(true);
  });

  it('encerrar tira do ar sem apagar: sai do join, continua legível', async () => {
    const closed = await closeChallenge(staff(), {
      challengeId: adminChallenge,
      expectedVersion: 3,
    });
    // O código antes do objeto: uma recusa aqui é `conflict` (a versão que a tela
    // viu não é a da linha) e o teste precisa dizer isso, não só "não bateu".
    expect(codeOf(closed)).toBe('ok');
    expect(closed.ok && closed.value).toMatchObject({ status: 'closed', version: 4 });

    const row = await readRow('challenges', adminChallenge);
    expect(row?.status).toBe('closed');
    // Encerrado continua legível: quem participou precisa reencontrar o desafio.
    expect(row?.$permissions).toEqual([Permission.read(Role.any())]);
    // ...mas não aceita entrada nova.
    expect(codeOf(await joinChallenge(context(actorA.id), { challengeId: adminChallenge }))).toBe(
      'not_published',
    );
  });

  it('recompensa: a chave de intenção não cria duas, e o rascunho não é catálogo', async () => {
    const reward = {
      name: 'Recompensa administrada (teste isolado)',
      type: 'produto físico',
      description: 'Fixture do teste de integração.',
      pointsCost: 150,
      stock: 4,
      perUserLimit: 2,
      startsAt: '2026-10-01T09:00',
      endsAt: '2026-11-01T23:59',
      imageFileId: '',
    };
    const first = await saveReward(staff(), {
      key: adminRewardKey,
      draft: reward,
      publish: false,
      timeZone: rankingTimeZone,
    });
    expect(first.ok && first.value).toMatchObject({
      rewardId: managedReward,
      status: 'draft',
      created: true,
      stock: 4,
    });
    track('rewards', managedReward);
    // Repetir a chave devolve o MESMO item — não um segundo.
    const again = await saveReward(staff(), {
      key: adminRewardKey,
      draft: reward,
      publish: false,
      timeZone: rankingTimeZone,
    });
    expect(again.ok && again.value).toMatchObject({ rewardId: managedReward, created: false });

    const draft = await saveReward(staff(), {
      key: draftRewardKey,
      draft: { ...reward, name: 'Recompensa em rascunho (teste isolado)' },
      publish: false,
      timeZone: rankingTimeZone,
    });
    expect(draft.ok && draft.value.status).toBe('draft');
    track('rewards', draftReward);
    // Rascunho de recompensa não está no catálogo de ninguém.
    const denied = await rejection(() =>
      sessionB().getRow({ databaseId, tableId: 'rewards', rowId: draftReward }),
    );
    expect(denied.status).toBeGreaterThanOrEqual(400);
  });

  it('estoque muda por comando auditado — nunca por escrita de tela', async () => {
    expect(
      codeOf(await publishReward(staff(), { rewardId: managedReward, expectedVersion: 1 })),
    ).toBe('ok');
    expect((await readRow('rewards', managedReward))?.status).toBe('published');
    expect(
      await responseCode(() =>
        sessionB().getRow({ databaseId, tableId: 'rewards', rowId: managedReward }),
      ),
    ).toBe(200);

    // Sem motivo não há ajuste: o motivo é o que a auditoria guarda.
    expect(
      codeOf(await setRewardStock(staff(), { rewardId: managedReward, stock: 9, reason: '  ' })),
    ).toBe('invalid');
    // Papel sem `manage-catalog` não mexe em estoque.
    expect(
      codeOf(
        await setRewardStock(staff(['fulfillment']), {
          rewardId: managedReward,
          stock: 9,
          reason: 'Reposição do lote',
        }),
      ),
    ).toBe('forbidden');

    const adjusted = await setRewardStock(staff(), {
      rewardId: managedReward,
      stock: 9,
      reason: 'Reposição do lote de outubro',
      expectedVersion: 2,
    });
    expect(adjusted.ok && adjusted.value).toMatchObject({ stock: 9, version: 3 });
    expect((await readRow('rewards', managedReward))?.stock).toBe(9);

    const logs = await ops.listRows({
      databaseId,
      tableId: 'audit_logs',
      queries: [Query.equal('entityId', managedReward), Query.limit(20)],
    });
    const stockLog = logs.rows.find((log) => log.action === 'reward.stock_changed');
    expect(stockLog?.reason).toBe('Reposição do lote de outubro');
    expect(stockLog?.actorId).toBe(actorA.id);
    // Versão velha não sobrescreve o ajuste que outra pessoa acabou de fazer.
    expect(
      codeOf(
        await setRewardStock(staff(), {
          rewardId: managedReward,
          stock: 2,
          reason: 'Engano',
          expectedVersion: 2,
        }),
      ),
    ).toBe('conflict');
    expect((await readRow('rewards', managedReward))?.stock).toBe(9);
  });

  it('campanha é da equipe: nasce sem permissão e exige administrar catálogo', async () => {
    const campaign = {
      name: 'Campanha administrada (teste isolado)',
      description: 'Fixture do teste de integração.',
      startsAt: '2026-10-01T09:00',
      endsAt: '2026-11-01T23:59',
      status: 'draft' as const,
    };
    expect(
      codeOf(
        await saveCampaign(staff(['moderator']), {
          key: adminCampaignKey,
          draft: campaign,
          timeZone: rankingTimeZone,
        }),
      ),
    ).toBe('forbidden');

    const created = await saveCampaign(staff(), {
      key: adminCampaignKey,
      draft: campaign,
      timeZone: rankingTimeZone,
    });
    expect(created.ok && created.value).toMatchObject({ campaignId: adminCampaign, created: true });
    track('campaigns', adminCampaign);
    const row = await readRow('campaigns', adminCampaign);
    expect(row?.status).toBe('draft');
    expect(row?.$permissions).toEqual([]);
  });

  it('a leitura da equipe traduz a coluna, não o rótulo da tela', async () => {
    // O resumo chama dois números de "pontos"; o banco os chama
    // `availableBalance` e `qualifyingPoints`. Se a leitura usar o nome da TELA,
    // o valor vira `undefined` → 0, e um zero errado passa por resposta.
    const existing = await readRow('point_accounts', actorA.id);
    if (!existing)
      await fixture('point_accounts', actorA.id, {
        userId: actorA.id,
        availableBalance: 700,
        qualifyingPoints: 900,
        lifetimePoints: 900,
      });
    const account = await readRow('point_accounts', actorA.id);
    const balance = Number(account?.availableBalance);
    const journey = Number(account?.qualifyingPoints);

    const summary = await adminCreator(staff(), { userId: actorA.id });
    expect(codeOf(summary)).toBe('ok');
    const creator = summary.ok ? summary.value : null;
    expect(creator).not.toBe(null);
    expect(creator?.availablePoints).toBe(balance);
    expect(creator?.journeyPoints).toBe(journey);
    // A forma do bug: coluna com valor, tela mostrando zero.
    if (balance !== 0) expect(creator?.availablePoints).not.toBe(0);
    if (journey !== 0) expect(creator?.journeyPoints).not.toBe(0);

    // A lista usa a mesma tradução da tela de detalhe.
    const list = await adminCreators(staff(), {});
    const listed = list.ok ? list.value.items.find((item) => item.userId === actorA.id) : undefined;
    expect(listed?.availablePoints).toBe(balance);
    expect(listed?.journeyPoints).toBe(journey);

    // Visão geral: contagem exata, e a leitura do catálogo é de quem administra.
    expect(codeOf(await adminOverview(staff()))).toBe('ok');
    const overviewByModerator = await adminOverview(staff(['moderator']));
    expect(codeOf(overviewByModerator)).toBe('forbidden');
    const reward = await adminReward(staff(), { rewardId: managedReward });
    expect(reward.ok ? reward.value?.stock : null).toBe(9);
  });
});
