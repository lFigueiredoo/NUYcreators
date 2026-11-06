import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  row: { authUserId: 'creator-1', status: 'active' } as Record<string, unknown>,
  code: 0,
}));
vi.mock('../../src/lib/appwrite/server', () => ({
  currentUser: vi.fn(),
  SESSION_COOKIE: 'nuy-session',
}));
vi.mock('../../src/lib/security/authorization', () => ({ sessionRoles: vi.fn() }));
vi.mock('../../src/features/accounts/core/approval', () => ({ ensureCreatorApplication: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('../../src/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  sessionTables: () => ({}),
  operationsConfigured: () => true,
  opsTables: () => ({}),
  getTableRow: async () => {
    if (mock.code) throw Object.assign(new Error('read failed'), { code: mock.code });
    return mock.row;
  },
}));
import { currentAccountApproval } from '../../src/features/accounts/services/creator';

beforeEach(() => {
  mock.code = 0;
  mock.row = { authUserId: 'creator-1', status: 'active' };
});

describe('acesso antes da aprovação da conta', () => {
  it.each(['active', 'pending_review', 'rejected'] as const)(
    'lê %s apenas da linha privada da conta',
    async (status) => {
      mock.row.status = status;
      expect(await currentAccountApproval('session', 'creator-1')).toBe(status);
    },
  );
  it('não libera status desconhecido ou dados de outra identidade', async () => {
    mock.row.status = 'approved';
    expect(await currentAccountApproval('session', 'creator-1')).toBe('unavailable');
    mock.row = { authUserId: 'other-user', status: 'active' };
    expect(await currentAccountApproval('session', 'creator-1')).toBe('unavailable');
  });
  it('distingue ausência de falha sem liberar acesso', async () => {
    mock.code = 404;
    expect(await currentAccountApproval('session', 'creator-1')).toBe('missing');
    mock.code = 503;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await currentAccountApproval('session', 'creator-1')).toBe('unavailable');
    vi.restoreAllMocks();
  });
  it('relê a decisão após aprovação na mesma requisição', async () => {
    mock.row.status = 'pending_review';
    expect(await currentAccountApproval('session', 'creator-1')).toBe('pending_review');
    mock.row.status = 'active';
    expect(await currentAccountApproval('session', 'creator-1')).toBe('active');
  });
});
