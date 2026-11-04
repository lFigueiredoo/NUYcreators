import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? ' http: ws:' : ''}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const config: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // O formulário de catálogo aceita imagem de até 5 MB (`MEDIA_MAX_BYTES`) e
      // o campo promete esse número na tela. O padrão do Next para o corpo de uma
      // Server Action é 1 MB, e o teto é MEDIDO no corpo HTTP cru: uma foto de
      // 2,07 MB não devolvia recado nenhum — a requisição morria com
      // `ERR_CONNECTION_RESET` e o operador ficava olhando "Enviando…" para
      // sempre. Aqui o teto passa a caber o que o próprio produto diz aceitar,
      // com folga para o que o `multipart/form-data` acrescenta (limites, cabeça
      // de parte e metadados) — que a documentação do Next estima em 10 a 20 KB.
      bodySizeLimit: '6mb',
    },
  },
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
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
