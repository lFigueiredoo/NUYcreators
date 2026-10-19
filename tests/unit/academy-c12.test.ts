import { afterAll, beforeAll, expect, it } from 'vitest';
import { Account, Client, Query, TablesDB } from 'node-appwrite';
import { archiveChallenge, closeChallenge, type CoreContext } from '../../src/features/workspace/core';
import { createComment, editComment, hideOwnComment, moderateComment, type Context } from '../../src/features/academy/services/operations';
import { startStub } from '../support/appwrite-stub/server.mjs';

let stub: Awaited<ReturnType<typeof startStub>>;
let admin: Context;
let creator: Context;
let novaTables: TablesDB;
let anaTables: TablesDB;
let anonymousTables: TablesDB;
const databaseId = 'nuy-creators';

function core(correlationId: string, privateReady = true, schemaReady = true): CoreContext {
  return { tables: admin.tables as TablesDB, databaseId,
    actor: { userId: 'academy-admin', roles: ['admin'] }, now: new Date(),
    correlationId, academyCommentsReady: schemaReady,
    challengeCommentsPrivateReady: privateReady };
}

function addChallenge(count: number, suffix: string, legacyAt = -1) {
  const targetId = `c12-${suffix}`;
  stub.dataset.tables.challenges.push({ $id: targetId, slug: targetId,
    $permissions: ['read("any")'], status: 'published', version: 1 });
  const comments = Array.from({ length: count }, (_, index) => {
    const authorId = index > 0 && index % 11 === 0 ? 'academy-admin'
      : index % 3 === 0 ? 'viewer-marina' : 'viewer-ana';
    return { $id: `${targetId}-c-${String(index).padStart(4, '0')}`,
      $permissions: index === legacyAt ? ['read("users")']
        : [`read("user:${authorId}")`],
      targetType: 'challenge', targetId,
      parentId: index % 2 && index > 0
        ? `${targetId}-c-${String(index - 1).padStart(4, '0')}` : null,
      authorId, body: `Comment ${index}`,
      status: index % 10 === 0 ? 'pending' : 'visible',
      createdAt: new Date().toISOString() };
  });
  stub.dataset.tables.community_comments.push(...comments);
  return { targetId, comments };
}

beforeAll(async () => {
  stub = await startStub({ academyFixture: true });
  const server = new Client().setEndpoint(stub.endpoint).setProject('nuy-stub')
    .setKey('stub-ops-key').setSelfSigned(true);
  admin = { tables: new TablesDB(server), databaseId,
    actor: { id: 'academy-admin', manage: true, moderate: true } };
  creator = { ...admin, actor: { id: 'viewer-ana', manage: false, moderate: false } };
  async function sessionTables(email: string, password: string) {
    const client = new Client().setEndpoint(stub.endpoint).setProject('nuy-stub')
      .setSelfSigned(true);
    const session = await new Account(client).createEmailPasswordSession({ email, password });
    return new TablesDB(new Client().setEndpoint(stub.endpoint).setProject('nuy-stub')
      .setSession(session.secret).setSelfSigned(true));
  }
  novaTables = await sessionTables('nova@nuy.test', 'senha-de-teste-789');
  anaTables = await sessionTables('ana@nuy.test', 'senha-de-teste-123');
  anonymousTables = new TablesDB(new Client().setEndpoint(stub.endpoint)
    .setProject('nuy-stub').setSelfSigned(true));
});
afterAll(async () => { await stub.close(); });

