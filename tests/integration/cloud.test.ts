import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Account,
  Client,
  Functions,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
  Teams,
  Users,
} from 'node-appwrite';
import { randomBytes, createHash } from 'node:crypto';
import { tables, buckets, team, functionDefinitions } from '../../infra/appwrite/schema';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { hasCapability, ownTeamRoles } from '../../src/lib/security/memberships';

// Fixtures exist only in an explicitly confirmed dedicated dev/staging project.
const runId = `it${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
type Actor = { id: string; email: string; password: string; client: Client; secret: string };
const actors: Actor[] = [];
const ownedRows: { tableId: string; rowId: string }[] = [];
const memberships: string[] = [];
const transactions: string[] = [];
let adminDb: TablesDB;
let testClient: Client;
let users: Users;
let teams: Teams;
let databaseId: string;
const clients = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!);
async function responseCode(operation: () => Promise<unknown>) {
  try {
    await operation();
    return 200;
  } catch (error) {
    return (error as { code?: number }).code ?? -1;
  }
}
/**
 * Recusa medida como o Sprint 6 exige: status HTTP, `AppwriteException.code` e a
 * mensagem — a mensagem é devolvida para ser checada, nunca impressa.
 */
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
/** Igual a `rejection`, mas preserva o corpo devolvido — diagnóstico precisa do valor, não só do status. */
async function measured<T>(operation: () => Promise<T>) {
  try {
    return { status: 200, type: '', message: '', value: await operation() };
  } catch (error) {
    const failure = error as { code?: number; type?: string; message?: string };
    return {
      status: failure.code ?? -1,
      type: failure.type ?? '',
      message: failure.message ?? '',
      value: undefined as T | undefined,
    };
  }
}
function fixtureData(tableId: string, owner: string, key: string): Record<string, unknown> {
  const definition = tables.find((t) => t.id === tableId)!;
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
  owner: string,
  override: Record<string, unknown> = {},
  transactionId?: string,
) {
  if (owner.length > 36) owner = createHash('sha256').update(owner).digest('hex').slice(0, 36);
  const rowId = `${runId}-${ownedRows.length}`;
  const data = { ...fixtureData(tableId, owner, rowId), ...override };
  ownedRows.push({ tableId, rowId });
  await adminDb.createRow({
    databaseId,
    tableId,
    rowId,
    data,
    permissions: [Permission.read(Role.user(owner))],
    transactionId,
  });
  return { rowId, data };
}
async function transaction() {
  const result = await adminDb.createTransaction({ ttl: 120 });
  transactions.push(result.$id);
  return result.$id;
}
beforeAll(async () => {
  assertTestEnvironment(process.env);
  databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
  testClient = clients().setKey(process.env.APPWRITE_TEST_API_KEY!);
  adminDb = new TablesDB(testClient);
  users = new Users(testClient);
  teams = new Teams(testClient);
  for (let index = 0; index < 5; index++) {
    const id = `${runId}-u${index}`;
    const email = `${id}@example.invalid`; // deliberately not a deliverable mailbox
    const password = randomBytes(24).toString('hex');
    // Actual anonymous signup endpoint; no account-verification bypass here.
    await new Account(clients()).create({
      userId: id,
      email,
      password,
      name: 'Isolated integration fixture',
    });
    const actor: Actor = { id, email, password, client: clients(), secret: '' };
    actors.push(actor); // register cleanup immediately, even if session creation fails
    const session = await new Account(testClient).createEmailPasswordSession({ email, password });
    if (!session.secret)
      throw new Error('SSR session secret missing. Check test-key sessions.write scope.');
    actor.secret = session.secret;
    actor.client.setSession(session.secret);
  }
});
afterAll(async () => {
  if (!testClient) return;
  let cleanupFailures = 0;
  for (const id of transactions) {
    const code = await responseCode(() => adminDb.deleteTransaction({ transactionId: id }));
    if (![200, 404].includes(code)) cleanupFailures++;
  }
  for (const row of ownedRows) {
    const code = await responseCode(() => adminDb.deleteRow({ databaseId, ...row }));
    if (![200, 404].includes(code)) cleanupFailures++;
  }
  for (const membershipId of memberships) {
    const code = await responseCode(() =>
      teams.deleteMembership({ teamId: team.id, membershipId }),
    );
    if (![200, 404].includes(code)) cleanupFailures++;
  }
  for (const actor of actors) {
    const code = await responseCode(() => users.delete({ userId: actor.id }));
    if (![200, 404].includes(code)) cleanupFailures++;
  }
  if (cleanupFailures)
    throw new Error(
      `Controlled fixture cleanup incomplete (${cleanupFailures}). Review run ${runId}; do not delete unrelated data.`,
    );
});

describe('effective provisioned resources', () => {
  it('matches tables, columns, indexes and deny-by-default permissions', async () => {
    const all = await adminDb.listTables({ databaseId, queries: [Query.limit(100)] });
    expect(all.total).toBe(tables.length);
    expect(all.tables.map((t) => t.$id).sort()).toEqual(tables.map((t) => t.id).sort());
    for (const definition of tables) {
      const actual = await adminDb.getTable({ databaseId, tableId: definition.id });
      expect(actual.$permissions).toEqual([]);
      expect(actual.rowSecurity).toBe(true);
      const columns = await adminDb.listColumns({
        databaseId,
        tableId: definition.id,
        queries: [Query.limit(100)],
      });
      for (const column of definition.columns) {
        const match = columns.columns.find((c) => c.key === column.key);
        expect(match?.status).toBe('available');
        expect(match?.type).toBe(column.type === 'varchar' ? 'varchar' : column.type);
      }
      const indexes = await adminDb.listIndexes({
        databaseId,
        tableId: definition.id,
        queries: [Query.limit(100)],
      });
      expect(indexes.total).toBe(definition.unique.length + definition.indexes.length);
      for (const [unique, groups] of [
        [true, definition.unique],
        [false, definition.indexes],
      ] as const)
        for (const fields of groups) {
          const index = indexes.indexes.find(
            (i) =>
              JSON.stringify(i.columns) === JSON.stringify(fields) &&
              i.type === (unique ? 'unique' : 'key'),
          );
          expect(index?.status).toBe('available');
        }
    }
  });
  it('checks effective buckets, team and disabled financial Functions', async () => {
    for (const bucket of buckets) {
      const actual = await new Storage(testClient).getBucket({ bucketId: bucket.id });
      expect(actual.$permissions).toEqual([]);
      expect(actual.fileSecurity).toBe(true);
      expect(actual.maximumFileSize).toBe(bucket.size);
      expect([...actual.allowedFileExtensions].sort()).toEqual([...bucket.extensions].sort());
    }
    expect((await teams.get({ teamId: team.id })).$id).toBe(team.id);
    for (const definition of functionDefinitions.filter((f) => !f.implemented)) {
      const actual = await new Functions(testClient).get({ functionId: definition.id });
      expect(actual.enabled).toBe(false);
      expect(actual.execute).toEqual([]);
    }
  });
});
describe('direct SDK isolation without API keys', () => {
  it.each([
    'profiles',
    'challenge_submissions',
    'point_transactions',
    'content_saves',
    'reward_redemptions',
    'shipping_addresses',
  ])('A cannot read B in %s', async (tableId) => {
    const record = await fixture(tableId, actors[1].id);
    const a = new TablesDB(actors[0].client);
    const b = new TablesDB(actors[1].client);
    expect((await b.getRow({ databaseId, tableId, rowId: record.rowId })).$id).toBe(record.rowId);
    expect([401, 403, 404]).toContain(
      await responseCode(() => a.getRow({ databaseId, tableId, rowId: record.rowId })),
    );
    const listing = await a.listRows({
      databaseId,
      tableId,
      queries: [Query.equal('$id', record.rowId)],
    });
    expect(listing.total).toBe(0);
  });
  it.each([
    'point_transactions',
    'point_accounts',
    'ranking_entries',
    'audit_logs',
    'operation_keys',
    'outbox_events',
    'rewards',
    'challenge_submissions',
    'reward_redemptions',
  ])('A cannot create/update/delete protected %s', async (tableId) => {
    const record = await fixture(tableId, actors[0].id);
    const client = new TablesDB(actors[0].client);
    const params = { databaseId, tableId, rowId: record.rowId };
    const delta =
      tableId === 'rewards'
        ? { stock: 999 }
        : ['challenge_submissions', 'reward_redemptions'].includes(tableId)
          ? { status: 'approved' }
          : { userId: actors[1].id };
    // Valid payloads ensure a validation error cannot masquerade as authorization denial.
    const attemptedId = ID.unique();
    ownedRows.push({ tableId, rowId: attemptedId });
    expect([401, 403]).toContain(
      await responseCode(() =>
        client.createRow({
          databaseId,
          tableId,
          rowId: attemptedId,
          data: fixtureData(tableId, actors[0].id, attemptedId),
        }),
      ),
    );
    expect([401, 403]).toContain(
      await responseCode(() => client.updateRow({ ...params, data: delta })),
    );
    expect([401, 403]).toContain(await responseCode(() => client.deleteRow(params)));
  });
});
describe('real Auth and memberships (email delivery tested separately)', () => {
  it('uses a real SSR session secret, rejects duplicate email and invalid credentials', async () => {
    expect((await new Account(actors[0].client).get()).$id).toBe(actors[0].id);
    expect(
      await responseCode(() =>
        new Account(clients()).create({
          userId: ID.unique(),
          email: actors[0].email,
          password: actors[0].password,
        }),
      ),
    ).toBe(409);
    expect([400, 401]).toContain(
      await responseCode(() =>
        new Account(testClient).createEmailPasswordSession({
          email: actors[0].email,
          password: randomBytes(24).toString('hex'),
        }),
      ),
    );
    expect([400, 401]).toContain(
      await responseCode(() =>
        new Account(testClient).createEmailPasswordSession({
          email: `${runId}-absent@example.invalid`,
          password: actors[0].password,
        }),
      ),
    );
  });
  it('rejects invalid verification/recovery tokens without exposing credentials', async () => {
    const account = new Account(clients());
    expect([400, 401, 404]).toContain(
      await responseCode(() =>
        account.updateVerification({
          userId: actors[0].id,
          secret: 'intentionally-invalid-test-token',
        }),
      ),
    );
    expect([400, 401, 404]).toContain(
      await responseCode(() =>
        account.updateRecovery({
          userId: actors[0].id,
          secret: 'intentionally-invalid-test-token',
          password: actors[0].password,
        }),
      ),
    );
    // Invalid is NOT proof of expired-token behavior; real expiration remains pending.
  });
  it('checks membership roles against the real team API', async () => {
    for (const [index, role] of team.roles.entries()) {
      const actor = actors[index + 2];
      const created = await teams.createMembership({
        teamId: team.id,
        userId: actor.id,
        roles: [role],
      });
      memberships.push(created.$id);
      const response = await new Teams(actor.client).listMemberships({
        teamId: team.id,
        queries: [Query.equal('userId', actor.id), Query.limit(100)],
      });
      // Medido no staging: a listagem de SESSÃO redige identidade (`userId` e
      // `userEmail` voltam vazios) mas honra o filtro por `userId` no servidor —
      // devolve exatamente a membership de quem pediu. Por isso o app apura via
      // `ownTeamRoles` (contrato do filtro) e não por `confirmedRoles` (que exige
      // a identidade na resposta e serve para listagem com chave de API).
      const roles = ownTeamRoles(response.memberships, actor.id, team.id);
      const mine = response.memberships.filter((membership) => membership.$id === created.$id);
      expect({
        criada: `${created.confirm}/${created.roles.join('+')}`,
        apurado: roles.join('+'),
        devolvidas: response.memberships.length,
        minha: mine.map(
          (membership) =>
            `${membership.teamId}/confirm=${membership.confirm}/${membership.roles.join('+')}`,
        ),
        identidadeRedigida: mine.every(
          (membership) => membership.userId === '' || membership.userId === actor.id,
        ),
      }).toEqual({
        criada: `true/${role}`,
        apurado: role,
        devolvidas: 1,
        minha: [`${team.id}/confirm=true/${role}`],
        identidadeRedigida: true,
      });
      // Sem o filtro por identidade a mesma sessão vê o time inteiro (identidade
      // redigida). Com mais de uma membership no time a apuração recusa em vez de
      // atribuir o papel da primeira linha; com uma só, a linha é necessariamente
      // a minha, então o papel apurado é o meu.
      const unfiltered = await new Teams(actor.client).listMemberships({
        teamId: team.id,
        queries: [Query.limit(100)],
      });
      const teamSize = index + 1;
      expect(unfiltered.memberships.length).toBe(teamSize);
      expect(ownTeamRoles(unfiltered.memberships, actor.id, team.id)).toEqual(
        teamSize === 1 ? [role] : [],
      );
      // A mesma regra com identidade exposta (listagem administrativa): a linha de
      // outro membro nunca vira papel meu — diverge o `userId`, a apuração recusa.
      const administrative = await teams.listMemberships({
        teamId: team.id,
        queries: [Query.limit(100)],
      });
      expect(administrative.memberships.length).toBe(teamSize);
      expect(ownTeamRoles(administrative.memberships, actor.id, team.id)).toEqual(
        teamSize === 1 ? [role] : [],
      );
      expect(hasCapability(roles, 'adjust-points')).toBe(role === 'admin');
      expect(hasCapability(roles, 'moderate')).toBe(role === 'admin' || role === 'moderator');
      expect(hasCapability(roles, 'fulfill')).toBe(role === 'admin' || role === 'fulfillment');
    }
    expect([401, 403, 404]).toContain(
      await responseCode(() => new Teams(actors[0].client).listMemberships({ teamId: team.id })),
    );
  });
  it('logout revokes the server session and login creates a new one', async () => {
    await new Account(actors[0].client).deleteSession({ sessionId: 'current' });
    expect(await responseCode(() => new Account(actors[0].client).get())).toBe(401);
    const fresh = await new Account(testClient).createEmailPasswordSession({
      email: actors[0].email,
      password: actors[0].password,
    });
    actors[0].client.setSession(fresh.secret);
    expect((await new Account(actors[0].client).get()).$id).toBe(actors[0].id);
  });
});
describe('real TablesDB transaction capability — no production command implemented', () => {
  const approvalParts = [
    'challenge_submissions',
    'point_transactions',
    'point_accounts',
    'submission_history',
    'audit_logs',
    'outbox_events',
  ];
  const redemptionParts = [
    'reward_redemptions',
    'point_transactions',
    'point_accounts',
    'rewards',
    'redemption_history',
    'audit_logs',
    'outbox_events',
  ];
  it.each([
    { label: 'approval', parts: approvalParts },
    { label: 'redemption', parts: redemptionParts },
  ])(
    'commits all rows and explicitly rolls back all rows across required tables',
    async ({ label, parts }) => {
      // O dono carrega o rótulo do caso: medido, dois casos compartilhando um dono
      // constante colidem em `point_accounts.userId` (único) e o commit volta
      // 409 transaction_conflict — a unicidade é cobrada no commit, não no create.
      const committedTx = await transaction();
      const committed = [];
      for (const part of parts)
        committed.push({
          tableId: part,
          ...(await fixture(part, `${runId}-${label}-commit-${part}`, {}, committedTx)),
        });
      for (const record of committed)
        expect(
          await responseCode(() =>
            adminDb.getRow({
              databaseId,
              tableId: record.tableId,
              rowId: record.rowId,
            }),
          ),
        ).toBe(404);
      const commit = await rejection(() =>
        adminDb.updateTransaction({ transactionId: committedTx, commit: true }),
      );
      if (commit.status !== 200) {
        // Sem isso, o conflict vira "alguma coisa deu errado" e ninguém sabe o quê.
        const state = await Promise.all(
          committed.map(async (record) => {
            const read = await rejection(() =>
              adminDb.getRow({ databaseId, tableId: record.tableId, rowId: record.rowId }),
            );
            return `${record.tableId}=${read.status}`;
          }),
        );
        const transaction = await measured(() =>
          adminDb.getTransaction({ transactionId: committedTx }),
        );
        // Um conflict só é diagnosticável com o estado das OUTRAS transações
        // vivas: medido, não deduzido.
        const live = await measured(() =>
          adminDb.listTransactions({ queries: [Query.limit(100)] }),
        );
        throw new Error(
          `commit recusado [${commit.status} ${commit.type}] ${commit.message} | ` +
            `staged: ${state.join(' ')} | ` +
            `transaction: ${
              transaction.status === 200
                ? JSON.stringify({
                    keys: Object.keys(transaction.value as object),
                    status: (transaction.value as { status?: unknown })?.status,
                    operations: (transaction.value as { operations?: unknown })?.operations,
                  })
                : `HTTP ${transaction.status}`
            } | ` +
            `vivas: ${
              live.status === 200
                ? (
                    (
                      live.value as {
                        transactions?: { $id: string; status: string; operations: number }[];
                      }
                    ).transactions ?? []
                  )
                    .map((item) => `${item.$id.slice(0, 6)}…=${item.status}/${item.operations}`)
                    .join(' ')
                : `HTTP ${live.status}`
            }`,
        );
      }
      for (const record of committed)
        expect(
          await responseCode(() =>
            adminDb.getRow({
              databaseId,
              tableId: record.tableId,
              rowId: record.rowId,
            }),
          ),
        ).toBe(200);
      const rolledBackTx = await transaction();
      const rolledBack = [];
      for (const part of parts)
        rolledBack.push({
          tableId: part,
          ...(await fixture(part, `${runId}-${label}-rollback-${part}`, {}, rolledBackTx)),
        });
      await adminDb.updateTransaction({ transactionId: rolledBackTx, rollback: true });
      for (const record of rolledBack)
        expect(
          await responseCode(() =>
            adminDb.getRow({
              databaseId,
              tableId: record.tableId,
              rowId: record.rowId,
            }),
          ),
        ).toBe(404);
    },
  );
  it.each([
    { tableId: 'point_accounts', column: 'availableBalance' },
    { tableId: 'rewards', column: 'stock' },
  ])(
    'prevents double commit on concurrent writes and leaves the losing outbox absent',
    async ({ tableId, column }) => {
      const record = await fixture(tableId, `${runId}-race`, { [column]: 1 });
      const txA = await transaction(),
        txB = await transaction();
      for (const tx of [txA, txB])
        await adminDb.updateRow({
          databaseId,
          tableId,
          rowId: record.rowId,
          data: { [column]: 0 },
          transactionId: tx,
        });
      const events = [];
      for (const tx of [txA, txB])
        events.push(await fixture('outbox_events', `${runId}-${tx}`, {}, tx));
      const results = await Promise.all(
        [txA, txB].map((transactionId) =>
          responseCode(() => adminDb.updateTransaction({ transactionId, commit: true })),
        ),
      );
      expect(results.filter((code) => code === 200)).toHaveLength(1);
      expect(results.filter((code) => code === 409)).toHaveLength(1);
      for (const [index, event] of events.entries())
        expect(
          await responseCode(() =>
            adminDb.getRow({
              databaseId,
              tableId: 'outbox_events',
              rowId: event.rowId,
            }),
          ),
        ).toBe(results[index] === 200 ? 200 : 404);
    },
  );
  it('reports a staged conflict with HTTP status, error code and a message without credentials', async () => {
    const key = `${runId}-reported-conflict`;
    await fixture('point_transactions', `${runId}-conflict-owner`, { idempotencyKey: key });
    const tx = await transaction();
    const denied = await rejection(() =>
      fixture('point_transactions', `${runId}-conflict-owner`, { idempotencyKey: key }, tx),
    );
    // Só 409 prova a unicidade: recusa de autorização ou validação não serve.
    if (denied.status === 200) {
      // A API aceitou o stage; então a colisão precisa aparecer no commit.
      const commit = await rejection(() =>
        adminDb.updateTransaction({ transactionId: tx, commit: true }),
      );
      expect(commit.status).toBe(409);
      expect(typeof commit.code).toBe('number');
      expect(commit.message.includes(process.env.APPWRITE_TEST_API_KEY!)).toBe(false);
    } else {
      expect(denied.status).toBe(409);
      expect(denied.code).toBe(409);
      expect(typeof denied.type).toBe('string');
      expect(denied.message.length).toBeGreaterThan(0);
      // A mensagem é da Appwrite, não credencial nossa: nada de chave vazando.
      expect(denied.message.includes(process.env.APPWRITE_TEST_API_KEY!)).toBe(false);
      await adminDb.updateTransaction({ transactionId: tx, rollback: true });
    }
  });
  it('a duplicated unique key never coexists at rest', async () => {
    const key = `${runId}-unique-rest`;
    await fixture('point_transactions', `${runId}-unique-rest-owner`, { idempotencyKey: key });
    const duplicate = await rejection(() =>
      fixture('point_transactions', `${runId}-unique-rest-owner`, { idempotencyKey: key }),
    );
    expect(duplicate.status).toBe(409);
    const stored = await adminDb.listRows({
      databaseId,
      tableId: 'point_transactions',
      queries: [Query.equal('idempotencyKey', key)],
    });
    expect(stored.total).toBe(1);
  });
  it('rolls back staged companion writes on a unique-key conflict', async () => {
    const key = `${runId}-unique`;
    await fixture('point_transactions', `${runId}-unique-owner`, { idempotencyKey: key });
    const tx = await transaction();
    const companion = await fixture('outbox_events', `${runId}-unique-outbox`, {}, tx);
    const duplicateCode = await responseCode(() =>
      fixture('point_transactions', `${runId}-unique-owner`, { idempotencyKey: key }, tx),
    );
    if (duplicateCode !== 200) {
      expect(duplicateCode).toBe(409);
      await adminDb.updateTransaction({ transactionId: tx, rollback: true });
    } else
      expect(
        await responseCode(() => adminDb.updateTransaction({ transactionId: tx, commit: true })),
      ).toBe(409);
    expect(
      await responseCode(() =>
        adminDb.getRow({
          databaseId,
          tableId: 'outbox_events',
          rowId: companion.rowId,
        }),
      ),
    ).toBe(404);
  });
  it('detects a write made outside the transaction after staging', async () => {
    const record = await fixture('point_accounts', `${runId}-external-writer`, {
      availableBalance: 100,
    });
    const tx = await transaction();
    await adminDb.updateRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: record.rowId,
      data: { availableBalance: 90 },
      transactionId: tx,
    });
    await adminDb.updateRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: record.rowId,
      data: { availableBalance: 80 },
    });
    expect(
      await responseCode(() => adminDb.updateTransaction({ transactionId: tx, commit: true })),
    ).toBe(409);
    const actual = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: record.rowId,
    });
    expect(actual.availableBalance).toBe(80);
  });
  it('a bounded numeric operation never persists negative stock', async () => {
    const record = await fixture('rewards', `${runId}-bounded-stock`, { stock: 0 });
    const tx = await transaction();
    const staged = await responseCode(() =>
      adminDb.decrementRowColumn({
        databaseId,
        tableId: 'rewards',
        rowId: record.rowId,
        column: 'stock',
        value: 1,
        min: 0,
        transactionId: tx,
      }),
    );
    if (staged === 200)
      expect([400, 409]).toContain(
        await responseCode(() => adminDb.updateTransaction({ transactionId: tx, commit: true })),
      );
    else {
      expect([400, 409]).toContain(staged);
      await adminDb.updateTransaction({ transactionId: tx, rollback: true });
    }
    expect(
      (
        await adminDb.getRow({
          databaseId,
          tableId: 'rewards',
          rowId: record.rowId,
        })
      ).stock,
    ).toBe(0);
  });
  it('a balance of one is debited exactly once under concurrent transactions', async () => {
    const record = await fixture('point_accounts', `${runId}-balance-race`, {
      availableBalance: 1,
      qualifyingPoints: 1,
    });
    const staged = [];
    for (let index = 0; index < 2; index++) {
      const tx = await transaction();
      staged.push({ tx });
      await adminDb.decrementRowColumn({
        databaseId,
        tableId: 'point_accounts',
        rowId: record.rowId,
        column: 'availableBalance',
        value: 1,
        min: 0,
        transactionId: tx,
      });
    }
    const results = await Promise.all(
      staged.map(({ tx }) =>
        responseCode(() => adminDb.updateTransaction({ transactionId: tx, commit: true })),
      ),
    );
    // Medido: o commit perdedor volta 400 `attribute_limit_exceeded` (o mínimo
    // da coluna é conferido no commit, não no staging) — 409 fica aceito para o
    // caso de conflito de versão. O que não se aceita é os dois passarem.
    expect(results.filter((code) => code === 200)).toHaveLength(1);
    expect(results.filter((code) => [400, 409].includes(code))).toHaveLength(1);
    const actual = await adminDb.getRow({
      databaseId,
      tableId: 'point_accounts',
      rowId: record.rowId,
    });
    expect(actual.availableBalance).toBe(0);
    expect(actual.qualifyingPoints).toBe(1);
  });
  it('an isolated replay can return the original result without creating another ledger entry', async () => {
    const key = `${runId}-replay`,
      actorId = `${runId}-replay-actor`;
    // Test harness only. This is not a deployed points service.
    const replay = async () => {
      const existing = await adminDb.listRows({
        databaseId,
        tableId: 'operation_keys',
        queries: [
          Query.equal('actorId', actorId),
          Query.equal('operation', 'integration_probe'),
          Query.equal('key', key),
        ],
      });
      if (existing.total) return existing.rows[0].resultId as string;
      const tx = await transaction();
      const credit = await fixture('point_transactions', actorId, { idempotencyKey: key }, tx);
      await fixture(
        'operation_keys',
        actorId,
        {
          actorId,
          operation: 'integration_probe',
          key,
          requestHash: key,
          resultId: credit.rowId,
          status: 'completed',
        },
        tx,
      );
      await adminDb.updateTransaction({ transactionId: tx, commit: true });
      return credit.rowId;
    };
    const first = await replay();
    expect(await replay()).toBe(first);
    const ledger = await adminDb.listRows({
      databaseId,
      tableId: 'point_transactions',
      queries: [Query.equal('idempotencyKey', key)],
    });
    expect(ledger.total).toBe(1);
  });
  it('a concurrent replay with the same key produces one row, not two', async () => {
    const key = `${runId}-replay-race`;
    const rowId = `${runId}-idem`;
    ownedRows.push({ tableId: 'operation_keys', rowId });
    const create = () =>
      adminDb.createRow({
        databaseId,
        tableId: 'operation_keys',
        rowId,
        data: {
          ...fixtureData('operation_keys', `${runId}-replay-race-actor`, rowId),
          actorId: `${runId}-replay-race-actor`,
          operation: 'integration_probe',
          key,
          requestHash: key,
          resultId: rowId,
          status: 'completed',
        },
        permissions: [],
      });
    const codes = await Promise.all([responseCode(create), responseCode(create)]);
    expect(codes.filter((code) => code === 200)).toHaveLength(1);
    expect(codes.filter((code) => code === 409)).toHaveLength(1);
    const stored = await adminDb.listRows({
      databaseId,
      tableId: 'operation_keys',
      queries: [Query.equal('key', key)],
    });
    expect(stored.total).toBe(1);
  });
});
