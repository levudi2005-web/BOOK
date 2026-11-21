import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RequirePermission } from './admin.decorators.js';
import { AdminRbacGuard } from './admin-rbac.guard.js';

type Row = Record<string, unknown>;

@Controller('admin')
@UseGuards(AdminRbacGuard)
export class AdminController {
  constructor(private readonly db: DatabaseService) {}

  @Get('users')
  @RequirePermission('user.read')
  async listUsers(@Query() query: Record<string, string>) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
    const offset = (page - 1) * limit;
    const [{ total }] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`,
    );
    const rows = await this.db.query<Row[]>(
      `SELECT user_id, user_uuid, username, email, status, created_at, last_login_at
       FROM users WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return { data: rows, meta: { page, limit, total: Number(total) } };
  }

  @Get('books')
  @RequirePermission('book.read')
  async listBooks(@Query() query: Record<string, string>) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
    const offset = (page - 1) * limit;
    const [{ total }] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM books WHERE deleted_at IS NULL`,
    );
    const rows = await this.db.query<Row[]>(
      `SELECT book_uuid, slug, title, status, visibility, created_by_user_id, published_at, created_at
       FROM books WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return { data: rows, meta: { page, limit, total: Number(total) } };
  }
}
