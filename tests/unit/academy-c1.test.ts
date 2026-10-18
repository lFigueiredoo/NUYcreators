import { afterAll, beforeAll, expect, it } from 'vitest';
import { Account, Client, TablesDB } from 'node-appwrite';
import { academyCategorySeeds, planAcademyCategorySeeds } from '../../infra/appwrite/academy-seeds';
import { EDITOR_MAX_STAGED_WRITES, createComment, saveCategory, saveEditorDraft,
  saveMaterial, seedInitialCategories, setCourseStatus, type Context } from '../../src/features/academy/services/operations';
import { archiveChallenge, closeChallenge, type CoreContext } from '../../src/features/workspace/core';
import { startStub } from '../support/appwrite-stub/server.mjs';

let stub: Awaited<ReturnType<typeof startStub>>;
let admin: Context;
let creator: Context;
let viewerTables: TablesDB;
beforeAll(async () => {
  stub = await startStub({ academyFixture: true });
  const client = new Client().setEndpoint(stub.endpoint).setProject('nuy-stub')
    .setKey('stub-ops-key').setSelfSigned(true);
  const tables = new TablesDB(client);
  admin = { tables, databaseId: 'nuy-creators', actor: {
    id: 'academy-admin', manage: true, moderate: true } };
  creator = { ...admin, actor: { id: 'viewer-ana', manage: false, moderate: false } };
  const accountClient = new Client().setEndpoint(stub.endpoint).setProject('nuy-stub').setSelfSigned(true);
  const session = await new Account(accountClient).createEmailPasswordSession({
    email: 'nova@nuy.test', password: 'senha-de-teste-789',
  });
  viewerTables = new TablesDB(new Client().setEndpoint(stub.endpoint).setProject('nuy-stub')
    .setSession(session.secret).setSelfSigned(true));
});
afterAll(async () => { await stub.close(); });

it('prepara cinco seeds estáveis e idempotentes sem execução automática', () => {
  expect(academyCategorySeeds).toHaveLength(5);
  expect(new Set(academyCategorySeeds.map((seed) => seed.slug)).size).toBe(5);
  expect(planAcademyCategorySeeds([]).pending).toHaveLength(5);
  const existing = academyCategorySeeds.map((seed) => ({ $id: seed.id, slug: seed.slug }));
  expect(planAcademyCategorySeeds(existing)).toEqual({ pending: [], conflicts: [] });
  expect(planAcademyCategorySeeds([{ $id: 'other', slug: academyCategorySeeds[0].slug }]).conflicts)
    .toEqual([academyCategorySeeds[0].slug]);
});

it('executor local de seeds exige Admin e repetir não cria duplicatas', async () => {
  await expect(seedInitialCategories(creator)).rejects.toMatchObject({ code: 'forbidden' });
  expect(await seedInitialCategories(admin)).toEqual({ created: 5, total: 5 });
  expect(await seedInitialCategories(admin)).toEqual({ created: 0, total: 5 });
  for (const seed of academyCategorySeeds)
    expect(stub.dataset.tables.academy_categories.filter((row) => row.$id === seed.id))
      .toHaveLength(1);
});

it('categorias exigem Admin, mantêm slug e ordem; materiais exigem cadeia válida', async () => {
  const input = { name: 'Tema novo', slug: 'tema-novo', description: '', order: 90, active: true };
  await expect(saveCategory(creator, input)).rejects.toMatchObject({ code: 'forbidden' });
  const created = await saveCategory(admin, input);
  expect(created.$permissions).toEqual(['read("users")']);
  await saveCategory(admin, { ...input, id: created.$id, order: 5 });
  expect(stub.dataset.tables.academy_categories.find((row) => row.$id === created.$id)?.order).toBe(5);
  await expect(saveCategory(admin, { ...input, id: created.$id, slug: 'renomeado' }))
    .rejects.toMatchObject({ code: 'invalid' });
  await expect(saveCategory(admin, { ...input, slug: 'criacao' }))
    .rejects.toMatchObject({ code: 'conflict' });
  await expect(saveCategory(admin, { name: 'Criação de conteúdo', slug: 'criacao',
    description: '', order: 1, active: false, id: 'cat-criacao' }))
    .rejects.toMatchObject({ code: 'invalid' });
  const material = { courseId: 'course-presenca', lessonId: 'lesson-voz',
    expectedCourseVersion: 1, title: 'Material seguro', kind: 'link', fileId: null,
    url: 'https://nuy.test/guia', order: 77 };
  await expect(saveMaterial(creator, material)).rejects.toMatchObject({ code: 'forbidden' });
  await expect(saveMaterial(admin, { ...material, lessonId: 'sem-aula' }))
    .rejects.toMatchObject({ code: 'missing' });
  const lesson = stub.dataset.tables.academy_lessons.find((row) => row.$id === 'lesson-voz')!;
  lesson.moduleId = 'sem-modulo';
  await expect(saveMaterial(admin, material)).rejects.toMatchObject({ code: 'missing' });
  lesson.moduleId = 'module-historia';
  const saved = await saveMaterial(admin, material);
  expect(saved.lessonId).toBe('lesson-voz');
  expect(saved.$permissions).toEqual([]);
});

