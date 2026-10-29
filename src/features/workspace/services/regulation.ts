import 'server-only';

export type RegulationPublication = {
  promoterLegalName: string | null;
  promoterAddress: string | null;
  promoterCnpj: string | null;
  participationStartsAt: string | null;
  participationEndsAt: string | null;
  viralViewsGoal: string | null;
  supportEmail: string | null;
  authorizationCertificate: string | null;
};

function optionalEnvironment(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * Campos institucionais do Regulamento.
 *
 * O texto-base é versionado no produto, mas dados que não podem ser inventados
 * vêm da configuração do ambiente. Enquanto um campo não estiver configurado,
 * a tela o apresenta como pendência — nunca como informação oficial fictícia.
 */
export function loadRegulationPublication(): RegulationPublication {
  return {
    promoterLegalName: optionalEnvironment('NUY_PROMOTER_LEGAL_NAME'),
    promoterAddress: optionalEnvironment('NUY_PROMOTER_ADDRESS'),
    promoterCnpj: optionalEnvironment('NUY_PROMOTER_CNPJ'),
    participationStartsAt: optionalEnvironment('NUY_REGULATION_STARTS_AT'),
    participationEndsAt: optionalEnvironment('NUY_REGULATION_ENDS_AT'),
    viralViewsGoal: optionalEnvironment('NUY_REGULATION_VIRAL_VIEWS_GOAL'),
    supportEmail: optionalEnvironment('NUY_REGULATION_SUPPORT_EMAIL'),
    authorizationCertificate: optionalEnvironment('NUY_REGULATION_AUTHORIZATION_CERTIFICATE'),
  };
}
