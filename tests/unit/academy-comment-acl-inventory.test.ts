import { expect, it } from 'vitest';
import { inventoryChallengeCommentAcls } from '../../infra/appwrite/academy-comment-acl-inventory';

type Reader = Parameters<typeof inventoryChallengeCommentAcls>[0];
type FakeRow = { $id: string; $permissions: string[]; targetType: string;
  authorId: string; status: string; parentId: string | null };

function reader(rows: FakeRow[], options: { tablePermissions?: string[];
  rowSecurity?: boolean; unstableTotal?: boolean } = {}) {
  let pages = 0;
  const fake = {
    getTable: async () => ({ rowSecurity: options.rowSecurity ?? true,
      $permissions: options.tablePermissions ?? [] }),
    listRows: async ({ queries }: { queries: string[] }) => {
      pages++;
      const cursor = queries.map((query) => JSON.parse(query) as {
        method: string; values?: string[] }).find((query) => query.method === 'cursorAfter')
        ?.values?.[0];
      const index = cursor ? rows.findIndex((row) => row.$id === cursor) + 1 : 0;
      return { total: rows.length + (options.unstableTotal && pages > 1 ? 1 : 0),
        rows: rows.slice(index, index + 100) };
    },
  } as unknown as Reader;
  return { fake, pages: () => pages };
}

function comments(count: number): FakeRow[] {
  return Array.from({ length: count }, (_, index) => ({
    $id: `comment-${String(index).padStart(4, '0')}`,
    $permissions: ['read("user:viewer-ana")'], targetType: 'challenge',
    authorId: 'viewer-ana', status: index % 10 === 0 ? 'pending' : 'visible',
    parentId: index % 2 ? `comment-${String(index - 1).padStart(4, '0')}` : null,
  }));
}

it('inventories all 1000 rows outside the archive transaction, including replies', async () => {
  const { fake, pages } = reader(comments(1000));
  const report = await inventoryChallengeCommentAcls(fake, 'nuy-creators');
  expect(report).toMatchObject({ ready: true, complete: true, totalRows: 1000,
    challengeRows: 1000, ownerOnly: 1000, replies: 500, excessivePermissions: 0,
    byStatus: { pending: 100, visible: 900 } });
  expect(pages()).toBe(11);
});

it('separates lesson rows and refuses excessive challenge ACL or table access', async () => {
  const rows = comments(101);
  rows[100].$permissions = ['read("users")'];
  rows.push({ ...rows[0], $id: 'lesson-comment', targetType: 'lesson',
    $permissions: ['read("users")'] });
  const { fake } = reader(rows, { tablePermissions: ['read("users")'] });
  const report = await inventoryChallengeCommentAcls(fake, 'nuy-creators');
  expect(report).toMatchObject({ ready: false, totalRows: 102, challengeRows: 101,
    lessonRows: 1, ownerOnly: 100, excessivePermissions: 1,
    tablePermissions: ['read("users")'] });
});

it('rejects an unstable or incomplete inventory instead of declaring readiness', async () => {
  const { fake } = reader(comments(100), { unstableTotal: true });
  await expect(inventoryChallengeCommentAcls(fake, 'nuy-creators'))
    .rejects.toThrow('total mudou');
});
