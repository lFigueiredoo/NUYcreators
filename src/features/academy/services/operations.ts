import { randomUUID, createHash } from 'node:crypto';
import { Permission, Query, Role, type TablesDB } from 'node-appwrite';
import { z } from 'zod';
import { academyCategorySeeds, planAcademyCategorySeeds } from '../../../../infra/appwrite/academy-seeds';
import { canModerateComment, type AcademyCommentStatus } from '../domain';

/** Pure command layer: the caller supplies the authenticated actor and an isolated TablesDB client. */
export type AcademyStore = Pick<TablesDB,
  'getRow' | 'listRows' | 'createRow' | 'updateRow' | 'createTransaction' |
  'updateTransaction' | 'deleteTransaction'>;
export type Actor = { id: string; manage: boolean; moderate: boolean };
export type Context = { tables: AcademyStore; databaseId: string; actor: Actor };
export type Code = 'invalid' | 'forbidden' | 'missing' | 'conflict' | 'unavailable';
export class AcademyError extends Error {
  constructor(public code: Code, message: string) { super(message); }
}

const id = z.string().min(1).max(36).regex(/^[a-zA-Z0-9._-]+$/);
const slug = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const title = z.string().trim().min(2).max(255);
const optionalText = (max: number) => z.string().trim().max(max);
const position = z.number().int().min(0).max(100000);
const version = z.number().int().positive();
export const courseInput = z.object({
  id: id.optional(), expectedVersion: version.optional(), title, slug,
  summary: optionalText(1000).min(2), description: optionalText(6000),
  categoryId: id, order: position,
});
export const categoryInput = z.object({
  id: id.optional(), name: title, slug, description: optionalText(1000),
  order: position, active: z.boolean(),
});
export const moduleInput = z.object({
  id: id.optional(), courseId: id, expectedCourseVersion: version,
  title, summary: optionalText(1000), order: position,
});
export const lessonInput = z.object({
  id: id.optional(), courseId: id, moduleId: id, expectedCourseVersion: version,
  title, summary: optionalText(2000), order: position,
  durationSeconds: z.number().int().min(0).max(86400).nullable(),
  videoFileId: id.nullable(),
});
export const materialInput = z.object({
  id: id.optional(), courseId: id, lessonId: id, expectedCourseVersion: version,
  title, kind: z.enum(['pdf', 'link']), fileId: id.nullable(),
  url: z.url().max(2048).nullable(), order: position,
});
export const commentInput = z.object({
  targetType: z.enum(['lesson', 'challenge']), targetId: id,
  parentId: id.nullable(), body: z.string().trim().min(2).max(4000),
  idempotencyKey: z.string().uuid().optional(),
});
export const reportInput = z.object({ commentId: id, reason: z.string().trim().min(5).max(1000) });
export const moderationInput = z.object({
  commentId: id, expectedStatus: z.enum(['pending', 'visible', 'hidden', 'rejected']),
  to: z.enum(['visible', 'hidden', 'rejected']), reason: optionalText(1000),
});

