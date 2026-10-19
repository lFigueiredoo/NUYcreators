/** Real Appwrite transaction race: comment touch staged before archive commit. */
import { randomUUID } from 'node:crypto';
import { Client, Permission, Query, Role, TablesDB } from 'node-appwrite';
import { archiveChallenge } from '../../src/features/workspace/core/catalog';
import type { CoreContext } from '../../src/features/workspace/core/context';
import { createComment, AcademyError, type Context } from '../../src/features/academy/services/operations';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

const databaseId = 'nuy-creators';
const holdBeforeTouch = process.argv.includes('--before-touch');
let release!: () => void;
let touched!: () => void;
const released = new Promise<void>((resolve) => { release = resolve; });
const touchStaged = new Promise<void>((resolve) => { touched = resolve; });
let phase = 'guard';
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`C2: ${message}.`);
}

try {
  await verifyC2WriteTarget(process.env, 'test-academy');
  const server = new TablesDB(new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(process.env.APPWRITE_C2_ROWS_API_KEY!));
  const challengeId = `c2-race-${randomUUID().slice(0, 8)}`;
  const body = `Corrida sintética ${challengeId}`;
  const startsAt = new Date(Date.now() - 86_400_000).toISOString();
  const endsAt = new Date(Date.now() + 86_400_000).toISOString();
  await server.createRow({ databaseId, tableId: 'challenges', rowId: challengeId,
    data: { slug: challengeId, name: 'Desafio corrida C2', description: 'Sintético',
      platform: 'instagram', startsAt, endsAt, points: 10, participantCount: 0,
      status: 'published', version: 1 },
    permissions: [Permission.read(Role.any())] });
  const delayed = new Proxy(server, {
    get(target, property) {
      if (property === 'getRow' && holdBeforeTouch) return async (params: {
        tableId: string; rowId: string; transactionId?: string;
      }) => {
        const result = await target.getRow(params as never);
        if (params.tableId === 'challenges' && params.rowId === challengeId &&
            params.transactionId) { touched(); await released; }
        return result;
      };
      if (property === 'updateRow') return async (params: {
        tableId: string; rowId: string; transactionId?: string;
      }) => {
        const result = await target.updateRow(params as never);
        if (!holdBeforeTouch && params.tableId === 'challenges' && params.rowId === challengeId &&
            params.transactionId) { touched(); await released; }
        return result;
      };
      const value = Reflect.get(target, property) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as TablesDB;
  const creator: Context = { tables: delayed, databaseId,
    actor: { id: 'c2-creator-a', manage: false, moderate: false } };
  const admin: CoreContext = { tables: server, databaseId,
    actor: { userId: 'c2-admin-teste', roles: ['admin'] }, now: new Date(),
    correlationId: `c2-race-${challengeId}`, academyCommentsReady: true,
    challengeCommentsPrivateReady: true };
  phase = 'stage-comment';
  const commentPromise = createComment(creator, { targetType: 'challenge',
    targetId: challengeId, parentId: null, body, idempotencyKey: randomUUID() });
  const timeout = new Promise<never>((_, reject) => setTimeout(() =>
    reject(new Error('C2: corrida excedeu 15 s.')), 15000));
  await Promise.race([touchStaged, timeout]);
  phase = 'archive-concurrently';
  const archivePromise = archiveChallenge(admin, { challengeId, expectedVersion: 1 });
  let archived;
  try { archived = await Promise.race([archivePromise, timeout]); }
  finally { release(); }
  check(archived.ok, `arquivo concorrente recusado ${archived.ok ? '' : archived.failure.code}`);
  phase = 'comment-commit';
  let creatorCode: string | null = null;
  try { await commentPromise; }
  catch (error) { creatorCode = error instanceof AcademyError ? error.code :
    String((error as { code?: unknown }).code ?? 'unknown'); }
  check(creatorCode === 'conflict' || creatorCode === 'missing',
    `comentário concorrente retornou ${creatorCode} challenge=${challengeId}`);
  const stored = await server.getRow({ databaseId, tableId: 'challenges', rowId: challengeId });
  check(stored.status === 'archived', `desafio ressuscitou ${challengeId} status=${stored.status}`);
  const page = await server.listRows({ databaseId, tableId: 'community_comments',
    queries: [Query.equal('targetType', 'challenge'), Query.equal('targetId', challengeId),
      Query.limit(10)] });
  check(page.total === 0, 'comentário concorrente persistiu após arquivo');
  const audit = await server.listRows({ databaseId, tableId: 'audit_logs', queries: [
    Query.equal('entityType', 'challenges'), Query.equal('entityId', challengeId),
    Query.limit(10),
  ] });
  check(audit.total === 1 && audit.rows[0].action === 'challenge.archived',
    `auditoria divergente para ${challengeId}: ${audit.total}`);
  console.log(`C2_PASS real_comment_archive_race mode=${holdBeforeTouch ? 'before_touch' : 'after_touch'} challenge=${challengeId} archive=committed comment=${creatorCode} rows=0 audit=1`);
} catch (error) {
  release();
  const code = (error as { code?: unknown }).code;
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? `${error.message} phase=${phase}`
    : `C2: corrida interrompida phase=${phase}${typeof code === 'number' ? ` HTTP=${code}` : ''}.`);
  process.exitCode = 1;
}
