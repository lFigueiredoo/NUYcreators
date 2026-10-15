export type AcademyCategory = { id: string; name: string; slug: string;
  description: string; order: number; active: boolean };
export type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  categoryId: string | null;
  coverFileId: string | null;
  /** Somente uma URL emitida após autorização da sessão pode preencher este campo. */
  authorizedCoverUrl: string | null;
  status: 'draft' | 'published' | 'archived';
  order: number;
  version: number;
};
export type AcademyModule = {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  order: number;
};
export type AcademyLesson = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  summary: string;
  durationSeconds: number | null;
  videoFileId: string | null;
  status: 'draft' | 'published' | 'archived';
  order: number;
};
export type AcademyMaterial = {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  kind: 'pdf' | 'link';
  fileId: string | null;
  url: string | null;
  order: number;
};
export type AcademyComment = {
  id: string;
  targetType: 'lesson' | 'challenge' | 'unknown';
  targetId: string;
  parentId: string | null;
  authorId: string;
  body: string;
  status: AcademyCommentStatus;
  createdAt: string;
};
export type AcademyCommentStatus = 'pending' | 'visible' | 'hidden' | 'rejected' | 'unknown';
export const academyModerationTransitions: Record<
  AcademyCommentStatus,
  readonly AcademyCommentStatus[]
> = {
  pending: ['visible', 'rejected'],
  visible: ['hidden'],
  hidden: ['visible', 'rejected'],
  rejected: [],
  unknown: [],
};
export function canModerateComment(from: AcademyCommentStatus, to: AcademyCommentStatus) {
  return academyModerationTransitions[from].includes(to);
}
export type AcademyModerationComment = AcademyComment & {
  authorName: string;
  targetTitle: string;
};
export type AcademyReport = {
  id: string;
  commentId: string;
  reporterId: string;
  reason: string;
  status: string;
};
export type AcademyProgress = {
  userId: string;
  courseId: string;
  lessonId: string;
  completedAt: string;
};
export type AcademyLoad<T> =
  | { state: 'pending'; items: T[] }
  | { state: 'ok'; items: T[] }
  | { state: 'unavailable'; items: T[] };
export type AcademyPage<T> = AcademyLoad<T> & { page: number; hasNext: boolean };
export type AcademyProgressSummary = { completedLessons: number };

export function academyEnabled() {
  return process.env.APPWRITE_ACADEMY_ENABLED === 'true';
}