const db = (ctx: Context) => ctx.databaseId;
/** Local safety budget, pending measurement of the installed Appwrite transaction limit. */
export const EDITOR_MAX_STAGED_WRITES = 50;
const stagedWrites = new Map<string, number>();
function countWrite(transactionId?: string) {
  if (!transactionId || !stagedWrites.has(transactionId)) return;
  const count = stagedWrites.get(transactionId)! + 1;
  if (count > EDITOR_MAX_STAGED_WRITES)
    throw new AcademyError('invalid', `O editor aceita no máximo ${EDITOR_MAX_STAGED_WRITES} gravações por salvamento. Divida o treinamento.`);
  stagedWrites.set(transactionId, count);
}
const usersRead = [Permission.read(Role.users())];
const ownRead = (userId: string) => [Permission.read(Role.user(userId))];
function requireManage(ctx: Context) {
  if (!ctx.actor.manage) throw new AcademyError('forbidden', 'Permissão de gestão necessária.');
}
function requireModerate(ctx: Context) {
  if (!ctx.actor.moderate) throw new AcademyError('forbidden', 'Permissão de moderação necessária.');
}
function assertEnabled(status: unknown) {
  if (status !== 'published') throw new AcademyError('missing', 'Conteúdo não publicado.');
}
function isAbsent(error: unknown) { return (error as { code?: number }).code === 404; }
function isConflict(error: unknown) { return (error as { code?: number }).code === 409; }
function mapFailure(error: unknown): never {
  if (error instanceof AcademyError) throw error;
  if (isConflict(error)) throw new AcademyError('conflict', 'O registro mudou. Recarregue e tente novamente.');
  if (isAbsent(error)) throw new AcademyError('missing', 'Registro não encontrado.');
  throw new AcademyError('unavailable', 'Operação indisponível. Nenhuma confirmação de gravação.');
}
async function get(ctx: Context, tableId: string, rowId: string, transactionId?: string) {
  try { return await ctx.tables.getRow({ databaseId: db(ctx), tableId, rowId, transactionId }) as Record<string, unknown> & { $id: string }; }
  catch (error) { mapFailure(error); }
}
async function rows(ctx: Context, tableId: string, queries: string[], transactionId?: string) {
  try {
    const result: (Record<string, unknown> & { $id: string })[] = [];
    for (let offset = 0; offset < 5000; offset += 100) {
      const page = await ctx.tables.listRows({ databaseId: db(ctx), tableId,
        queries: [...queries, Query.limit(100), Query.offset(offset)], transactionId });
      result.push(...page.rows as (Record<string, unknown> & { $id: string })[]);
      if (result.length >= page.total) return result;
    }
    throw new AcademyError('unavailable', 'Limite de leitura atingido. Operação recusada.');
  } catch (error) { mapFailure(error); }
}
async function create(ctx: Context, tableId: string, data: Record<string, unknown>,
  permissions: string[], rowId: string = randomUUID(), transactionId?: string) {
  countWrite(transactionId);
  try { return await ctx.tables.createRow({ databaseId: db(ctx), tableId, rowId, data, permissions, transactionId }); }
  catch (error) { mapFailure(error); }
}
async function update(ctx: Context, tableId: string, rowId: string,
  data: Record<string, unknown>, permissions?: string[], transactionId?: string) {
  countWrite(transactionId);
  try { return await ctx.tables.updateRow({ databaseId: db(ctx), tableId, rowId, data, permissions, transactionId }); }
  catch (error) { mapFailure(error); }
}
async function transaction<T>(ctx: Context, run: (transactionId: string) => Promise<T>,
  editorBudget = false): Promise<T> {
  let transactionId: string;
  try { transactionId = (await ctx.tables.createTransaction({ ttl: 120 })).$id; }
  catch (error) { mapFailure(error); }
  if (editorBudget) stagedWrites.set(transactionId, 0);
  try {
    const result = await run(transactionId);
    await ctx.tables.updateTransaction({ transactionId, commit: true });
    return result;
  } catch (error) {
    try { await ctx.tables.updateTransaction({ transactionId, rollback: true }); } catch { /* best effort */ }
    return mapFailure(error);
  } finally {
    stagedWrites.delete(transactionId);
    try { await ctx.tables.deleteTransaction({ transactionId }); } catch { /* TTL cleans up */ }
  }
}
function checkVersion(row: Record<string, unknown>, expected: number) {
  if (row.version !== expected) throw new AcademyError('conflict', 'O curso mudou. Recarregue antes de salvar.');
}
async function category(ctx: Context, categoryId: string, tx?: string) {
  const row = await get(ctx, 'academy_categories', categoryId, tx);
  if (row.active !== true) throw new AcademyError('invalid', 'Categoria inativa.');
}
export async function saveCategory(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = categoryInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Confira os campos da categoria.');
  const input = parsed.data;
  return transaction(ctx, async (tx) => {
    const sameSlug = await rows(ctx, 'academy_categories', [Query.equal('slug', input.slug)], tx);
    if (sameSlug.some((row) => row.$id !== input.id))
      throw new AcademyError('conflict', 'Este slug já está em uso.');
    const data = { name: input.name, slug: input.slug, description: input.description,
      order: input.order, active: input.active };
    if (!input.id) return create(ctx, 'academy_categories', data,
      input.active ? usersRead : [], undefined, tx);
    const current = await get(ctx, 'academy_categories', input.id, tx);
    if (current.slug !== input.slug)
      throw new AcademyError('invalid', 'O slug de uma categoria existente é estável.');
    if (!input.active && current.active === true) {
      const published = await rows(ctx, 'academy_courses', [
        Query.equal('categoryId', input.id), Query.equal('status', 'published'),
      ], tx);
      if (published.length) throw new AcademyError('invalid',
        'Arquive os treinamentos publicados antes de desativar esta categoria.');
    }
    return update(ctx, 'academy_categories', input.id, data,
      input.active ? usersRead : [], tx);
  });
}
/** Prepared for a separately approved run; no route or Action invokes this automatically. */
export async function seedInitialCategories(ctx: Context) {
  requireManage(ctx);
  return transaction(ctx, async (tx) => {
    const existing = await rows(ctx, 'academy_categories', [], tx);
    const plan = planAcademyCategorySeeds(existing.map((row) => ({
      $id: row.$id, slug: String(row.slug),
    })));
    if (plan.conflicts.length)
      throw new AcademyError('conflict', 'IDs ou slugs iniciais conflitam com categorias existentes.');
    for (const seed of plan.pending) {
      await create(ctx, 'academy_categories', { slug: seed.slug, name: seed.name,
        description: '', order: seed.order, active: true }, usersRead, seed.id, tx);
    }
    return { created: plan.pending.length, total: academyCategorySeeds.length };
  });
}
async function lessonInCourse(ctx: Context, lessonId: string, courseId: string, tx: string) {
  const lesson = await get(ctx, 'academy_lessons', lessonId, tx);
  if (lesson.courseId !== courseId) throw new AcademyError('invalid', 'Aula de outro curso.');
  const moduleId = String(lesson.moduleId ?? '');
  if (!moduleId) throw new AcademyError('invalid', 'Aula sem módulo.');
  const module = await get(ctx, 'academy_modules', moduleId, tx);
  if (module.courseId !== courseId) throw new AcademyError('invalid', 'Módulo de outro curso.');
  return lesson;
}
async function course(ctx: Context, courseId: string, tx?: string) {
  return get(ctx, 'academy_courses', courseId, tx);
}
async function editableCourse(ctx: Context, courseId: string, expected: number, tx: string) {
  const row = await course(ctx, courseId, tx);
  checkVersion(row, expected);
  if (row.status === 'archived') throw new AcademyError('invalid', 'Curso arquivado.');
  return row;
}
async function bump(ctx: Context, row: { $id: string; version?: unknown }, tx: string) {
  await update(ctx, 'academy_courses', row.$id, { version: Number(row.version ?? 0) + 1 }, undefined, tx);
}
async function setLessonCommentReads(ctx: Context, lessonId: string, published: boolean, tx: string) {
  const comments = await rows(ctx, 'community_comments', [
    Query.equal('targetType', 'lesson'), Query.equal('targetId', lessonId),
  ], tx);
  for (const comment of comments)
    await update(ctx, 'community_comments', comment.$id, {},
      published && comment.status === 'visible' ? usersRead : ownRead(String(comment.authorId)), tx);
}
async function revokeLessonMaterialReads(ctx: Context, lessonId: string, tx: string) {
  const materials = await rows(ctx, 'academy_materials', [Query.equal('lessonId', lessonId)], tx);
  for (const material of materials)
    await update(ctx, 'academy_materials', material.$id, {}, [], tx);
}

