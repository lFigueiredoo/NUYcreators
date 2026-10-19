/** Small real-server C2 flow. Leaves synthetic fixtures for review. */
import { Account, Client, Query, TablesDB, Teams } from 'node-appwrite';
import { saveCourse, saveLesson, saveModule, setCourseStatus, completeLesson,
  createComment, AcademyError, type Context } from '../../src/features/academy/services/operations';
import { ownTeamRoles } from '../../src/lib/security/memberships';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

const databaseId = 'nuy-creators';
const slug = 'c2-homologacao-real';
let phase = 'guard';
const actors = [
  { id: 'c2-admin-teste', email: 'c2-admin@example.invalid',
    password: process.env.APPWRITE_C2_ADMIN_PASSWORD },
  { id: 'c2-creator-a', email: 'c2-creator-a@example.invalid',
    password: process.env.APPWRITE_C2_CREATOR_A_PASSWORD },
  { id: 'c2-creator-b', email: 'c2-creator-b@example.invalid',
    password: process.env.APPWRITE_C2_CREATOR_B_PASSWORD },
] as const;
function client(key?: string) {
  const result = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID);
  return key ? result.setKey(key) : result;
}
async function login(email: string, password: string | undefined) {
  if (!password) throw new Error('C2: senha fictícia ausente.');
  assert(process.env.APPWRITE_C2_SESSION_API_KEY, 'chave temporária de sessão ausente');
  const session = await new Account(client(process.env.APPWRITE_C2_SESSION_API_KEY))
    .createEmailPasswordSession({ email, password });
  if (!session.secret) throw new Error('C2: sessão real sem secret no Server SDK.');
  return client().setSession(session.secret);
}
function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`C2: ${label}.`);
}
async function expectCode(run: () => Promise<unknown>, expected: string[], label: string) {
  try { await run(); }
  catch (error) {
    const code = error instanceof AcademyError ? error.code :
      String((error as { code?: unknown })?.code ?? 'unknown');
    if (expected.includes(code)) { console.log(`C2_PASS ${label} code=${code}`); return; }
    throw new Error(`C2: ${label} retornou ${code}, esperado ${expected.join('/')}.`);
  }
  throw new Error(`C2: ${label} foi permitido indevidamente.`);
}