it('publicação recusa material órfão mesmo se seu PDF ou link parecer válido', async () => {
  const courseId = 'course-presenca';
  const version = Number(stub.dataset.tables.academy_courses.find((row) => row.$id === courseId)?.version);
  stub.dataset.tables.academy_materials.push({ $id: 'orphan-c1', $permissions: [],
    courseId, lessonId: 'missing-lesson', title: 'Link solto', kind: 'link',
    fileId: null, url: 'https://nuy.test/solto', order: 98 });
  await expect(setCourseStatus(admin, courseId, version, 'published'))
    .rejects.toMatchObject({ code: 'invalid' });
  expect(stub.dataset.tables.academy_courses.find((row) => row.$id === courseId)?.version)
    .toBe(version);
  stub.dataset.tables.academy_materials = stub.dataset.tables.academy_materials
    .filter((row) => row.$id !== 'orphan-c1');
  stub.dataset.tables.academy_materials.push({ $id: 'insecure-link-c1', $permissions: [],
    courseId, lessonId: 'lesson-voz', title: 'Link inseguro', kind: 'link',
    fileId: null, url: 'http://nuy.test/solto', order: 98 });
  await expect(setCourseStatus(admin, courseId, version, 'published'))
    .rejects.toMatchObject({ code: 'invalid' });
  stub.dataset.tables.academy_materials = stub.dataset.tables.academy_materials
    .filter((row) => row.$id !== 'insecure-link-c1');
});

it('editor limita 50 writes, preserva IDs e faz rollback após falha tardia', async () => {
  const base = { title: 'Treinamento grande', slug: 'treinamento-grande-c1',
    summary: 'Teste de limite conservador', description: '', categoryId: 'cat-criacao', order: 75 };
  const makeLessons = (count: number) => Array.from({ length: count }, (_, index) => ({
    id: `local-lesson-${index}`, title: `Aula ${index + 1}`, summary: '', order: index,
    durationSeconds: null, videoFileId: null, status: 'draft' as const,
  }));
  const graph = (count: number) => ({ ...base, modules: [{ id: 'local-module-c1',
    title: 'Módulo longo', summary: '', order: 0, lessons: makeLessons(count) }], materials: [] });
  expect(1 + 1 + 48).toBe(EDITOR_MAX_STAGED_WRITES);
  await expect(saveEditorDraft(admin, graph(49))).rejects.toMatchObject({ code: 'invalid' });
  expect(stub.dataset.tables.academy_courses.some((row) => row.slug === base.slug)).toBe(false);
  const saved = await saveEditorDraft(admin, graph(48));
  expect(Object.keys(saved.lessonIds)).toHaveLength(48);
  expect(stub.dataset.tables.academy_lessons.filter((row) => row.courseId === saved.id)).toHaveLength(48);
  const oldIds = Object.values(saved.lessonIds);
  const failed = { ...graph(48), id: saved.id, expectedVersion: 1,
    modules: [{ ...graph(48).modules[0], id: saved.moduleIds['local-module-c1'],
      lessons: graph(48).modules[0].lessons.map((lesson) => ({ ...lesson,
        id: saved.lessonIds[lesson.id] })) }],
    materials: [{ id: 'local-bad', lessonId: 'missing', title: 'PDF perdido', kind: 'pdf',
      fileId: 'pdf-any', url: null, order: 1 }] };
  await expect(saveEditorDraft(admin, failed)).rejects.toMatchObject({ code: 'invalid' });
  expect(stub.dataset.tables.academy_courses.find((row) => row.$id === saved.id)?.version).toBe(1);
  expect(stub.dataset.tables.academy_lessons.filter((row) => row.courseId === saved.id)
    .map((row) => row.$id)).toEqual(oldIds);
  const updated = await saveEditorDraft(admin, { ...failed, materials: [] });
  expect(updated.lessonIds).toEqual(Object.fromEntries(oldIds.map((item) => [item, item])));
  expect(stub.dataset.tables.academy_lessons.filter((row) => row.courseId === saved.id)).toHaveLength(48);
  const firstLessonId = oldIds[0];
  stub.dataset.tables.community_comments.push({ $id: 'editor-budget-comment-c1',
    $permissions: ['read("users")'], targetType: 'lesson', targetId: firstLessonId,
    parentId: null, authorId: 'viewer-ana', body: 'Visible comment', status: 'visible',
    createdAt: new Date().toISOString() });
  const overBudget = { ...graph(48), id: saved.id, expectedVersion: 2,
    modules: [{ ...graph(48).modules[0], id: saved.moduleIds['local-module-c1'],
      lessons: graph(48).modules[0].lessons.map((lesson, index) => ({ ...lesson,
        id: saved.lessonIds[lesson.id], videoFileId: index === 0 ? 'new-video-c1' : null })) }] };
  await expect(saveEditorDraft(admin, overBudget)).rejects.toMatchObject({ code: 'invalid' });
  expect(stub.dataset.tables.academy_courses.find((row) => row.$id === saved.id)?.version).toBe(2);
  expect(stub.dataset.tables.academy_lessons.find((row) => row.$id === firstLessonId)?.videoFileId)
    .toBeNull();
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === 'editor-budget-comment-c1')?.$permissions)
    .toEqual(['read("users")']);
});

