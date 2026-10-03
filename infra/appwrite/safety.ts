export function assertAppwriteEndpoint(endpoint: string | undefined) {
  if (!endpoint)
    throw new Error('APPWRITE_ENDPOINT ausente. Configure o endpoint aprovado da infraestrutura.');
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('APPWRITE_ENDPOINT inválido.');
  }
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/v1' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Endpoint exige HTTPS, path /v1 e ausência de usuário, senha, query ou fragmento. O domínio não identifica o projeto.',
    );
  }
}
export function assertDedicatedProject(env: Record<string, string | undefined>) {
  assertAppwriteEndpoint(env.APPWRITE_ENDPOINT);
  if (!env.APPWRITE_EXPECTED_PROJECT_ID)
    throw new Error(
      'APPWRITE_EXPECTED_PROJECT_ID ausente. Informe o ID aprovado para NUY Creators; ele não será inferido ou copiado automaticamente.',
    );
  if (env.APPWRITE_PROJECT_ID !== env.APPWRITE_EXPECTED_PROJECT_ID)
    throw new Error(
      'APPWRITE_PROJECT_ID difere de APPWRITE_EXPECTED_PROJECT_ID. Nenhuma requisição ou fallback autorizado.',
    );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(env.APPWRITE_PROJECT_ID))
    throw new Error('Formato de Project ID inválido.');
  if (!env.APPWRITE_PROJECT_ID || env.APPWRITE_DEDICATED_PROJECT_CONFIRMED !== 'true')
    throw new Error(
      'Confirme o ID do projeto dedicado NUY Creators e APPWRITE_DEDICATED_PROJECT_CONFIRMED=true.',
    );
  if (!['development', 'staging'].includes(env.APPWRITE_TEST_ENVIRONMENT ?? ''))
    throw new Error(
      'APPWRITE_TEST_ENVIRONMENT deve ser development ou staging antes da validação/provisionamento desta rodada.',
    );
  if ((env.APPWRITE_DATABASE_ID || 'nuy-creators') !== 'nuy-creators')
    throw new Error(
      'Esta infraestrutura só pode provisionar o database nuy-creators. Não haverá fallback ou adoção de outro banco.',
    );
  if ((env.APPWRITE_ADMIN_TEAM_ID || 'nuy-admins') !== 'nuy-admins')
    throw new Error('Team ID deve ser nuy-admins nesta versão.');
}
export function assertTestEnvironment(env: Record<string, string | undefined>) {
  assertDedicatedProject(env);
  if (
    env.APPWRITE_RUN_INTEGRATION_TESTS !== 'true' ||
    !['development', 'staging'].includes(env.APPWRITE_TEST_ENVIRONMENT ?? '') ||
    !env.APPWRITE_TEST_API_KEY
  ) {
    throw new Error(
      'Testes Cloud bloqueados: exige opt-in, ambiente development/staging dedicado e APPWRITE_TEST_API_KEY separada. Nenhuma fixture foi criada.',
    );
  }
}
