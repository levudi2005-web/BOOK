/** Extract the raw token from an `Authorization: Bearer <token>` header. */
export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization) return '';
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? (token ?? '') : '';
}

type RequestLike = {
  ip?: string;
  headers: Record<string, unknown>;
};

/** Resolve the effective client IP from a request (respects X-Forwarded-For). */
export function clientIp(request: RequestLike): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? 'unknown';
}

