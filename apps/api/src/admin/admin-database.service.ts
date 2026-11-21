import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPool, type Pool } from 'mysql2/promise';

export type QueryValue = string | number | boolean | Date | Buffer | null;

@Injectable()
export class AdminDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminDatabaseService.name);
  private pool: Pool | null = null;

  async onModuleInit(): Promise<void> {
    this.pool = createPool({
      host: process.env.BOOKADMIN_DB_HOST ?? '127.0.0.1',
      port: Number(process.env.BOOKADMIN_DB_PORT ?? 3306),
      user: process.env.BOOKADMIN_DB_USER ?? 'app_bookadmin',
      password: process.env.BOOKADMIN_DB_PASSWORD ?? '',
      database: process.env.BOOKADMIN_DB_NAME ?? 'bookadmin',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 5),
      charset: 'utf8mb4',
      decimalNumbers: true,
      enableKeepAlive: true,
    });
    this.logger.log('MariaDB connection pool initialized (bookadmin)');
  }

  async query<T>(sql: string, params: QueryValue[] = []): Promise<T> {
    if (!this.pool) throw new Error('Admin database pool is not initialized');
    const [rows] = await this.pool.execute(sql, params);
    return rows as T;
  }

  async getConnection() {
    if (!this.pool) throw new Error('Admin database pool is not initialized');
    return this.pool.getConnection();
  }

  async ping(): Promise<void> {
    await this.query('SELECT 1');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end();
  }
}
