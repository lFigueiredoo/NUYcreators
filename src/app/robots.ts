import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/cadastro', '/termos', '/privacidade'],
      disallow: [
        '/admin',
        '/app',
        '/desafios',
        '/login',
        '/onboarding',
        '/ranking',
        '/recuperar-senha',
        '/recompensas',
        '/redefinir-senha',
        '/verificar-email',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