try {
  await verifyC2WriteTarget(process.env, 'test-academy');
  phase = 'login';
  const sessions = await Promise.all(actors.map((actor) => login(actor.email, actor.password)));
  phase = 'membership';
  const roles = await Promise.all(sessions.map(async (session, index) => {
    try {
      const page = await new Teams(session).listMemberships({ teamId: 'nuy-admins',
        queries: [Query.equal('userId', actors[index].id), Query.limit(100)] });
      return ownTeamRoles(page.memberships, actors[index].id, 'nuy-admins');
    } catch (error) {
      if ([401, 403, 404].includes(Number((error as { code?: unknown }).code))) return [];
      throw error;
    }
  }));
  assert(roles[0].includes('admin') && roles[1].length === 0 && roles[2].length === 0,
    'papéis por sessão divergentes');
  console.log('C2_PASS sessions_and_real_membership admin=1 creators_admin=0');

  phase = 'draft';
  const server = new TablesDB(client(process.env.APPWRITE_C2_ROWS_API_KEY));
  const admin: Context = { tables: server, databaseId,
    actor: { id: actors[0].id, manage: true, moderate: true } };
  const creator: Context = { tables: server, databaseId,
    actor: { id: actors[1].id, manage: false, moderate: false } };
  const existing = await server.listRows({ databaseId, tableId: 'academy_courses',
    queries: [Query.equal('slug', slug), Query.limit(2)] });
  assert(existing.total <= 1, 'slug de curso duplicado');
  let course = existing.rows[0];
  if (!course) {
    course = await saveCourse(admin, { title: 'Curso de prova C2', slug,
      summary: 'Fluxo sintético de homologação', description: 'Sem upload de mídia.',
      categoryId: 'cat-primeiros-passos', order: 999 });
    console.log(`C2_PASS create_draft_course id=${course.$id}`);
  }
  let modules = await server.listRows({ databaseId, tableId: 'academy_modules',
    queries: [Query.equal('courseId', course.$id), Query.limit(2)] });
  let module = modules.rows[0];
  if (!module) {
    module = await saveModule(admin, { courseId: course.$id,
      expectedCourseVersion: Number(course.version), title: 'Módulo sintético',
      summary: 'Prova da transação', order: 1 });
    console.log(`C2_PASS create_module id=${module.$id}`);
  }
  course = await server.getRow({ databaseId, tableId: 'academy_courses', rowId: course.$id });
  const lessons = await server.listRows({ databaseId, tableId: 'academy_lessons',
    queries: [Query.equal('courseId', course.$id), Query.limit(2)] });
  let lesson = lessons.rows[0];
  if (!lesson) {
    lesson = await saveLesson(admin, { courseId: course.$id, moduleId: module.$id,
      expectedCourseVersion: Number(course.version), title: 'Aula sintética',
      summary: 'Vídeo ainda não homologado', order: 1,
      durationSeconds: 90, videoFileId: 'c2-no-video-uploaded' });
    console.log(`C2_PASS create_draft_lesson id=${lesson.$id}`);
  }
  course = await server.getRow({ databaseId, tableId: 'academy_courses', rowId: course.$id });
  const edited = await saveCourse(admin, { id: course.$id,
    expectedVersion: Number(course.version), title: 'Curso de prova C2 editado', slug,
    summary: 'Fluxo sintético de homologação', description: 'Sem upload de mídia.',
    categoryId: 'cat-primeiros-passos', order: 999 });
  assert(Number(edited.version) === Number(course.version) + 1, 'edição não persistiu');
  console.log(`C2_PASS edit_draft_course version=${edited.version}`);

  await expectCode(() => saveCourse(creator, { id: course.$id,
    expectedVersion: Number(edited.version), title: 'Edição proibida', slug,
    summary: 'Tentativa Creator', description: '',
    categoryId: 'cat-primeiros-passos', order: 999 }), ['forbidden'],
  'creator_cannot_edit_course');
  await expectCode(() => setCourseStatus(admin, course.$id,
    Number(edited.version), 'published'), ['invalid'],
  'publish_refused_without_verified_media');
  const after = await server.getRow({ databaseId, tableId: 'academy_courses', rowId: course.$id });
  assert(after.status === 'draft' && after.version === edited.version,
    'rollback após publicação negada');
  console.log('C2_PASS rollback_kept_draft');
  await expectCode(() => completeLesson(creator, lesson.$id), ['missing'],
    'creator_cannot_complete_draft');
  await expectCode(() => createComment(creator, { targetType: 'lesson',
    targetId: lesson.$id, parentId: null, body: 'Comentário de prova' }), ['missing'],
  'creator_cannot_comment_draft');

  for (const [label, session] of [['creator_a', sessions[1]],
    ['creator_b', sessions[2]], ['anonymous', client()]] as const) {
    const rows = new TablesDB(session);
    await expectCode(() => rows.getRow({ databaseId, tableId: 'academy_courses',
      rowId: course.$id }), ['401', '403', '404'], `${label}_cannot_read_draft`);
  }
  const page1 = await server.listRows({ databaseId, tableId: 'academy_categories',
    queries: [Query.orderAsc('$id'), Query.limit(2)] });
  const page2 = await server.listRows({ databaseId, tableId: 'academy_categories',
    queries: [Query.orderAsc('$id'), Query.limit(2),
      Query.cursorAfter(page1.rows.at(-1)!.$id)] });
  assert(page1.rows.length === 2 && page2.rows.length === 2 && page1.total === 5,
    'paginação real incompleta');
  console.log('C2_PASS cursor_pagination page_size=2 total=5');
  console.log(`C2_SMOKE_COMPLETE course=${course.$id} module=${module.$id} lesson=${lesson.$id}`);
} catch (error) {
  const code = (error as { code?: unknown })?.code;
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? `${error.message} phase=${phase}`
    : `C2: fluxo interrompido phase=${phase}${typeof code === 'number' ? ` (HTTP ${code})` : ''}.`);
  process.exitCode = 1;
}