export async function saveCourse(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = courseInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Confira os campos do treinamento.');
  const input = parsed.data;
  if (Boolean(input.id) !== Boolean(input.expectedVersion))
    throw new AcademyError('invalid', 'Versão do treinamento obrigatória para editar.');
  return transaction(ctx, async (tx) => {
    await category(ctx, input.categoryId, tx);
    const searchText = `${input.title} ${input.summary}`;
    const data = { title: input.title, slug: input.slug, summary: input.summary,
      description: input.description, categoryId: input.categoryId, order: input.order, searchText };
    if (!input.id) {
      const same = await rows(ctx, 'academy_courses', [Query.equal('slug', input.slug)], tx);
      if (same.length) throw new AcademyError('conflict', 'Este slug já está em uso.');
      return create(ctx, 'academy_courses', { ...data, status: 'draft', version: 1 }, [], undefined, tx);
    }
    const current = await editableCourse(ctx, input.id, input.expectedVersion!, tx);
    const same = await rows(ctx, 'academy_courses', [Query.equal('slug', input.slug)], tx);
    if (same.some((entry) => entry.$id !== input.id))
      throw new AcademyError('conflict', 'Este slug já está em uso.');
    return update(ctx, 'academy_courses', input.id, { ...data, version: Number(current.version) + 1 }, undefined, tx);
  });
}

const draftModule = z.object({
  id: z.string().max(64), title, summary: optionalText(1000), order: position,
  lessons: z.array(z.object({
    id: z.string().max(64), title, summary: optionalText(2000), order: position,
    durationSeconds: z.number().int().min(0).max(86400).nullable(),
    videoFileId: id.nullable(), status: z.enum(['draft', 'published', 'archived']),
  })).max(100),
});
const draftMaterial = z.object({
  id: z.string().max(64), lessonId: z.string().max(64), title,
  kind: z.enum(['pdf', 'link']), fileId: id.nullable(),
  url: z.url().max(2048).nullable(), order: position,
});
export const editorInput = courseInput.extend({
  modules: z.array(draftModule).max(100), materials: z.array(draftMaterial).max(500),
});

