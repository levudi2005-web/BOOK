import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, type QueryValue } from '../database/database.service.js';
import { StorageService } from '../storage/storage.service.js';

type Row = Record<string, unknown>;

const publicStatusFilter = `b.deleted_at IS NULL AND b.visibility = 'public' AND b.status IN ('approved', 'published')`;

const sortOptions: Record<string, string> = {
  newest: 'b.published_at DESC',
  popular: 'b.view_count DESC',
  rating: 'b.average_rating DESC',
  title: 'b.title ASC',
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  async listBooks(query: Record<string, string>) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    const where: string[] = [publicStatusFilter];
    const params: QueryValue[] = [];

    if (query.q) {
      where.push(
        '(b.title LIKE ? OR b.subtitle LIKE ? OR b.description LIKE ? OR b.author_name LIKE ? OR b.publisher_name LIKE ?)',
      );
      const like = `%${query.q}%`;
      params.push(like, like, like, like, like);
    }
    if (query.category) {
      where.push(
        'EXISTS (SELECT 1 FROM book_categories bc JOIN categories c ON c.category_id = bc.category_id WHERE bc.book_id = b.book_id AND c.slug = ?)',
      );
      params.push(query.category);
    }
    if (query.author) {
      // Accept both an author slug (author pages) and a typed author name.
      where.push(
        '(EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON a.author_id = ba.author_id WHERE ba.book_id = b.book_id AND a.slug = ?) OR b.author_name LIKE ?)',
      );
      params.push(query.author, `%${query.author}%`);
    }
    if (query.publisher) {
      where.push(
        '(EXISTS (SELECT 1 FROM publishers p WHERE p.publisher_id = b.publisher_id AND p.slug = ?) OR b.publisher_name LIKE ?)',
      );
      params.push(query.publisher, `%${query.publisher}%`);
    }
    if (query.categories) {
      const slugs = query.categories.split(',').map((slug) => slug.trim()).filter(Boolean);
      if (slugs.length > 0) {
        const placeholders = slugs.map(() => '?').join(',');
        where.push(
          `EXISTS (SELECT 1 FROM book_categories bc JOIN categories c ON c.category_id = bc.category_id WHERE bc.book_id = b.book_id AND c.slug IN (${placeholders}))`,
        );
        params.push(...slugs);
      }
    }
    if (query.group) {
      where.push(
        'EXISTS (SELECT 1 FROM book_categories bc JOIN categories c ON c.category_id = bc.category_id WHERE bc.book_id = b.book_id AND c.parent_category_id = (SELECT category_id FROM categories WHERE slug = ? AND parent_category_id IS NULL LIMIT 1))',
      );
      params.push(query.group);
    }
    if (query.year) {
      where.push('YEAR(b.publication_date) = ?');
      params.push(Number(query.year));
    }

    const orderBy = sortOptions[query.sort ?? 'newest'] ?? sortOptions.newest;

    const [{ total }] = await this.db.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM books b WHERE ${where.join(' AND ')}`,
      params,
    );

    const rows = await this.db.query<Row[]>(
      `SELECT b.book_uuid, b.slug, b.title, b.subtitle, b.description, b.language,
              b.publication_date, b.page_count, b.word_count, b.cover_storage_key,
              b.average_rating, b.rating_count, b.review_count, b.view_count,
              b.download_count, b.published_at, b.age_rating,
              b.author_name, b.publisher_name, b.publication_year
       FROM books b
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async getBook(slug: string) {
    const books = await this.db.query<Row[]>(
      `SELECT b.book_uuid, b.slug, b.title, b.subtitle, b.description, b.excerpt,
              b.isbn_13, b.isbn_10, b.language, b.publication_date, b.edition,
              b.page_count, b.word_count, b.cover_storage_key, b.cover_mime_type,
              b.average_rating, b.rating_count, b.review_count, b.view_count,
              b.download_count, b.published_at, b.age_rating, b.book_id,
              b.trim_size, b.trim_width_mm, b.trim_height_mm, b.page_style,
              b.page_effect, b.show_page_numbers, b.reader_default_mode,
              b.author_name, b.publisher_name, b.publication_year
       FROM books b
       WHERE b.slug = ? AND ${publicStatusFilter}
       LIMIT 1`,
      [slug],
    );

    if (books.length === 0) {
      throw new NotFoundException('Book not found');
    }

    const book = books[0];
    const bookId = book.book_id as number;

    const [authors, categories] = await Promise.all([
      this.db.query<Row[]>(
        `SELECT a.author_id, a.author_uuid, a.name, a.slug
         FROM authors a
         JOIN book_authors ba ON ba.author_id = a.author_id
         WHERE ba.book_id = ? AND a.deleted_at IS NULL
         ORDER BY ba.author_order`,
        [bookId],
      ),
      this.db.query<Row[]>(
        `SELECT c.category_id, c.parent_category_id, c.name, c.slug, c.description, c.icon,
                g.name AS group_name, g.slug AS group_slug
         FROM categories c
         LEFT JOIN categories g ON g.category_id = c.parent_category_id
         JOIN book_categories bc ON bc.category_id = c.category_id
         WHERE bc.book_id = ? AND c.is_active = 1
         ORDER BY g.sort_order, c.sort_order, c.name`,
        [bookId],
      ),
    ]);

    delete book.book_id;
    return {
      ...book,
      layout: {
        trimSize: book.trim_size ?? 'A5',
        widthMm: Number(book.trim_width_mm ?? 148),
        heightMm: Number(book.trim_height_mm ?? 210),
        pageStyle: book.page_style ?? 'lines',
        pageEffect: book.page_effect ?? 'paper',
        showPageNumbers: Number(book.show_page_numbers ?? 1) === 1,
        readerDefaultMode: book.reader_default_mode ?? 'page',
      },
      authors,
      categories,
    };
  }

  async listCategories() {
    const rows = await this.db.query<Row[]>(
      `SELECT category_id, parent_category_id, name, slug, description, sort_order, is_active, icon
       FROM categories
       WHERE is_active = 1
       ORDER BY sort_order, name`,
    );
    const groups = rows
      .filter((row) => row.parent_category_id === null)
      .map((group) => ({
        ...group,
        children: rows.filter((row) => row.parent_category_id === group.category_id),
      }));
    const leaves = rows.filter((row) => row.parent_category_id !== null);
    return {
      data: leaves,
      groups,
      ageRatings: ['all', '6+', '13+', '16+', '18+', '19+'],
    };
  }

  async listAuthors() {
    const rows = await this.db.query<Row[]>(
      `SELECT author_id, author_uuid, name, slug, bio
       FROM authors
       WHERE deleted_at IS NULL
       ORDER BY name`,
    );
    return { data: rows };
  }

  async listPublishers() {
    const rows = await this.db.query<Row[]>(
      `SELECT publisher_id, name, slug, description
       FROM publishers
       WHERE deleted_at IS NULL
       ORDER BY name`,
    );
    return { data: rows };
  }

  /** Public chapters for the reader (published book, published chapters only). */
  /**
   * Ảnh bìa chỉ phục vụ khi: sách thoả `publicStatusFilter` (đã publish/approved,
   * visibility public, chưa xoá) VÀ object storage được đánh dấu public.
   * Truy cập trực tiếp object của user khác qua route này là không thể.
   */
  async getPublicCover(slug: string) {
    const rows = await this.db.query<{ cover_storage_key: string | null }[]>(
      `SELECT b.cover_storage_key
       FROM books b
       WHERE b.slug = ? AND ${publicStatusFilter}
       LIMIT 1`,
      [slug],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy sách.');
    }
    const key = rows[0].cover_storage_key;
    if (!key) {
      throw new NotFoundException('Sách chưa có ảnh bìa.');
    }
    return this.storage.streamPublicObject(key);
  }

  async getPublicChapterImage(slug: string, objectUuid: string) {
    const references = await this.db.query<{ chapter_id: number }[]>(
      `SELECT c.chapter_id
       FROM books b
       JOIN book_chapters c ON c.book_id = b.book_id
       WHERE b.slug = ? AND ${publicStatusFilter}
         AND c.status = 'published'
         AND LOCATE(?, c.content) > 0
       LIMIT 1`,
      [slug, `data-storage-uuid="${objectUuid}"`],
    );
    if (references.length === 0) {
      throw new NotFoundException('Không tìm thấy ảnh trong sách đã xuất bản.');
    }
    return this.storage.streamPublicObject(objectUuid);
  }

  async getBookChapters(slug: string) {
    const books = await this.db.query<{ book_id: number }[]>(
      `SELECT b.book_id FROM books b WHERE b.slug = ? AND ${publicStatusFilter} LIMIT 1`,
      [slug],
    );
    if (books.length === 0) throw new NotFoundException('Book not found');
    const rows = await this.db.query<Row[]>(
      `SELECT chapter_uuid, chapter_number, title, content, word_count, sort_order
       FROM book_chapters
       WHERE book_id = ? AND status = 'published'
       ORDER BY sort_order, chapter_number`,
      [books[0].book_id],
    );
    return { data: rows };
  }
}
