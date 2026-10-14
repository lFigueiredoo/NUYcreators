import { expect, it } from 'vitest';
import { orphanedMediaCandidates, validateMediaDescriptor } from '../../src/features/academy/services/media-contract';

const video = { fileId: 'file-1', lessonId: 'lesson-1', kind: 'video',
  name: 'aula.mp4', mimeType: 'video/mp4', sizeBytes: 1024,
  bucketId: 'academy-media', permissions: [], chunksTotal: 2, chunksUploaded: 2 };

it('recusa arquivo público, upload incompleto, tipo e tamanho divergentes', () => {
  expect(validateMediaDescriptor(video)).toMatchObject({ ok: true, status: 'pending' });
  expect(validateMediaDescriptor({ ...video, permissions: ['read("any")'] }).ok).toBe(false);
  expect(validateMediaDescriptor({ ...video, chunksUploaded: 1 }).ok).toBe(false);
  expect(validateMediaDescriptor({ ...video, mimeType: 'application/pdf' }).ok).toBe(false);
  expect(validateMediaDescriptor({ ...video, sizeBytes: 201 * 1024 * 1024 }).ok).toBe(false);
  expect(validateMediaDescriptor({ ...video, bucketId: 'community-media' }).ok).toBe(false);
});

it('só propõe limpeza de mídia antiga e sem referência', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  expect(orphanedMediaCandidates([
    { fileId: 'old-referenced', createdAt: '2026-10-10T12:00:00Z' },
    { fileId: 'old-orphan', createdAt: '2026-10-10T12:00:00Z' },
    { fileId: 'recent-orphan', createdAt: '2026-10-14T11:00:00Z' },
  ], new Set(['old-referenced']), now)).toEqual(['old-orphan']);
});
