import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads the **test** environment only.
 *
 * Tests must never read the production `.env`: that file points at the live
 * MariaDB and would make write-tests mutate production data. We therefore
 * fail closed when no test env file is present instead of silently falling
 * back to production credentials.
 *
 * Resolution order:
 *   1. `TEST_ENV_FILE` (absolute or relative path)
 *   2. `apps/api/test/.env.test` (relative to the package working directory)
 */
export function resolveTestEnvPath(): string {
  const explicit = process.env.TEST_ENV_FILE;
  if (explicit) return resolve(explicit);
  return resolve(process.cwd(), 'test/.env.test');
}

/** Load a test env file into process.env.
 *
 * Values from the test file **always win**: playwright/webServer commands inherit
 * the caller shell, and a production `.env` exported in that shell would
 * otherwise leak into the test run (`KEY in process.env`), silently pointing
 * tests at the live database. `assertIsolatedTestDatabase()` below is the
 * second line of defence.
 */
export function loadEnv(path = resolveTestEnvPath(), options: { override?: boolean } = {}): void {
  const override = options.override ?? true;
  if (!existsSync(path)) {
    throw new Error(
      `Missing test environment file: ${path}\n` +
        'Create it from apps/api/test/.env.test.example and point it at the isolated test stack ' +
        '(see docker-compose.test.yml). Tests refuse to run against production.',
    );
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (override || !(key in process.env)) process.env[key] = value;
  }

  assertIsolatedTestDatabase();
}

/**
 * Fail closed unless the resolved database really is the isolated test stack.
 * Protects against an inherited shell environment pointing at production
 * (MariaDB test stack publishes `127.0.0.1:3308`; production uses `:3307`).
 */
export function assertIsolatedTestDatabase(): void {
  const host = (process.env.BOOKUSER_DB_HOST ?? '').trim();
  const port = (process.env.BOOKUSER_DB_PORT ?? '').trim();
  const allowedHosts = (process.env.TEST_ALLOWED_DB_HOSTS ?? '127.0.0.1,localhost,::1,mariadb-test')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowedPorts = (process.env.TEST_ALLOWED_DB_PORTS ?? '3308')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!allowedHosts.includes(host) || !allowedPorts.includes(port)) {
    throw new Error(
      `Refusing to run tests against database ${host || '(unset)'}:${port || '(unset)'}.\n` +
        `Only the isolated test stack is allowed (hosts: ${allowedHosts.join(', ')}; ports: ${allowedPorts.join(', ')}).\n` +
        'Check that no production env vars are exported in the current shell.',
    );
  }
}

