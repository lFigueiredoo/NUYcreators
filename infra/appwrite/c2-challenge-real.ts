/** Real-server challenge comment/archive and synthetic legacy ACL sample. */
import { randomUUID } from 'node:crypto';
import { Account, Client, Permission, Query, Role, TablesDB, Teams } from 'node-appwrite';
import { archiveChallenge } from '../../src/features/workspace/core/catalog';
import type { CoreContext } from '../../src/features/workspace/core/context';
import { createComment, moderateComment, AcademyError,
  type Context } from '../../src/features/academy/services/operations';
import { confirmedRoles } from '../../src/lib/security/memberships';
import { inventoryChallengeCommentAcls } from './academy-comment-acl-inventory';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

const databaseId = 'nuy-creators';
const aId = 'c2-creator-a';
const bId = 'c2-creator-b';
const adminId = 'c2-admin-teste';
let phase = 'guard';
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`C2: ${message}.`);
}
function client(key?: string) {
  const result = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID);
  return key ? result.setKey(key) : result;
}
async function login(email: string, password: string | undefined) {
  check(password, 'senha fictícia ausente');
  const session = await new Account(client(process.env.APPWRITE_C2_SESSION_API_KEY))
    .createEmailPasswordSession({ email, password });
  check(session.secret, 'secret de sessão ausente');
  return new TablesDB(client().setSession(session.secret));
}
async function denial(run: () => Promise<unknown>, label: string) {
  try { await run(); }
  catch (error) {
    const code = error instanceof AcademyError ? error.code :
      String((error as { code?: unknown }).code ?? 'unknown');
    if (['401', '403', '404', 'missing', 'conflict'].includes(code)) {
      console.log(`C2_PASS ${label} code=${code}`); return;
    }
    throw new Error(`C2: ${label} retornou ${code}.`);
  }
  throw new Error(`C2: ${label} permitido indevidamente.`);
}
async function fixture(server: TablesDB, id: string) {
  const startsAt = new Date(Date.now() - 86_400_000).toISOString();
  const endsAt = new Date(Date.now() + 86_400_000).toISOString();
  return server.createRow({ databaseId, tableId: 'challenges', rowId: id,
    data: { slug: id, name: `Desafio sintético ${id}`, description: 'C2 staging',
      platform: 'instagram', startsAt, endsAt, points: 10, participantCount: 0,
      status: 'published', version: 1 },
    permissions: [Permission.read(Role.any())] });
}

