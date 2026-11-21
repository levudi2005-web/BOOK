import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — hoàn toàn tách khỏi production:
 *  - API: Nest chạy bằng `apps/api/test/.env.test` (MariaDB test :3308, Meili :7701)
 *  - Web: `next dev` trên :3100 trỏ về API test
 *  - Mail: memory adapter (không gửi email thật)
 *
 * Chạy: `pnpm e2e` (sau khi `docker compose -f docker-compose.test.yml -p bff-test up -d --wait`).
 */
const WEB_PORT = 3100;
const API_PORT = 3200;

export default defineConfig({
  testDir: './apps/web/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      command:
        'pnpm --filter @bff/api exec tsc -p tsconfig.test.json && node apps/api/dist-test/test/seed-admin.js && node apps/api/dist-test/test/e2e-server.js',
      port: API_PORT,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        NODE_ENV: 'test',
        TEST_AUTH_RATE_LIMIT_MAX_REQUESTS: '200',
        TEST_ENV_FILE: 'apps/api/test/.env.test',
        E2E_API_PORT: String(API_PORT),
        E2E_WEB_PORT: String(WEB_PORT),
      },
    },
    {
      command: `pnpm --filter @bff/web exec next dev -p ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}`,
        NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${WEB_PORT}`,
      },
    },
  ],
});