it.each([0, 1, 50, 100, 500, 1000])(
  'archives %i private comments without per-comment writes', async (count) => {
    const { targetId, comments } = addChallenge(count, `scale-${count}`);
    const auditBefore = stub.dataset.tables.audit_logs.length;
    const commentWritesBefore = stub.journal.filter((entry) =>
      entry.method === 'PATCH' && String(entry.path).includes('/community_comments/')).length;
    const commentReadsBefore = stub.journal.filter((entry) =>
      entry.method === 'GET' && String(entry.path).includes('/community_comments')).length;
    const result = await archiveChallenge(core(`c12-scale-${count}`),
      { challengeId: targetId, expectedVersion: 1 });
    expect(result.ok).toBe(true);
    expect(stub.journal.filter((entry) =>
      entry.method === 'GET' && String(entry.path).includes('/community_comments')).length)
      .toBe(commentReadsBefore);
    expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId))
      .toMatchObject({ status: 'archived', version: 2, $permissions: [] });
    expect(stub.dataset.tables.community_comments.filter((row) => row.targetId === targetId))
      .toHaveLength(count);
    expect(stub.dataset.tables.audit_logs.length).toBe(auditBefore + 1);
    expect(stub.journal.filter((entry) =>
      entry.method === 'PATCH' && String(entry.path).includes('/community_comments/')).length)
      .toBe(commentWritesBefore);
    if (count) {
      expect(stub.dataset.tables.community_comments.find((row) => row.$id === comments[0].$id)?.$permissions)
        .toEqual(comments[0].$permissions);
      await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
        rowId: comments[0].$id })).rejects.toMatchObject({ code: 404 });
    }
    const direct = await novaTables.listRows({ databaseId, tableId: 'community_comments',
      queries: [Query.equal('targetType', 'challenge'), Query.equal('targetId', targetId)] });
    expect(direct.rows).toHaveLength(0);
    await expect(createComment(creator, { targetType: 'challenge', targetId,
      parentId: null, body: 'After archive' })).rejects.toMatchObject({ code: 'missing' });
  },
);

it('keeps the no-scan path gated until historical ACL migration is verified', async () => {
  const { targetId, comments } = addChallenge(500, 'resume', 499);
  const before = stub.dataset.tables.audit_logs.length;
  const refused = await archiveChallenge(core('c12-incomplete', false),
    { challengeId: targetId, expectedVersion: 1 });
  expect(refused).toMatchObject({ ok: false, failure: { code: 'limit_reached' } });
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId))
    .toMatchObject({ status: 'published', version: 1, $permissions: ['read("any")'] });
  expect(stub.dataset.tables.audit_logs.length).toBe(before);
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[499].$id })).resolves.toMatchObject({ $id: comments[499].$id });
  stub.dataset.tables.community_comments.find((row) => row.$id === comments[499].$id)!.$permissions =
    ['read("user:viewer-ana")'];
  // Simulates a separately approved and verified migration before readiness is set.
  const resumed = await archiveChallenge(core('c12-resumed'),
    { challengeId: targetId, expectedVersion: 1 });
  expect(resumed.ok).toBe(true);
  expect(stub.dataset.tables.audit_logs.length).toBe(before + 1);
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[499].$id })).rejects.toMatchObject({ code: 404 });
});

it('keeps the legacy ceiling until the private-ACL gate is explicitly ready', async () => {
  const { targetId } = addChallenge(50, 'gate');
  const refused = await archiveChallenge(core('c12-gate-off', false),
    { challengeId: targetId, expectedVersion: 1 });
  expect(refused).toMatchObject({ ok: false, failure: { code: 'limit_reached' } });
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId)?.status)
    .toBe('published');
  expect((await archiveChallenge(core('c12-gate-on'),
    { challengeId: targetId, expectedVersion: 1 })).ok).toBe(true);
});

it('revokes public rows in legacy mode even if the schema flag was omitted', async () => {
  const { targetId, comments } = addChallenge(1, 'missing-schema-flag', 0);
  const archived = await archiveChallenge(core('c12-missing-schema-flag', false, false),
    { challengeId: targetId, expectedVersion: 1 });
  expect(archived.ok).toBe(true);
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comments[0].$id)?.$permissions)
    .toEqual(['read("user:viewer-marina")']);
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[0].$id })).rejects.toMatchObject({ code: 404 });
});