it('desafio publicado aceita pendente; encerrado e arquivado revogam ACL e recusam resposta', async () => {
  const targetId = 'challenge-reels';
  stub.dataset.tables.challenges.push({ $id: 'challenge-draft-c1', $permissions: [],
    status: 'draft', version: 1, slug: 'draft-c1' });
  await expect(createComment(creator, { targetType: 'challenge', targetId: 'challenge-draft-c1',
    parentId: null, body: 'Comentário no rascunho' })).rejects.toMatchObject({ code: 'missing' });
  await expect(viewerTables.getRow({ databaseId: 'nuy-creators',
    tableId: 'challenges', rowId: 'challenge-draft-c1' })).rejects.toMatchObject({ code: 404 });
  const first = await createComment(creator, { targetType: 'challenge', targetId,
    parentId: null, body: 'Comentário de teste' });
  const visible = { $id: 'challenge-visible-c1', $permissions: ['read("users")'],
    targetType: 'challenge', targetId, parentId: null, authorId: 'viewer-ana',
    body: 'Resposta aprovada', status: 'visible', createdAt: new Date().toISOString() };
  const reply = { ...visible, $id: 'challenge-reply-c1', parentId: visible.$id, authorId: 'viewer-marina' };
  stub.dataset.tables.community_comments.push(visible, reply);
  await expect(viewerTables.getRow({ databaseId: 'nuy-creators', tableId: 'community_comments',
    rowId: visible.$id })).resolves.toMatchObject({ $id: visible.$id });
  const core = { tables: admin.tables as TablesDB, databaseId: admin.databaseId,
    actor: { userId: 'academy-admin', roles: ['admin'] }, now: new Date(),
    correlationId: 'academy-c1-challenge', academyCommentsReady: true } as CoreContext;
  const closed = await closeChallenge(core, { challengeId: targetId, expectedVersion: 1 });
  expect(closed).toEqual({ ok: true, value: expect.anything() });
  for (const commentId of [visible.$id, reply.$id]) {
    expect(stub.dataset.tables.community_comments.find((row) => row.$id === commentId)?.$permissions)
      .not.toContain('read("users")');
    await expect(viewerTables.getRow({ databaseId: 'nuy-creators',
      tableId: 'community_comments', rowId: commentId })).rejects.toMatchObject({ code: 404 });
  }
  await expect(createComment(creator, { targetType: 'challenge', targetId,
    parentId: visible.$id, body: 'Resposta tardia' })).rejects.toMatchObject({ code: 'missing' });
  const archived = await archiveChallenge(core, { challengeId: targetId, expectedVersion: 2 });
  expect(archived.ok).toBe(true);
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId)?.$permissions).toEqual([]);
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === first.$id)?.status)
    .toBe('pending');
  await expect(viewerTables.getRow({ databaseId: 'nuy-creators',
    tableId: 'challenges', rowId: targetId })).rejects.toMatchObject({ code: 404 });
});

