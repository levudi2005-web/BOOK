import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    const isolatedSources =
      process.env.NODE_ENV === 'development'
        ? ' http://127.0.0.1:* http://localhost:*'
        : '';
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:${isolatedSources} https://freedombook.duckdns.org https://bookfreedom.id.vn https://www.bookfreedom.id.vn https://*.levudi2005.workers.dev; font-src 'self' data:; connect-src 'self'${isolatedSources} https://freedombook.duckdns.org https://bookfreedom.id.vn https://www.bookfreedom.id.vn https://cloudflareinsights.com https://*.levudi2005.workers.dev; worker-src 'self' blob:; frame-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
