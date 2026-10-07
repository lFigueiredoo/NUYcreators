import type { AdminRole } from '@/lib/security/permissions';

/**
 * Destino de quem chega autenticado.
 *
 * A conclusão do onboarding tem uma única fonte de verdade: o documento
 * privado `profiles/{userId}` no Appwrite, onde a função `complete-onboarding`
 * grava `onboardingCompletedAt` por ÚLTIMO (o marcador nunca existe em perfil
 * parcial). Este módulo não cria estado nenhum — só decide a rota a partir do
 * que a função já escreve.
 *
 * A prioridade é a da operação: quem tem membership CONFIRMADA em `nuy-admins`
 * é operador administrativo, e o lugar dele é o `/admin`. Exigir o perfil de
 * criadora para chegar lá prendia a operação no formulário de onboarding. A
 * apuração dos papéis não mora aqui (vem de `sessionRoles`, a MESMA que
 * `requireStaff` usa): este módulo só ORDENA o destino — nunca concede acesso.
 */
export const ONBOARDING_ROUTE = '/onboarding';
export const WORKSPACE_ROUTE = '/app';
export const ADMIN_ROUTE = '/admin';

export function postLoginRoute(
  profile: { onboardingCompletedAt?: unknown } | null,
): typeof ONBOARDING_ROUTE | typeof WORKSPACE_ROUTE {
  // Documento ausente, campo ausente e leitura indisponível (`null`) caem todos
  // no onboarding: o formulário é resumível e regrava por upsert, então repetir
  // é seguro — mandar para `/app` quem não concluiu não é.
  return typeof profile?.onboardingCompletedAt === 'string' && profile.onboardingCompletedAt
    ? WORKSPACE_ROUTE
    : ONBOARDING_ROUTE;
}

export function signedInRoute(
  profile: { onboardingCompletedAt?: unknown } | null,
  roles: readonly AdminRole[],
): typeof ADMIN_ROUTE | typeof ONBOARDING_ROUTE | typeof WORKSPACE_ROUTE {
  // Destino administrativo ANTES do onboarding de criadora: o operador não é
  // criadora em onboarding, e o perfil de criadora dele pode nunca existir.
  if (roles.length) return ADMIN_ROUTE;
  return postLoginRoute(profile);
}
