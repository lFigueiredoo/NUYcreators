import { expect, it } from 'vitest';
import {
  academyBucketProposal,
  academyFulltextIndexesProposal,
  academyTablesProposal,
} from '../../infra/appwrite/academy-schema';
import { tables } from '../../infra/appwrite/schema';

it('mantém a migração da Academia aditiva e fora do manifesto atual', () => {
  const current = new Set(tables.map((table) => table.id));
  const proposed = academyTablesProposal.map((table) => table.id);
  expect(proposed).toHaveLength(10);
  expect(new Set(proposed).size).toBe(proposed.length);
  expect(proposed.filter((id) => current.has(id))).toEqual([]);
  expect(proposed).toContain('community_comments');
  expect(proposed).toContain('academy_progress');
  expect(proposed).toContain('academy_media');
  expect(proposed).toContain('community_moderation_events');
});

it('prepara busca paginada e integridade da ordem sem alterar o manifesto v001', () => {
  expect(academyFulltextIndexesProposal).toContainEqual({
    tableId: 'academy_courses',
    key: 'searchText',
    attributes: ['searchText'],
  });
  expect(
    academyTablesProposal.find((table) => table.id === 'academy_courses')?.columns,
  ).toContainEqual(expect.objectContaining({ key: 'searchText', required: true }));
  expect(
    academyTablesProposal.find((table) => table.id === 'academy_modules')?.unique,
  ).toContainEqual(['courseId', 'order']);
  expect(
    academyTablesProposal.find((table) => table.id === 'academy_lessons')?.unique,
  ).toContainEqual(['moduleId', 'order']);
});

it('propõe mídia privada e chaves de unicidade para progresso e denúncias', () => {
  expect(academyBucketProposal.public).toBe(false);
  expect(academyBucketProposal.fileSecurity).toBe(true);
  expect(academyBucketProposal.allowedMimeTypes).toEqual(['video/mp4', 'application/pdf']);
  expect(
    academyTablesProposal.find((table) => table.id === 'academy_progress')?.unique,
  ).toContainEqual(['userId', 'lessonId']);
  expect(
    academyTablesProposal.find((table) => table.id === 'community_reports')?.unique,
  ).toContainEqual(['commentId', 'reporterId']);
  expect(
    academyTablesProposal.find((table) => table.id === 'community_moderation_events')?.indexes,
  ).toContainEqual(['commentId', 'createdAt']);
});
