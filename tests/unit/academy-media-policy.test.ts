import { describe, expect, it } from 'vitest';
import {
  authorizeMediaDelivery, authorizeMediaReplacement, authorizeMediaUpload,
  canDeleteOrphan, inspectionState, validAccessExpiry,
} from '../../src/features/academy/services/media-policy';

const upload = {
  actorIsConfirmedAdmin: true, lessonId: 'lesson-1', lessonExists: true,
  kind: 'video' as const, fileName: 'lesson.mp4', mimeType: 'video/mp4',
  sizeBytes: 10_000_000, duplicateFileId: false,
  globalLimitBytes: 209_715_200, scannerAvailable: true,
};
const descriptor = {
  fileId: 'file-1', lessonId: 'lesson-1', kind: 'video', name: 'lesson.mp4',
  mimeType: 'video/mp4', sizeBytes: 10_000_000, bucketId: 'academy-media',
  permissions: [], chunksTotal: 2, chunksUploaded: 2,
};
const delivery = {
  sessionUserId: 'creator-a', courseStatus: 'published', lessonStatus: 'published',
  courseId: 'course-1', lessonCourseId: 'course-1', lessonId: 'lesson-1',
  linkedFileId: 'file-1', mediaFileId: 'file-1', mediaLessonId: 'lesson-1',
  mediaKind: 'video' as const, requestedKind: 'video' as const,
  mediaStatus: 'ready' as const, scanClean: true,
};

describe('C3 media gates (local contract, no remote Storage)', () => {
  it('requires real Admin membership and a measured limit before upload', () => {
    expect(authorizeMediaUpload({ ...upload, actorIsConfirmedAdmin: false }))
      .toEqual({ ok: false, reason: 'admin_required' });
    expect(authorizeMediaUpload({ ...upload, globalLimitBytes: null }))
      .toEqual({ ok: false, reason: 'global_limit_unverified' });
    expect(authorizeMediaUpload({ ...upload, scannerAvailable: false }))
      .toEqual({ ok: false, reason: 'scanner_unavailable' });
  });

  it('rejects wrong lesson, invalid type/size and duplicate object ID', () => {
    expect(authorizeMediaUpload({ ...upload, lessonExists: false }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, fileName: 'lesson.exe' }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, mimeType: 'application/octet-stream' }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, kind: 'archive' as 'video' }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, sizeBytes: 300_000_000 }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, globalLimitBytes: Number.NaN }).ok).toBe(false);
    expect(authorizeMediaUpload({ ...upload, duplicateFileId: true }).ok).toBe(false);
    expect(authorizeMediaUpload(upload)).toEqual({ ok: true });
  });

  it('keeps bytes quarantined until complete, clean, validated and private', () => {
    const base = { uploadComplete: true, scan: 'clean' as const,
      signatureValid: true, videoCodecValid: true, privateDeliveryVerified: true,
      descriptor };
    expect(inspectionState({ ...base, uploadComplete: false })).toBe('pending');
    expect(inspectionState({ ...base, scan: 'pending' })).toBe('processing');
    expect(inspectionState({ ...base, scan: 'unavailable' })).toBe('unavailable');
    expect(inspectionState({ ...base, scan: 'infected' })).toBe('error');
    expect(inspectionState({ ...base, signatureValid: false })).toBe('error');
    expect(inspectionState({ ...base, videoCodecValid: false })).toBe('error');
    expect(inspectionState({ ...base, privateDeliveryVerified: false })).toBe('processing');
    expect(inspectionState({ ...base, descriptor: { ...descriptor, permissions: ['read("any")'] } }))
      .toBe('error');
    expect(inspectionState(base)).toBe('ready');
  });

  it('authorizes only a current session for the exact published lesson/file', () => {
    expect(authorizeMediaDelivery(delivery)).toEqual({ ok: true });
    expect(authorizeMediaDelivery({ ...delivery, sessionUserId: null }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, courseStatus: 'draft' }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, lessonStatus: 'archived' }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, mediaLessonId: 'other' }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, linkedFileId: 'other' }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, mediaStatus: 'processing' }).ok).toBe(false);
    expect(authorizeMediaDelivery({ ...delivery, scanClean: false }).ok).toBe(false);
  });

  it('rejects expired URLs and concurrent or cross-lesson replacement', () => {
    expect(validAccessExpiry(1000, 121000, 120000, 120000)).toBe(true);
    expect(validAccessExpiry(1000, 121000, 121000, 120000)).toBe(false);
    expect(validAccessExpiry(1000, 301000, 120000, 120000)).toBe(false);
    const replacement = { expectedCourseVersion: 4, currentCourseVersion: 4,
      lessonId: 'lesson-1', replacementLessonId: 'lesson-1',
      replacementStatus: 'ready' as const, replacementKind: 'pdf' as const,
      existingKind: 'pdf' as const };
    expect(authorizeMediaReplacement(replacement)).toEqual({ ok: true });
    expect(authorizeMediaReplacement({ ...replacement, currentCourseVersion: 5 }))
      .toEqual({ ok: false, reason: 'conflict' });
    expect(authorizeMediaReplacement({ ...replacement, replacementLessonId: 'lesson-2' }).ok)
      .toBe(false);
  });

  it('only selects unreferenced, settled objects after the retention window', () => {
    const orphan = { ageHours: 25, referencedByLesson: false,
      referencedByMaterial: false, multipartActive: false, auditHold: false };
    expect(canDeleteOrphan(orphan)).toBe(true);
    expect(canDeleteOrphan({ ...orphan, ageHours: 23 })).toBe(false);
    expect(canDeleteOrphan({ ...orphan, referencedByLesson: true })).toBe(false);
    expect(canDeleteOrphan({ ...orphan, multipartActive: true })).toBe(false);
    expect(canDeleteOrphan({ ...orphan, auditHold: true })).toBe(false);
  });
});
