/**
 * Service-to-service HMAC signature (Web Crypto) matching the VPS Data Gateway.
 *
 * Signature = HMAC-SHA256(secret, "{timestamp}.{nonce}.{METHOD}.{path}") as hex.
 * This is the Cloudflare Workers counterpart of
 * `apps/api/src/common/gateway-sign.util.ts` (Node crypto). Both produce the
 * same hex string for identical inputs.
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

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/** Produce the hex HMAC-SHA256 signature for a gateway request. */
export async function signGatewayRequest(input: GatewaySignInput): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(gatewayMessage(input)),
  );
  return toHex(signature);
}

/** Generate a fresh anti-replay nonce (16 bytes, base64url). */
export function generateGatewayNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
