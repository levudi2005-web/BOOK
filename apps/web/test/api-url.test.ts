import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_API_BASE,
  joinApiUrl,
  normalizeApiBase,
  resolveApiBaseStatus,
} from '../src/lib/api-url.js';
import { fetchBooks } from '../src/lib/api.js';

// The public production API base configured for the frontend build.
const PRODUCTION_API_BASE = 'https://freedombook.duckdns.org/api';
const BACKEND_LOGIN = 'https://freedombook.duckdns.org/api/auth/login';

// The Worker that serves the frontend only (no backend routes on this origin).
const WORKER_HOST = 'bookforfreedom-web.levudi2005.workers.dev';
const WORKER_ORIGIN = `https://${WORKER_HOST}`;
const WORKER_LOGIN = `${WORKER_ORIGIN}/api/auth/login`;

test('normalizeApiBase keeps the absolute production base and drops trailing slashes', () => {
  assert.equal(normalizeApiBase(PRODUCTION_API_BASE), PRODUCTION_API_BASE);
  assert.equal(normalizeApiBase('https://freedombook.duckdns.org/api/'), PRODUCTION_API_BASE);
  assert.equal(normalizeApiBase('  https://freedombook.duckdns.org/api//  '), PRODUCTION_API_BASE);
});

test('normalizeApiBase falls back to the same-origin default for empty or unsafe values', () => {
  assert.equal(normalizeApiBase(undefined), DEFAULT_API_BASE);
  assert.equal(normalizeApiBase(null), DEFAULT_API_BASE);
  assert.equal(normalizeApiBase(''), DEFAULT_API_BASE);
  assert.equal(normalizeApiBase('   '), DEFAULT_API_BASE);
  assert.equal(normalizeApiBase('javascript:alert(1)'), DEFAULT_API_BASE);
  assert.equal(normalizeApiBase('ws://evil.example'), DEFAULT_API_BASE);
});

test('login resolves to the backend endpoint', () => {
  const loginUrl = joinApiUrl(normalizeApiBase(PRODUCTION_API_BASE), '/auth/login');
  assert.equal(loginUrl, BACKEND_LOGIN);
});

test('login never resolves to the frontend Worker origin', () => {
  const loginUrl = joinApiUrl(normalizeApiBase(PRODUCTION_API_BASE), '/auth/login');
  assert.notEqual(loginUrl, WORKER_LOGIN);
  assert.ok(!loginUrl.startsWith(WORKER_ORIGIN), `${loginUrl} must not target the frontend Worker`);
});

test('paths that already contain /api never produce /api/api', () => {
  assert.equal(joinApiUrl(PRODUCTION_API_BASE, '/api/auth/login'), BACKEND_LOGIN);
  assert.equal(joinApiUrl(PRODUCTION_API_BASE, 'api/auth/login'), BACKEND_LOGIN);
  assert.equal(joinApiUrl(`${PRODUCTION_API_BASE}/`, '/api/auth/login'), BACKEND_LOGIN);
  assert.equal(joinApiUrl('/api', '/api/books'), '/api/books');
});

test('a base without the /api suffix keeps the path as-is', () => {
  assert.equal(
    joinApiUrl('https://freedombook.duckdns.org', '/auth/login'),
    'https://freedombook.duckdns.org/auth/login',
  );
  assert.equal(
    joinApiUrl('https://freedombook.duckdns.org/', '/books?page=2'),
    'https://freedombook.duckdns.org/books?page=2',
  );
});

test('a relative base stays same-origin for the nginx single-origin deployment', () => {
  const status = resolveApiBaseStatus(undefined, { hostname: 'freedombook.duckdns.org' });
  assert.equal(status.base, DEFAULT_API_BASE);
  assert.equal(status.source, 'default');
  assert.equal(status.isCloudflareHost, false);
  assert.equal(status.misrouted, false);
  assert.equal(joinApiUrl(status.base, '/auth/login'), '/api/auth/login');
});

test('a build without NEXT_PUBLIC_API_URL on a Worker host is flagged as misrouted', () => {
  const status = resolveApiBaseStatus(undefined, { hostname: WORKER_HOST });
  assert.equal(status.source, 'default');
  assert.equal(status.isAbsolute, false);
  assert.equal(status.isCloudflareHost, true);
  assert.equal(status.misrouted, true);
  assert.match(status.message ?? '', /NEXT_PUBLIC_API_URL/);
  // The app refuses this request (assertApiBaseReachable throws), so the login
  // call can never be answered by the frontend Worker's HTML 404.
  assert.ok(!status.base.startsWith('http'), 'a misrouted base must stay relative');
});

test('the production build config on a Worker host targets the backend', () => {
  const status = resolveApiBaseStatus(PRODUCTION_API_BASE, { hostname: WORKER_HOST });
  assert.equal(status.misrouted, false);
  assert.equal(status.isAbsolute, true);
  assert.equal(status.isCloudflareHost, true);
  assert.equal(joinApiUrl(status.base, '/auth/login'), BACKEND_LOGIN);
  assert.notEqual(joinApiUrl(status.base, '/auth/login'), WORKER_LOGIN);
});

test('an absolute API host that happens to be a Worker is allowed when configured explicitly', () => {
  const explicit = 'https://bff-api.example.workers.dev';
  const status = resolveApiBaseStatus(explicit, { hostname: WORKER_HOST });
  assert.equal(status.misrouted, false);
  assert.equal(joinApiUrl(status.base, '/auth/login'), `${explicit}/auth/login`);
});

test('fetchBooks forwards the year filter alongside other catalog filters', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    await fetchBooks({
      q: 'sample',
      category: 'fiction',
      author: 'writer',
      publisher: 'press',
      year: '2024',
      sort: 'rating',
      page: 2,
      limit: 12,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const params = new URL(requestedUrl, 'https://test.example').searchParams;
  assert.equal(params.get('q'), 'sample');
  assert.equal(params.get('category'), 'fiction');
  assert.equal(params.get('author'), 'writer');
  assert.equal(params.get('publisher'), 'press');
  assert.equal(params.get('year'), '2024');
  assert.equal(params.get('sort'), 'rating');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('limit'), '12');
});
