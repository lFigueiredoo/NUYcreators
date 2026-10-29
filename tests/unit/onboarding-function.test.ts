import { afterEach, beforeEach, expect, it, vi } from 'vitest';
// O stub é do SDK (TablesDB), não do comportamento: ele só substitui a rede, e
// por isso não define o que a função faz — o que ela faz é medido no staging.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
}));
import handler from '../../functions/complete-onboarding/main';
import { CURRENT_TERMS_VERSION } from '../../src/features/legal/versions';
const main = (ctx: Parameters<typeof handler>[0]) =>
  handler(ctx, {
    account: () => ({ get: mocks.getUser }),
    tables: () => ({
      getRow: mocks.getRow,
      createRow: mocks.createRow,
      updateRow: mocks.updateRow,
      deleteRow: mocks.deleteRow,
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
  vi.stubEnv('NUY_TERMS_VERSION', CURRENT_TERMS_VERSION);
  vi.stubEnv('NUY_MINIMUM_AGE', '18');
  mocks.getUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: true });
  mocks.getRow.mockImplementation(async ({ tableId }: { tableId: string }) =>
    tableId === 'users'
      ? {
          authUserId: 'trusted-user',
          status: 'active',
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        }
      : { userId: 'trusted-user' },
  );
  mocks.updateRow.mockResolvedValue({});
  mocks.deleteRow.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
it('requires platform credentials and user JWT', async () => {
  const result = await main(context({}));
  expect(result).toMatchObject({ status: 401 });
  expect(mocks.getRow).not.toHaveBeenCalled();
});
it('does not save for unverified email', async () => {
  mocks.getUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: false });
  expect(await main(context())).toMatchObject({ status: 403 });
  expect(mocks.updateRow).not.toHaveBeenCalled();
});
it('refuses profiles before legal policy configuration', async () => {
  vi.stubEnv('NUY_TERMS_VERSION', '');
  expect(await main(context())).toMatchObject({ status: 503 });
});
it('enforces configured age policy', async () => {
  expect(await main(context(undefined, { ...body, birthDate: '2020-01-01' }))).toMatchObject({
    status: 400,
  });
  expect(mocks.updateRow).not.toHaveBeenCalled();
});
it('rejects suspended users', async () => {
  mocks.getRow.mockResolvedValue({ authUserId: 'trusted-user', status: 'suspended' });
  expect(await main(context())).toMatchObject({ status: 403 });
});
it('records an explicit acceptance when an existing user submits a newer terms version', async () => {
  mocks.getRow.mockImplementation(async ({ tableId }: { tableId: string }) =>
    tableId === 'users'
      ? {
          authUserId: 'trusted-user',
          status: 'active',
          acceptedTermsVersion: '2026-10-07-v1',
        }
      : { userId: 'trusted-user' },
  );

  expect(await main(context())).toMatchObject({ status: 200 });
  const acceptanceWrite = mocks.updateRow.mock.calls.find(
    ([input]) => input.tableId === 'users',
  )?.[0];
  expect(acceptanceWrite).toMatchObject({
    rowId: 'trusted-user',
    data: { acceptedTermsVersion: CURRENT_TERMS_VERSION },
  });
  expect(acceptanceWrite.data.consentAt).toEqual(expect.any(String));
});
it('selects ownership from verified identity, never from the payload', async () => {
  expect(
    await main(context(undefined, { ...body, userId: 'victim', points: 999, role: 'admin' })),
  ).toMatchObject({ status: 200 });
  const write = mocks.updateRow.mock.calls[0][0];
  expect(write.rowId).toBe('trusted-user');
  expect(write.data.userId).toBe('trusted-user');
  expect(write.data).not.toHaveProperty('points');
  expect(write.data).not.toHaveProperty('role');
  expect(write.permissions).toEqual(['read("user:trusted-user")']);
});
it('does not report partial writes as success or write financial records', async () => {
  mocks.updateRow.mockRejectedValue(new Error('test failure'));
  const ctx = context();
  expect(await main(ctx)).toMatchObject({ status: 503 });
  expect(ctx.error).toHaveBeenCalledWith('onboarding_failed');
  const writes = [...mocks.updateRow.mock.calls, ...mocks.createRow.mock.calls];
  expect(
    writes.some(([input]) =>
      ['point_accounts', 'point_transactions', 'ranking_entries'].includes(input.tableId),
    ),
  ).toBe(false);
});
