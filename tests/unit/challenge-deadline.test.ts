import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { deadlineLabel, deadlinePassed } from '../../src/features/workspace/domain/format';
import type { ChallengeView } from '../../src/features/workspace/services/challenges';

vi.mock('@/features/academy/components/comments', () => ({ CommunityComments: () => null }));
vi.mock('../../src/features/workspace/components/core-forms', () => ({
  JoinChallengeForm: () => 'JOIN_ACTION',
  SubmitContentForm: () => 'SUBMIT_ACTION',
}));

import { ChallengeDetailScreen } from '../../src/features/workspace/components/challenges-screen';

const end = '2026-11-04T12:00:00.000Z';

function challenge(participating = false): ChallengeView {
  return {
    id: 'challenge-1',
    slug: 'desafio-teste',
    name: 'Desafio teste',
    description: 'Briefing do desafio.',
    imageFileId: null,
    platform: 'instagram',
    startsAt: '2026-11-01T12:00:00.000Z',
    endsAt: end,
    points: 100,
    status: 'published',
    requiredLevelId: null,
    participantLimit: null,
    participantCount: participating ? 1 : 0,
    hashtags: null,
    mentions: null,
    participation: participating
      ? {
          id: 'participation-1',
          challengeId: 'challenge-1',
          status: 'joined',
          joinedAt: '2026-11-02T12:00:00.000Z',
        }
      : null,
    submission: null,
    bucket: participating ? 'joined' : 'available',
  };
}

function renderDetail(item: ChallengeView, now: Date) {
  return renderToStaticMarkup(
    createElement(ChallengeDetailScreen, {
      detail: {
        challenge: { state: 'ok', items: [item] },
        requirements: { state: 'ok', items: [] },
      },
      slug: item.slug,
      now,
      participationEnabled: true,
      comments: { state: 'ok', items: [] },
      viewerId: 'viewer-1',
    }),
  );
}

describe('prazo dos desafios', () => {
  it('marca como encerrado imediatamente depois do instante final', () => {
    const after = new Date('2026-11-04T12:00:00.001Z');
    expect(deadlinePassed(end, after)).toBe(true);
    expect(deadlineLabel(end, after)).toBe('Encerrado');
  });

  it('mantém o último instante da janela disponível, como o servidor', () => {
    const exact = new Date(end);
    expect(deadlinePassed(end, exact)).toBe(false);
    expect(deadlineLabel(end, exact)).toBe('Último dia');
    expect(renderDetail(challenge(), exact)).toContain('JOIN_ACTION');
    expect(renderDetail(challenge(true), exact)).toContain('SUBMIT_ACTION');
  });

  it('troca as ações por uma explicação depois do prazo', () => {
    const after = new Date('2026-11-04T12:00:00.001Z');
    const available = renderDetail(challenge(), after);
    expect(available).toContain('Prazo encerrado');
    expect(available).not.toContain('JOIN_ACTION');

    const joined = renderDetail(challenge(true), after);
    expect(joined).toContain('Novos envios não estão mais disponíveis');
    expect(joined).not.toContain('SUBMIT_ACTION');
  });
});
