import { createHmac, randomBytes } from 'node:crypto';
import { config } from './config.js';

export function signGatewayRequest(timestamp: string, nonce: string, method: string, path: string): string {
  return createHmac('sha256', config.gatewayHmacSecret)
    .update(`${timestamp}.${nonce}.${method}.${path}`, 'utf8')
    .digest('hex');
}

export async function callGateway(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('base64url');
  const signature = signGatewayRequest(timestamp, nonce, method, path);

  const response = await fetch(`${config.gatewayUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-gateway-timestamp': timestamp,
      'x-gateway-nonce': nonce,
      'x-gateway-signature': signature,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: unknown = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: response.ok, status: response.status, data };
}
