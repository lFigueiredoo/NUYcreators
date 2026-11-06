import { beforeEach, expect, it, vi } from 'vitest';
import { CURRENT_TERMS_VERSION } from '../../src/features/legal/versions';

const mocks = vi.hoisted(() => ({
  approval: vi.fn(),
  ensure: vi.fn(),
  save: vi.fn(),
  execution: vi.fn(),
  currentUser: vi.fn(),
  readProfile: vi.fn(),
  roles: vi.fn(),
  operations: vi.fn(),
  createAuth: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://nuy.test' }),
  cookies: async () => ({ get: () => ({ value: 'test-session' }), set: vi.fn(), delete: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  redirect: (route: string) => {
    throw new Error(`redirect:${route}`);
  },
}));
vi.mock('../../src/lib/appwrite/server', () => ({
  authConfigured: () => true,
  registrationConfigured: () => true,
  currentUser: mocks.currentUser,
  readOwnProfile: mocks.readProfile,
  SESSION_COOKIE: 'session',
  sessionClient: () => ({}),
  createAccount: () => ({ create: mocks.createAuth }),
  createSessionAccount: () => ({}),
}));
vi.mock('../../src/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  operationsConfigured: mocks.operations,
  opsTables: () => ({}),
}));
vi.mock('../../src/lib/env/server', () => ({
  getEnvironment: () => ({
    APP_URL: 'https://nuy.test',
    APPWRITE_FUNCTIONS_ENABLED: 'false',
    NUY_TERMS_VERSION: CURRENT_TERMS_VERSION,
    NUY_MINIMUM_AGE: 18,
  }),
}));
vi.mock('../../src/lib/security/authorization', () => ({ sessionRoles: mocks.roles }));
vi.mock('../../src/features/accounts/services/creator', () => ({
  currentAccountApproval: mocks.approval,
  ensureCurrentCreatorApplication: mocks.ensure,
}));
vi.mock('../../src/features/accounts/core/onboarding', () => ({
  savePendingCreatorProfile: mocks.save,
  CreatorOnboardingError: class extends Error {},
}));
vi.mock('node-appwrite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node-appwrite')>()),
  Functions: class {
    createExecution = mocks.execution;
  },
}));

import { onboardingAction, signupAction } from '../../src/features/auth/services/actions';

function form() {
  const input = new FormData();
  for (const [key, value] of Object.entries({
    name: 'Pessoa NUY',
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
    status: 'active',
    userId: 'victim',
  }))
    input.set(key, value);
  return input;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: true });
  mocks.readProfile.mockResolvedValue(null);
  mocks.roles.mockResolvedValue([]);
  mocks.operations.mockReturnValue(true);
  mocks.approval.mockResolvedValue('pending_review');
  mocks.ensure.mockResolvedValue(true);
  mocks.save.mockResolvedValue(undefined);
});

it('salva cadastro pendente no servidor e vai para espera sem depender da Function antiga', async () => {
  await expect(onboardingAction({ message: '' }, form())).rejects.toThrow(
    'redirect:/aguardando-aprovacao',
  );
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ actor: { userId: 'trusted-user', roles: [] } }),
    expect.objectContaining({ name: 'Pessoa NUY' }),
  );
  expect(mocks.save.mock.calls[0][1]).not.toHaveProperty('status');
  expect(mocks.save.mock.calls[0][1]).not.toHaveProperty('userId');
  expect(mocks.execution).not.toHaveBeenCalled();
});
it('não grava perfil nem reabre uma conta recusada pelo envio direto da action', async () => {
  mocks.approval.mockResolvedValue('rejected');
  const result = await onboardingAction({ message: '' }, form());
  expect(result.success).not.toBe(true);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.execution).not.toHaveBeenCalled();
});
it('exige email confirmado também no caminho Next de cadastro pendente', async () => {
  mocks.currentUser.mockResolvedValue({ $id: 'trusted-user', emailVerification: false });
  expect(await onboardingAction({ message: '' }, form())).toMatchObject({
    message: expect.stringContaining('Verifique'),
  });
  expect(mocks.save).not.toHaveBeenCalled();
});
it('confere o registro recém-criado antes de salvar um perfil sem users anterior', async () => {
  mocks.approval.mockResolvedValueOnce('missing').mockResolvedValueOnce('pending_review');
  await expect(onboardingAction({ message: '' }, form())).rejects.toThrow(
    'redirect:/aguardando-aprovacao',
  );
  expect(mocks.ensure).toHaveBeenCalledOnce();
  expect(mocks.approval).toHaveBeenCalledTimes(2);
  expect(mocks.save).toHaveBeenCalledOnce();
});
it('não cria identidade Auth sem capacidade de registrar a solicitação privada', async () => {
  mocks.operations.mockReturnValue(false);
  const input = new FormData();
  input.set('name', 'Pessoa NUY');
  input.set('email', 'pessoa@nuy.test');
  input.set('password', 'senha-123456');
  input.set('terms', 'on');
  const result = await signupAction({ message: '' }, input);
  expect(result.success).not.toBe(true);
  expect(mocks.createAuth).not.toHaveBeenCalled();
});
