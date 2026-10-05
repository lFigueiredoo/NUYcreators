import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    // Hero packshot is rendered at 90; everything else stays at the default 75.
    qualities: [75, 90],
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
