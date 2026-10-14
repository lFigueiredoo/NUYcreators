import 'server-only';
import { Query } from 'node-appwrite';
import {
  countTableRows,
  databaseId,
  getTableRow,
  listTableRows,
  opsTables,
  sessionTables,
  type Tables,
} from '@/lib/appwrite/data';
import {
  academyEnabled,
  type AcademyCategory,
  type AcademyComment,
  type AcademyCourse,
  type AcademyLesson,
  type AcademyLoad,
  type AcademyModerationComment,
  type AcademyMaterial,
  type AcademyModule,
  type AcademyPage,
  type AcademyProgress,
  type AcademyProgressSummary,
  type AcademyReport,
} from '../domain';

type Row = Record<string, unknown>;
const string = (value: unknown) => (typeof value === 'string' ? value : '');
const optional = (value: unknown) => string(value) || null;
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const courseStatus = (value: unknown): AcademyCourse['status'] =>
  value === 'published' || value === 'archived' ? value : 'draft';
const commentStatus = (value: unknown): AcademyComment['status'] =>
  value === 'pending' || value === 'visible' || value === 'hidden' || value === 'rejected'
    ? value
    : 'unknown';

export const mapCategory = (row: Row): AcademyCategory => ({
  id: string(row.$id),
  name: string(row.name),
  slug: string(row.slug),
});
export const mapCourse = (row: Row): AcademyCourse => ({
  id: string(row.$id),
  slug: string(row.slug),
  title: string(row.title),
  summary: string(row.summary),
  description: string(row.description),
  categoryId: optional(row.categoryId),
  coverFileId: optional(row.coverFileId),
  authorizedCoverUrl: null,
  status: courseStatus(row.status),
  order: number(row.order),
});
export const mapModule = (row: Row): AcademyModule => ({
  id: string(row.$id),
  courseId: string(row.courseId),
  title: string(row.title),
  summary: string(row.summary),
  order: number(row.order),
});
export const mapLesson = (row: Row): AcademyLesson => ({
  id: string(row.$id),
  courseId: string(row.courseId),
  moduleId: string(row.moduleId),
  title: string(row.title),
  summary: string(row.summary),
  durationSeconds: typeof row.durationSeconds === 'number' ? row.durationSeconds : null,
  videoFileId: optional(row.videoFileId),
  status: courseStatus(row.status),
  order: number(row.order),
});
export const mapMaterial = (row: Row): AcademyMaterial => ({
  id: string(row.$id),
  courseId: string(row.courseId),
  lessonId: optional(row.lessonId),
  title: string(row.title),
  kind: row.kind === 'link' ? 'link' : 'pdf',
  fileId: optional(row.fileId),
  url: optional(row.url),
  order: number(row.order),
});
export const mapComment = (row: Row): AcademyComment => ({
  id: string(row.$id),
  targetType:
    row.targetType === 'lesson' || row.targetType === 'challenge' ? row.targetType : 'unknown',
  targetId: string(row.targetId),
  parentId: optional(row.parentId),
  authorId: string(row.authorId),
  body: string(row.body),
  status: commentStatus(row.status),
  createdAt: string(row.createdAt),
});
export const mapReport = (row: Row): AcademyReport => ({
  id: string(row.$id),
  commentId: string(row.commentId),
  reporterId: string(row.reporterId),
  reason: string(row.reason),
  status: string(row.status),
});
export const mapProgress = (row: Row): AcademyProgress => ({
  userId: string(row.userId),
  courseId: string(row.courseId),
  lessonId: string(row.lessonId),
  completedAt: string(row.completedAt),
});

const CATALOG_PAGE_SIZE = 24;
const BATCH_SIZE = 100;
const MAX_DETAIL_ROWS = 5000;

async function read<T>(
  client: () => Tables,
  tableId: string,
  map: (row: Row) => T,
  queries: string[] = [],
  limit = BATCH_SIZE,
  offset = 0,
): Promise<AcademyPage<T>> {
  const page = Math.floor(offset / limit) + 1;
  if (!academyEnabled()) return { state: 'pending', items: [], page, hasNext: false };
  try {
    const result = await listTableRows(client(), {
      databaseId: databaseId(),
      tableId,
      queries: [...queries, Query.limit(limit), Query.offset(offset)],
    });
    return {
      state: 'ok',
      items: result.rows.map((row) => map(row as Row)),
      page,
      hasNext: offset + result.rows.length < result.total,
    };
  } catch {
    return { state: 'unavailable', items: [], page, hasNext: false };
  }
}

