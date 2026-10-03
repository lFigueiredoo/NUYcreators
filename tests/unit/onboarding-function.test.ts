import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
import handler from '../../functions/complete-onboarding/main';
const main = (ctx: Parameters<typeof handler>[0]) =>
  handler(ctx, {
    account: () => ({ get: mocks.getUser }),
    database: () => ({
      getDocument: mocks.getDocument,
      createDocument: mocks.createDocument,
      updateDocument: mocks.updateDocument,
      deleteDocument: mocks.deleteDocument,
    }),
  });
const body = {
  name: 'Pessoa',
  phone: '11999999999',
  city: 'São Paulo',
  state: 'SP',
  birthDate: '2000-01-01',
  niche: 'casa',
  creatorType: 'ugc',
  instagram: '',
  tiktok: '',
  youtube: '',
  terms: 'on',
};
function context(
  headers: Record<string, string> = {
    'x-appwrite-user-jwt': 'test-jwt',
    'x-appwrite-key': 'test-key',
  },
  bodyJson: unknown = body,
) {
  return {
    req: { headers, bodyJson },
    res: { json: vi.fn((data: unknown, status?: number) => ({ data, status })) },
    error: vi.fn(),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APPWRITE_FUNCTION_API_ENDPOINT', 'https://example.test/v1');
  vi.stubEnv('APPWRITE_FUNCTION_PROJECT_ID', 'isolated-test');
  vi.stubEnv('NUY_TERMS_VERSION', 'test-v1');
  vi.stubEnv('NUY_MINIMUM_AGE', '18');
  mocks.getUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: true });
  mocks.getDocument.mockImplementation(async ({ collectionId }: { collectionId: string }) =>
    collectionId === 'users'
      ? { authUserId: 'trusted-user', status: 'active' }
      : { userId: 'trusted-user' },
  );
  mocks.updateDocument.mockResolvedValue({});
  mocks.deleteDocument.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
it('requires platform credentials and user JWT', async () => {
  const result = await main(context({}));
  expect(result).toMatchObject({ status: 401 });
  expect(mocks.getDocument).not.toHaveBeenCalled();
});
it('does not save for unverified email', async () => {
  mocks.getUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: false });
  expect(await main(context())).toMatchObject({ status: 403 });
  expect(mocks.updateDocument).not.toHaveBeenCalled();
});
it('refuses profiles before legal policy configuration', async () => {
  vi.stubEnv('NUY_TERMS_VERSION', '');
  expect(await main(context())).toMatchObject({ status: 503 });
});
it('enforces configured age policy', async () => {
  expect(await main(context(undefined, { ...body, birthDate: '2020-01-01' }))).toMatchObject({
    status: 400,
  });
  expect(mocks.updateDocument).not.toHaveBeenCalled();
});
it('rejects suspended users', async () => {
  mocks.getDocument.mockResolvedValue({ authUserId: 'trusted-user', status: 'suspended' });
  expect(await main(context())).toMatchObject({ status: 403 });
});
it('selects ownership from verified identity, never from the payload', async () => {
  expect(
    await main(context(undefined, { ...body, userId: 'victim', points: 999, role: 'admin' })),
  ).toMatchObject({ status: 200 });
  const write = mocks.updateDocument.mock.calls[0][0];
  expect(write.documentId).toBe('trusted-user');
  expect(write.data.userId).toBe('trusted-user');
  expect(write.data).not.toHaveProperty('points');
  expect(write.data).not.toHaveProperty('role');
  expect(write.permissions).toEqual(['read("user:trusted-user")']);
});
it('does not report partial writes as success or write financial records', async () => {
  mocks.updateDocument.mockRejectedValue(new Error('test failure'));
  const ctx = context();
  expect(await main(ctx)).toMatchObject({ status: 503 });
  expect(ctx.error).toHaveBeenCalledWith('onboarding_failed');
  const writes = [...mocks.updateDocument.mock.calls, ...mocks.createDocument.mock.calls];
  expect(
    writes.some(([input]) =>
      ['point_accounts', 'point_transactions', 'ranking_entries'].includes(input.collectionId),
    ),
  ).toBe(false);
});
