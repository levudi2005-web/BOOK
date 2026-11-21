import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ResultSetHeader } from 'mysql2';
import { DatabaseService } from '../database/database.service.js';
import { StorageService } from '../storage/storage.service.js';

const COVER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_COVER_BYTES = 2 * 1024 * 1024; // 2 MiB
const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;

function extractStorageImageUuids(content: string): string[] {
  const uuids = new Set<string>();
  const pattern = /data-storage-uuid=["']([0-9a-f-]{36})["']/gi;
  for (const match of content.matchAll(pattern)) uuids.add(match[1]);
  return [...uuids];
}

type BookRow = {
  book_id: number;
  book_uuid: string;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  language: string;
  status: string;
  visibility: string;
  published_at: Date | string | null;
  created_by_user_id: number;
  cover_storage_key: string | null;
  cover_mime_type: string | null;
  word_count?: number;
};

type ChapterRow = {
  chapter_id: number;
  chapter_uuid: string;
  book_id: number;
  chapter_number: number;
  title: string;
  content: string | null;
  word_count: number;
  sort_order: number;
  status: string;
};

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
}

function countWords(input: string): number {
  const normalized = stripHtml(input).trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'book';
}

type BookSnapshot = {
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  language?: string;
  chapters?: { chapterUuid?: string; title?: string; content?: string | null }[];
};

/**
 * `book_versions.snapshot_json` is a MySQL JSON column: mysql2 returns it
 * already parsed, but older rows may still surface as text. Handle both.
 */
function parseSnapshot(value: unknown): BookSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as BookSnapshot;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as BookSnapshot;
  return null;
}

