import { z } from 'zod';

/** Metadata gate only. A real file stays pending until host, AV, codec and private delivery are verified. */
export const academyMediaBucket = 'academy-media';
export const mediaLimits = { video: 200 * 1024 * 1024, pdf: 25 * 1024 * 1024 } as const;
export const mediaDescriptor = z.object({
  fileId: z.string().min(1).max(36).regex(/^[a-zA-Z0-9._-]+$/),
  lessonId: z.string().min(1).max(36),
  kind: z.enum(['video', 'pdf']),
  name: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  bucketId: z.literal(academyMediaBucket),
  permissions: z.array(z.string()).length(0),
  chunksTotal: z.number().int().positive(),
  chunksUploaded: z.number().int().positive(),
});

export function validateMediaDescriptor(raw: unknown) {
  const result = mediaDescriptor.safeParse(raw);
  if (!result.success) return { ok: false as const, reason: 'Metadados inválidos ou arquivo público.' };
  const file = result.data;
  if (file.chunksUploaded !== file.chunksTotal)
    return { ok: false as const, reason: 'Upload incompleto.' };
  if (file.kind === 'video' && (file.mimeType !== 'video/mp4' ||
    !file.name.toLowerCase().endsWith('.mp4') || file.sizeBytes > mediaLimits.video))
    return { ok: false as const, reason: 'MP4 fora do contrato de tipo ou tamanho.' };
  if (file.kind === 'pdf' && (file.mimeType !== 'application/pdf' ||
    !file.name.toLowerCase().endsWith('.pdf') || file.sizeBytes > mediaLimits.pdf))
    return { ok: false as const, reason: 'PDF fora do contrato de tipo ou tamanho.' };
  return { ok: true as const, value: file, status: 'pending' as const };
}
