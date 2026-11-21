import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AdminModule } from '../apps/api/src/admin/admin.module.js';
import { AdminService } from '../apps/api/src/admin/admin.service.js';

function loadEnv(path = '/var/www/BOOKFORFREEDOM/.env'): void {
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

async function main(): Promise<void> {
  // Resolve .env from repo root (script may be run from apps/api for module resolution).
  loadEnv('/var/www/BOOKFORFREEDOM/.env');

  const [username, email, password, role] = process.argv.slice(2);
  if (!username || !email || !password || !role) {
    // eslint-disable-next-line no-console
    console.error('Usage: tsx scripts/create-admin.ts <username> <email> <password> <role>');
    process.exit(1);
  }

  const context = await NestFactory.createApplicationContext(AdminModule, { logger: false });
  const adminService = context.get(AdminService);
  const created = await adminService.createAdmin(username, email, password, role);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(created, null, 2));
  // eslint-disable-next-line no-console
  console.log('IMPORTANT: lưu recoveryKey ở nơi an toàn; chỉ trả về đúng một lần.');
  await context.close();
}

void main();