/** Save the current editor graph in one transaction; absent children are preserved. */
export async function saveEditorDraft(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = editorInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Confira os campos do editor.');
  const input = parsed.data;
  if (Boolean(input.id) !== Boolean(input.expectedVersion))
    throw new AcademyError('invalid', 'Versão do curso obrigatória.');
  const allIds = [
    ...input.modules.map((module) => module.id),
    ...input.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    ...input.materials.map((material) => material.id),
  ].filter(Boolean);
  if (new Set(allIds).size !== allIds.length)
    throw new AcademyError('invalid', 'IDs repetidos no editor.');
  const minimumWrites = 1 + input.modules.length +
    input.modules.reduce((total, module) => total + module.lessons.length, 0) + input.materials.length;
  if (minimumWrites > EDITOR_MAX_STAGED_WRITES)
    throw new AcademyError('invalid', `O editor aceita no máximo ${EDITOR_MAX_STAGED_WRITES} gravações por salvamento. Divida o treinamento.`);
  return transaction(ctx, async (tx) => {
    await category(ctx, input.categoryId, tx);
    const same = await rows(ctx, 'academy_courses', [Query.equal('slug', input.slug)], tx);
    if (same.some((row) => row.$id !== input.id))
      throw new AcademyError('conflict', 'Este slug já está em uso.');
    const data = { title: input.title, slug: input.slug, summary: input.summary,
      description: input.description, categoryId: input.categoryId, order: input.order,
      searchText: `${input.title} ${input.summary}` };
    let saved;
    if (input.id) {
      const current = await editableCourse(ctx, input.id, input.expectedVersion!, tx);
      saved = await update(ctx, 'academy_courses', input.id,
        { ...data, version: Number(current.version) + 1 }, undefined, tx);
    } else {
      saved = await create(ctx, 'academy_courses', { ...data, status: 'draft', version: 1 }, [], undefined, tx);
    }
    const courseId = saved.$id;
    const moduleIds = new Map<string, string>();
    for (const module of input.modules) {
      const moduleData = { courseId, title: module.title, summary: module.summary, order: module.order };
      if (module.id.startsWith('local-') || !module.id) {
        const created = await create(ctx, 'academy_modules', moduleData, [], undefined, tx);
        moduleIds.set(module.id, created.$id);
      } else {
        const existing = await get(ctx, 'academy_modules', module.id, tx);
        if (existing.courseId !== courseId) throw new AcademyError('invalid', 'Módulo de outro curso.');
        await update(ctx, 'academy_modules', module.id, moduleData, undefined, tx);
        moduleIds.set(module.id, module.id);
      }
    }
    const lessonIds = new Map<string, string>();
    for (const module of input.modules) {
      for (const lesson of module.lessons) {
        const lessonData = { courseId, moduleId: moduleIds.get(module.id),
          title: lesson.title, summary: lesson.summary, order: lesson.order,
          durationSeconds: lesson.durationSeconds, videoFileId: lesson.videoFileId };
        if (lesson.id.startsWith('local-') || !lesson.id) {
          const created = await create(ctx, 'academy_lessons', { ...lessonData, status: 'draft' }, [], undefined, tx);
          lessonIds.set(lesson.id, created.$id);
        }
        else {
          const existing = await get(ctx, 'academy_lessons', lesson.id, tx);
          if (existing.courseId !== courseId) throw new AcademyError('invalid', 'Aula de outro curso.');
          const changedVideo = existing.videoFileId !== lesson.videoFileId;
          await update(ctx, 'academy_lessons', lesson.id,
            { ...lessonData, ...(changedVideo ? { status: 'draft' } : {}) },
            changedVideo ? [] : undefined, tx);
          if (changedVideo) {
            await setLessonCommentReads(ctx, lesson.id, false, tx);
            await revokeLessonMaterialReads(ctx, lesson.id, tx);
          }
          lessonIds.set(lesson.id, lesson.id);
        }
      }
    }
    const materialIds = new Map<string, string>();
    for (const material of input.materials) {
      const lessonId = lessonIds.get(material.lessonId);
      if (!lessonId) throw new AcademyError('invalid', 'Material sem aula vinculada.');
      if ((material.kind === 'pdf' && (!material.fileId || material.url)) ||
        (material.kind === 'link' && (!material.url || material.fileId ||
          new URL(material.url).protocol !== 'https:')))
        throw new AcademyError('invalid', 'Material precisa de PDF privado ou link HTTPS.');
      const materialData = { courseId, lessonId, title: material.title, kind: material.kind,
        fileId: material.fileId, url: material.url, order: material.order };
      if (material.id.startsWith('local-') || !material.id) {
        const created = await create(ctx, 'academy_materials', materialData, [], undefined, tx);
        materialIds.set(material.id, created.$id);
      }
      else {
        const existing = await get(ctx, 'academy_materials', material.id, tx);
        if (existing.courseId !== courseId) throw new AcademyError('invalid', 'Material de outro curso.');
        const linkedLesson = await lessonInCourse(ctx, lessonId, courseId, tx);
        await update(ctx, 'academy_materials', material.id, materialData,
          existing.fileId !== material.fileId || existing.lessonId !== lessonId ||
          saved.status !== 'published' || linkedLesson.status !== 'published' ? [] : undefined, tx);
        materialIds.set(material.id, material.id);
      }
    }
    return { id: courseId, version: Number(saved.version),
      moduleIds: Object.fromEntries(moduleIds), lessonIds: Object.fromEntries(lessonIds),
      materialIds: Object.fromEntries(materialIds) };
  }, true);
}

