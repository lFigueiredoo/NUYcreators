import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  definitiveActionTokenError,
  parseActionToken,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_PATH,
  serializeActionToken,
  VERIFICATION_TOKEN_COOKIE,
  VERIFICATION_TOKEN_PATH,
} from '../../src/features/auth/services/action-token';
import { proxy } from '../../src/proxy';

describe('tokens de recuperação e verificação', () => {
  it('serializa somente o par válido e rejeita conteúdo adulterado', () => {
    const token = { userId: 'creator.1', secret: 'segredo-do-appwrite' };
    expect(parseActionToken(serializeActionToken(token) ?? undefined)).toEqual(token);
    expect(parseActionToken('não-é-base64-json')).toBeNull();
    expect(serializeActionToken({ userId: '../fora', secret: 'x' })).toBeNull();
  });

  it('limpa a URL e guarda o token somente em cookie protegido', () => {
    const response = proxy(
      new NextRequest(
        'https://nuy.example/verificar-email?userId=creator.1&secret=segredo-do-appwrite',
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://nuy.example/verificar-email');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    const cookie = response.cookies.get(VERIFICATION_TOKEN_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe(VERIFICATION_TOKEN_PATH);
    expect(parseActionToken(cookie?.value)).toEqual({
      userId: 'creator.1',
      secret: 'segredo-do-appwrite',
    });
  });

  it('não guarda callback incompleto e ainda remove a query sensível', () => {
    const response = proxy(new NextRequest('https://nuy.example/redefinir-senha?userId=creator.1'));
    expect(response.headers.get('location')).toBe('https://nuy.example/redefinir-senha');
    expect(response.headers.get('set-cookie')).not.toContain('creator.1');
  });

  it('mantém o token em falhas retentáveis e descarta apenas erros definitivos', () => {
    for (const code of [400, 401, 404, 409, 410, 422])
      expect(definitiveActionTokenError({ code })).toBe(true);
    expect(definitiveActionTokenError({ type: 'user_invalid_token', code: 500 })).toBe(true);
    expect(definitiveActionTokenError({ type: 'user_token_expired' })).toBe(true);

    for (const error of [new Error('fetch failed'), { code: 408 }, { code: 429 }, { code: 503 }])
      expect(definitiveActionTokenError(error)).toBe(false);
  });

  it('isola o token de redefinição na própria rota', () => {
    const response = proxy(
      new NextRequest(
        'https://nuy.example/redefinir-senha?userId=creator.1&secret=segredo-do-appwrite',
      ),
    );
    const cookie = response.cookies.get(RESET_TOKEN_COOKIE);
    expect(cookie?.path).toBe(RESET_TOKEN_PATH);
    expect(cookie?.httpOnly).toBe(true);
    expect(response.headers.get('location')).toBe('https://nuy.example/redefinir-senha');
  });
});
