import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import { loadEnv } from './lib/env.js';

/**
 * API server riêng cho Playwright E2E.
 * - Luôn nạp `apps/api/test/.env.test` (fail-closed, không bao giờ dùng .env production).
 * - Chỉ bind 127.0.0.1, CORS chỉ cho phép web test.
 */
async function main(): Promise<void> {
  loadEnv();
  const port = Number(process.env.E2E_API_PORT ?? 3200);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('');
  app.useBodyParser('json', { limit: '8mb' });
  app.enableCors({
    origin: [`http://127.0.0.1:${process.env.E2E_WEB_PORT ?? 3100}`, `http://localhost:${process.env.E2E_WEB_PORT ?? 3100}`],
    credentials: true,
  });

  await app.listen(port, '127.0.0.1');
  // eslint-disable-next-line no-console
  console.log(`[e2e] API test listening on http://127.0.0.1:${port}`);
}

void main();
