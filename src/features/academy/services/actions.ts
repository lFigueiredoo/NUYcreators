'use server';
import { revalidatePath } from 'next/cache';
import { headers, cookies } from 'next/headers';
import { currentUser, SESSION_COOKIE } from '@/lib/appwrite/server';
import { databaseId, opsTables, operationsConfigured } from '@/lib/appwrite/data';
import { getEnvironment } from '@/lib/env/server';
import { sessionRoles } from '@/lib/security/authorization';
import { hasCapability } from '@/lib/security/memberships';
import { academyEnabled } from '../domain';
import {
  AcademyError, completeLesson, createComment, editComment, hideOwnComment,
  moderateComment, reportComment, saveEditorDraft, setCourseStatus, staffReply,
  type Context,
} from './operations';

export type AcademyActionResult = { ok: boolean; message: string; id?: string; version?: number };
const unavailable = 'A Academia ainda não está ativa neste ambiente. Nada foi gravado.';
async function context(): Promise<Context> {
  const origin = (await headers()).get('origin');
  if (origin !== new URL(getEnvironment().APP_URL).origin)
    throw new AcademyError('forbidden', 'Requisição não reconhecida.');
  if (!academyEnabled() || !operationsConfigured())
    throw new AcademyError('unavailable', unavailable);
  const user = await currentUser();
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!user || !secret) throw new AcademyError('forbidden', 'Entre novamente para continuar.');
  const roles = await sessionRoles(secret, user.$id);
  return { tables: opsTables(), databaseId: databaseId(), actor: {
    id: user.$id,
    manage: hasCapability(roles, 'manage-catalog'),
    moderate: hasCapability(roles, 'moderate'),
  } };
}
async function perform(run: (ctx: Context) => Promise<unknown>): Promise<AcademyActionResult> {
  try {
    const value = await run(await context());
    revalidatePath('/app/academia');
    revalidatePath('/admin/academia');
    const row = value as { $id?: string; id?: string; version?: number };
    return { ok: true, message: 'Alteração salva e confirmada.',
      id: row.id ?? row.$id, version: row.version };
  } catch (error) {
    if (error instanceof AcademyError) return { ok: false, message: error.message };
    return { ok: false, message: 'Não foi possível confirmar a gravação. Recarregue e tente novamente.' };
  }
}
export async function saveAcademyDraftAction(raw: unknown) {
  return perform((ctx) => saveEditorDraft(ctx, raw));
}
export async function setAcademyCourseStatusAction(id: string, version: number,
  status: 'published' | 'archived') {
  return perform((ctx) => setCourseStatus(ctx, id, version, status));
}
export async function completeAcademyLessonAction(lessonId: string) {
  return perform((ctx) => completeLesson(ctx, lessonId));
}
export async function postAcademyCommentAction(raw: unknown) {
  return perform((ctx) => createComment(ctx, raw));
}
export async function editAcademyCommentAction(id: string, body: string) {
  return perform((ctx) => editComment(ctx, id, body));
}
export async function hideAcademyCommentAction(id: string) {
  return perform((ctx) => hideOwnComment(ctx, id));
}
export async function reportAcademyCommentAction(raw: unknown) {
  return perform((ctx) => reportComment(ctx, raw));
}
export async function moderateAcademyCommentAction(raw: unknown) {
  return perform((ctx) => moderateComment(ctx, raw));
}
export async function replyAsAcademyStaffAction(type: 'lesson' | 'challenge',
  targetId: string, parentId: string, body: string, idempotencyKey: string) {
  return perform((ctx) => staffReply(ctx, type, targetId, parentId, body, idempotencyKey));
}