it('closing a large challenge hides its private comments without rewriting them', async () => {
  const { targetId, comments } = addChallenge(500, 'close');
  const closed = await closeChallenge(core('c12-close'),
    { challengeId: targetId, expectedVersion: 1 });
  expect(closed.ok).toBe(true);
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId)?.status)
    .toBe('closed');
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comments[0].$id)?.$permissions)
    .toEqual(comments[0].$permissions);
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[0].$id })).rejects.toMatchObject({ code: 404 });
  await expect(createComment(creator, { targetType: 'challenge', targetId,
    parentId: comments[0].$id, body: 'Reply after close' }))
    .rejects.toMatchObject({ code: 'missing' });
});

it('refuses editing and hiding own challenge comments after archive', async () => {
  const { targetId, comments } = addChallenge(2, 'owner-writes');
  expect((await archiveChallenge(core('c12-owner-writes'),
    { challengeId: targetId, expectedVersion: 1 })).ok).toBe(true);
  await expect(editComment(creator, comments[1].$id, 'Edited after archive'))
    .rejects.toMatchObject({ code: 'missing' });
  await expect(hideOwnComment(creator, comments[1].$id))
    .rejects.toMatchObject({ code: 'missing' });
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comments[1].$id))
    .toMatchObject({ body: comments[1].body, status: comments[1].status });
});

it('keeps pending and staff replies private; notification stays with its recipient', async () => {
  const { targetId, comments } = addChallenge(1, 'staff-reply');
  comments[0].status = 'visible';
  const reply = await createComment(admin, { targetType: 'challenge', targetId,
    parentId: comments[0].$id, body: 'NUY team reply',
    idempotencyKey: crypto.randomUUID() });
  expect(reply.$permissions).toEqual(['read("user:academy-admin")']);
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: reply.$id })).rejects.toMatchObject({ code: 404 });
  const approved = await moderateComment(admin, { commentId: reply.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' });
  expect(approved.$permissions).toEqual(['read("user:academy-admin")']);
  const notice = stub.dataset.tables.notifications.find((row) =>
    row.referenceId === reply.$id);
  expect(notice).toMatchObject({ userId: 'viewer-marina' });
  const pending = await createComment(creator, { targetType: 'challenge', targetId,
    parentId: null, body: 'Pending private' });
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: pending.$id })).rejects.toMatchObject({ code: 404 });
  expect((await archiveChallenge(core('c12-notice'), { challengeId: targetId,
    expectedVersion: 1 })).ok).toBe(true);
  expect(stub.dataset.tables.notifications.find((row) => row.referenceId === reply.$id))
    .toEqual(notice);
  await expect(moderateComment(admin, { commentId: pending.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' }))
    .rejects.toMatchObject({ code: 'missing' });
});

it('one of two concurrent archives commits and audit is not duplicated', async () => {
  const { targetId } = addChallenge(50, 'concurrent');
  const before = stub.dataset.tables.audit_logs.length;
  const results = await Promise.all([
    archiveChallenge(core('c12-concurrent-a'), { challengeId: targetId, expectedVersion: 1 }),
    archiveChallenge(core('c12-concurrent-b'), { challengeId: targetId, expectedVersion: 1 }),
  ]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toHaveLength(1);
  expect(stub.dataset.tables.audit_logs.length).toBe(before + 1);
});

it('direct API denies another Creator and anonymous session before archive', async () => {
  const { targetId, comments } = addChallenge(1, 'direct');
  comments[0].status = 'visible';
  await expect(novaTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[0].$id })).rejects.toMatchObject({ code: 404 });
  await expect(anonymousTables.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[0].$id })).rejects.toMatchObject({ code: 401 });
  const owner = comments[0].authorId === 'viewer-ana' ? anaTables : admin.tables;
  await expect(owner.getRow({ databaseId, tableId: 'community_comments',
    rowId: comments[0].$id })).resolves.toMatchObject({ $id: comments[0].$id });
  expect((await archiveChallenge(core('c12-direct'),
    { challengeId: targetId, expectedVersion: 1 })).ok).toBe(true);
});