async function readAll<T>(
  client: () => Tables,
  tableId: string,
  map: (row: Row) => T,
  queries: string[] = [],
): Promise<AcademyLoad<T>> {
  const items: T[] = [];
  for (let offset = 0; offset < MAX_DETAIL_ROWS; offset += BATCH_SIZE) {
    const batch = await read(client, tableId, map, queries, BATCH_SIZE, offset);
    if (batch.state !== 'ok') return { state: batch.state, items: [] };
    items.push(...batch.items);
    if (!batch.hasNext) return { state: 'ok', items };
  }
  // Não entregar um conjunto truncado como se fosse completo.
  return { state: 'unavailable', items: [] };
}

async function readById<T>(
  client: () => Tables,
  tableId: string,
  id: string,
  map: (row: Row) => T,
) {
  if (!academyEnabled()) return { state: 'pending', items: [] } as AcademyLoad<T>;
  try {
    const row = await getTableRow(client(), { databaseId: databaseId(), tableId, rowId: id });
    return { state: 'ok', items: [map(row)] } as AcademyLoad<T>;
  } catch (error) {
    if ((error as { type?: string }).type === 'row_not_found')
      return { state: 'ok', items: [] } as AcademyLoad<T>;
    return { state: 'unavailable', items: [] } as AcademyLoad<T>;
  }
}

function fromSession<T>(
  secret: string,
  tableId: string,
  map: (row: Row) => T,
  queries: string[] = [],
  limit = BATCH_SIZE,
  offset = 0,
) {
  return read(() => sessionTables(secret), tableId, map, queries, limit, offset);
}
function fromAdmin<T>(
  tableId: string,
  map: (row: Row) => T,
  queries: string[] = [],
  limit = BATCH_SIZE,
  offset = 0,
) {
  return read(() => opsTables(), tableId, map, queries, limit, offset);
}
function fromSessionAll<T>(
  secret: string,
  tableId: string,
  map: (row: Row) => T,
  queries: string[],
) {
  return readAll(() => sessionTables(secret), tableId, map, queries);
}
function fromAdminAll<T>(tableId: string, map: (row: Row) => T, queries: string[]) {
  return readAll(() => opsTables(), tableId, map, queries);
}

export async function creatorAcademyCatalog(
  secret: string,
  {
    search = '',
    category = '',
    page = 1,
  }: { search?: string; category?: string; page?: number } = {},
) {
  const filters = [Query.equal('status', 'published')];
  if (category) filters.push(Query.equal('categoryId', category));
  if (search.trim().length >= 3) filters.push(Query.search('searchText', search.trim()));
  const [courses, categories] = await Promise.all([
    fromSession(
      secret,
      'academy_courses',
      mapCourse,
      [...filters, Query.orderAsc('order'), Query.orderAsc('slug')],
      CATALOG_PAGE_SIZE,
      (page - 1) * CATALOG_PAGE_SIZE,
    ),
    fromSessionAll(secret, 'academy_categories', mapCategory, [
      Query.equal('active', true),
      Query.orderAsc('order'),
      Query.orderAsc('slug'),
    ]),
  ]);
  return { courses, categories };
}

