import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failedTable: '',
}));

vi.mock('../../src/features/workspace/services/commands', () => ({ functionsOnline: () => false }));
vi.mock('../../src/features/workspace/services/read', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/features/workspace/services/read')>();
  return {
    ...actual,
    listSession: vi.fn(
      async <T>(
        _secret: string,
        _scope: string,
        tableId: string,
        map: (row: Record<string, unknown>) => T,
        options: { queries?: string[]; limit?: number } = {},
      ) => {
        if (tableId === fixture.failedTable) return actual.unavailable<T>();
        const queries = (options.queries ?? []).map(
          (query) =>
            JSON.parse(query) as {
              method: string;
              attribute?: string;
              values?: unknown[];
            },
        );
        const rows = (fixture.tables[tableId] ?? []).filter((row) =>
          queries.every(
            (query) =>
              query.method !== 'equal' || (query.values ?? []).includes(row[query.attribute!]),
          ),
        );
        return actual.loaded(rows.slice(0, options.limit ?? 100).map(map));
      },
    ),
  };
});

import { loadContents } from '../../src/features/workspace/services/content';
import { ContentsScreen } from '../../src/features/workspace/components/contents-screen';

const USER = 'creator-owner';
const submission = (id: string, status = 'approved', reason = '') => ({
  $id: id,
  userId: USER,
  challengeId: 'challenge-1',
  status,
  revision: 1,
  submittedAt: '2026-11-06T12:00:00.000Z',
  canonicalUrl: `https://instagram.com/p/${id}`,
  platform: 'instagram',
  moderationReason: reason,
  reviewedBy: 'staff-private-id',
});
const credit = (extra: Record<string, unknown> = {}) => ({
  $id: 'credit-1',
  userId: USER,
  type: 'earn',
  referenceType: 'challenge_submission',
  referenceId: 'submission-1',
  amount: 10,
  ...extra,
});

beforeEach(() => {
  fixture.failedTable = '';
  fixture.tables = {
    challenges: [{ $id: 'challenge-1', slug: 'desafio-nuy', name: 'Desafio NUY', points: 10 }],
    challenge_submissions: [submission('submission-1')],
    point_transactions: [credit()],
  };
});

describe('histórico de conteúdos e crédito efetivo', () => {
  it('preserva os pontos creditados depois de editar a pontuação do desafio', async () => {
    const before = await loadContents('session', USER);
    fixture.tables.challenges[0].points = 999;
    const after = await loadContents('session', USER);

    expect(before).toMatchObject({
      state: 'ok',
      items: [{ awardedPoints: 10, challengePoints: 10 }],
    });
    expect(after).toMatchObject({
      state: 'ok',
      items: [{ awardedPoints: 10, challengePoints: 999 }],
    });
    if (after.state !== 'ok') return;
    const html = renderToStaticMarkup(
      createElement(ContentsScreen, { entries: after.items, tab: 'approved' }),
    );
    expect(html).toContain('10 Pontos NUY creditados');
    expect(html).toContain('10 Pontos NUY aprovados em desafios');
    expect(html).not.toContain('999 Pontos NUY');
  });

  it('usa apenas créditos earn da submissão e da dona da sessão', async () => {
    fixture.tables.point_transactions.push(
      credit({ $id: 'adjust', type: 'adjust', amount: 900 }),
      credit({ $id: 'wrong-reference', referenceType: 'admin_adjustment', amount: 800 }),
      credit({ $id: 'other-user', userId: 'other-creator', amount: 700 }),
      credit({ $id: 'other-submission', referenceId: 'another-submission', amount: 600 }),
    );
    const result = await loadContents('session', USER);
    expect(result).toMatchObject({
      state: 'ok',
      items: [{ id: 'submission-1', awardedPoints: 10 }],
    });
  });

  it('encontra o crédito exibido depois de mais de 100 lançamentos sem relação com o envio', async () => {
    fixture.tables.point_transactions = [
      ...Array.from({ length: 150 }, (_, index) =>
        credit({
          $id: `old-credit-${index}`,
          referenceId: `old-submission-${index}`,
          amount: 999,
        }),
      ),
      credit(),
    ];
    const result = await loadContents('session', USER);
    expect(result).toMatchObject({
      state: 'ok',
      items: [{ id: 'submission-1', awardedPoints: 10 }],
    });
    if (result.state !== 'ok') return;
    const html = renderToStaticMarkup(
      createElement(ContentsScreen, { entries: result.items, tab: 'approved' }),
    );
    expect(html).toContain('10 Pontos NUY creditados');
  });

  it('orienta revisões/recusas sem expor notas de aprovação ou identidade da revisora', async () => {
    fixture.tables.challenge_submissions = [
      submission('submission-1', 'approved', 'NOTA INTERNA DA APROVAÇÃO'),
      submission('submission-2', 'revision_requested', 'Inclua a marca na legenda.'),
      submission('submission-3', 'rejected', 'A publicação não mostra o produto NUY.'),
    ];
    const result = await loadContents('session', USER);
    expect(result).toMatchObject({
      state: 'ok',
      items: [
        { id: 'submission-1', moderationReason: null },
        { id: 'submission-2', moderationReason: 'Inclua a marca na legenda.' },
        { id: 'submission-3', moderationReason: 'A publicação não mostra o produto NUY.' },
      ],
    });
    if (result.state !== 'ok') return;
    const html = renderToStaticMarkup(
      createElement(ContentsScreen, { entries: result.items, tab: 'all' }),
    );
    expect(html).toContain('Inclua a marca na legenda.');
    expect(html).toContain('A publicação não mostra o produto NUY.');
    expect(html).toContain('Revisar e reenviar conteúdo');
    expect(html).not.toContain('NOTA INTERNA DA APROVAÇÃO');
    expect(html).not.toContain('staff-private-id');
  });

  it('não inventa o crédito quando não há lançamento e falha fechado se o extrato não carrega', async () => {
    fixture.tables.point_transactions = [];
    const noCredit = await loadContents('session', USER);
    expect(noCredit).toMatchObject({ state: 'ok', items: [{ awardedPoints: null }] });
    if (noCredit.state === 'ok') {
      const html = renderToStaticMarkup(
        createElement(ContentsScreen, { entries: noCredit.items, tab: 'approved' }),
      );
      expect(html).toContain('Consulte o crédito no extrato de pontos');
      expect(html).not.toContain('Pontos NUY creditados');
    }
    fixture.failedTable = 'point_transactions';
    expect(await loadContents('session', USER)).toMatchObject({ state: 'unavailable' });
  });
});