try {
  await verifyC2WriteTarget(process.env, 'test-academy');
  const server = new TablesDB(client(process.env.APPWRITE_C2_ROWS_API_KEY));
  const schema = new TablesDB(client(process.env.APPWRITE_C2_SCHEMA_API_KEY));
  const [a, b] = await Promise.all([
    login('c2-creator-a@example.invalid', process.env.APPWRITE_C2_CREATOR_A_PASSWORD),
    login('c2-creator-b@example.invalid', process.env.APPWRITE_C2_CREATOR_B_PASSWORD),
  ]);
  const anonymous = new TablesDB(client());
  const members = await new Teams(client(process.env.APPWRITE_C2_IDENTITY_API_KEY))
    .listMemberships({ teamId: 'nuy-admins', queries: [Query.limit(100)] });
  check(confirmedRoles(members.memberships, adminId, 'nuy-admins').includes('admin'),
    'Admin real sem membership');
  const creator: Context = { tables: server, databaseId,
    actor: { id: aId, manage: false, moderate: false } };
  const moderator: Context = { tables: server, databaseId,
    actor: { id: adminId, manage: true, moderate: true } };
  const core = (challengeId: string): CoreContext => ({ tables: server,
    databaseId, actor: { userId: adminId, roles: ['admin'] }, now: new Date(),
    correlationId: `c2-${challengeId}`, academyCommentsReady: true,
    challengeCommentsPrivateReady: true });
  const reader = { getTable: schema.getTable.bind(schema),
    listRows: server.listRows.bind(server) } as Pick<TablesDB, 'getTable' | 'listRows'>;

  phase = 'comment-and-moderation';
  const challengeId = `c2-challenge-${randomUUID().slice(0, 8)}`;
  await fixture(server, challengeId);
  const pending = await createComment(creator, { targetType: 'challenge',
    targetId: challengeId, parentId: null, body: 'Comentário sintético C2',
    idempotencyKey: randomUUID() });
  check(pending.status === 'pending', 'comentário não entrou pendente');
  const visible = await moderateComment(moderator, { commentId: pending.$id,
    expectedStatus: 'pending', to: 'visible', reason: 'Aprovado na prova C2' });
  check(visible.status === 'visible', 'moderação não persistiu');
  await denial(() => b.getRow({ databaseId, tableId: 'community_comments',
    rowId: pending.$id }), 'other_creator_cannot_read_visible_challenge_comment_directly');
  await denial(() => anonymous.getRow({ databaseId, tableId: 'community_comments',
    rowId: pending.$id }), 'anonymous_cannot_read_visible_challenge_comment_directly');
  check((await a.getRow({ databaseId, tableId: 'community_comments',
    rowId: pending.$id })).authorId === aId, 'autora não leu comentário próprio');
  const beforeArchive = await inventoryChallengeCommentAcls(reader, databaseId);
  check(beforeArchive.ready && beforeArchive.excessivePermissions === 0,
    'inventário de ACL privada não passou');
  console.log(`C2_PASS challenge_comment_moderation id=${pending.$id} acl_ready=true`);

  phase = 'archive';
  const archived = await archiveChallenge(core(challengeId),
    { challengeId, expectedVersion: 1 });
  check(archived.ok, `arquivo recusado ${archived.ok ? '' : archived.failure.code}`);
  const stored = await server.getRow({ databaseId, tableId: 'challenges', rowId: challengeId });
  check(stored.status === 'archived' && stored.version === 2 &&
    stored.$permissions.length === 0, 'arquivo não persistiu estado e ACL');
  await denial(() => b.getRow({ databaseId, tableId: 'challenges', rowId: challengeId }),
    'other_creator_cannot_read_archived_challenge');
  check((await a.getRow({ databaseId, tableId: 'community_comments',
    rowId: pending.$id })).authorId === aId, 'autora perdeu leitura permitida');
  await denial(() => createComment(creator, { targetType: 'challenge',
    targetId: challengeId, parentId: pending.$id,
    body: 'Resposta após arquivo' }), 'new_reply_after_archive_refused');
  const secondArchive = await archiveChallenge(core(challengeId),
    { challengeId, expectedVersion: 2 });
  check(!secondArchive.ok && secondArchive.failure.code === 'conflict',
    'segundo arquivo não retornou conflito');
  console.log(`C2_PASS challenge_archive id=${challengeId} version=2 second=conflict`);

  phase = 'legacy-acl';
  const legacyChallengeId = `c2-legacy-${randomUUID().slice(0, 8)}`;
  const legacyCommentId = `c2-legacy-comment-${randomUUID().slice(0, 8)}`;
  await fixture(server, legacyChallengeId);
  await server.createRow({ databaseId, tableId: 'community_comments',
    rowId: legacyCommentId, data: { targetType: 'challenge', targetId: legacyChallengeId,
      authorId: aId, body: 'ACL legada fictícia', status: 'visible',
      createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users())] });
  check((await b.getRow({ databaseId, tableId: 'community_comments',
    rowId: legacyCommentId })).status === 'visible',
  'amostra legada não reproduziu leitura excessiva');
  const legacyInventory = await inventoryChallengeCommentAcls(reader, databaseId);
  check(!legacyInventory.ready && legacyInventory.excessivePermissions === 1,
    'inventário não detectou ACL excessiva');
  await server.updateRow({ databaseId, tableId: 'community_comments',
    rowId: legacyCommentId, data: {},
    permissions: [Permission.read(Role.user(aId))] });
  const migrated = await inventoryChallengeCommentAcls(reader, databaseId);
  check(migrated.ready && migrated.excessivePermissions === 0,
    'migração da amostra legada não passou');
  await denial(() => b.getRow({ databaseId, tableId: 'community_comments',
    rowId: legacyCommentId }), 'legacy_comment_private_after_migration');
  console.log(`C2_PASS synthetic_legacy_acl_migration id=${legacyCommentId}`);
  console.log(`C2_CHALLENGE_COMPLETE project=${C2_PROJECT_ID}`);
} catch (error) {
  const code = (error as { code?: unknown }).code;
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? `${error.message} phase=${phase}`
    : `C2: desafio interrompido phase=${phase}${typeof code === 'number' ? ` HTTP=${code}` : ''}.`);
  process.exitCode = 1;
}
