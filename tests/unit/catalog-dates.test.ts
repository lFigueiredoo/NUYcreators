import { describe, expect, it } from 'vitest';
import { instantIn } from '../../src/features/workspace/core/catalog';
import {
  challengeIssues,
  parseCivilDateTime,
  type ChallengeDraft,
} from '../../src/features/workspace/domain/catalog';
import { rankingTimeZone } from '../../src/features/workspace/domain/ranking';

const draft = (startsAt: string, endsAt = '2026-03-10T10:00'): ChallengeDraft => ({
  slug: 'data-civil',
  name: 'Data civil',
  description: 'Validação das datas civis antes de gravar o catálogo.',
  platform: 'instagram',
  startsAt,
  endsAt,
  points: 10,
  imageFileId: '',
  requiredLevelId: '',
  participantLimit: null,
  campaignId: '',
  productId: '',
  hashtags: '',
  mentions: '',
  requirements: [],
});

describe('datas civis do catálogo', () => {
  it.each(['2026-02-29T10:00', '2026-02-31T10:00', '2026-04-31T10:00'])(
    'recusa o dia inexistente %s no domínio e na conversão para instante',
    (value) => {
      expect(parseCivilDateTime(value)).toBeNull();
      expect(challengeIssues(draft(value))).toContain(
        'Informe a data de início no formato AAAA-MM-DDTHH:mm.',
      );
      expect(instantIn(value, rankingTimeZone)).toBeNull();
    },
  );

  it('ancora o valor inteiro e não aceita lixo depois de um prefixo válido', () => {
    const value = '2026-02-28T10:00<script>';
    expect(parseCivilDateTime(value)).toBeNull();
    expect(instantIn(value, rankingTimeZone)).toBeNull();
  });

  it('aceita ano bissexto e preserva hora de São Paulo e instante explícito', () => {
    expect(challengeIssues(draft('2028-02-29T10:00', '2028-03-01T10:00'))).toEqual([]);
    expect(instantIn('2028-02-29T10:00', rankingTimeZone)).toBe('2028-02-29T13:00:00.000Z');
    expect(instantIn('2028-02-29T10:00:30.125-03:00', rankingTimeZone)).toBe(
      '2028-02-29T13:00:30.125Z',
    );
  });
});
