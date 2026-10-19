/** Controlled Appwrite 2.2.0 ACL and transaction probes; synthetic staging data only. */
import { performance } from 'node:perf_hooks';
import { Account, Client, Permission, Query, Role, TablesDB } from 'node-appwrite';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

const databaseId = 'nuy-creators';
const adminId = 'c2-admin-teste';
const aId = 'c2-creator-a';
const bId = 'c2-creator-b';
const courseId = '50efbe7a-7996-4344-b767-5221457d763f';
const lessonId = '2e476aee-c941-40f6-b104-0fa4d49cd799';
let phase = 'guard';
function client(key?: string) {
  const value = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID);
  return key ? value.setKey(key) : value;
}
function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`C2: ${label}.`);
}
async function deny(run: () => Promise<unknown>, label: string) {
  try { await run(); }
  catch (error) {
    const code = Number((error as { code?: unknown })?.code);
    if ([401, 403, 404].includes(code)) {
      console.log(`C2_PASS ${label} code=${code}`); return;
    }
    throw new Error(`C2: ${label} retornou HTTP ${code}.`);
  }
  throw new Error(`C2: ${label} permitido indevidamente.`);
}
async function session(email: string, password: string | undefined) {
  check(password, 'senha fictícia ausente');
  const created = await new Account(client(process.env.APPWRITE_C2_SESSION_API_KEY))
    .createEmailPasswordSession({ email, password });
  check(created.secret, 'secret de sessão ausente');
  return new TablesDB(client().setSession(created.secret));
}
async function absent<T>(run: () => Promise<T>): Promise<T | null> {
  try { return await run(); }
  catch (error) { if ((error as { code?: unknown }).code === 404) return null; throw error; }
}

