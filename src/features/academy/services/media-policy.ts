import { mediaLimits, validateMediaDescriptor } from './media-contract';

export type MediaKind = 'video' | 'pdf';
export type MediaState = 'pending' | 'processing' | 'unavailable' | 'error' | 'ready';
export type MediaDecision = { ok: true } | { ok: false; reason: string };
const allowed = (): MediaDecision => ({ ok: true });
const denied = (reason: string): MediaDecision => ({ ok: false, reason });

/** Metadata admission only; bytes remain quarantined until independent inspection. */
export function authorizeMediaUpload(input: {
  actorIsConfirmedAdmin: boolean;
  lessonId: string;
  lessonExists: boolean;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  duplicateFileId: boolean;
  globalLimitBytes: number | null;
  scannerAvailable: boolean;
}): MediaDecision {
  if (!input.actorIsConfirmedAdmin) return denied('admin_required');
  if (!input.lessonExists || !input.lessonId) return denied('lesson_missing');
  if (!input.scannerAvailable) return denied('scanner_unavailable');
  if (input.kind !== 'video' && input.kind !== 'pdf') return denied('type_invalid');
  if (!Number.isSafeInteger(input.globalLimitBytes) ||
      input.globalLimitBytes === null || input.globalLimitBytes <= 0)
    return denied('global_limit_unverified');
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 ||
      input.sizeBytes > mediaLimits[input.kind] ||
      input.sizeBytes > input.globalLimitBytes)
    return denied('size_invalid');
  if ((input.kind === 'video' &&
      (input.mimeType !== 'video/mp4' || !input.fileName.toLowerCase().endsWith('.mp4'))) ||
      (input.kind === 'pdf' &&
      (input.mimeType !== 'application/pdf' || !input.fileName.toLowerCase().endsWith('.pdf'))))
    return denied('type_invalid');
  if (input.duplicateFileId) return denied('duplicate_file_id');
  return allowed();
}

/** Only an independent byte/AV/codec inspection may promote a private object. */
export function inspectionState(input: {
  uploadComplete: boolean;
  scan: 'pending' | 'clean' | 'infected' | 'failed' | 'unavailable';
  signatureValid: boolean;
  videoCodecValid: boolean | null;
  privateDeliveryVerified: boolean;
  descriptor: unknown;
}): MediaState {
  if (!input.uploadComplete) return 'pending';
  if (input.scan === 'pending') return 'processing';
  if (input.scan === 'unavailable') return 'unavailable';
  if (input.scan !== 'clean' || !input.signatureValid ||
      input.videoCodecValid === false) return 'error';
  const descriptor = validateMediaDescriptor(input.descriptor);
  if (!descriptor.ok || (descriptor.value.kind === 'video' &&
      input.videoCodecValid !== true)) return 'error';
  return input.privateDeliveryVerified ? 'ready' : 'processing';
}

/** Called before signing one GET; never infer authority from possession of an ID. */
export function authorizeMediaDelivery(input: {
  sessionUserId: string | null;
  courseStatus: string;
  lessonStatus: string;
  courseId: string;
  lessonCourseId: string;
  lessonId: string;
  linkedFileId: string | null;
  mediaFileId: string;
  mediaLessonId: string;
  mediaKind: MediaKind;
  requestedKind: MediaKind;
  mediaStatus: MediaState;
  scanClean: boolean;
}): MediaDecision {
  if (!input.sessionUserId) return denied('session_required');
  if (!['video', 'pdf'].includes(input.mediaKind) ||
      !['video', 'pdf'].includes(input.requestedKind)) return denied('link_mismatch');
  if (input.courseStatus !== 'published' || input.lessonStatus !== 'published')
    return denied('not_published');
  if (input.lessonCourseId !== input.courseId || !input.lessonId ||
      input.mediaLessonId !== input.lessonId ||
      input.linkedFileId !== input.mediaFileId ||
      input.mediaKind !== input.requestedKind) return denied('link_mismatch');
  if (input.mediaStatus !== 'ready' || !input.scanClean) return denied('not_ready');
  return allowed();
}

export function validAccessExpiry(issuedAtMs: number, expiresAtMs: number, nowMs: number,
  maxTtlMs: number): boolean {
  return Number.isSafeInteger(issuedAtMs) && Number.isSafeInteger(expiresAtMs) &&
    Number.isSafeInteger(nowMs) && Number.isSafeInteger(maxTtlMs) &&
    maxTtlMs > 0 && issuedAtMs <= nowMs && nowMs < expiresAtMs &&
    expiresAtMs - issuedAtMs <= maxTtlMs;
}

/** Refuse stale editor saves and cross-lesson substitutions. */
export function authorizeMediaReplacement(input: {
  expectedCourseVersion: number;
  currentCourseVersion: number;
  lessonId: string;
  replacementLessonId: string;
  replacementStatus: MediaState;
  replacementKind: MediaKind;
  existingKind: MediaKind;
}): MediaDecision {
  if (input.expectedCourseVersion !== input.currentCourseVersion)
    return denied('conflict');
  if (!['video', 'pdf'].includes(input.replacementKind) ||
      !['video', 'pdf'].includes(input.existingKind)) return denied('link_mismatch');
  if (input.lessonId !== input.replacementLessonId ||
      input.replacementKind !== input.existingKind) return denied('link_mismatch');
  if (input.replacementStatus !== 'ready') return denied('not_ready');
  return allowed();
}

export function canDeleteOrphan(input: {
  ageHours: number;
  referencedByLesson: boolean;
  referencedByMaterial: boolean;
  multipartActive: boolean;
  auditHold: boolean;
}): boolean {
  return Number.isFinite(input.ageHours) && input.ageHours >= 24 &&
    !input.referencedByLesson && !input.referencedByMaterial &&
    !input.multipartActive && !input.auditHold;
}
