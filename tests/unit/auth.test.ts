import { describe, expect, it } from 'vitest';
import { signupSchema, loginSchema } from '../../src/features/auth/schemas/auth';
import { onboardingSchema } from '../../src/features/profiles/schemas/onboarding';
const profile = {
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
describe('auth contracts', () => {
  it('requires valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
  });
  it('requires explicit terms', () => {
    expect(
      signupSchema.safeParse({ email: 'a@example.com', password: '12345678', name: 'Pessoa' })
        .success,
    ).toBe(false);
  });
  it('accepts an optional empty social profile', () => {
    expect(onboardingSchema.safeParse(profile).success).toBe(true);
  });
  it('rejects off-platform and insecure social links', () => {
    for (const instagram of [
      'https://evil.com/name',
      'http://instagram.com/name',
      'https://instagram.com.evil.com/name',
    ])
      expect(onboardingSchema.safeParse({ ...profile, instagram }).success).toBe(false);
  });
  it('rejects future birth dates and invented UF', () => {
    expect(onboardingSchema.safeParse({ ...profile, state: 'XX' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...profile, birthDate: '2099-01-01' }).success).toBe(false);
  });
  it('discards privilege escalation fields', () => {
    const result = onboardingSchema.parse({ ...profile, role: 'admin', points: 10000 });
    expect(result).not.toHaveProperty('role');
    expect(result).not.toHaveProperty('points');
  });
});
