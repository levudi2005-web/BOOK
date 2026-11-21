import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

type BookRow = {
  book_uuid: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  language: string;
  cover_storage_key: string | null;
  average_rating: string | number;
  rating_count: number;
  view_count: number;
  published_at: string | null;
  authors: string;
};

const BOOKS_INDEX = 'books';
const AUTHORS_INDEX = 'authors';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly db: DatabaseService) {}

  private get host(): string {
    return (process.env.MEILI_HOST ?? 'http://127.0.0.1:7700').replace(/\/$/, '');
  }

  private get key(): string {
    return process.env.MEILI_MASTER_KEY ?? '';
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.key) headers['authorization'] = `Bearer ${this.key}`;
    return headers;
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/health`, { headers: this.headers() });
      return response.ok;
    } catch {
      return false;
    }
  }

  async configureIndexes(): Promise<void> {
    await this.#task('PATCH', `${this.host}/indexes/${BOOKS_INDEX}/settings`, {
      searchableAttributes: ['title', 'subtitle', 'description', 'authors'],
      filterableAttributes: ['language'],
      sortableAttributes: ['published_at', 'view_count', 'rating_count'],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });
    await this.#task('PATCH', `${this.host}/indexes/${AUTHORS_INDEX}/settings`, {
      searchableAttributes: ['name', 'bio'],
      filterableAttributes: [],
    });
  }

  async indexBook(book: Record<string, unknown>): Promise<void> {
    await this.#task('POST', `${this.host}/indexes/${BOOKS_INDEX}/documents`, [book]);
  }

  async deleteBook(bookUuid: string): Promise<void> {
    await fetch(`${this.host}/indexes/${BOOKS_INDEX}/documents/${bookUuid}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }

  async reindexAll(): Promise<{ books: number; authors: number }> {
    const books = await this.db.query<BookRow[]>(
      `SELECT b.book_uuid, b.slug, b.title, b.subtitle, b.description, b.language,
              b.cover_storage_key, b.average_rating, b.rating_count, b.view_count,
              b.published_at, COALESCE(GROUP_CONCAT(a.name SEPARATOR ', '), '') AS authors
       FROM books b
       LEFT JOIN book_authors ba ON ba.book_id = b.book_id
       LEFT JOIN authors a ON a.author_id = ba.author_id AND a.deleted_at IS NULL
       WHERE b.deleted_at IS NULL AND b.visibility = 'public' AND b.status IN ('approved','published')
       GROUP BY b.book_id
       ORDER BY b.book_id`,
    );

    const authors = await this.db.query<{ author_uuid: string; name: string; bio: string | null }[]>(
      `SELECT author_uuid, name, bio FROM authors WHERE deleted_at IS NULL ORDER BY author_id`,
    );

    const bookDocs = books.map((b) => ({
      id: b.book_uuid,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      language: b.language,
      cover_storage_key: b.cover_storage_key,
      average_rating: Number(b.average_rating),
      rating_count: b.rating_count,
      view_count: b.view_count,
      published_at: b.published_at ? new Date(b.published_at).getTime() : null,
      authors: b.authors,
    }));

    const authorDocs = authors.map((a) => ({ id: a.author_uuid, name: a.name, bio: a.bio }));

    if (bookDocs.length > 0) {
      await this.#task('POST', `${this.host}/indexes/${BOOKS_INDEX}/documents`, bookDocs);
    }
    if (authorDocs.length > 0) {
      await this.#task('POST', `${this.host}/indexes/${AUTHORS_INDEX}/documents`, authorDocs);
    }
    return { books: bookDocs.length, authors: authorDocs.length };
  }

  async search(query: string, limit = 20) {
    const q = query.trim();
    if (!q) return { hits: [], estimatedTotalHits: 0 };
    const response = await fetch(`${this.host}/indexes/${BOOKS_INDEX}/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ q, limit: Math.min(50, Math.max(1, limit)) }),
    });
    if (!response.ok) {
      this.logger.warn(`Meilisearch search failed: ${response.status}`);
      return { hits: [], estimatedTotalHits: 0 };
    }
    const body = (await response.json()) as {
      hits: Record<string, unknown>[];
      estimatedTotalHits: number;
    };
    return { hits: body.hits, estimatedTotalHits: body.estimatedTotalHits };
  }

  /** Await a Meilisearch async task so indexing is deterministic in tests. */
  async #task(method: string, url: string, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Meilisearch request failed (${response.status})`);
    }
    const result = (await response.json()) as { taskUid?: number };
    if (typeof result.taskUid === 'number') {
      await this.#waitTask(result.taskUid);
    }
  }

  async #waitTask(taskUid: number): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const response = await fetch(`${this.host}/tasks/${taskUid}`, { headers: this.headers() });
      if (response.ok) {
        const task = (await response.json()) as { status: string };
        if (task.status === 'succeeded') return;
        if (task.status === 'failed') throw new Error(`Meilisearch task ${taskUid} failed`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Meilisearch task ${taskUid} timed out`);
  }
}
