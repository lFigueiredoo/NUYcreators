import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    // Hero packshot is rendered at 90; as fotografias da landing pedem 88 —
    // sem o degrau na lista o Next serve em 75 e avisa no console a cada
    // imagem (o bitmap servido não era o pedido).
    qualities: [75, 88, 90],
    // 1448 é a largura nativa do hero da Proposta C. Sem ele na lista, o srcset
    // salta de 1200 para 1920: em DPR1 o navegador servia 1200 para 1270 CSS px
    // (upscale) e em DPR2 pedia 3840 para receber 1448 de volta. Com o degrau
    // exato, o bitmap servido bate com a fonte nas duas densidades.
    deviceSizes: [640, 750, 828, 1080, 1200, 1448, 1920, 2048, 3840],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
