import { NextResponse, type NextRequest } from 'next/server';
import {
  ACTION_TOKEN_MAX_AGE_SECONDS,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_PATH,
  VERIFICATION_TOKEN_COOKIE,
  VERIFICATION_TOKEN_PATH,
  serializeActionToken,
} from './features/auth/services/action-token';

const routes = {
  [RESET_TOKEN_PATH]: RESET_TOKEN_COOKIE,
  [VERIFICATION_TOKEN_PATH]: VERIFICATION_TOKEN_COOKIE,
} as const;

function privateHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

/**
 * Troca o token recebido do Appwrite por um cookie curto e inacessível ao JS.
 * A página nunca renderiza `userId`/`secret`, e a URL limpa é a única que segue
 * para o React, assets, histórico e navegações seguintes.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname as keyof typeof routes;
  const cookieName = routes[pathname];
  const hasCallbackToken =
    request.nextUrl.searchParams.has('userId') || request.nextUrl.searchParams.has('secret');

  if (request.method === 'GET' && hasCallbackToken) {
    const encoded = serializeActionToken({
      userId: request.nextUrl.searchParams.get('userId') ?? '',
      secret: request.nextUrl.searchParams.get('secret') ?? '',
    });
    const clean = request.nextUrl.clone();
    clean.search = '';
    const response = privateHeaders(NextResponse.redirect(clean));
    if (encoded)
      response.cookies.set(cookieName, encoded, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: pathname,
        maxAge: ACTION_TOKEN_MAX_AGE_SECONDS,
        priority: 'high',
      });
    else response.cookies.delete(cookieName);
    return response;
  }

  return privateHeaders(NextResponse.next());
}

export const config = {
  // O Next analisa `matcher` estaticamente no build; mantenha os literais aqui.
  matcher: ['/redefinir-senha', '/verificar-email'],
};
