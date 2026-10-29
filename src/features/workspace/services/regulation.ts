import 'server-only';

export type RegulationPublication = {
  promoterLegalName: string | null;
  promoterTradeName: string | null;
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

const providedPublicationData = {
  promoterLegalName: 'SIRMIONE COMERCIO E DISTRIBUICAO LTDA',
  promoterTradeName: 'NSN COMERCIO E DISTRIBUICAO',
  promoterAddress: 'Rua Projetada, S/N, Distrito Mecânico, Pedras de Fogo - PB, CEP 58.328-000',
  promoterCnpj: '36.120.044/0001-00',
  participationStartsAt: '03/11/2026',
  participationEndsAt: '03/11/2027 (12 meses)',
  viralViewsGoal: '20.000 (vinte mil) visualizações',
  supportEmail: 'mundonuy@gmail.com',
} as const;

function publicationValue(environmentName: string, fallback: string): string {
  return optionalEnvironment(environmentName) ?? fallback;
}

/**
 * Campos institucionais do Regulamento.
 *
 * O texto-base e os dados institucionais fornecidos oficialmente pela NUY são
 * versionados no produto. O ambiente pode substituir um valor em um deployment
 * futuro sem duplicar a página. O certificado continua sem fallback: enquanto
 * não for informado, a tela o apresenta como pendência.
 */
export function loadRegulationPublication(): RegulationPublication {
  return {
    promoterLegalName: publicationValue(
      'NUY_PROMOTER_LEGAL_NAME',
      providedPublicationData.promoterLegalName,
    ),
    promoterTradeName: publicationValue(
      'NUY_PROMOTER_TRADE_NAME',
      providedPublicationData.promoterTradeName,
    ),
    promoterAddress: publicationValue(
      'NUY_PROMOTER_ADDRESS',
      providedPublicationData.promoterAddress,
    ),
    promoterCnpj: publicationValue('NUY_PROMOTER_CNPJ', providedPublicationData.promoterCnpj),
    participationStartsAt: publicationValue(
      'NUY_REGULATION_STARTS_AT',
      providedPublicationData.participationStartsAt,
    ),
    participationEndsAt: publicationValue(
      'NUY_REGULATION_ENDS_AT',
      providedPublicationData.participationEndsAt,
    ),
    viralViewsGoal: publicationValue(
      'NUY_REGULATION_VIRAL_VIEWS_GOAL',
      providedPublicationData.viralViewsGoal,
    ),
    supportEmail: publicationValue(
      'NUY_REGULATION_SUPPORT_EMAIL',
      providedPublicationData.supportEmail,
    ),
    authorizationCertificate: optionalEnvironment('NUY_REGULATION_AUTHORIZATION_CERTIFICATE'),
  };
}