it('limite de comentários aborta encerramento e preserva ACL; não Admin é recusado', async () => {
  const targetId = 'challenge-carrossel';
  const core = { tables: admin.tables as TablesDB, databaseId: admin.databaseId,
    actor: { userId: 'academy-admin', roles: ['admin'] }, now: new Date(),
    correlationId: 'academy-c1-limit', academyCommentsReady: true } as CoreContext;
  const forbidden = await archiveChallenge({ ...core, actor: { userId: 'viewer-ana', roles: [] } },
    { challengeId: targetId, expectedVersion: 1 });
  expect(forbidden).toMatchObject({ ok: false, failure: { code: 'forbidden' } });
  for (let index = 0; index < 41; index++)
    stub.dataset.tables.community_comments.push({ $id: `challenge-many-${index}`,
      $permissions: ['read("users")'], targetType: 'challenge', targetId,
      parentId: null, authorId: 'viewer-ana', body: 'Comentário aprovado', status: 'visible',
      createdAt: new Date().toISOString() });
  const result = await closeChallenge(core, { challengeId: targetId, expectedVersion: 1 });
  expect(result).toMatchObject({ ok: false, failure: { code: 'limit_reached' } });
  expect(stub.dataset.tables.challenges.find((row) => row.$id === targetId)?.status)
    .toBe('published');
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === 'challenge-many-0')?.$permissions)
    .toEqual(['read("users")']);
});

it.each([0, 1, 50, 100])('archive with %i comments is atomic and audited', async (count) => {
  const targetId = `challenge-scale-${count}`;
  stub.dataset.tables.challenges.push({ $id: targetId, $permissions: ['read("any")'],
    status: 'published', version: 1, slug: targetId });
  const comments = Array.from({ length: count }, (_, index) => ({
    $id: `${targetId}-${index}`, $permissions: ['read("users")'],
    targetType: 'challenge', targetId,
    parentId: index > 0 && index % 2 ? `${targetId}-${index - 1}` : null,
    authorId: 'viewer-ana', body: 'Visible comment or reply', status: 'visible',
    createdAt: new Date().toISOString(),
  }));
  stub.dataset.tables.community_comments.push(...comments);
  const auditBefore = stub.dataset.tables.audit_logs.length;
  const core = { tables: admin.tables as TablesDB, databaseId: admin.databaseId,
    actor: { userId: 'academy-admin', roles: ['admin'] }, now: new Date(),
    correlationId: `academy-c1-scale-${count}`, academyCommentsReady: true } as CoreContext;
  const result = await archiveChallenge(core, { challengeId: targetId, expectedVersion: 1 });
  const challenge = stub.dataset.tables.challenges.find((row) => row.$id === targetId)!;
  const persisted = stub.dataset.tables.community_comments.filter((row) => row.targetId === targetId);
  expect(persisted).toHaveLength(count);
  if (count <= 40) {
    expect(result.ok).toBe(true);
    expect(challenge).toMatchObject({ status: 'archived', version: 2, $permissions: [] });
    expect(persisted.every((row) => !(row.$permissions as string[]).includes('read("users")'))).toBe(true);
    expect(stub.dataset.tables.audit_logs.length).toBe(auditBefore + 1);
    if (count) await expect(viewerTables.getRow({ databaseId: 'nuy-creators',
      tableId: 'community_comments', rowId: comments[0].$id })).rejects.toMatchObject({ code: 404 });
  } else {
    expect(result).toMatchObject({ ok: false, failure: { code: 'limit_reached' } });
    expect(challenge).toMatchObject({ status: 'published', version: 1, $permissions: ['read("any")'] });
    expect(persisted.every((row) => (row.$permissions as string[]).includes('read("users")'))).toBe(true);
    expect(stub.dataset.tables.audit_logs.length).toBe(auditBefore);
  }
});

it('a reply racing archive remains private after its initial target check', async () => {
  const targetId = 'challenge-reply-race-c1';
  const parentId = 'challenge-reply-race-parent-c1';
  stub.dataset.tables.challenges.push({ $id: targetId, $permissions: ['read("any")'],
    status: 'published', version: 1, slug: targetId });
  stub.dataset.tables.community_comments.push({ $id: parentId,
    $permissions: ['read("users")'], targetType: 'challenge', targetId,
    parentId: null, authorId: 'viewer-marina', body: 'Original comment',
    status: 'visible', createdAt: new Date().toISOString() });
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
  const replyPromise = createComment({ ...creator, tables: wrapped }, {
    targetType: 'challenge', targetId, parentId, body: 'Racing reply' });
  await reached;
  const core = { tables: admin.tables as TablesDB, databaseId: admin.databaseId,
    actor: { userId: 'academy-admin', roles: ['admin'] }, now: new Date(),
    correlationId: 'academy-c1-reply-race', academyCommentsReady: true } as CoreContext;
  const archived = await archiveChallenge(core, { challengeId: targetId, expectedVersion: 1 });
  release();
  expect(archived.ok).toBe(true);
  await expect(replyPromise).rejects.toMatchObject({ code: 'conflict' });
  expect(stub.dataset.tables.community_comments.filter((row) =>
    row.targetId === targetId && row.body === 'Racing reply')).toHaveLength(0);
  await expect(createComment(creator, { targetType: 'challenge', targetId,
    parentId, body: 'Reply after archive' })).rejects.toMatchObject({ code: 'missing' });
});
