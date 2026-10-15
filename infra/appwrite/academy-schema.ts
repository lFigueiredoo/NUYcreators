/**
 * Proposta aditiva da Academia. NÃO é importada pelo provisioner v001.
 * A aplicação só pode usar estas tabelas depois de uma migração aprovada.
 */
import type { Table } from './schema';

function table(
  id: string,
  fields: string,
  unique: string[][] = [],
  indexes: string[][] = [],
): Table {
  return {
    id,
    columns: fields.split(' ').map((field) => {
      const required = !field.endsWith('?');
      const [key, marker] = field.replace(/\?$/, '').split(':');
      return {
        key,
        required,
        type:
          marker === '#'
            ? 'integer'
            : marker === '!'
              ? 'boolean'
              : marker === '@'
                ? 'datetime'
                : 'varchar',
        size: marker && /^\d+$/.test(marker) ? Number(marker) : 255,
      };
    }),
    unique,
    indexes,
  };
}

export const academySchemaVersion = 'academy-003-proposal-c1';
/** Índice FULLTEXT separado: o manifesto v001 só expressa índices key/unique. */
export const academyFulltextIndexesProposal = [
  { tableId: 'academy_courses', key: 'searchText', attributes: ['searchText'] },
] as const;
export const academyBucketProposal = {
  id: 'academy-media',
  public: false,
  fileSecurity: true,
  allowedFileExtensions: ['mp4', 'pdf'],
  allowedMimeTypes: ['video/mp4', 'application/pdf'],
} as const;

export const academyTablesProposal: Table[] = [
  table(
    'academy_categories',
    'slug name description:1000? order:# active:!',
    [['slug']],
    [
      ['active', 'order', 'slug'],
      ['order', 'slug'],
    ],
  ),
  table(
    'academy_courses',
    'slug title summary:1000 searchText:2000 description:6000? categoryId? coverFileId? status order:# publishedAt:@? version:#',
    [['slug']],
    [
      ['status', 'order', 'slug'],
      ['categoryId', 'status'],
      ['categoryId', 'status', 'order', 'slug'],
      ['order', 'slug'],
    ],
  ),
  table('academy_modules', 'courseId title summary:1000? order:#', [['courseId', 'order']]),
  table(
    'academy_lessons',
    'courseId moduleId title summary:2000? durationSeconds:#? videoFileId? status order:# publishedAt:@?',
    [['moduleId', 'order']],
    [['courseId', 'status', 'order']],
  ),
  table(
    'academy_materials',
    'courseId lessonId title kind fileId? url:2048? order:#',
    [],
    [
      ['courseId', 'order'],
      ['lessonId', 'order'],
      ['courseId', 'lessonId'],
    ],
  ),
  table(
    'academy_media',
    'fileId lessonId kind status mimeType sizeBytes:# sha256:64? createdBy createdAt:@ verifiedAt:@?',
    [['fileId']],
    [['lessonId', 'kind'], ['status', 'createdAt']],
  ),
  table(
    'academy_progress',
    'userId courseId lessonId completedAt:@',
    [['userId', 'lessonId']],
    [['userId', 'courseId'], ['courseId']],
  ),
  table(
    'community_comments',
    'targetType targetId parentId? authorId body:4000 status createdAt:@ editedAt:@? moderatedBy? moderatedAt:@? moderationReason:1000?',
    [],
    [
      ['targetType', 'targetId', 'status', 'createdAt'],
      ['parentId'],
      ['authorId', 'createdAt'],
      ['status', 'createdAt'],
      ['createdAt'],
    ],
  ),
  table(
    'community_reports',
    'commentId reporterId reason:1000 status reviewedBy? reviewedAt:@?',
    [['commentId', 'reporterId']],
    [['status', 'commentId'], ['commentId']],
  ),
  table(
    'community_moderation_events',
    'commentId actorId fromStatus toStatus reason:1000? createdAt:@',
    [],
    [['commentId', 'createdAt'], ['actorId', 'createdAt']],
  ),
];