export async function saveModule(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = moduleInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Dados do módulo inválidos.');
  const input = parsed.data;
  return transaction(ctx, async (tx) => {
    const parent = await editableCourse(ctx, input.courseId, input.expectedCourseVersion, tx);
    const data = { courseId: input.courseId, title: input.title, summary: input.summary, order: input.order };
    let saved;
    if (input.id) {
      const existing = await get(ctx, 'academy_modules', input.id, tx);
      if (existing.courseId !== input.courseId) throw new AcademyError('invalid', 'Módulo de outro curso.');
      saved = await update(ctx, 'academy_modules', input.id, data, undefined, tx);
    } else saved = await create(ctx, 'academy_modules', data, [], undefined, tx);
    await bump(ctx, parent, tx);
    return saved;
  });
}

export async function saveLesson(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = lessonInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Dados da aula inválidos.');
  const input = parsed.data;
  return transaction(ctx, async (tx) => {
    const parent = await editableCourse(ctx, input.courseId, input.expectedCourseVersion, tx);
    const module = await get(ctx, 'academy_modules', input.moduleId, tx);
    if (module.courseId !== input.courseId) throw new AcademyError('invalid', 'Módulo de outro curso.');
    const data = { courseId: input.courseId, moduleId: input.moduleId,
      title: input.title, summary: input.summary, order: input.order,
      durationSeconds: input.durationSeconds, videoFileId: input.videoFileId };
    let saved;
    if (input.id) {
      const existing = await get(ctx, 'academy_lessons', input.id, tx);
      if (existing.courseId !== input.courseId) throw new AcademyError('invalid', 'Aula de outro curso.');
      const changedVideo = existing.videoFileId !== input.videoFileId;
      saved = await update(ctx, 'academy_lessons', input.id,
        { ...data, ...(changedVideo ? { status: 'draft' } : {}) }, changedVideo ? [] : undefined, tx);
      if (changedVideo) {
        await setLessonCommentReads(ctx, input.id, false, tx);
        await revokeLessonMaterialReads(ctx, input.id, tx);
      }
    } else saved = await create(ctx, 'academy_lessons', { ...data, status: 'draft' }, [], undefined, tx);
    await bump(ctx, parent, tx);
    return saved;
  });
}

export async function saveMaterial(ctx: Context, raw: unknown) {
  requireManage(ctx);
  const parsed = materialInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Dados do material inválidos.');
  const input = parsed.data;
  if ((input.kind === 'pdf' && (!input.fileId || input.url)) ||
      (input.kind === 'link' && (!input.url || input.fileId)))
    throw new AcademyError('invalid', 'Informe um PDF privado ou um link válido.');
  if (input.kind === 'link' && new URL(input.url!).protocol !== 'https:')
    throw new AcademyError('invalid', 'Links precisam usar HTTPS.');
  return transaction(ctx, async (tx) => {
    const parent = await editableCourse(ctx, input.courseId, input.expectedCourseVersion, tx);
    const lesson = await lessonInCourse(ctx, input.lessonId, input.courseId, tx);
    const data = { courseId: input.courseId, lessonId: input.lessonId, title: input.title,
      kind: input.kind, fileId: input.fileId, url: input.url, order: input.order };
    let saved;
    if (input.id) {
      const existing = await get(ctx, 'academy_materials', input.id, tx);
      if (existing.courseId !== input.courseId) throw new AcademyError('invalid', 'Material de outro curso.');
      saved = await update(ctx, 'academy_materials', input.id, data,
        existing.fileId !== input.fileId || existing.lessonId !== input.lessonId ||
        parent.status !== 'published' || lesson.status !== 'published' ? [] : undefined, tx);
    } else saved = await create(ctx, 'academy_materials', data, [], undefined, tx);
    await bump(ctx, parent, tx);
    return saved;
  });
}

