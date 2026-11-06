/** Versões dos documentos legais atualmente publicados e vigentes. */
export const CURRENT_TERMS_VERSION = '2026-10-29-v3';
export const CURRENT_PRIVACY_VERSION = '2026-10-29-v2';
/**
 * Versão gravada no aceite combinado exibido pelo produto.
 *
 * A coluna histórica se chama `acceptedTermsVersion`, mas o checkbox cobre os
 * dois documentos. Compor as versões aqui faz uma alteração em qualquer um
 * deles exigir novo aceite e deixa a prova completa em um único valor.
 */
export const CURRENT_LEGAL_CONSENT_VERSION =
  `terms:${CURRENT_TERMS_VERSION}|privacy:${CURRENT_PRIVACY_VERSION}` as const;
export const LEGAL_EFFECTIVE_DATE = '29/10/2026';
