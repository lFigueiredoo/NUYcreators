import { describe, expect, it, vi } from 'vitest';
import { moderationQueue, type CoreContext } from '../../src/features/workspace/core';
import { academyDateLabel } from '../../src/features/academy/domain';
import { exactRedemptionCounts } from '../../src/features/workspace/services/rewards';

describe('regressões operacionais', () => {
  it('conta o histórico completo somente para recompensas com limite', async () => {
    const count = vi.fn(async (id: string) => (id === 'limitada' ? 73 : 0));
    const result = await exactRedemptionCounts(
      [
        { id: 'limitada', perUserLimit: 100 },
        { id: 'ilimitada', perUserLimit: 0 },
        { id: 'limitada', perUserLimit: 100 },
      ],
      count,
    );
    expect(result?.get('limitada')).toBe(73);
    expect(result?.has('ilimitada')).toBe(false);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it('falha fechado quando uma contagem exata fica indisponível', async () => {
    const result = await exactRedemptionCounts(
      [{ id: 'limitada', perUserLimit: 1 }],
      async () => null,
    );
    expect(result).toBeNull();
  });

  it('formata datas no dia civil de São Paulo', () => {
    expect(academyDateLabel('2026-11-04T01:30:00.000Z')).toBe('03/11/2026');
    expect(academyDateLabel('data inválida')).toBe('Data indisponível');
  });

  it('carrega nomes da fila de moderação em uma consulta, sem N+1', async () => {
    const listRows = vi.fn(async ({ tableId }: { tableId: string }) => {
      if (tableId === 'challenge_submissions')
        return {
          total: 3,
          rows: [
            { $id: 's1', challengeId: 'c1', userId: 'u1', status: 'pending' },
            { $id: 's2', challengeId: 'c1', userId: 'u2', status: 'pending' },
            { $id: 's3', challengeId: 'c2', userId: 'u3', status: 'pending' },
          ],
        };
      return {
        total: 2,
        rows: [
          { $id: 'c1', name: 'Desafio um' },
          { $id: 'c2', name: 'Desafio dois' },
        ],
      };
    });
    const getRow = vi.fn();
    const ctx = {
      tables: { listRows, getRow },
      databaseId: 'nuy-creators',
      actor: { userId: 'moderador', roles: ['moderator'] },
      now: new Date('2026-11-04T12:00:00.000Z'),
      correlationId: 'queue-unit',
    } as unknown as CoreContext;

    const result = await moderationQueue(ctx, { limit: 100 });

    expect(result.ok && result.value.items.map((item) => item.challengeName)).toEqual([
      'Desafio um',
      'Desafio um',
      'Desafio dois',
    ]);
    expect(listRows).toHaveBeenCalledTimes(2);
    expect(getRow).not.toHaveBeenCalled();
  });
});
