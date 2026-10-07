/**
 * Vocabulário da auditoria para quem opera.
 *
 * O que está gravado em `audit_logs.action` são os nomes que o núcleo escreve —
 * e é isso que o banco guarda. Aqui só existe a tradução para leitura humana.
 * Ação desconhecida aparece CRUA, nunca traduzida no chute: um mapa que adivinha
 * faria a equipe ler "Desafio atualizado" para uma ação que ninguém previu.
 */
const ACTIONS: Record<string, string> = {
  'challenge.created': 'Desafio criado',
  'challenge.updated': 'Desafio editado',
  'challenge.published': 'Desafio publicado',
  'challenge.closed': 'Desafio encerrado',
  'challenge.joined': 'Creator entrou no desafio',
  'reward.created': 'Recompensa criada',
  'reward.updated': 'Recompensa editada',
  'reward.published': 'Recompensa ativada',
  'reward.closed': 'Recompensa desativada',
  'reward.stock_changed': 'Estoque ajustado',
  'reward.redeemed': 'Recompensa resgatada',
  'campaign.created': 'Campanha criada',
  'campaign.updated': 'Campanha editada',
  'submission.created': 'Conteúdo enviado',
  'submission.approved': 'Envio aprovado',
  'submission.rejected': 'Envio recusado',
  'submission.revision_requested': 'Revisão solicitada',
  'submission.pending': 'Envio reaberto para análise',
  'points.credited': 'Pontos creditados',
  'points.debited': 'Pontos debitados',
};

export function auditActionLabel(action: string) {
  return ACTIONS[action] ?? action;
}

/** Nome legível da entidade afetada, para a linha de auditoria não mostrar só o id. */
const ENTITIES: Record<string, string> = {
  challenges: 'desafio',
  rewards: 'recompensa',
  campaigns: 'campanha',
  challenge_submissions: 'envio',
  point_accounts: 'saldo',
  reward_redemptions: 'resgate',
  profiles: 'perfil',
};

export function entityLabel(entityType: string) {
  return ENTITIES[entityType] ?? entityType;
}
