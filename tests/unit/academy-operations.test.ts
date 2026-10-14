import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, TablesDB } from 'node-appwrite';
import { startStub } from '../support/appwrite-stub/server.mjs';
import {
  completeLesson, createComment, editComment, moderateComment,
  reportComment, saveEditorDraft, saveLesson, saveMaterial, setCourseStatus,
  type Context,
} from '../../src/features/academy/services/operations';

let stub: Awaited<ReturnType<typeof startStub>>;
let admin: Context;
let creator: Context;
beforeAll(async () => {
  stub = await startStub({ academyFixture: true });
  const tables = new TablesDB(new Client().setEndpoint(stub.endpoint)
    .setProject('nuy-stub').setKey('stub-ops-key').setSelfSigned(true));
  admin = { tables, databaseId: 'nuy-creators', actor: {
    id: 'academy-admin', manage: true, moderate: true } };
  creator = { tables, databaseId: 'nuy-creators', actor: {
    id: 'viewer-ana', manage: false, moderate: false } };
});
afterAll(async () => { await stub.close(); });

it('completa o fluxo local e recusa operações adversas sem tocar no Appwrite remoto', async () => {
  const input = { title: 'Treinamento funcional', slug: 'treinamento-funcional',
    summary: 'Aprender em conjunto', description: 'Percurso de teste',
    categoryId: 'cat-criacao', order: 10,
    modules: [{ id: 'local-module', title: 'Primeiro módulo', summary: '', order: 1,
      lessons: [{ id: 'local-lesson', title: 'Primeira aula', summary: '', order: 1,
        durationSeconds: 120, videoFileId: 'test-video', status: 'draft' as const }] }],
    materials: [] };
  await expect(saveEditorDraft(creator, input)).rejects.toMatchObject({ code: 'forbidden' });
  const created = await saveEditorDraft(admin, input);
  const courseId = created.id;
  const lesson = stub.dataset.tables.academy_lessons.find((row) => row.courseId === courseId)!;
  expect(lesson.title).toBe('Primeira aula');
  expect(created.lessonIds['local-lesson']).toBe(lesson.$id);
  expect(created.moduleIds['local-module']).toBe(lesson.moduleId);
  await expect(saveEditorDraft(admin, { ...input, id: courseId, expectedVersion: 99 }))
    .rejects.toMatchObject({ code: 'conflict' });
  await expect(completeLesson(creator, lesson.$id)).rejects.toMatchObject({ code: 'missing' });
  await expect(setCourseStatus(admin, courseId, 1, 'published'))
    .rejects.toMatchObject({ code: 'invalid' });
  expect(stub.dataset.tables.academy_courses.find((row) => row.$id === courseId)?.status)
    .toBe('draft');
  expect(stub.dataset.tables.academy_lessons.find((row) => row.$id === lesson.$id)?.status)
    .toBe('draft');
  // The stub emulates the separately verified private Storage metadata.
  stub.dataset.tables.academy_media.push({ $id: 'test-video-media', $permissions: [],
    fileId: 'test-video', lessonId: lesson.$id, kind: 'video', status: 'ready',
    mimeType: 'video/mp4', sizeBytes: 1024, createdBy: 'academy-admin',
    createdAt: new Date().toISOString() });
  await saveMaterial(admin, { courseId, lessonId: lesson.$id, expectedCourseVersion: 1,
    title: 'Guia de estudo', kind: 'pdf', fileId: 'test-pdf', url: null, order: 1 });
  await expect(setCourseStatus(admin, courseId, 2, 'published'))
    .rejects.toMatchObject({ code: 'invalid' });
  stub.dataset.tables.academy_media.push({ $id: 'test-pdf-media', $permissions: [],
    fileId: 'test-pdf', lessonId: lesson.$id, kind: 'pdf', status: 'ready',
    mimeType: 'application/pdf', sizeBytes: 512, createdBy: 'academy-admin',
    createdAt: new Date().toISOString() });
  await setCourseStatus(admin, courseId, 2, 'published');
  const first = await completeLesson(creator, lesson.$id);
  const second = await completeLesson(creator, lesson.$id);
  expect(first.$id).toBe(second.$id);
  expect(stub.dataset.tables.academy_progress.filter((row) => row.lessonId === lesson.$id))
    .toHaveLength(1);
  const key = crypto.randomUUID();
  const comment = await createComment(creator, { targetType: 'lesson', targetId: lesson.$id,
    parentId: null, body: 'Gostei muito desta aula.', idempotencyKey: key });
  const retry = await createComment(creator, { targetType: 'lesson', targetId: lesson.$id,
    parentId: null, body: 'Gostei muito desta aula.', idempotencyKey: key });
  expect(retry.$id).toBe(comment.$id);
  expect(comment.status).toBe('pending');
  await expect(moderateComment(creator, { commentId: comment.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' }))
    .rejects.toMatchObject({ code: 'forbidden' });
  await expect(editComment({ ...creator, actor: { ...creator.actor, id: 'viewer-marina' } },
    comment.$id, 'Outro texto')).rejects.toMatchObject({ code: 'forbidden' });
  await moderateComment(admin, { commentId: comment.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' });
  await expect(moderateComment(admin, { commentId: comment.$id,
    expectedStatus: 'pending', to: 'rejected', reason: '' }))
    .rejects.toMatchObject({ code: 'conflict' });
  const reply = await createComment(admin, { targetType: 'lesson', targetId: lesson.$id,
    parentId: comment.$id, body: 'Obrigada por participar!' });
  await moderateComment(admin, { commentId: reply.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' });
  expect(stub.dataset.tables.notifications.some((row) =>
    row.type === 'academy_reply' && row.userId === 'viewer-ana')).toBe(true);
  const report = await reportComment({ ...creator, actor: { ...creator.actor,
    id: 'viewer-marina' } }, { commentId: reply.$id,
    reason: 'Revisar esta resposta da equipe.' });
  expect(report.status).toBe('open');
  const pending = await createComment(creator, { targetType: 'lesson', targetId: lesson.$id,
    parentId: null, body: 'Aguardando nova revisão.' });
  await saveLesson(admin, { id: lesson.$id, courseId,
    moduleId: lesson.moduleId, expectedCourseVersion: 3, title: lesson.title,
    summary: '', order: 1, durationSeconds: 120, videoFileId: 'replacement-video' });
  expect(stub.dataset.tables.academy_lessons.find((row) => row.$id === lesson.$id)?.status)
    .toBe('draft');
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comment.$id)?.$permissions)
    .toEqual(['read("user:viewer-ana")']);
  expect(stub.dataset.tables.academy_materials.find((row) => row.lessonId === lesson.$id)?.$permissions)
    .toEqual([]);
  await expect(moderateComment(admin, { commentId: pending.$id,
    expectedStatus: 'pending', to: 'visible', reason: '' }))
    .rejects.toMatchObject({ code: 'missing' });
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === pending.$id)?.status)
    .toBe('pending');
  await expect(completeLesson(creator, lesson.$id)).rejects.toMatchObject({ code: 'missing' });
  stub.dataset.tables.academy_media.push({ $id: 'replacement-media', $permissions: [],
    fileId: 'replacement-video', lessonId: lesson.$id, kind: 'video', status: 'ready',
    mimeType: 'video/mp4', sizeBytes: 1024, createdBy: 'academy-admin',
    createdAt: new Date().toISOString() });
  await setCourseStatus(admin, courseId, 4, 'published');
  expect(stub.dataset.tables.community_comments.find((row) => row.$id === comment.$id)?.$permissions)
    .toEqual(['read("users")']);
  expect(stub.dataset.tables.academy_materials.find((row) => row.lessonId === lesson.$id)?.$permissions)
    .toEqual(['read("users")']);
  await setCourseStatus(admin, courseId, 5, 'archived');
  await expect(completeLesson(creator, lesson.$id)).rejects.toMatchObject({ code: 'missing' });
  expect(stub.dataset.tables.academy_courses.find((row) => row.$id === courseId)?.$permissions)
    .toEqual([]);
});

it('uma de duas edições concorrentes vence; a outra recebe conflito', async () => {
  const base = { id: 'course-rascunho', expectedVersion: 1,
    title: 'Rascunho concorrente A', slug: 'rascunho-interno',
    summary: 'Conflito de edição', description: '', categoryId: 'cat-criacao',
    order: 3, modules: [], materials: [] };
  const results = await Promise.allSettled([
    saveEditorDraft(admin, base),
    saveEditorDraft(admin, { ...base, title: 'Rascunho concorrente B' }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect(results.find((result) => result.status === 'rejected'))
    .toMatchObject({ reason: { code: 'conflict' } });
});
