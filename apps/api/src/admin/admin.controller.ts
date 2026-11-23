import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DatabaseService, type QueryValue } from '../database/database.service.js';
import { RequirePermission } from './admin.decorators.js';
import { AdminRbacGuard } from './admin-rbac.guard.js';

type Row = Record<string, unknown>;

type CategoryBody = {
  parentCategoryId?: number | null;
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

function categorySlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

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

  @Get('stats')
  @RequirePermission('user.read')
  async stats() {
    const [users] = await this.db.query<{ total: number; active: number | null }[]>(
      `SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM users WHERE deleted_at IS NULL`,
    );
    const [books] = await this.db.query<{ total: number; published: number | null; draft: number | null }[]>(
      `SELECT COUNT(*) AS total,
              SUM(status = 'published') AS published,
              SUM(status = 'draft') AS draft
       FROM books WHERE deleted_at IS NULL`,
    );
    const [comments] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM comments WHERE deleted_at IS NULL`,
    );
    const [storage] = await this.db.query<{ used: number | null; objects: number }[]>(
      `SELECT COALESCE(SUM(size_bytes), 0) AS used, COUNT(*) AS objects
       FROM storage_objects WHERE status = 'complete' AND deleted_at IS NULL`,
    );

    return {
      users: { total: Number(users?.total ?? 0), active: Number(users?.active ?? 0) },
      books: {
        total: Number(books?.total ?? 0),
        published: Number(books?.published ?? 0),
        draft: Number(books?.draft ?? 0),
      },
      comments: Number(comments?.total ?? 0),
      storage: { usedBytes: Number(storage?.used ?? 0), objects: Number(storage?.objects ?? 0) },
    };
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

  // -------------------------------------------------------------------
  // Quản trị danh mục 8 nhóm / 64 thể loại
  // -------------------------------------------------------------------

  @Get('categories')
  @RequirePermission('category.read')
  async listCategories() {
    const rows = await this.db.query<Row[]>(
      `SELECT c.category_id, c.parent_category_id, c.name, c.slug, c.description, c.icon,
              c.sort_order, c.is_active, g.name AS group_name,
              (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_id = c.category_id) AS usage_count,
              (SELECT COUNT(*) FROM categories ch WHERE ch.parent_category_id = c.category_id) AS child_count
       FROM categories c
       LEFT JOIN categories g ON g.category_id = c.parent_category_id
       ORDER BY COALESCE(g.sort_order, c.sort_order), c.sort_order, c.name`,
    );
    const groups = rows
      .filter((row) => row.parent_category_id === null)
      .map((group) => ({
        ...group,
        children: rows.filter((row) => row.parent_category_id === group.category_id),
      }));
    return { data: rows, groups };
  }

  @Post('categories')
  @RequirePermission('category.create')
  async createCategory(@Body() body: CategoryBody) {
    const name = (body.name ?? '').trim();
    if (name.length < 2 || name.length > 150) {
      throw new BadRequestException('Tên danh mục phải từ 2 đến 150 ký tự.');
    }
    const slug = (body.slug ?? '').trim() || categorySlug(name);
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
    }
    const duplicate = await this.db.query<Row[]>(
      `SELECT category_id FROM categories WHERE slug = ? LIMIT 1`,
      [slug],
    );
    if (duplicate.length > 0) {
      throw new ConflictException('Slug danh mục đã tồn tại.');
    }
    const parentCategoryId = body.parentCategoryId ?? null;
    if (parentCategoryId !== null) {
      const parents = await this.db.query<Row[]>(
        `SELECT category_id FROM categories WHERE category_id = ? AND parent_category_id IS NULL LIMIT 1`,
        [parentCategoryId],
      );
      if (parents.length === 0) {
        throw new BadRequestException('Nhóm cha không hợp lệ.');
      }
    }
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO categories
         (parent_category_id, name, slug, description, icon, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parentCategoryId,
        name,
        slug,
        body.description?.trim() || null,
        body.icon?.trim().slice(0, 50) || null,
        Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
        body.isActive === false ? 0 : 1,
      ],
    );
    const [created] = await this.db.query<Row[]>(
      `SELECT category_id, parent_category_id, name, slug, description, icon, sort_order, is_active
       FROM categories WHERE category_id = ?`,
      [result.insertId],
    );
    return { data: created };
  }

  @Put('categories/:categoryId')
  @RequirePermission('category.update')
  async updateCategory(@Param('categoryId') categoryId: string, @Body() body: CategoryBody) {
    const id = Number.parseInt(categoryId, 10);
    const rows = await this.db.query<Row[]>(
      `SELECT category_id, parent_category_id, name, slug, description, icon, sort_order, is_active
       FROM categories WHERE category_id = ? LIMIT 1`,
      [id],
    );
    if (!Number.isInteger(id) || rows.length === 0) {
      throw new NotFoundException('Không tìm thấy danh mục.');
    }
    const current = rows[0];
    const name = body.name !== undefined ? body.name.trim() : (current.name as string);
    if (name.length < 2 || name.length > 150) {
      throw new BadRequestException('Tên danh mục phải từ 2 đến 150 ký tự.');
    }
    const slug = body.slug !== undefined ? body.slug.trim() : (current.slug as string);
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
    }
    const duplicate = await this.db.query<Row[]>(
      `SELECT category_id FROM categories WHERE slug = ? AND category_id <> ? LIMIT 1`,
      [slug, id],
    );
    if (duplicate.length > 0) {
      throw new ConflictException('Slug danh mục đã tồn tại.');
    }

    let parentCategoryId =
      body.parentCategoryId !== undefined
        ? body.parentCategoryId
        : (current.parent_category_id as number | null);
    if (parentCategoryId !== null) {
      if (parentCategoryId === id) {
        throw new BadRequestException('Danh mục không thể là cha của chính nó.');
      }
      const parents = await this.db.query<Row[]>(
        `SELECT category_id FROM categories WHERE category_id = ? AND parent_category_id IS NULL LIMIT 1`,
        [parentCategoryId],
      );
      if (parents.length === 0) {
        throw new BadRequestException('Nhóm cha không hợp lệ.');
      }
      const children = await this.db.query<Row[]>(
        `SELECT category_id FROM categories WHERE parent_category_id = ? LIMIT 1`,
        [id],
      );
      if (children.length > 0) {
        throw new BadRequestException('Nhóm đang có thể loại con, không thể chuyển vào nhóm khác.');
      }
      parentCategoryId = Number(parentCategoryId);
    }

    await this.db.query(
      `UPDATE categories
       SET parent_category_id = ?, name = ?, slug = ?, description = ?, icon = ?,
           sort_order = ?, is_active = ?
       WHERE category_id = ?`,
      [
        parentCategoryId,
        name,
        slug,
        body.description !== undefined
          ? body.description?.trim() || null
          : (current.description as string | null),
        body.icon !== undefined
          ? body.icon?.trim().slice(0, 50) || null
          : (current.icon as string | null),
        body.sortOrder !== undefined && Number.isFinite(body.sortOrder)
          ? Number(body.sortOrder)
          : (current.sort_order as number),
        body.isActive !== undefined ? (body.isActive ? 1 : 0) : (current.is_active as number),
        id,
      ],
    );
    const [updated] = await this.db.query<Row[]>(
      `SELECT category_id, parent_category_id, name, slug, description, icon, sort_order, is_active
       FROM categories WHERE category_id = ?`,
      [id],
    );
    return { data: updated };
  }

  @Get('feedback')
  @RequirePermission('report.read')
  async listFeedback(@Query() query: Record<string, string>) {
    const status = ['new', 'read', 'resolved'].includes(query.status ?? '') ? query.status : '';
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '50', 10) || 50));
    const where = status ? 'WHERE f.status = ?' : '';
    const params: QueryValue[] = status ? [status] : [];
    const rows = await this.db.query<Row[]>(
      `SELECT f.feedback_id, f.feedback_uuid, f.user_id, f.kind, f.subject, f.message,
              f.page_path, f.status, f.admin_note, f.created_at, f.updated_at,
              u.username
       FROM user_feedback f
       LEFT JOIN users u ON u.user_id = f.user_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT ${limit}`,
      params,
    );
    return { data: rows };
  }

  @Put('feedback/:feedbackId')
  @RequirePermission('report.update')
  async updateFeedback(
    @Param('feedbackId') feedbackId: string,
    @Body() body: { status?: string; adminNote?: string },
  ) {
    const id = Number.parseInt(feedbackId, 10);
    if (!Number.isInteger(id)) throw new BadRequestException('Phản hồi không hợp lệ.');
    const status: string | null = ['new', 'read', 'resolved'].includes(body.status ?? '')
      ? (body.status as string)
      : null;
    if (!status && body.adminNote === undefined) {
      throw new BadRequestException('Không có thay đổi để cập nhật.');
    }
    const adminNote =
      body.adminNote === undefined ? null : body.adminNote.trim().slice(0, 1000) || null;
    const result = await this.db.query<{ affectedRows: number }>(
      `UPDATE user_feedback
       SET status = COALESCE(?, status), admin_note = COALESCE(?, admin_note)
       WHERE feedback_id = ?`,
      [status, adminNote, id],
    );
    if (Number(result.affectedRows ?? 0) === 0) {
      throw new NotFoundException('Không tìm thấy phản hồi.');
    }
    return { success: true };
  }

  @Delete('categories/:categoryId')
  @RequirePermission('category.delete')
  async deleteCategory(@Param('categoryId') categoryId: string) {
    const id = Number.parseInt(categoryId, 10);
    if (!Number.isInteger(id)) {
      throw new BadRequestException('Danh mục không hợp lệ.');
    }
    const rows = await this.db.query<Row[]>(
      `SELECT category_id FROM categories WHERE category_id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy danh mục.');
    }
    const [usage] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM book_categories WHERE category_id = ?`,
      [id],
    );
    if (Number(usage.total) > 0) {
      throw new ConflictException('Danh mục đang được sách sử dụng. Hãy ẩn thay vì xoá.');
    }
    const [children] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM categories WHERE parent_category_id = ?`,
      [id],
    );
    if (Number(children.total) > 0) {
      throw new ConflictException('Danh mục đang có thể loại con. Hãy xoá hoặc ẩn các thể loại con trước.');
    }
    await this.db.query(`DELETE FROM categories WHERE category_id = ?`, [id]);
    return { success: true };
  }
}