@Injectable()
export class StudioService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  async createBook(userId: number, input: { title?: string; subtitle?: string; description?: string; language?: string }) {
    const title = (input.title ?? '').trim();
    if (title.length < 2 || title.length > 500) {
      throw new ForbiddenException('Tiêu đề sách không hợp lệ.');
    }
    const slug = await this.uniqueSlug(slugify(title));
    const bookUuid = randomUUID();

    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO books
         (book_uuid, title, subtitle, slug, description, language, status, visibility, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', 'private', ?)`,
      [bookUuid, title, input.subtitle ?? null, slug, input.description ?? null, input.language ?? 'vi', userId],
    );
    return this.getBook(userId, bookUuid, result.insertId);
  }

  async listBooks(userId: number) {
    const rows = await this.db.query<BookRow[]>(
      `SELECT book_id, book_uuid, title, subtitle, slug, description, language,
              status, visibility, published_at, created_by_user_id
       FROM books
       WHERE created_by_user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId],
    );
    return { data: rows.map((row) => this.toBookDto(row)) };
  }

  async getBook(userId: number, bookUuid: string, knownBookId?: number) {
    const rows = await this.db.query<BookRow[]>(
      `SELECT book_id, book_uuid, title, subtitle, slug, description, language,
              status, visibility, published_at, created_by_user_id,
              cover_storage_key, cover_mime_type
       FROM books
       WHERE book_uuid = ? AND deleted_at IS NULL
       LIMIT 1`,
      [bookUuid],
    );
    const book = knownBookId !== undefined ? rows.find((r) => r.book_id === knownBookId) : rows[0];
    if (!book) {
      throw new NotFoundException('Không tìm thấy sách.');
    }
    if (book.created_by_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với sách này.');
    }

    const chapters = await this.db.query<ChapterRow[]>(
      `SELECT chapter_id, chapter_uuid, book_id, chapter_number, title, content, word_count, sort_order, status
       FROM book_chapters
       WHERE book_id = ?
       ORDER BY sort_order, chapter_number`,
      [book.book_id],
    );

    const bookCategories = await this.db.query<{ category_id: number; name: string; slug: string }[]>(
      `SELECT c.category_id, c.name, c.slug
       FROM book_categories bc
       JOIN categories c ON c.category_id = bc.category_id
       WHERE bc.book_id = ?
       ORDER BY c.name`,
      [book.book_id],
    );
    const bookTags = await this.db.query<{ name: string; slug: string }[]>(
      `SELECT t.name, t.slug
       FROM book_tags bt
       JOIN tags t ON t.tag_id = bt.tag_id
       WHERE bt.book_id = ?
       ORDER BY t.name`,
      [book.book_id],
    );

    return {
      ...this.toBookDto(book),
      coverStorageKey: book.cover_storage_key,
      coverMimeType: book.cover_mime_type,
      chapters: chapters.map((c) => ({
        chapterUuid: c.chapter_uuid,
        chapterNumber: c.chapter_number,
        title: c.title,
        content: c.content,
        wordCount: c.word_count,
        sortOrder: c.sort_order,
        status: c.status,
      })),
      categories: bookCategories.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        slug: row.slug,
      })),
      tags: bookTags.map((row) => row.name),
    };
  }

  async updateBook(
    userId: number,
    bookUuid: string,
    input: { title?: string; subtitle?: string; description?: string; language?: string },
  ) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const title = input.title !== undefined ? input.title.trim() : book.title;
    if (title.length < 2 || title.length > 500) {
      throw new ForbiddenException('Tiêu đề sách không hợp lệ.');
    }
    const slug = title !== book.title ? await this.uniqueSlug(slugify(title)) : book.slug;

    await this.db.query(
      `UPDATE books
       SET title = ?, subtitle = ?, description = ?, language = ?, slug = ?
       WHERE book_id = ?`,
      [
        title,
        input.subtitle !== undefined ? input.subtitle : book.subtitle,
        input.description !== undefined ? input.description : book.description,
        input.language !== undefined ? input.language : book.language,
        slug,
        book.book_id,
      ],
    );
    return this.getBook(userId, bookUuid, book.book_id);
  }

  async deleteBook(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    await this.db.query(`UPDATE books SET deleted_at = NOW(3) WHERE book_id = ?`, [book.book_id]);
    return { status: 'ok' };
  }

  async createChapter(userId: number, bookUuid: string, input: { title?: string; content?: string }) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const title = (input.title ?? '').trim();
    if (!title || title.length > 300) {
      throw new ForbiddenException('Tiêu đề chương không hợp lệ.');
    }
    const content = input.content ?? '';
    await this.enableChapterImages(userId, content);
    const chapterUuid = randomUUID();
    const [{ nextNumber }] = await this.db.query<{ nextNumber: number }[]>(
      `SELECT COALESCE(MAX(chapter_number), 0) + 1 AS nextNumber FROM book_chapters WHERE book_id = ?`,
      [book.book_id],
    );
    const [{ nextSort }] = await this.db.query<{ nextSort: number }[]>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort FROM book_chapters WHERE book_id = ?`,
      [book.book_id],
    );
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO book_chapters
         (chapter_uuid, book_id, chapter_number, title, content, word_count, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [chapterUuid, book.book_id, nextNumber, title, content, countWords(content), nextSort],
    );
    return { chapterUuid, chapterId: result.insertId, wordCount: countWords(content) };
  }

  async updateChapter(userId: number, chapterUuid: string, input: { title?: string; content?: string }) {
    const chapter = await this.requireOwnedChapter(userId, chapterUuid);
    const title = input.title !== undefined ? input.title.trim() : chapter.title;
    if (!title || title.length > 300) {
      throw new ForbiddenException('Tiêu đề chương không hợp lệ.');
    }
    const content = input.content !== undefined ? input.content : (chapter.content ?? '');
    await this.enableChapterImages(userId, content);
    await this.db.query(
      `UPDATE book_chapters SET title = ?, content = ?, word_count = ? WHERE chapter_id = ?`,
      [title, content, countWords(content), chapter.chapter_id],
    );
    return { chapterUuid, wordCount: countWords(content) };
  }

  private async enableChapterImages(userId: number, content: string): Promise<void> {
    for (const objectUuid of extractStorageImageUuids(content)) {
      const object = await this.storage.getObject(userId, objectUuid);
      if (object.status !== 'complete' || !COVER_MIME_TYPES.has(object.mimeType.toLowerCase())) {
        throw new BadRequestException('Ảnh trong chương phải là ảnh JPEG, PNG, WebP hoặc GIF đã tải lên hoàn tất.');
      }
      if (object.sizeBytes > MAX_INLINE_IMAGE_BYTES) {
        throw new BadRequestException('Ảnh trong chương không được vượt quá 10 MiB.');
      }
      await this.storage.setObjectVisibility(userId, objectUuid, true);
    }
  }

  async deleteChapter(userId: number, chapterUuid: string) {
    const chapter = await this.requireOwnedChapter(userId, chapterUuid);
    await this.db.query(`DELETE FROM book_chapters WHERE chapter_id = ?`, [chapter.chapter_id]);
    return { status: 'ok' };
  }

  async reorderChapters(userId: number, bookUuid: string, orderedUuids: string[]) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const existing = await this.db.query<{ chapter_uuid: string }[]>(
      `SELECT chapter_uuid FROM book_chapters WHERE book_id = ?`,
      [book.book_id],
    );
    const owned = new Set(existing.map((row) => row.chapter_uuid));
    const ordered = orderedUuids.filter((uuid) => owned.has(uuid));
    // The payload must be an exact permutation of the book's chapters.
    if (ordered.length !== owned.size || new Set(ordered).size !== ordered.length) {
      throw new BadRequestException('Danh sách sắp xếp chương không hợp lệ.');
    }

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      // `chapter_number` is unique per book (uq_book_chapters_number), so a
      // direct renumber collides whenever two chapters swap places. Shift every
      // row out of the target range first, then assign the final 1..n numbers.
      await connection.execute(
        `UPDATE book_chapters SET chapter_number = chapter_number + ? WHERE book_id = ?`,
        [ordered.length + 1, book.book_id],
      );
      for (let index = 0; index < ordered.length; index += 1) {
        await connection.execute(
          `UPDATE book_chapters SET chapter_number = ?, sort_order = ? WHERE chapter_uuid = ? AND book_id = ?`,
          [index + 1, index + 1, ordered[index], book.book_id],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return { status: 'ok' };
  }



  /**
   * Gắn ảnh bìa cho sách từ một object do chính tác giả upload qua StorageService.
   * Kiểm tra: ownership sách, ownership object, trạng thái upload, MIME ảnh,
   * kích thước. Chỉ lưu storage key (object uuid) + MIME, không lưu URL tuỳ tiện.
   */
  async setCover(userId: number, bookUuid: string, objectUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const key = (objectUuid ?? '').trim();
    if (!key) {
      throw new BadRequestException('Thiếu mã tệp ảnh bìa.');
    }

    // findObject bên trong StorageService đã kiểm tra ownership của object.
    const object = await this.storage.getObject(userId, key);
    if (object.status !== 'complete') {
      throw new BadRequestException('Tệp ảnh bìa chưa upload hoàn tất.');
    }
    if (!COVER_MIME_TYPES.has(object.mimeType.toLowerCase())) {
      throw new BadRequestException('Ảnh bìa chỉ nhận JPEG, PNG, WebP hoặc GIF.');
    }
    if (object.sizeBytes > MAX_COVER_BYTES) {
      throw new BadRequestException('Ảnh bìa tối đa 2 MiB.');
    }

    const rows = await this.db.query<{ cover_storage_key: string | null }[]>(
      `SELECT cover_storage_key FROM books WHERE book_id = ? LIMIT 1`,
      [book.book_id],
    );
    const previousKey = rows[0]?.cover_storage_key ?? null;

    await this.db.query(
      `UPDATE books SET cover_storage_key = ?, cover_mime_type = ? WHERE book_id = ?`,
      [object.objectUuid, object.mimeType, book.book_id],
    );
    await this.storage.setObjectVisibility(userId, object.objectUuid, true);

    if (previousKey && previousKey !== object.objectUuid) {
      // Ảnh cũ không còn là bìa công khai: hạ cờ public (nếu vẫn thuộc user).
      await this.storage.setObjectVisibility(userId, previousKey, false).catch(() => undefined);
    }

    return this.getBook(userId, bookUuid);
  }

  async removeCover(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const rows = await this.db.query<{ cover_storage_key: string | null }[]>(
      `SELECT cover_storage_key FROM books WHERE book_id = ? LIMIT 1`,
      [book.book_id],
    );
    const previousKey = rows[0]?.cover_storage_key ?? null;

    await this.db.query(
      `UPDATE books SET cover_storage_key = NULL, cover_mime_type = NULL WHERE book_id = ?`,
      [book.book_id],
    );

    if (previousKey) {
      await this.storage.setObjectVisibility(userId, previousKey, false).catch(() => undefined);
    }

    return this.getBook(userId, bookUuid);
  }

  async publishBook(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const chapters = await this.db.query<{ chapter_id: number; title: string; word_count: number }[]>(
      `SELECT chapter_id, title, word_count FROM book_chapters WHERE book_id = ? ORDER BY sort_order, chapter_number`,
      [book.book_id],
    );
    if (chapters.length === 0) {
      throw new BadRequestException('Cần ít nhất một chương trước khi xuất bản.');
    }
    const totalWords = chapters.reduce((sum, c) => sum + Number(c.word_count ?? 0), 0);
    if (totalWords === 0) {
      throw new BadRequestException('Chương chưa có nội dung để xuất bản.');
    }

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE books
         SET status = 'published', visibility = 'public', published_at = NOW(3), word_count = ?
         WHERE book_id = ?`,
        [totalWords, book.book_id],
      );
      // Catalog exposes chapters of published books, so the chapter status must
      // follow the book status instead of staying 'draft' forever.
      await connection.execute(
        `UPDATE book_chapters SET status = 'published' WHERE book_id = ?`,
        [book.book_id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await this.createSnapshot(userId, bookUuid, book.book_id);
    return this.getBook(userId, bookUuid, book.book_id);
  }

  async listVersions(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const rows = await this.db.query<{ version_number: number; title: string; word_count: number; created_at: Date | string }[]>(
      `SELECT version_number, title, word_count, created_at
       FROM book_versions WHERE book_id = ? ORDER BY version_number DESC`,
      [book.book_id],
    );
    return { data: rows };
  }

  async listAvailableCategories() {
    const rows = await this.db.query<
      { category_id: number; name: string; slug: string; parent_category_id: number | null }[]
    >(
      `SELECT category_id, name, slug, parent_category_id
       FROM categories WHERE is_active = 1
       ORDER BY sort_order, name`,
    );
    return {
      data: rows.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        slug: row.slug,
        parentCategoryId: row.parent_category_id,
      })),
    };
  }

  async setCategories(userId: number, bookUuid: string, categoryIds: number[]) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const ids = [...new Set(categoryIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (ids.length > 5) {
      throw new BadRequestException('Mỗi sách chỉ được chọn tối đa 5 danh mục.');
    }
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const existing = await this.db.query<{ category_id: number }[]>(
        `SELECT category_id FROM categories WHERE is_active = 1 AND category_id IN (${placeholders})`,
        ids,
      );
      if (existing.length !== ids.length) {
        throw new BadRequestException('Danh mục không hợp lệ.');
      }
    }

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM book_categories WHERE book_id = ?`, [book.book_id]);
      for (let index = 0; index < ids.length; index += 1) {
        await connection.execute(
          `INSERT INTO book_categories (book_id, category_id, is_primary) VALUES (?, ?, ?)`,
          [book.book_id, ids[index], index === 0 ? 1 : 0],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getBook(userId, bookUuid, book.book_id);
  }

  async setTags(userId: number, bookUuid: string, tags: string[]) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const names = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
    if (names.length > 10) {
      throw new BadRequestException('Mỗi sách chỉ được gắn tối đa 10 nhãn.');
    }
    if (names.some((name) => name.length > 80)) {
      throw new BadRequestException('Nhãn không được vượt quá 80 ký tự.');
    }

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM book_tags WHERE book_id = ?`, [book.book_id]);
      for (const name of names) {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO tags (name, slug) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE tag_id = LAST_INSERT_ID(tag_id), name = VALUES(name)`,
          [name, slugify(name) || `tag-${Date.now().toString(36)}`],
        );
        await connection.execute(`INSERT IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)`, [
          book.book_id,
          result.insertId,
        ]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getBook(userId, bookUuid, book.book_id);
  }

  async unpublishBook(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE books SET status = 'draft', visibility = 'private', published_at = NULL WHERE book_id = ?`,
        [book.book_id],
      );
      await connection.execute(`UPDATE book_chapters SET status = 'draft' WHERE book_id = ?`, [book.book_id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getBook(userId, bookUuid, book.book_id);
  }

  async getVersion(userId: number, bookUuid: string, versionNumber: number) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const rows = await this.db.query<{ version_number: number; snapshot_json: unknown }[]>(
      `SELECT version_number, snapshot_json FROM book_versions
       WHERE book_id = ? AND version_number = ? LIMIT 1`,
      [book.book_id, versionNumber],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy phiên bản.');
    }
    return { versionNumber: rows[0].version_number, snapshot: parseSnapshot(rows[0].snapshot_json) };
  }

  /**
   * Restores book metadata and the content of chapters that still exist.
   * Chapters created after the snapshot are kept (never deleted); chapters
   * deleted since then cannot be recreated safely and are reported instead.
   */
  async restoreVersion(userId: number, bookUuid: string, versionNumber: number) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const rows = await this.db.query<{ snapshot_json: unknown }[]>(
      `SELECT snapshot_json FROM book_versions WHERE book_id = ? AND version_number = ? LIMIT 1`,
      [book.book_id, versionNumber],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy phiên bản.');
    }

    const snapshot = parseSnapshot(rows[0].snapshot_json);
    if (!snapshot) {
      throw new NotFoundException('Không tìm thấy phiên bản.');
    }

    const current = await this.db.query<{ chapter_uuid: string }[]>(
      `SELECT chapter_uuid FROM book_chapters WHERE book_id = ?`,
      [book.book_id],
    );
    const existing = new Set(current.map((row) => row.chapter_uuid));
    const snapshotChapters = snapshot.chapters ?? [];
    const restorable = snapshotChapters.filter(
      (chapter): chapter is { chapterUuid: string; title?: string; content?: string | null } =>
        Boolean(chapter.chapterUuid) && existing.has(String(chapter.chapterUuid)),
    );

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE books SET title = ?, subtitle = ?, description = ?, language = ? WHERE book_id = ?`,
        [
          (snapshot.title ?? book.title).slice(0, 500),
          snapshot.subtitle ?? null,
          snapshot.description ?? null,
          snapshot.language ?? book.language,
          book.book_id,
        ],
      );
      for (const chapter of restorable) {
        const content = chapter.content ?? '';
        await connection.execute(
          `UPDATE book_chapters SET title = ?, content = ?, word_count = ? WHERE chapter_uuid = ? AND book_id = ?`,
          [
            (chapter.title ?? 'Chương').slice(0, 300),
            content,
            countWords(content),
            chapter.chapterUuid,
            book.book_id,
          ],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      restoredChapters: restorable.length,
      skippedChapters: snapshotChapters.length - restorable.length,
      book: await this.getBook(userId, bookUuid, book.book_id),
    };
  }

  private async createSnapshot(userId: number, bookUuid: string, bookId: number) {
    const [{ next }] = await this.db.query<{ next: number }[]>(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM book_versions WHERE book_id = ?`,
      [bookId],
    );
    const book = await this.db.query<BookRow[]>(
      `SELECT title, subtitle, description, language, word_count FROM books WHERE book_id = ? LIMIT 1`,
      [bookId],
    );
    const chapters = await this.db.query<ChapterRow[]>(
      `SELECT chapter_uuid, chapter_number, title, content, word_count, sort_order
       FROM book_chapters WHERE book_id = ? ORDER BY sort_order`,
      [bookId],
    );
    const snapshot = {
      bookUuid,
      title: book[0]?.title,
      subtitle: book[0]?.subtitle,
      description: book[0]?.description,
      language: book[0]?.language,
      chapters: chapters.map((c) => ({ chapterUuid: c.chapter_uuid, title: c.title, content: c.content, wordCount: c.word_count })),
    };
    await this.db.query(
      `INSERT INTO book_versions (book_id, version_number, title, word_count, snapshot_json, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookId, next, book[0]?.title ?? '', book[0]?.word_count ?? 0, JSON.stringify(snapshot), userId],
    );
  }

  private async uniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    for (;;) {
      const rows = await this.db.query<{ slug: string }[]>(
        `SELECT slug FROM books WHERE slug = ? LIMIT 1`,
        [candidate],
      );
      if (rows.length === 0) return candidate;
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
      if (suffix > 1000) {
        candidate = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      }
    }
  }

  private async requireOwnedBook(userId: number, bookUuid: string): Promise<BookRow> {
    const rows = await this.db.query<BookRow[]>(
      `SELECT book_id, book_uuid, title, subtitle, slug, description, language,
              status, visibility, published_at, created_by_user_id, word_count
       FROM books WHERE book_uuid = ? AND deleted_at IS NULL LIMIT 1`,
      [bookUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy sách.');
    }
    if (rows[0].created_by_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với sách này.');
    }
    return rows[0];
  }

  private async requireOwnedChapter(userId: number, chapterUuid: string): Promise<ChapterRow> {
    const rows = await this.db.query<ChapterRow[]>(
      `SELECT c.chapter_id, c.chapter_uuid, c.book_id, c.chapter_number, c.title, c.content,
              c.word_count, c.sort_order, c.status
       FROM book_chapters c
       JOIN books b ON b.book_id = c.book_id
       WHERE c.chapter_uuid = ? AND b.deleted_at IS NULL LIMIT 1`,
      [chapterUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy chương.');
    }
    const owner = await this.db.query<{ created_by_user_id: number | null }[]>(
      `SELECT created_by_user_id FROM books WHERE book_id = ? LIMIT 1`,
      [rows[0].book_id],
    );
    if (owner.length === 0 || owner[0].created_by_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với chương này.');
    }
    return rows[0];
  }

  private toBookDto(book: BookRow) {
    return {
      bookUuid: book.book_uuid,
      title: book.title,
      subtitle: book.subtitle,
      slug: book.slug,
      description: book.description,
      language: book.language,
      status: book.status,
      visibility: book.visibility,
      publishedAt: book.published_at,
    };
  }
}
