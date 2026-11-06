import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  origin: 'https://nuy.example',
  configured: true,
  requireStaff: vi.fn(),
  review: vi.fn(),
  opsTables: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: mocks.origin }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('../../src/lib/security/authorization', () => ({ requireStaff: mocks.requireStaff }));
vi.mock('../../src/lib/env/server', () => ({
  getEnvironment: () => ({ APP_URL: 'https://nuy.example' }),
}));
vi.mock('../../src/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  operationsConfigured: () => mocks.configured,
  opsTables: mocks.opsTables,
}));
vi.mock('../../src/features/accounts/core/approval', () => ({
  reviewCreatorApplication: mocks.review,
  loadCreatorApplications: vi.fn(),
}));

import { reviewCreatorApplicationAction } from '../../src/features/accounts/services/actions';

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    userId: 'creator.1',
    decision: 'approve',
    expectedStatus: 'pending_review',
    ...values,
  }))
    data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.origin = 'https://nuy.example';
  mocks.configured = true;
  mocks.requireStaff.mockResolvedValue({ user: { $id: 'admin-confirmado' }, roles: ['admin'] });
  mocks.opsTables.mockReturnValue({});
  mocks.review.mockResolvedValue({ ok: true, value: { userId: 'creator.1', status: 'active' } });
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
});

describe('action administrativa de aprovação de cadastros', () => {
  it('recusa origem externa antes de acessar credenciais ou gravar', async () => {
    mocks.origin = 'https://externo.example';
    await expect(reviewCreatorApplicationAction({ message: '' }, form())).resolves.toMatchObject({
      message: expect.stringContaining('Requisição não reconhecida'),
    });
    expect(mocks.requireStaff).not.toHaveBeenCalled();
    expect(mocks.opsTables).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it('cobra a capacidade de revisão antes da chave de escrita', async () => {
    mocks.requireStaff.mockRejectedValue(new Error('sem permissão'));
    await expect(reviewCreatorApplicationAction({ message: '' }, form())).rejects.toThrow(
      'sem permissão',
    );
    expect(mocks.requireStaff).toHaveBeenCalledWith('review-creators');
    expect(mocks.opsTables).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it('não mostra sucesso quando a operação está desativada', async () => {
    mocks.configured = false;
    await expect(reviewCreatorApplicationAction({ message: '' }, form())).resolves.toMatchObject({
      message: expect.stringContaining('Nada foi alterado'),
    });
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('exige motivo da recusa também em POST direto', async () => {
    await expect(
      reviewCreatorApplicationAction({ message: '' }, form({ decision: 'reject' })),
    ).resolves.toMatchObject({ message: expect.stringContaining('motivo da recusa') });
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it('deriva o decisor da sessão e só confirma depois do núcleo aprovar', async () => {
    await expect(
      reviewCreatorApplicationAction(
        { message: '' },
        form({
          actorId: 'identidade-forjada',
          roles: 'admin',
        }),
      ),
    ).rejects.toThrow('redirect:/admin/aprovacoes?status=pending_review&resultado=approved');
    expect(mocks.review).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: 'admin-confirmado', roles: ['admin'] },
      }),
      { userId: 'creator.1', decision: 'approve', expectedStatus: 'pending_review', reason: '' },
    );
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/aprovacoes');
  });

  it('explica conflito sem afirmar que a decisão foi salva', async () => {
    mocks.review.mockResolvedValue({ ok: false, failure: { code: 'conflict', status: 409 } });
    await expect(reviewCreatorApplicationAction({ message: '' }, form())).resolves.toMatchObject({
      message: expect.stringContaining('cadastro mudou'),
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
