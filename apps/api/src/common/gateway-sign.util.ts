import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Service-to-service HMAC signature contract shared by the VPS Data Gateway
 * and the Cloudflare Workers transport layer.
 *
 * Signature = HMAC-SHA256(secret, "{timestamp}.{nonce}.{METHOD}.{path}") as hex.
 * The timestamp is Unix epoch **seconds**; the gateway rejects drift > 300s and
 * replays of the same nonce.
 */

export interface GatewaySignInput {
  secret: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
}

export function gatewayMessage(input: GatewaySignInput): string {
  return `${input.timestamp}.${input.nonce}.${input.method}.${input.path}`;
}

/** Produce the hex HMAC-SHA256 signature for a gateway request. */
export function signGatewayRequest(input: GatewaySignInput): string {
  return createHmac('sha256', input.secret)
    .update(gatewayMessage(input), 'utf8')
    .digest('hex');
}

/** Constant-time comparison of a provided signature against the expected one. */
export function verifyGatewaySignature(
  input: GatewaySignInput,
  signature: string,
): boolean {
  if (!input.secret || !input.timestamp || !input.nonce || !signature) return false;
  const expected = Buffer.from(signGatewayRequest(input), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/** Generate a fresh anti-replay nonce (base64url, 16 bytes). */
export function generateGatewayNonce(): string {
  return randomBytes(16).toString('base64url');
}
