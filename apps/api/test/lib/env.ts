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

/** Load a test env file into process.env without overwriting existing values. */
export function loadEnv(path = resolveTestEnvPath()): void {
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
    if (!(key in process.env)) process.env[key] = value;
  }
}

