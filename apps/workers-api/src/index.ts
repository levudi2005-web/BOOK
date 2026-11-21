import { forwardToGateway, matchRoute, type Env } from './router.js';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

function applyRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (!origin || allowed.length === 0 || !allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!applyRateLimit(clientIp(request))) {
      return new Response(JSON.stringify({ statusCode: 429, message: 'Too many requests.' }), {
        status: 429,
        headers: { 'content-type': 'application/json', ...cors },
      });
    }

    const gatewayPath = matchRoute(request.method, url.pathname);
    if (!gatewayPath) {
      return new Response(JSON.stringify({ statusCode: 404, message: 'Not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json', ...cors },
      });
    }

    const targetBase = (env.VPS_GATEWAY_URL ?? '').replace(/\/$/, '');
    const response = await forwardToGateway(request, env, gatewayPath, targetBase);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    return new Response(response.body, { status: response.status, headers });
  },
};

