import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { loadEnv } from './env.js';

export interface RunningApp {
  app: INestApplication;
  url: string;
  port: number;
}

export async function startApp(): Promise<RunningApp> {
  loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  app.setGlobalPrefix('');
  app.useBodyParser('json', { limit: '8mb' });
  await app.listen(0, '127.0.0.1');
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return { app, url: `http://127.0.0.1:${address.port}`, port: address.port };
}

export async function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { raw: text };
  }
  return { status: response.status, body: parsed };
}