it('a comment started during archive cannot commit after it', async () => {
  const { targetId } = addChallenge(100, 'comment-race');
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  const wrapped = new Proxy(admin.tables, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property === 'createRow') return async (args: { tableId: string }) => {
        if (args.tableId === 'community_comments') { entered(); await held; }
        return value.call(target, args);
      };
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Context['tables'];
  const pending = createComment({ ...creator, tables: wrapped }, {
    targetType: 'challenge', targetId, parentId: null, body: 'Racing new comment',
  });
  await reached;
  const archived = await archiveChallenge(core('c12-comment-race'),
    { challengeId: targetId, expectedVersion: 1 });
  release();
  expect(archived.ok).toBe(true);
  await expect(pending).rejects.toMatchObject({ code: 'conflict' });
  expect(stub.dataset.tables.community_comments.filter((row) =>
    row.targetId === targetId && row.body === 'Racing new comment')).toHaveLength(0);
});

it('does not restore a challenge archived between target read and transactional touch', async () => {
  const { targetId } = addChallenge(0, 'before-touch-race');
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  const wrapped = new Proxy(admin.tables, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property === 'getRow') return async (args: {
        tableId: string; rowId: string; transactionId?: string;
      }) => {
        const row = await value.call(target, args);
        if (args.tableId === 'challenges' && args.rowId === targetId &&
            args.transactionId) { entered(); await held; }
        return row;
      };
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Context['tables'];
  const pending = createComment({ ...creator, tables: wrapped }, {
    targetType: 'challenge', targetId, parentId: null, body: 'Before touch race',
  });
  await reached;
  const archived = await archiveChallenge(core('c12-before-touch-race'),
    { challengeId: targetId, expectedVersion: 1 });
  release();
  expect(archived.ok).toBe(true);
  await expect(pending).rejects.toMatchObject({ code: 'missing' });
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId)?.status)
    .toBe('archived');
  expect(stub.dataset.tables.community_comments.filter((row) =>
    row.targetId === targetId)).toHaveLength(0);
});

it('a reply started before archive cannot commit or notify afterward', async () => {
  const { targetId, comments } = addChallenge(1, 'reply-race');
  comments[0].status = 'visible';
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  const wrapped = new Proxy(admin.tables, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property === 'createRow') return async (args: { tableId: string }) => {
        if (args.tableId === 'community_comments') { entered(); await held; }
        return value.call(target, args);
      };
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Context['tables'];
  const before = stub.dataset.tables.notifications.length;
  const pending = createComment({ ...creator, tables: wrapped }, {
    targetType: 'challenge', targetId, parentId: comments[0].$id,
    body: 'Racing reply',
  });
  await reached;
  const archived = await archiveChallenge(core('c12-reply-race'),
    { challengeId: targetId, expectedVersion: 1 });
  release();
  expect(archived.ok).toBe(true);
  await expect(pending).rejects.toMatchObject({ code: 'conflict' });
  expect(stub.dataset.tables.community_comments.filter((row) => row.body === 'Racing reply'))
    .toHaveLength(0);
  expect(stub.dataset.tables.notifications).toHaveLength(before);
});

it('moderation approval started before archive cannot become visible afterward', async () => {
  const { targetId, comments } = addChallenge(1, 'moderation-race');
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  const wrapped = new Proxy(admin.tables, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property === 'updateRow') return async (args: { tableId: string }) => {
        if (args.tableId === 'community_comments') { entered(); await held; }
        return value.call(target, args);
      };
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Context['tables'];
  const before = stub.dataset.tables.community_moderation_events.length;
  const pending = moderateComment({ ...admin, tables: wrapped }, {
    commentId: comments[0].$id, expectedStatus: 'pending', to: 'visible', reason: '',
  });
  await reached;
  const archived = await archiveChallenge(core('c12-moderation-race'),
    { challengeId: targetId, expectedVersion: 1 });
  release();
  expect(archived.ok).toBe(true);
  await expect(pending).rejects.toMatchObject({ code: 'conflict' });
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comments[0].$id)?.status)
    .toBe('pending');
  expect(stub.dataset.tables.community_moderation_events).toHaveLength(before);
});
