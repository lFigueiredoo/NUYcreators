import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Account,
  Client,
  Databases,
  ID,
  Permission,
  Role,
  Teams,
  Users,
  Storage,
  Query,
  Functions,
} from 'node-appwrite';
import { randomBytes, createHash } from 'node:crypto';
import { collections, buckets, team, functionDefinitions } from '../../infra/appwrite/schema';
import { assertTestEnvironment } from '../../infra/appwrite/safety';
import { confirmedRoles, hasCapability } from '../../src/lib/security/memberships';

// Fixtures exist only in an explicitly confirmed dedicated dev/staging project.
const runId = `it${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
type Actor = { id: string; email: string; password: string; client: Client; secret: string };
const actors: Actor[] = [];
const ownedDocuments: { collectionId: string; documentId: string }[] = [];
const memberships: string[] = [];
const transactions: string[] = [];
let adminDb: Databases;
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
function fixtureData(collectionId: string, owner: string, key: string): Record<string, unknown> {
  const definition = collections.find((c) => c.id === collectionId)!;
  return Object.fromEntries(
    definition.attributes
      .filter((attribute) => attribute.required)
      .map((attribute) => [
        attribute.key,
        attribute.key === 'userId' || attribute.key === 'authUserId'
          ? owner
          : attribute.type === 'datetime'
            ? new Date().toISOString()
            : attribute.type === 'boolean'
              ? false
              : attribute.type === 'integer'
                ? 1
                : `${key}-${attribute.key}`,
      ]),
  );
}
async function fixture(
  collectionId: string,
  owner: string,
  override: Record<string, unknown> = {},
  transactionId?: string,
) {
  if (owner.length > 36) owner = createHash('sha256').update(owner).digest('hex').slice(0, 36);
  const documentId = `${runId}-${ownedDocuments.length}`;
  const data = { ...fixtureData(collectionId, owner, documentId), ...override };
  ownedDocuments.push({ collectionId, documentId });
  await adminDb.createDocument({
    databaseId,
    collectionId,
    documentId,
    data,
    permissions: [Permission.read(Role.user(owner))],
    transactionId,
  });
  return { documentId, data };
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
  adminDb = new Databases(testClient);
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
  for (const document of ownedDocuments) {
    const code = await responseCode(() => adminDb.deleteDocument({ databaseId, ...document }));
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
  it('matches collections, attributes, indexes and deny-by-default permissions', async () => {
    const all = await adminDb.listCollections({ databaseId, queries: [Query.limit(100)] });
    expect(all.total).toBe(collections.length);
    expect(all.collections.map((c) => c.$id).sort()).toEqual(collections.map((c) => c.id).sort());
    for (const definition of collections) {
      const actual = await adminDb.getCollection({ databaseId, collectionId: definition.id });
      expect(actual.$permissions).toEqual([]);
      expect(actual.documentSecurity).toBe(true);
      const attrs = await adminDb.listAttributes({
        databaseId,
        collectionId: definition.id,
        queries: [Query.limit(100)],
      });
      for (const attr of definition.attributes) {
        const match = attrs.attributes.find((a) => a.key === attr.key);
        expect(match?.status).toBe('available');
        expect(match?.type).toBe(attr.type);
      }
      const indexes = await adminDb.listIndexes({
        databaseId,
        collectionId: definition.id,
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
              JSON.stringify(i.attributes) === JSON.stringify(fields) &&
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
  ])('A cannot read B in %s', async (collectionId) => {
    const record = await fixture(collectionId, actors[1].id);
    const a = new Databases(actors[0].client);
    const b = new Databases(actors[1].client);
    expect(
      (await b.getDocument({ databaseId, collectionId, documentId: record.documentId })).$id,
    ).toBe(record.documentId);
    expect([401, 403, 404]).toContain(
      await responseCode(() =>
        a.getDocument({ databaseId, collectionId, documentId: record.documentId }),
      ),
    );
    const listing = await a.listDocuments({
      databaseId,
      collectionId,
      queries: [Query.equal('$id', record.documentId)],
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
  ])('A cannot create/update/delete protected %s', async (collectionId) => {
    const record = await fixture(collectionId, actors[0].id);
    const client = new Databases(actors[0].client);
    const params = { databaseId, collectionId, documentId: record.documentId };
    const delta =
      collectionId === 'rewards'
        ? { stock: 999 }
        : ['challenge_submissions', 'reward_redemptions'].includes(collectionId)
          ? { status: 'approved' }
          : { userId: actors[1].id };
    // Valid payloads ensure a validation error cannot masquerade as authorization denial.
    const attemptedId = ID.unique();
    ownedDocuments.push({ collectionId, documentId: attemptedId });
    expect([401, 403]).toContain(
      await responseCode(() =>
        client.createDocument({
          ...params,
          documentId: attemptedId,
          data: fixtureData(collectionId, actors[0].id, attemptedId),
        }),
      ),
    );
    expect([401, 403]).toContain(
      await responseCode(() => client.updateDocument({ ...params, data: delta })),
    );
    expect([401, 403]).toContain(await responseCode(() => client.deleteDocument(params)));
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
        queries: [Query.equal('userId', actor.id)],
      });
      const roles = confirmedRoles(response.memberships, actor.id, team.id);
      expect(roles).toEqual([role]);
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
describe('real legacy Databases transaction capability — no production command implemented', () => {
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
  it.each([{ parts: approvalParts }, { parts: redemptionParts }])(
    'commits all records and explicitly rolls back all records across required collections',
    async ({ parts }) => {
      const committedTx = await transaction();
      const committed = [];
      for (const part of parts)
        committed.push({
          collectionId: part,
          ...(await fixture(part, `${runId}-commit-${part}`, {}, committedTx)),
        });
      for (const record of committed)
        expect(
          await responseCode(() =>
            adminDb.getDocument({
              databaseId,
              collectionId: record.collectionId,
              documentId: record.documentId,
            }),
          ),
        ).toBe(404);
      await adminDb.updateTransaction({ transactionId: committedTx, commit: true });
      for (const record of committed)
        expect(
          await responseCode(() =>
            adminDb.getDocument({
              databaseId,
              collectionId: record.collectionId,
              documentId: record.documentId,
            }),
          ),
        ).toBe(200);
      const rolledBackTx = await transaction();
      const rolledBack = [];
      for (const part of parts)
        rolledBack.push({
          collectionId: part,
          ...(await fixture(part, `${runId}-rollback-${part}`, {}, rolledBackTx)),
        });
      await adminDb.updateTransaction({ transactionId: rolledBackTx, rollback: true });
      for (const record of rolledBack)
        expect(
          await responseCode(() =>
            adminDb.getDocument({
              databaseId,
              collectionId: record.collectionId,
              documentId: record.documentId,
            }),
          ),
        ).toBe(404);
    },
  );
  it.each([
    { collectionId: 'point_accounts', field: 'availableBalance' },
    { collectionId: 'rewards', field: 'stock' },
  ])(
    'prevents double commit on concurrent writes and leaves the losing outbox absent',
    async ({ collectionId, field }) => {
      const record = await fixture(collectionId, `${runId}-race`, { [field]: 1 });
      const txA = await transaction(),
        txB = await transaction();
      for (const tx of [txA, txB])
        await adminDb.updateDocument({
          databaseId,
          collectionId,
          documentId: record.documentId,
          data: { [field]: 0 },
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
            adminDb.getDocument({
              databaseId,
              collectionId: 'outbox_events',
              documentId: event.documentId,
            }),
          ),
        ).toBe(results[index] === 200 ? 200 : 404);
    },
  );
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
        adminDb.getDocument({
          databaseId,
          collectionId: 'outbox_events',
          documentId: companion.documentId,
        }),
      ),
    ).toBe(404);
  });
  it('detects a write made outside the transaction after staging', async () => {
    const record = await fixture('point_accounts', `${runId}-external-writer`, {
      availableBalance: 100,
    });
    const tx = await transaction();
    await adminDb.updateDocument({
      databaseId,
      collectionId: 'point_accounts',
      documentId: record.documentId,
      data: { availableBalance: 90 },
      transactionId: tx,
    });
    await adminDb.updateDocument({
      databaseId,
      collectionId: 'point_accounts',
      documentId: record.documentId,
      data: { availableBalance: 80 },
    });
    expect(
      await responseCode(() => adminDb.updateTransaction({ transactionId: tx, commit: true })),
    ).toBe(409);
    const actual = await adminDb.getDocument({
      databaseId,
      collectionId: 'point_accounts',
      documentId: record.documentId,
    });
    expect(actual.availableBalance).toBe(80);
  });
  it('a bounded numeric operation never persists negative stock', async () => {
    const record = await fixture('rewards', `${runId}-bounded-stock`, { stock: 0 });
    const tx = await transaction();
    const staged = await responseCode(() =>
      adminDb.decrementDocumentAttribute({
        databaseId,
        collectionId: 'rewards',
        documentId: record.documentId,
        attribute: 'stock',
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
        await adminDb.getDocument({
          databaseId,
          collectionId: 'rewards',
          documentId: record.documentId,
        })
      ).stock,
    ).toBe(0);
  });
  it('an isolated replay can return the original result without creating another ledger entry', async () => {
    const key = `${runId}-replay`,
      actorId = `${runId}-replay-actor`;
    // Test harness only. This is not a deployed points service.
    const replay = async () => {
      const existing = await adminDb.listDocuments({
        databaseId,
        collectionId: 'operation_keys',
        queries: [
          Query.equal('actorId', actorId),
          Query.equal('operation', 'integration_probe'),
          Query.equal('key', key),
        ],
      });
      if (existing.total) return existing.documents[0].resultId as string;
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
          resultId: credit.documentId,
          status: 'completed',
        },
        tx,
      );
      await adminDb.updateTransaction({ transactionId: tx, commit: true });
      return credit.documentId;
    };
    const first = await replay();
    expect(await replay()).toBe(first);
    const ledger = await adminDb.listDocuments({
      databaseId,
      collectionId: 'point_transactions',
      queries: [Query.equal('idempotencyKey', key)],
    });
    expect(ledger.total).toBe(1);
    // Concurrent replay and business-level payload conflicts still require future command tests.
  });
});