try {
  await verifyC2WriteTarget(process.env, 'test-academy');
  const server = new TablesDB(client(process.env.APPWRITE_C2_ROWS_API_KEY));
  const schema = new TablesDB(client(process.env.APPWRITE_C2_SCHEMA_API_KEY));
  phase = 'schema-acl';
  for (const tableId of ['academy_courses', 'academy_lessons', 'academy_materials',
    'academy_progress', 'community_comments']) {
    const table = await schema.getTable({ databaseId, tableId });
    check(table.rowSecurity === true && table.$permissions.length === 0,
      `${tableId} sem Row Security/ACL privada`);
  }
  console.log('C2_PASS row_security table_permissions_empty count=5');

  phase = 'sessions';
  const [a, b] = await Promise.all([
    session('c2-creator-a@example.invalid', process.env.APPWRITE_C2_CREATOR_A_PASSWORD),
    session('c2-creator-b@example.invalid', process.env.APPWRITE_C2_CREATOR_B_PASSWORD),
  ]);
  const anonymous = new TablesDB(client());

  phase = 'acl-fixtures';
  for (const [rowId, userId] of [['c2-progress-a', aId], ['c2-progress-b', bId]] as const) {
    if (!await absent(() => server.getRow({ databaseId, tableId: 'academy_progress', rowId })))
      await server.createRow({ databaseId, tableId: 'academy_progress', rowId,
        data: { userId, courseId, lessonId, completedAt: new Date().toISOString() },
        permissions: [Permission.read(Role.user(userId))] });
  }
  const own = await a.getRow({ databaseId, tableId: 'academy_progress', rowId: 'c2-progress-a' });
  check(own.userId === aId, 'Creator A não leu o próprio progresso');
  await deny(() => a.getRow({ databaseId, tableId: 'academy_progress',
    rowId: 'c2-progress-b' }), 'creator_a_cannot_read_b_progress');
  await deny(() => b.updateRow({ databaseId, tableId: 'academy_progress',
    rowId: 'c2-progress-a', data: { courseId } as never }),
  'creator_b_cannot_change_a_progress');
  await deny(() => anonymous.getRow({ databaseId, tableId: 'academy_progress',
    rowId: 'c2-progress-a' }), 'anonymous_cannot_read_progress');
  console.log('C2_PASS owner_row_read_with_empty_table_acl');

  for (const [rowId, status] of [['c2-comment-pending', 'pending'],
    ['c2-comment-rejected', 'rejected']] as const) {
    if (!await absent(() => server.getRow({ databaseId, tableId: 'community_comments', rowId })))
      await server.createRow({ databaseId, tableId: 'community_comments', rowId,
        data: { targetType: 'lesson', targetId: lessonId, authorId: aId,
          body: `Comentário ${status} sintético`, status, createdAt: new Date().toISOString() },
        permissions: [Permission.read(Role.user(aId))] });
    check((await server.getRow({ databaseId, tableId: 'community_comments', rowId })).status === status,
      `Admin não leu comentário ${status}`);
    await deny(() => b.getRow({ databaseId, tableId: 'community_comments', rowId }),
      `creator_b_cannot_read_${status}`);
    await deny(() => anonymous.getRow({ databaseId, tableId: 'community_comments', rowId }),
      `anonymous_cannot_read_${status}`);
  }
  if (!await absent(() => server.getRow({ databaseId, tableId: 'academy_materials',
    rowId: 'c2-draft-material' })))
    await server.createRow({ databaseId, tableId: 'academy_materials',
      rowId: 'c2-draft-material', data: { courseId, lessonId,
        title: 'Material sintético em rascunho', kind: 'link',
        url: 'https://example.invalid/c2', order: 1 }, permissions: [] });
  await deny(() => a.getRow({ databaseId, tableId: 'academy_materials',
    rowId: 'c2-draft-material' }), 'creator_cannot_read_draft_material');
  await deny(() => anonymous.getRow({ databaseId, tableId: 'academy_materials',
    rowId: 'c2-draft-material' }), 'anonymous_cannot_read_draft_material');
  await deny(() => b.createRow({ databaseId, tableId: 'academy_courses',
    rowId: 'c2-forbidden-course', data: { slug: 'c2-forbidden-course',
      title: 'Não deve existir', summary: 'Sem autorização', searchText: 'Não',
      categoryId: 'cat-primeiros-passos', status: 'draft', order: 1, version: 1 } as never,
    permissions: [] }),
  'creator_cannot_create_course_directly');
  await deny(() => b.updateRow({ databaseId, tableId: 'academy_lessons', rowId: lessonId,
    data: { status: 'published' } as never }),
  'creator_cannot_publish_lesson_directly');

  phase = 'transactions';
  const anchorId = 'c2-tx-anchor';
  if (!await absent(() => server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: anchorId })))
    await server.createRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
      data: { slug: anchorId, name: 'Transação C2', description: 'initial',
        order: 990, active: false }, permissions: [] });
  const before = performance.now();
  const committed = await server.createTransaction({ ttl: 120 });
  await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
    data: { description: 'committed' }, transactionId: committed.$id });
  await server.updateTransaction({ transactionId: committed.$id, commit: true });
  check((await server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: anchorId })).description === 'committed', 'commit não persistiu');
  console.log(`C2_PASS transaction_commit elapsed_ms=${Math.round(performance.now() - before)}`);
  const rolled = await server.createTransaction({ ttl: 120 });
  await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
    data: { description: 'rolled-back' }, transactionId: rolled.$id });
  await server.updateTransaction({ transactionId: rolled.$id, rollback: true });
  check((await server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: anchorId })).description === 'committed', 'rollback não preservou linha');
  console.log('C2_PASS transaction_rollback');

  const partial = await server.createTransaction({ ttl: 120 });
  await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
    data: { description: 'partial' }, transactionId: partial.$id });
  let invalidRejectedAtStage = false;
  try {
    await server.createRow({ databaseId, tableId: 'academy_categories',
      rowId: 'c2-invalid-partial', data: { slug: 'c2-invalid-partial' },
      permissions: [], transactionId: partial.$id });
  } catch { invalidRejectedAtStage = true; }
  let invalidRejectedAtCommit = false;
  if (!invalidRejectedAtStage) {
    try { await server.updateTransaction({ transactionId: partial.$id, commit: true }); }
    catch { invalidRejectedAtCommit = true; }
  }
  if (invalidRejectedAtStage || invalidRejectedAtCommit)
    try { await server.updateTransaction({ transactionId: partial.$id, rollback: true }); }
    catch { /* commit failure may already close it */ }
  check(invalidRejectedAtStage || invalidRejectedAtCommit,
    'operação incompleta foi aceita até o commit');
  check((await server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: anchorId })).description === 'committed', 'falha parcial persistiu');
  check(!await absent(() => server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: 'c2-invalid-partial' })), 'linha incompleta persistiu');
  console.log(`C2_PASS partial_failure_rollback rejected_at=${invalidRejectedAtStage ? 'stage' : 'commit'}`);

  phase = 'acl-only-update';
  const aclOnly = await server.createTransaction({ ttl: 120 });
  let aclOnlyCode: unknown = null;
  try {
    await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
      data: {}, permissions: [Permission.read(Role.user(aId))],
      transactionId: aclOnly.$id });
  } catch (error) { aclOnlyCode = (error as { code?: unknown }).code; }
  try { await server.updateTransaction({ transactionId: aclOnly.$id, rollback: true }); }
  catch { /* stage failure may close it */ }
  console.log(`C2_OBSERVED acl_only_update_status=${aclOnlyCode ?? 'accepted'}`);

  phase = 'same-value-create-transactions';
  const first = await server.createTransaction({ ttl: 120 });
  const second = await server.createTransaction({ ttl: 120 });
  phase = 'same-value-stage-first';
  await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
    data: { description: 'committed' }, transactionId: first.$id });
  phase = 'same-value-stage-second';
  await server.updateRow({ databaseId, tableId: 'academy_categories', rowId: anchorId,
    data: { description: 'concurrent' }, transactionId: second.$id });
  phase = 'same-value-commit-second';
  await server.updateTransaction({ transactionId: second.$id, commit: true });
  phase = 'same-value-commit-first';
  let conflictCode: unknown = null;
  try { await server.updateTransaction({ transactionId: first.$id, commit: true }); }
  catch (error) { conflictCode = (error as { code?: unknown }).code; }
  check(conflictCode === 409, `updateRow com valor igual não detectou conflito: ${String(conflictCode)}`);
  console.log('C2_PASS same_value_update_conflict code=409');

  const batch = await server.createTransaction({ ttl: 120 });
  const batchStarted = performance.now();
  for (let i = 0; i < 8; i++) {
    const rowId = `c2-batch-${i}`;
    await server.createRow({ databaseId, tableId: 'academy_categories', rowId,
      data: { slug: rowId, name: `Lote ${i}`, order: 980 + i, active: false },
      permissions: [], transactionId: batch.$id });
  }
  await server.updateTransaction({ transactionId: batch.$id, rollback: true });
  check(!await absent(() => server.getRow({ databaseId, tableId: 'academy_categories',
    rowId: 'c2-batch-0' })), 'lote com rollback persistiu');
  console.log(`C2_PASS transaction_eight_staged_writes_rollback elapsed_ms=${Math.round(performance.now() - batchStarted)}`);
  console.log(`C2_SECURITY_COMPLETE project=${C2_PROJECT_ID} actor_admin=${adminId}`);
} catch (error) {
  const code = (error as { code?: unknown }).code;
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? `${error.message} phase=${phase}`
    : `C2: prova interrompida phase=${phase}${typeof code === 'number' ? ` HTTP=${code}` : ''}.`);
  process.exitCode = 1;
}
