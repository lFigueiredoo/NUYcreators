import { describe, expect, it } from 'vitest';
import {
  isAtLeastAge,
  latestEligibleBirthDate,
} from '../../src/features/profiles/domain/age';
import { onboardingSchema } from '../../src/features/profiles/schemas/onboarding';

const instant = new Date('2026-11-04T00:30:00.000Z');

describe('política civil de idade', () => {
  it('usa o dia vigente no Brasil, não o dia UTC', () => {
    expect(latestEligibleBirthDate(18, instant)).toBe('2008-11-03');
    expect(isAtLeastAge('2008-11-03', 18, instant)).toBe(true);
    expect(isAtLeastAge('2008-11-04', 18, instant)).toBe(false);
  });

  it('trata corretamente o limite do aniversário e anos bissextos', () => {
    const february = new Date('2026-02-28T15:00:00.000Z');
    const march = new Date('2026-03-01T15:00:00.000Z');
    expect(isAtLeastAge('2008-02-29', 18, february)).toBe(false);
    expect(isAtLeastAge('2008-02-29', 18, march)).toBe(true);
  });

  it('rejeita menor de idade no schema compartilhado pelo cadastro e pela edição', () => {
    const input = {
      name: 'Pessoa',
      phone: '11999999999',
      city: 'São Paulo',
      state: 'SP',
      birthDate: '2020-01-01',
      niche: 'casa',
      creatorType: 'ugc',
      instagram: '',
      tiktok: '',
      youtube: '',
      terms: 'on',
    };
    expect(onboardingSchema.safeParse(input).success).toBe(false);
  });
});
