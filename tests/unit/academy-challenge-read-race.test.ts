import { afterEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  challengeStatus: 'published',
  commentReads: 0,
  archiveDuringRead: false,
}));

vi.mock('@/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  sessionTables: () => ({ kind: 'session' }),
  opsTables: () => ({ kind: 'operations' }),
  getTableRow: async () => ({ $id: 'challenge-race-read', status: state.challengeStatus }),
  listTableRows: async (client: { kind: string }, args: { tableId: string }) => {
    if (args.tableId !== 'community_comments' || client.kind !== 'operations')
      throw new Error('Unexpected read path');
    state.commentReads++;
    if (state.archiveDuringRead) state.challengeStatus = 'archived';
    return { total: 1, rows: [{
      $id: 'comment-race-read', targetType: 'challenge', targetId: 'challenge-race-read',
      parentId: null, authorId: 'viewer-ana', body: 'Visible before archive',
      status: 'visible', createdAt: '2026-10-01T00:00:00.000Z',
    }] };
  },
}));

import { challengeComments } from '../../src/features/academy/services/read';

afterEach(() => {
  vi.unstubAllEnvs();
  state.challengeStatus = 'published';
  state.commentReads = 0;
  state.archiveDuringRead = false;
});

it('discards comments if archive lands between the two server authorization checks', async () => {
  vi.stubEnv('APPWRITE_ACADEMY_ENABLED', 'true');
  state.archiveDuringRead = true;
  const result = await challengeComments('creator-session', 'challenge-race-read');
  expect(result).toEqual({ state: 'pending', items: [] });
  expect(state.commentReads).toBe(1);
});

it('does not use the operations key when the challenge is already archived', async () => {
  vi.stubEnv('APPWRITE_ACADEMY_ENABLED', 'true');
  state.challengeStatus = 'archived';
  const result = await challengeComments('creator-session', 'challenge-race-read');
  expect(result).toEqual({ state: 'pending', items: [] });
  expect(state.commentReads).toBe(0);
});
