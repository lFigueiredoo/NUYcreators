export const dailyChallenges = [
  {
    id: 'instagram-reels-feed',
    platform: 'Instagram',
    format: 'Reels ou vídeo no Feed',
    points: '10 pontos / post',
    rule: 'Pontua por publicação aprovada no feed.',
  },
  {
    id: 'instagram-photo-carousel',
    platform: 'Instagram',
    format: 'Foto ou carrossel',
    points: '10 pontos / post',
    rule: 'Pontua por publicação aprovada no feed.',
  },
  {
    id: 'instagram-stories',
    platform: 'Instagram',
    format: 'Stories',
    points: '1 ponto / story',
    rule: 'Máximo de 10 pontos por dia. Exemplo: 15 stories aprovados rendem 10 pontos.',
  },
  {
    id: 'tiktok-collab',
    platform: 'TikTok',
    format: 'Postagem colaborativa',
    points: '15 pontos / post',
    rule: 'Máximo de 2 posts por dia (até 30 pontos). Envie ou aceite a Collab com a NUY.',
  },
  {
    id: 'shopee-video',
    platform: 'Shopee',
    format: 'Shopee Vídeo',
    points: '20 pontos / vídeo',
    rule: 'Máximo de 2 vídeos por dia (até 40 pontos). Inclua o link do produto NUY.',
  },
] as const;

export type DailyChallenge = (typeof dailyChallenges)[number];
