/**
 * Rótulos de exibição — o valor do banco continua sendo o valor do banco.
 *
 * `ugc`, `instagram` e `bem-estar` são códigos de catálogo, não palavras: quem lê
 * o próprio perfil merece "Criadora de conteúdo UGC" e "Instagram". O mapa é SÓ
 * de tela — nenhum enum, payload, comando ou gravação passa por aqui, e um valor
 * que não está no mapa aparece cru (código desconhecido é código desconhecido,
 * nunca um rótulo traduzido no chute).
 *
 * A voz é a da área da creator — a mesma do resto da superfície, que fala com
 * ela no feminino ("Criadora", "Consumidora"). O formulário público de cadastro
 * tem as dele ("Creator UGC"): são dois contextos, não duas verdades.
 */
const PLATFORM: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const CREATOR_TYPE: Record<string, string> = {
  consumidor: 'Consumidora',
  ugc: 'Criadora de conteúdo UGC',
  influenciador: 'Influenciadora',
};

const NICHE: Record<string, string> = {
  casa: 'Casa',
  'bem-estar': 'Bem-estar',
  beleza: 'Beleza',
  lifestyle: 'Lifestyle',
  outro: 'Outro',
};

export const platformLabel = (value: string) => PLATFORM[value] ?? value;
export const creatorTypeLabel = (value: string) => CREATOR_TYPE[value] ?? value;
export const nicheLabel = (value: string) => NICHE[value] ?? value;
