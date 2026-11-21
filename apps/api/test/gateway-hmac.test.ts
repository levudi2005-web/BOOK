import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signGatewayRequest as signNode } from '../src/common/gateway-sign.util.js';

// Mirrors apps/workers-api/src/hmac.ts (Web Crypto) to prove the two
// implementations produce byte-identical signatures for the same input.
async function signWebCrypto(input: {
  secret: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
}): Promise<string> {
  const message = `${input.timestamp}.${input.nonce}.${input.method}.${input.path}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(signature);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

const SECRET = 'test-gateway-secret-for-compat-check';
const input = {
  secret: SECRET,
  timestamp: '1732100000',
  nonce: 'abc123',
  method: 'POST',
  path: '/gateway/auth/register',
};

test('gateway HMAC: Node crypto and Web Crypto produce identical signatures', async () => {
  const nodeSig = signNode(input);
  const webSig = await signWebCrypto(input);
  assert.equal(nodeSig, webSig);
  assert.equal(nodeSig.length, 64);
});

test('gateway HMAC: message format is timestamp.nonce.method.path', async () => {
  const sig = await signWebCrypto(input);
  const other = await signWebCrypto({ ...input, path: '/gateway/auth/login' });
  assert.notEqual(sig, other);
});

test('gateway nonce: base64url, non-empty, unique', () => {
  const a = generateNonce();
  const b = generateNonce();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
  assert.ok(!a.includes('+') && !a.includes('/') && !a.includes('='));
});

