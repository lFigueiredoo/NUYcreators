import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentTermsState: vi.fn(),
  sessionRoles: vi.fn(),
  opsTables: vi.fn(),
  completeLesson: vi.fn(),
  createComment: vi.fn(),
  editComment: vi.fn(),
  hideOwnComment: vi.fn(),
  reportComment: vi.fn(),
  saveCategory: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://nuy.example' }),
  cookies: async () => ({ get: () => ({ value: 'creator-session' }) }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../../src/lib/appwrite/server', () => ({
  SESSION_COOKIE: 'nuy-session',
  currentUser: async () => ({ $id: 'creator.1' }),
}));
vi.mock('../../src/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  operationsConfigured: () => true,
  opsTables: mocks.opsTables,
}));
vi.mock('../../src/lib/env/server', () => ({
  getEnvironment: () => ({ APP_URL: 'https://nuy.example' }),
}));
vi.mock('../../src/lib/security/authorization', () => ({ sessionRoles: mocks.sessionRoles }));
vi.mock('../../src/features/legal/services/consent', () => ({
  currentTermsState: mocks.currentTermsState,
}));
vi.mock('../../src/features/academy/domain', () => ({ academyEnabled: () => true }));
vi.mock('../../src/features/academy/services/operations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/features/academy/services/operations')>()),
  completeLesson: mocks.completeLesson,
  createComment: mocks.createComment,
  editComment: mocks.editComment,
  hideOwnComment: mocks.hideOwnComment,
  reportComment: mocks.reportComment,
  saveCategory: mocks.saveCategory,
}));

import {
  completeAcademyLessonAction,
  editAcademyCommentAction,
  hideAcademyCommentAction,
  postAcademyCommentAction,
  reportAcademyCommentAction,
  saveAcademyCategoryAction,
} from '../../src/features/academy/services/actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionRoles.mockResolvedValue([]);
  mocks.currentTermsState.mockResolvedValue('accepted');
  mocks.completeLesson.mockResolvedValue({ $id: 'progress.1' });
  mocks.saveCategory.mockResolvedValue({ $id: 'category.1' });
});

describe('consentimento nos comandos da Academia', () => {
  it.each([
    ['conclusão de aula', () => completeAcademyLessonAction('lesson.1')],
    ['novo comentário', () => postAcademyCommentAction({})],
    ['edição de comentário', () => editAcademyCommentAction('comment.1', 'Texto')],
    ['ocultação de comentário', () => hideAcademyCommentAction('comment.1')],
    ['denúncia', () => reportAcademyCommentAction({})],
  ])(
    'recusa %s por POST direto sem aceite atual, antes de obter chave de escrita',
    async (_, action) => {
      mocks.currentTermsState.mockResolvedValue('required');
      await expect(action()).resolves.toMatchObject({
        ok: false,
        message: expect.stringContaining('Termos de Uso'),
      });
      expect(mocks.opsTables).not.toHaveBeenCalled();
      expect(mocks.completeLesson).not.toHaveBeenCalled();
      expect(mocks.createComment).not.toHaveBeenCalled();
      expect(mocks.editComment).not.toHaveBeenCalled();
      expect(mocks.hideOwnComment).not.toHaveBeenCalled();
      expect(mocks.reportComment).not.toHaveBeenCalled();
    },
  );

  it('falha fechado quando a conferência do aceite fica indisponível', async () => {
    mocks.currentTermsState.mockResolvedValue('unavailable');
    await expect(completeAcademyLessonAction('lesson.1')).resolves.toMatchObject({ ok: false });
    expect(mocks.opsTables).not.toHaveBeenCalled();
  });

  it('permite a conclusão pela creator com aceite vigente', async () => {
    await expect(completeAcademyLessonAction('lesson.1')).resolves.toMatchObject({ ok: true });
    expect(mocks.currentTermsState).toHaveBeenCalledWith('creator-session', 'creator.1');
    expect(mocks.completeLesson).toHaveBeenCalledWith(expect.any(Object), 'lesson.1');
  });

  it('mantém a gestão para staff confirmado sem exigir perfil de creator', async () => {
    mocks.sessionRoles.mockResolvedValue(['admin']);
    await expect(saveAcademyCategoryAction({ name: 'Criação' })).resolves.toMatchObject({
      ok: true,
    });
    expect(mocks.currentTermsState).not.toHaveBeenCalled();
    expect(mocks.saveCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 'creator.1', manage: true, moderate: true },
      }),
      { name: 'Criação' },
    );
  });
});
