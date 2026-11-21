/**
 * Centralised API base-URL resolution and URL joining for the web app.
 *
 * `NEXT_PUBLIC_API_URL` is a **build-time** variable: Next.js inlines its value
 * into the client bundle. Cloudflare Worker `vars` (see `wrangler.jsonc`) are
 * runtime-only bindings and can never reach the browser bundle, so a build
 * performed without the variable falls back to a same-origin `/api` path. On a
 * `*.workers.dev` host that path is answered by the frontend Worker itself
 * (HTML 404) instead of the JSON API — the exact login failure this module
 * guards against.
 */

export const DEFAULT_API_BASE = '/api';

export type ApiBaseStatus = {
  /** Normalised base used to build request URLs. */
  base: string;
  source: 'env' | 'default';
  isAbsolute: boolean;
  /** True when the frontend is served from a Cloudflare Worker/Pages host. */
  isCloudflareHost: boolean;
  /** True when API calls would hit the frontend Worker instead of the backend. */
  misrouted: boolean;
  message?: string;
};

const CLOUDFLARE_HOST_PATTERN = /(^|\.)(workers\.dev|pages\.dev)$/i;
const ABSOLUTE_HTTP_PATTERN = /^https?:\/\//i;
const ANY_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

function collapseSlashes(path: string): string {
  return path.replace(/\/{2,}/g, '/');
}

export function isCloudflareFrontendHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  return CLOUDFLARE_HOST_PATTERN.test(hostname.trim());
}

/**
 * Normalises a configured API base: trims spaces, drops trailing slashes,
 * collapses duplicate slashes and rejects non-HTTP schemes. An empty or
 * unusable value falls back to the same-origin `/api` path.
 */
export function normalizeApiBase(raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return DEFAULT_API_BASE;

  if (ANY_SCHEME_PATTERN.test(value) && !ABSOLUTE_HTTP_PATTERN.test(value)) {
    // e.g. `javascript:` or `ws:` would break fetch/XHR; stay on the safe default.
    return DEFAULT_API_BASE;
  }

  if (ABSOLUTE_HTTP_PATTERN.test(value)) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return DEFAULT_API_BASE;
    }
    const path = collapseSlashes(parsed.pathname).replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${path}`;
  }

  const path = collapseSlashes(`/${value.replace(/^\/+/, '')}`).replace(/\/+$/, '');
  return path === '' ? DEFAULT_API_BASE : path;
}

function apiBasePath(base: string): string {
  if (!ABSOLUTE_HTTP_PATTERN.test(base)) return base;
  try {
    return new URL(base).pathname;
  } catch {
    return '';
  }
}

/**
 * Joins a normalised base with an API path, never producing a duplicated
 * segment such as `/api/api/...` when callers pass a path that already starts
 * with the base's last segment.
 */
export function joinApiUrl(base: string, path: string): string {
  const safeBase = normalizeApiBase(base);
  const suffix = `/${(path ?? '').replace(/^\/+/, '')}`;
  if (suffix === '/') return safeBase;

  const baseTail = apiBasePath(safeBase).split('/').filter(Boolean).pop() ?? '';
  if (baseTail && (suffix === `/${baseTail}` || suffix.startsWith(`/${baseTail}/`))) {
    return `${safeBase}${suffix.slice(baseTail.length + 1)}`;
  }
  return `${safeBase}${suffix}`;
}

/**
 * Resolves the configured base plus a diagnosis of whether requests can
 * actually reach the backend from the current host.
 */
export function resolveApiBaseStatus(
  rawEnv?: string | null,
  options: { hostname?: string | null } = {},
): ApiBaseStatus {
  const trimmed = (rawEnv ?? '').trim();
  const base = normalizeApiBase(trimmed);
  const isAbsolute = ABSOLUTE_HTTP_PATTERN.test(base);
  const hostname = options.hostname ?? null;
  const isCloudflareHost = isCloudflareFrontendHost(hostname);
  const misrouted = !isAbsolute && isCloudflareHost;

  const status: ApiBaseStatus = {
    base,
    source: trimmed ? 'env' : 'default',
    isAbsolute,
    isCloudflareHost,
    misrouted,
  };

  if (misrouted) {
    status.message =
      'NEXT_PUBLIC_API_URL không có trong bản build production nên API sẽ trỏ vào chính frontend Worker ' +
      `(${hostname}) thay vì backend. Hãy build lại với NEXT_PUBLIC_API_URL là URL tuyệt đối, ` +
      'ví dụ https://freedombook.duckdns.org/api.';
  }

  return status;
}

export function currentHostname(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.hostname;
}
