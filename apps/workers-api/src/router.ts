import { generateGatewayNonce, signGatewayRequest } from './hmac.js';

export type Env = {
  GATEWAY_HMAC_SECRET?: string;
  VPS_GATEWAY_URL?: string;
  CORS_ORIGINS?: string;
};

/**
 * Public → gateway route table. Each entry maps a public Workers path (with a
 * `:param` segment) to a VPS Data Gateway path. The Workers transport layer
 * never talks to MariaDB directly — it only HMAC-signs and forwards.
 */
const ROUTES: { method: string; pattern: RegExp; gateway: (m: RegExpMatchArray) => string }[] = [
  { method: 'GET', pattern: /^\/health$/, gateway: () => '/gateway/health' },
  { method: 'GET', pattern: /^\/books$/, gateway: () => '/gateway/books' },
  { method: 'GET', pattern: /^\/books\/([^/]+)$/, gateway: (m) => `/gateway/books/${m[1]}` },
  { method: 'GET', pattern: /^\/categories$/, gateway: () => '/gateway/categories' },
  { method: 'GET', pattern: /^\/authors$/, gateway: () => '/gateway/authors' },
  { method: 'GET', pattern: /^\/publishers$/, gateway: () => '/gateway/publishers' },
  { method: 'POST', pattern: /^\/auth\/register$/, gateway: () => '/gateway/auth/register' },
  { method: 'POST', pattern: /^\/auth\/login$/, gateway: () => '/gateway/auth/login' },
  { method: 'POST', pattern: /^\/auth\/logout$/, gateway: () => '/gateway/auth/logout' },
  { method: 'POST', pattern: /^\/auth\/reset-password$/, gateway: () => '/gateway/auth/reset-password' },
  { method: 'POST', pattern: /^\/auth\/change-password$/, gateway: () => '/gateway/auth/change-password' },
  { method: 'POST', pattern: /^\/auth\/security-key\/rotate$/, gateway: () => '/gateway/auth/security-key/rotate' },
];

export function matchRoute(method: string, pathname: string): string | null {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (match) return route.gateway(match);
  }
  return null;
}

export async function forwardToGateway(
  request: Request,
  env: Env,
  gatewayPath: string,
  targetBase: string,
): Promise<Response> {
  const secret = env.GATEWAY_HMAC_SECRET ?? '';
  if (!secret) {
    return new Response(JSON.stringify({ statusCode: 500, message: 'Gateway secret not configured.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = generateGatewayNonce();
  const signature = await signGatewayRequest({
    secret,
    timestamp,
    nonce,
    method: request.method,
    path: gatewayPath,
  });

  const target = `${targetBase}${gatewayPath}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set('x-gateway-timestamp', timestamp);
  headers.set('x-gateway-nonce', nonce);
  headers.set('x-gateway-signature', signature);
  headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') ?? '');

  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });
}
