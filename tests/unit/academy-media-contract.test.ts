import { expect, it } from 'vitest';
import { validateMediaDescriptor } from '../../src/features/academy/services/media-contract';

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
