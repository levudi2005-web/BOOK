import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

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
  created_by_user_id: number | null;
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

@Injectable()
export class StudioService {
  constructor(private readonly db: DatabaseService) {}

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
              status, visibility, published_at, created_by_user_id
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

    return {
      ...this.toBookDto(book),
      chapters: chapters.map((c) => ({
        chapterUuid: c.chapter_uuid,
        chapterNumber: c.chapter_number,
        title: c.title,
        content: c.content,
        wordCount: c.word_count,
        sortOrder: c.sort_order,
        status: c.status,
      })),
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
    await this.db.query(
      `UPDATE book_chapters SET title = ?, content = ?, word_count = ? WHERE chapter_id = ?`,
      [title, content, countWords(content), chapter.chapter_id],
    );
    return { chapterUuid, wordCount: countWords(content) };
  }

  async deleteChapter(userId: number, chapterUuid: string) {
    const chapter = await this.requireOwnedChapter(userId, chapterUuid);
    await this.db.query(`DELETE FROM book_chapters WHERE chapter_id = ?`, [chapter.chapter_id]);
    return { status: 'ok' };
  }

  async reorderChapters(userId: number, bookUuid: string, orderedUuids: string[]) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    for (let index = 0; index < orderedUuids.length; index += 1) {
      await this.db.query(
        `UPDATE book_chapters SET sort_order = ?, chapter_number = ? WHERE chapter_uuid = ? AND book_id = ?`,
        [index + 1, index + 1, orderedUuids[index], book.book_id],
      );
    }
    return { status: 'ok' };
  }



  async publishBook(userId: number, bookUuid: string) {
    const book = await this.requireOwnedBook(userId, bookUuid);
    const chapters = await this.db.query<ChapterRow[]>(
      `SELECT chapter_id, word_count FROM book_chapters WHERE book_id = ? ORDER BY sort_order`,
      [book.book_id],
    );
    const totalWords = chapters.reduce((sum, c) => sum + c.word_count, 0);

    await this.db.query(
      `UPDATE books
       SET status = 'published', visibility = 'public', published_at = NOW(3), word_count = ?
       WHERE book_id = ?`,
      [totalWords, book.book_id],
    );
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