export async function setCourseStatus(ctx: Context, courseId: string, expectedVersion: number,
  status: 'published' | 'archived') {
  requireManage(ctx);
  id.parse(courseId); version.parse(expectedVersion);
  return transaction(ctx, async (tx) => {
    const current = await course(ctx, courseId, tx);
    checkVersion(current, expectedVersion);
    if (status === 'published') {
      if (current.status !== 'draft' && current.status !== 'published')
        throw new AcademyError('invalid', 'Curso arquivado não pode ser publicado.');
      if (!current.title || !current.summary || !current.categoryId)
        throw new AcademyError('invalid', 'Curso incompleto.');
      await category(ctx, String(current.categoryId), tx);
      const modules = await rows(ctx, 'academy_modules', [Query.equal('courseId', courseId)], tx);
      const lessons = await rows(ctx, 'academy_lessons', [Query.equal('courseId', courseId)], tx);
      if (!modules.length || !lessons.length || lessons.some((entry) => !entry.title ||
        !entry.videoFileId || !modules.some((module) =>
          module.$id === entry.moduleId && module.courseId === courseId)))
        throw new AcademyError('invalid', 'Publique apenas com módulos e aulas completas, com vídeo validado.');
      // The media registry is private; an unverified file ID must never make a course public.
      for (const lesson of lessons) {
        const media = await rows(ctx, 'academy_media', [Query.equal('fileId', String(lesson.videoFileId))], tx);
        if (media.length !== 1 || media[0].kind !== 'video' || media[0].status !== 'ready' ||
          media[0].lessonId !== lesson.$id)
          throw new AcademyError('invalid', 'Vídeo sem homologação privada.');
      }
      for (const lesson of lessons) {
        await update(ctx, 'academy_lessons', lesson.$id, { status: 'published', publishedAt: new Date().toISOString() }, usersRead, tx);
        await setLessonCommentReads(ctx, lesson.$id, true, tx);
      }
      for (const module of modules)
        await update(ctx, 'academy_modules', module.$id, {}, usersRead, tx);
      const materials = await rows(ctx, 'academy_materials', [Query.equal('courseId', courseId)], tx);
      for (const material of materials) {
        if (!material.lessonId || !lessons.some((lesson) => lesson.$id === material.lessonId &&
          lesson.courseId === courseId && modules.some((module) =>
            module.$id === lesson.moduleId && module.courseId === courseId)))
          throw new AcademyError('invalid', 'Material sem aula e módulo válidos no curso.');
        if (material.kind === 'pdf') {
          if (!material.fileId || material.url)
            throw new AcademyError('invalid', 'PDF sem arquivo privado válido.');
          const media = await rows(ctx, 'academy_media', [Query.equal('fileId', String(material.fileId))], tx);
          if (media.length !== 1 || media[0].kind !== 'pdf' || media[0].status !== 'ready' ||
            media[0].lessonId !== material.lessonId)
            throw new AcademyError('invalid', 'PDF sem homologação privada.');
        } else if (material.kind === 'link') {
          if (material.fileId || typeof material.url !== 'string' ||
            !z.url().safeParse(material.url).success || new URL(material.url).protocol !== 'https:')
            throw new AcademyError('invalid', 'Link de material precisa usar HTTPS.');
        } else {
          throw new AcademyError('invalid', 'Tipo de material desconhecido.');
        }
        await update(ctx, 'academy_materials', material.$id, {}, usersRead, tx);
      }
    } else {
      if (current.status === 'archived') return current;
      const lessons = await rows(ctx, 'academy_lessons', [Query.equal('courseId', courseId)], tx);
      const children = [
        ['academy_modules', await rows(ctx, 'academy_modules', [Query.equal('courseId', courseId)], tx)],
        ['academy_lessons', lessons],
        ['academy_materials', await rows(ctx, 'academy_materials', [Query.equal('courseId', courseId)], tx)],
      ] as const;
      for (const [table, entries] of children)
        for (const entry of entries) await update(ctx, table, entry.$id, {}, [], tx);
      for (const lesson of lessons) await setLessonCommentReads(ctx, lesson.$id, false, tx);
    }
    return update(ctx, 'academy_courses', courseId,
      { status, version: Number(current.version) + 1,
        ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}) },
      status === 'published' ? usersRead : [], tx);
  });
}

