import { describe, expect, it } from 'vitest';
import { signupSchema, loginSchema } from '../../src/features/auth/schemas/auth';
import { onboardingSchema } from '../../src/features/profiles/schemas/onboarding';
import { postLoginRoute, signedInRoute } from '../../src/features/auth/services/onboarding-gate';
import {
  failureMessage,
  refusalMessage,
} from '../../src/features/auth/services/onboarding-refusal';
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
describe('post-login destination', () => {
  it('sends a completed profile to the workspace', () => {
    expect(postLoginRoute({ onboardingCompletedAt: '2026-01-01T00:00:00.000Z' })).toBe('/app');
  });
  it('sends an incomplete, missing or unreadable profile to onboarding', () => {
    // O marcador só existe em perfil completo; qualquer outra forma — inclusive
    // a leitura indisponível (`null`) — cai no onboarding, que é resumível.
    for (const value of [null, {}, { onboardingCompletedAt: '' }, { onboardingCompletedAt: 0 }])
      expect(postLoginRoute(value)).toBe('/onboarding');
  });
});

describe('destino de quem já está autenticado', () => {
  const concluded = { onboardingCompletedAt: '2026-01-01T00:00:00.000Z' };

  it('operador com onboarding de criadora INCOMPLETO vai para a administração', () => {
    // A operação não passa pelo formulário de perfil: sem perfil nenhum, o
    // destino de quem tem membership confirmada em `nuy-admins` é o /admin.
    expect(signedInRoute(null, ['admin'])).toBe('/admin');
    expect(signedInRoute({}, ['moderator'])).toBe('/admin');
    expect(signedInRoute({ onboardingCompletedAt: '' }, ['fulfillment'])).toBe('/admin');
  });

  it('criadora sem onboarding concluído vai para o onboarding', () => {
    for (const value of [null, {}, { onboardingCompletedAt: '' }])
      expect(signedInRoute(value, [])).toBe('/onboarding');
  });

  it('criadora com onboarding concluído vai para a área', () => {
    expect(signedInRoute(concluded, [])).toBe('/app');
  });

  it('o destino administrativo tem precedência sobre o perfil concluído', () => {
    // Mesmo com o onboarding de criadora feito, quem opera entra na
    // administração — a prioridade é a da operação, não a do perfil.
    expect(signedInRoute(concluded, ['admin'])).toBe('/admin');
  });
});

describe('motivo da recusa ao salvar o perfil', () => {
  it('recusa com motivo conhecido diz o que fazer — não convida a insistir', () => {
    // Idade mínima e e-mail não verificado são recusas definitivas: a frase
    // "tente novamente mais tarde" prendia as duas num laço sem saída.
    for (const code of ['age_requirement', 'email_not_verified', 'account_disabled'])
      expect(refusalMessage(400, JSON.stringify({ error: code }))).not.toMatch(/tentar novamente/i);
    expect(refusalMessage(400, '{"error":"age_requirement"}')).toMatch(/idade mínima/i);
    expect(refusalMessage(403, '{"error":"email_not_verified"}')).toMatch(/e-mail/i);
  });

  it('motivo desconhecido e corpo ilegível continuam genéricos e retentáveis', () => {
    const generic = refusalMessage(503, '{"error":"profile_unavailable"}');
    expect(generic).toMatch(/tentar novamente/i);
    // Nunca inventa causa: corpo vazio, HTML de proxy ou JSON torto caem na
    // mesma frase — e o salvamento é resumível, então a frase é verdadeira.
    for (const body of [undefined, '', '<html>502</html>', '{"error":42}'])
      expect(refusalMessage(500, body)).toBe(generic);
  });

  it('Function sem a identidade da sessão é instalação não liberada, não indisponibilidade', () => {
    const notReleased = refusalMessage(401, '{"error":"unauthorized"}');
    expect(notReleased).not.toMatch(/tentar novamente/i);
    // Instalação sem idade mínima/versão dos termos configuradas na Function é a
    // mesma família: definitiva, resolvida por quem opera.
    expect(refusalMessage(503, '{"error":"participation_policy_unconfigured"}')).toBe(notReleased);
    // A plataforma recusando a execução (função desabilitada ou fora dos papéis
    // de `execute`) é a mesma conclusão vista do outro lado.
    for (const code of [401, 403, 404]) expect(failureMessage({ code })).toBe(notReleased);
    for (const code of [429, 500, 503, undefined])
      expect(failureMessage({ code })).toMatch(/tentar novamente/i);
    // Falha de rede chega sem `code`: retentável, como sempre foi.
    expect(failureMessage(new Error('fetch failed'))).toMatch(/tentar novamente/i);
  });
});