export async function creatorAcademyCourse(secret: string, slug: string) {
  const found = await fromSession(
    secret,
    'academy_courses',
    mapCourse,
    [Query.equal('slug', slug), Query.equal('status', 'published')],
    1,
  );
  const course = found.items[0] ?? null;
  if (!course)
    return {
      courseState: found.state,
      course,
      modules: { state: found.state, items: [] } as AcademyLoad<AcademyModule>,
      lessons: { state: found.state, items: [] } as AcademyLoad<AcademyLesson>,
      materials: { state: found.state, items: [] } as AcademyLoad<AcademyMaterial>,
    };
  const [modules, lessons, materials] = await Promise.all([
    fromSessionAll(secret, 'academy_modules', mapModule, [
      Query.equal('courseId', course.id),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
    fromSessionAll(secret, 'academy_lessons', mapLesson, [
      Query.equal('courseId', course.id),
      Query.equal('status', 'published'),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
    fromSessionAll(secret, 'academy_materials', mapMaterial, [
      Query.equal('courseId', course.id),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
  ]);
  return { courseState: found.state, course, modules, lessons, materials };
}

export function lessonComments(secret: string, lessonId: string) {
  return fromSessionAll(secret, 'community_comments', mapComment, [
    Query.equal('targetType', 'lesson'),
    Query.equal('targetId', lessonId),
    Query.equal('status', 'visible'),
    Query.orderAsc('createdAt'),
    Query.orderAsc('$id'),
  ]);
}

export function challengeComments(secret: string, challengeId: string) {
  return fromSessionAll(secret, 'community_comments', mapComment, [
    Query.equal('targetType', 'challenge'),
    Query.equal('targetId', challengeId),
    Query.equal('status', 'visible'),
    Query.orderAsc('createdAt'),
    Query.orderAsc('$id'),
  ]);
}

export function adminAcademyCatalog(page = 1) {
  return fromAdmin(
    'academy_courses',
    mapCourse,
    [Query.orderAsc('order'), Query.orderAsc('slug')],
    CATALOG_PAGE_SIZE,
    (page - 1) * CATALOG_PAGE_SIZE,
  );
}

export async function adminAcademyCourse(id: string) {
  const found = await readById(() => opsTables(), 'academy_courses', id, mapCourse);
  const course = found.items[0] ?? null;
  if (!course)
    return {
      course,
      courseState: found.state,
      modules: { state: found.state, items: [] } as AcademyLoad<AcademyModule>,
      lessons: { state: found.state, items: [] } as AcademyLoad<AcademyLesson>,
      materials: { state: found.state, items: [] } as AcademyLoad<AcademyMaterial>,
    };
  const [modules, lessons, materials] = await Promise.all([
    fromAdminAll('academy_modules', mapModule, [
      Query.equal('courseId', id),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
    fromAdminAll('academy_lessons', mapLesson, [
      Query.equal('courseId', id),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
    fromAdminAll('academy_materials', mapMaterial, [
      Query.equal('courseId', id),
      Query.orderAsc('order'),
      Query.orderAsc('$id'),
    ]),
  ]);
  return { course, courseState: found.state, modules, lessons, materials };
}

export function adminAcademyCategories() {
  return fromAdminAll('academy_categories', mapCategory, [
    Query.orderAsc('order'),
    Query.orderAsc('slug'),
  ]);
}

export async function adminAcademyComments(
  page = 1,
): Promise<AcademyPage<AcademyModerationComment>> {
  const comments = await fromAdmin(
    'community_comments',
    mapComment,
    [Query.orderDesc('createdAt'), Query.orderAsc('$id')],
    CATALOG_PAGE_SIZE,
    (page - 1) * CATALOG_PAGE_SIZE,
  );
  if (comments.state !== 'ok' || !comments.items.length) return { ...comments, items: [] };
  const authorIds = [...new Set(comments.items.map((item) => item.authorId))];
  const lessonIds = [
    ...new Set(
      comments.items.filter((item) => item.targetType === 'lesson').map((item) => item.targetId),
    ),
  ];
  const challengeIds = [
    ...new Set(
      comments.items.filter((item) => item.targetType === 'challenge').map((item) => item.targetId),
    ),
  ];
  const [authors, lessons, challenges] = await Promise.all([
    fromAdmin(
      'public_creator_profiles',
      (row) => ({ userId: string(row.userId), name: string(row.displayName) }),
      [Query.equal('userId', authorIds)],
      BATCH_SIZE,
    ),
    lessonIds.length
      ? fromAdmin(
          'academy_lessons',
          (row) => ({ id: string(row.$id), title: string(row.title) }),
          [Query.equal('$id', lessonIds)],
          BATCH_SIZE,
        )
      : Promise.resolve({ state: 'ok', items: [] } as AcademyLoad<{ id: string; title: string }>),
    challengeIds.length
      ? fromAdmin(
          'challenges',
          (row) => ({ id: string(row.$id), title: string(row.name) }),
          [Query.equal('$id', challengeIds)],
          BATCH_SIZE,
        )
      : Promise.resolve({ state: 'ok', items: [] } as AcademyLoad<{ id: string; title: string }>),
  ]);
  if ([authors, lessons, challenges].some((result) => result.state !== 'ok')) {
    return { ...comments, state: 'unavailable', items: [] };
  }
  const authorNames = new Map(authors.items.map((item) => [item.userId, item.name]));
  const targetNames = new Map(
    [...lessons.items, ...challenges.items].map((item) => [item.id, item.title]),
  );
  return {
    ...comments,
    items: comments.items.map((item) => ({
      ...item,
      authorName: authorNames.get(item.authorId) || 'Creator NUY',
      targetTitle:
        targetNames.get(item.targetId) ||
        (item.targetType === 'lesson'
          ? 'Aula indisponível'
          : item.targetType === 'challenge'
            ? 'Desafio indisponível'
            : 'Alvo desconhecido'),
    })),
  };
}

export function adminAcademyReports() {
  return fromAdminAll('community_reports', mapReport, [
    Query.orderAsc('status'),
    Query.orderAsc('$id'),
  ]);
}

export async function adminAcademyProgressSummary(
  courseId?: string,
): Promise<AcademyLoad<AcademyProgressSummary>> {
  if (!academyEnabled()) return { state: 'pending', items: [] };
  try {
    const completedLessons = await countTableRows(opsTables(), {
      databaseId: databaseId(),
      tableId: 'academy_progress',
      queries: courseId ? [Query.equal('courseId', courseId)] : [],
    });
    return { state: 'ok', items: [{ completedLessons }] };
  } catch {
    return { state: 'unavailable', items: [] };
  }
}