async function publishedTarget(ctx: Context, type: 'lesson' | 'challenge', targetId: string, tx?: string) {
  if (type === 'lesson') {
    const lesson = await get(ctx, 'academy_lessons', targetId, tx);
    assertEnabled(lesson.status);
    const parent = await course(ctx, String(lesson.courseId), tx);
    assertEnabled(parent.status);
  } else {
    const challenge = await get(ctx, 'challenges', targetId, tx);
    assertEnabled(challenge.status);
  }
}
/** A neutral same-value write detects conflicts without restoring an archived status. */
async function touchPublishedChallenge(ctx: Context, challengeId: string, tx: string) {
  const challenge = await get(ctx, 'challenges', challengeId, tx);
  await update(ctx, 'challenges', challengeId,
    { participantCount: Number(challenge.participantCount) }, undefined, tx);
  await publishedTarget(ctx, 'challenge', challengeId);
}
export async function completeLesson(ctx: Context, lessonId: string) {
  id.parse(lessonId);
  await publishedTarget(ctx, 'lesson', lessonId);
  const lesson = await get(ctx, 'academy_lessons', lessonId);
  const rowId = createHash('sha256').update(`${ctx.actor.id}:${lessonId}`).digest('hex').slice(0, 36);
  try {
    return await create(ctx, 'academy_progress', { userId: ctx.actor.id,
      courseId: lesson.courseId, lessonId, completedAt: new Date().toISOString() },
      ownRead(ctx.actor.id), rowId);
  } catch (error) {
    if (error instanceof AcademyError && error.code === 'conflict')
      return get(ctx, 'academy_progress', rowId);
    throw error;
  }
}
export async function createComment(ctx: Context, raw: unknown) {
  const parsed = commentInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Comentário inválido.');
  const input = parsed.data;
  const { idempotencyKey, ...content } = input;
  const rowId = idempotencyKey ? createHash('sha256').update(`${ctx.actor.id}:${idempotencyKey}`)
    .digest('hex').slice(0, 36) : randomUUID();
  const write = async (tx?: string) => {
    await publishedTarget(ctx, input.targetType, input.targetId, tx);
    if (input.parentId) {
      const parent = await get(ctx, 'community_comments', input.parentId, tx);
      if (parent.targetType !== input.targetType || parent.targetId !== input.targetId ||
          parent.status !== 'visible')
        throw new AcademyError('invalid', 'Resposta sem comentário visível.');
    }
    if (input.targetType === 'challenge' && tx)
      // Stage a write on the same row as archive so one concurrent commit loses.
      await touchPublishedChallenge(ctx, input.targetId, tx);
    return create(ctx, 'community_comments', { ...content, authorId: ctx.actor.id,
      status: 'pending', createdAt: new Date().toISOString() }, ownRead(ctx.actor.id), rowId, tx);
  };
  try {
    return input.targetType === 'challenge' ? await transaction(ctx, write) : await write();
  } catch (error) {
    if (error instanceof AcademyError && error.code === 'conflict') {
      try {
        const existing = await get(ctx, 'community_comments', rowId);
        if (existing.authorId === ctx.actor.id && existing.targetType === input.targetType &&
          existing.targetId === input.targetId && existing.parentId === input.parentId &&
          existing.body === input.body) return existing;
      } catch (lookupError) {
        if (!(lookupError instanceof AcademyError && lookupError.code === 'missing'))
          throw lookupError;
      }
    }
    throw error;
  }
}
export async function editComment(ctx: Context, commentId: string, body: string) {
  id.parse(commentId);
  const valid = z.string().trim().min(2).max(4000).safeParse(body);
  if (!valid.success) throw new AcademyError('invalid', 'Comentário inválido.');
  return transaction(ctx, async (tx) => {
    const current = await get(ctx, 'community_comments', commentId, tx);
    if (current.authorId !== ctx.actor.id) throw new AcademyError('forbidden', 'Comentário de outra pessoa.');
    if (!['pending', 'visible', 'hidden'].includes(String(current.status)))
      throw new AcademyError('invalid', 'Comentário não editável.');
    if (current.targetType === 'challenge') {
      await publishedTarget(ctx, 'challenge', String(current.targetId), tx);
      await touchPublishedChallenge(ctx, String(current.targetId), tx);
    }
    return update(ctx, 'community_comments', commentId,
      { body: valid.data, status: 'pending', editedAt: new Date().toISOString() },
      ownRead(ctx.actor.id), tx);
  });
}
export async function hideOwnComment(ctx: Context, commentId: string) {
  id.parse(commentId);
  return transaction(ctx, async (tx) => {
    const current = await get(ctx, 'community_comments', commentId, tx);
    if (current.authorId !== ctx.actor.id) throw new AcademyError('forbidden', 'Comentário de outra pessoa.');
    if (!['pending', 'visible'].includes(String(current.status)))
      throw new AcademyError('invalid', 'Comentário não ocultável.');
    if (current.targetType === 'challenge') {
      await publishedTarget(ctx, 'challenge', String(current.targetId), tx);
      await touchPublishedChallenge(ctx, String(current.targetId), tx);
    }
    return update(ctx, 'community_comments', commentId, { status: 'hidden',
      moderatedAt: new Date().toISOString(), moderationReason: 'Ocultado pela autora' },
      ownRead(ctx.actor.id), tx);
  });
}
export async function reportComment(ctx: Context, raw: unknown) {
  const parsed = reportInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Denúncia inválida.');
  const input = parsed.data;
  const comment = await get(ctx, 'community_comments', input.commentId);
  if (comment.status !== 'visible' || comment.authorId === ctx.actor.id)
    throw new AcademyError('invalid', 'Comentário não denunciável.');
  if (comment.targetType !== 'lesson' && comment.targetType !== 'challenge')
    throw new AcademyError('invalid', 'Alvo desconhecido.');
  await publishedTarget(ctx, comment.targetType, String(comment.targetId));
  const rowId = createHash('sha256').update(`${ctx.actor.id}:${input.commentId}`).digest('hex').slice(0, 36);
  try { return await create(ctx, 'community_reports', { commentId: input.commentId,
    reporterId: ctx.actor.id, reason: input.reason, status: 'open' }, ownRead(ctx.actor.id), rowId); }
  catch (error) {
    if (error instanceof AcademyError && error.code === 'conflict')
      return get(ctx, 'community_reports', rowId);
    throw error;
  }
}
export async function moderateComment(ctx: Context, raw: unknown) {
  requireModerate(ctx);
  const parsed = moderationInput.safeParse(raw);
  if (!parsed.success) throw new AcademyError('invalid', 'Moderação inválida.');
  const input = parsed.data;
  return transaction(ctx, async (tx) => {
    const current = await get(ctx, 'community_comments', input.commentId, tx);
    if (current.status !== input.expectedStatus)
      throw new AcademyError('conflict', 'O comentário mudou. Recarregue a fila.');
    if (!canModerateComment(current.status as AcademyCommentStatus, input.to))
      throw new AcademyError('invalid', 'Transição de moderação inválida.');
    if (input.to === 'visible') {
      if (current.targetType !== 'lesson' && current.targetType !== 'challenge')
        throw new AcademyError('invalid', 'Alvo desconhecido.');
      await publishedTarget(ctx, current.targetType, String(current.targetId), tx);
      if (current.targetType === 'challenge')
        await touchPublishedChallenge(ctx, String(current.targetId), tx);
    }
    const now = new Date().toISOString();
    const updated = await update(ctx, 'community_comments', input.commentId, {
      status: input.to, moderatedBy: ctx.actor.id, moderatedAt: now,
      moderationReason: input.reason },
      input.to === 'visible' && current.targetType === 'lesson'
        ? usersRead : ownRead(String(current.authorId)), tx);
    await create(ctx, 'community_moderation_events', { commentId: input.commentId,
      actorId: ctx.actor.id, fromStatus: current.status, toStatus: input.to,
      reason: input.reason, createdAt: now }, [], undefined, tx);
    if (input.to === 'visible' && current.parentId) {
      const parent = await get(ctx, 'community_comments', String(current.parentId), tx);
      if (parent.status !== 'visible' || parent.targetType !== current.targetType ||
        parent.targetId !== current.targetId)
        throw new AcademyError('invalid', 'Conversa de origem indisponível.');
      if (parent.authorId !== current.authorId) {
        const eventKey = `academy-reply-${input.commentId}`;
        await create(ctx, 'notifications', { userId: parent.authorId, type: 'academy_reply',
          title: 'Nova resposta na Academia NUY', body: 'Sua conversa recebeu uma resposta.',
          referenceId: input.commentId, readAt: null, eventKey },
          ownRead(String(parent.authorId)), createHash('sha256').update(eventKey).digest('hex').slice(0, 36), tx);
      }
    }
    return updated;
  });
}
export async function staffReply(ctx: Context, targetType: 'lesson' | 'challenge',
  targetId: string, parentId: string, body: string, idempotencyKey: string) {
  requireModerate(ctx);
  // Team replies still enter the moderation queue before becoming visible.
  return createComment(ctx, { targetType, targetId, parentId, body, idempotencyKey });
}
