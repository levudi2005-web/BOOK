import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { AdminService } from '../src/admin/admin.service.js';
import { AdminDatabaseService } from '../src/admin/admin-database.service.js';
import { loadEnv } from './lib/env.js';

/**
 * Tạo tài khoản admin cho Playwright E2E trên **database test**.
 *
 * - Luôn nạp `apps/api/test/.env.test` (fail-closed, không bao giờ chạm production).
 * - Idempotent: chạy lại không tạo trùng.
 * - Chỉ được gọi bởi `playwright.config.ts` (webServer command) trước khi API test khởi động.
 */
const ADMIN_USERNAME = process.env.E2E_ADMIN_USER ?? 'e2e_admin';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e_admin@example.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'E2eAdminPass123!';
const ADMIN_ROLE = process.env.E2E_ADMIN_ROLE ?? 'SUPER_ADMIN';

async function main(): Promise<void> {
  loadEnv();
  let context: INestApplicationContext | null = null;
  try {
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const database = context.get(AdminDatabaseService);
    const existing = await database.query<{ admin_id: number }[]>(
      `SELECT admin_id FROM admin_accounts WHERE username = ? OR email = ? LIMIT 1`,
      [ADMIN_USERNAME, ADMIN_EMAIL],
    );
    if (existing.length > 0) {
      console.log(`[e2e] admin "${ADMIN_USERNAME}" đã tồn tại — bỏ qua seed.`);
      return;
    }
    const adminService = context.get(AdminService);
    await adminService.createAdmin(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE);
    console.log(`[e2e] đã tạo admin test "${ADMIN_USERNAME}".`);
  } finally {
    await context?.close();
  }
}

void main().catch((error: unknown) => {
  console.error('[e2e] seed admin thất bại:', error);
  process.exitCode = 1;
});
