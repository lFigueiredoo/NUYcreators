/**
 * Destino pós-login.
 *
 * A conclusão do onboarding tem uma única fonte de verdade: o documento
 * privado `profiles/{userId}` no Appwrite, onde a função `complete-onboarding`
 * grava `onboardingCompletedAt` por ÚLTIMO (o marcador nunca existe em perfil
 * parcial). Este módulo não cria estado nenhum — só decide a rota a partir do
 * que a função já escreve.
 */
export const ONBOARDING_ROUTE = '/onboarding';
export const WORKSPACE_ROUTE = '/app';

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
