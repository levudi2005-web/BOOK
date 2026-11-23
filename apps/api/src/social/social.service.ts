import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

type BookRef = { book_id: number; book_uuid: string; slug: string; title: string };

@Injectable()
export class SocialService {
  constructor(private readonly db: DatabaseService) {}

  private async resolveBook(slug: string): Promise<BookRef> {
    const rows = await this.db.query<BookRef[]>(
      `SELECT book_id, book_uuid, slug, title FROM books WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
      [slug],
    );
    if (rows.length === 0) throw new NotFoundException('Không tìm thấy sách.');
    return rows[0];
  }

  async listLibrary(userId: number) {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT b.book_uuid, b.slug, b.title, b.subtitle, b.cover_storage_key, b.cover_mime_type,
              b.visibility AS book_visibility, b.status AS book_status,
              ul.status, ul.is_favorite, ul.added_at, ul.last_opened_at, ul.finished_at,
              COALESCE(rp.percent_complete, 0) AS progress_percent,
              COALESCE(rp.seconds_read, 0) AS seconds_read,
              rp.page_number, rp.total_pages
       FROM user_library ul
       JOIN books b ON b.book_id = ul.book_id
       LEFT JOIN reading_progress rp ON rp.user_id = ul.user_id AND rp.book_id = ul.book_id
       WHERE ul.user_id = ? AND ul.removed_at IS NULL AND b.deleted_at IS NULL
       ORDER BY ul.last_opened_at DESC, ul.added_at DESC`,
      [userId],
    );
    return { data: rows.map((r) => ({ ...r, isFavorite: Number(r.is_favorite) === 1 })) };
  }

  async addToLibrary(userId: number, slug: string) {
    const book = await this.resolveBook(slug);
    const existing = await this.db.query<{ library_id: number }[]>(
      `SELECT library_id FROM user_library WHERE user_id = ? AND book_id = ? LIMIT 1`,
      [userId, book.book_id],
    );
    if (existing.length > 0) {
      await this.db.query(
        `UPDATE user_library SET removed_at = NULL, updated_at = NOW(3) WHERE library_id = ?`,
        [existing[0].library_id],
      );
    } else {
      await this.db.query(
        `INSERT INTO user_library (user_id, book_id, status) VALUES (?, ?, 'want_to_read')`,
        [userId, book.book_id],
      );
    }
    return { status: 'ok', bookUuid: book.book_uuid };
  }

  async updateLibrary(userId: number, slug: string, input: { status?: string; isFavorite?: boolean }) {
    const book = await this.resolveBook(slug);
    const sets: string[] = [];
    const params: (string | number | boolean)[] = [];
    if (input.status) {
      sets.push('status = ?');
      params.push(input.status);
      if (input.status === 'finished') sets.push('finished_at = COALESCE(finished_at, NOW(3))');
    }
    if (input.isFavorite !== undefined) {
      sets.push('is_favorite = ?');
      params.push(input.isFavorite ? 1 : 0);
    }
    if (sets.length === 0) return { status: 'ok' };
    sets.push('last_opened_at = NOW(3)');
    await this.db.query(
      `UPDATE user_library SET ${sets.join(', ')} WHERE user_id = ? AND book_id = ?`,
      [...params, userId, book.book_id],
    );
    return { status: 'ok' };
  }

  async removeFromLibrary(userId: number, slug: string) {
    const book = await this.resolveBook(slug);
    await this.db.query(
      `UPDATE user_library SET removed_at = NOW(3) WHERE user_id = ? AND book_id = ?`,
      [userId, book.book_id],
    );
    return { status: 'ok' };
  }

  async getProgress(userId: number, slug: string) {
    const book = await this.resolveBook(slug);
    const rows = await this.db.query<
      {
        percent_complete: number | string;
        is_completed: number;
        completed_at: Date | string | null;
        last_read_at: Date | string | null;
        chapter_uuid: string | null;
        seconds_read: number | string;
      }[]
    >(
      `SELECT rp.percent_complete, rp.is_completed, rp.completed_at, rp.last_read_at,
              rp.seconds_read, bc.chapter_uuid
       FROM reading_progress rp
       LEFT JOIN book_chapters bc ON bc.chapter_id = rp.chapter_id
       WHERE rp.user_id = ? AND rp.book_id = ? LIMIT 1`,
      [userId, book.book_id],
    );
    if (rows.length === 0) {
      return { percentComplete: 0, isCompleted: false, chapterUuid: null };
    }
    const row = rows[0];
    return {
      percentComplete: Number(row.percent_complete),
      isCompleted: Number(row.is_completed) === 1,
      chapterUuid: row.chapter_uuid,
      lastReadAt: row.last_read_at,
      completedAt: row.completed_at,
      secondsRead: Number(row.seconds_read ?? 0),
    };
  }

  async saveProgress(
    userId: number,
    slug: string,
    input: {
      chapterId?: number;
      chapterUuid?: string;
      percentComplete?: number;
      isCompleted?: boolean;
      secondsRead?: number;
    },
  ) {
    const book = await this.resolveBook(slug);
    const pct = Math.min(100, Math.max(0, Number(input.percentComplete ?? 0)));
    const completed = input.isCompleted === true || pct >= 100;
    const chapterId = await this.resolveChapterId(book.book_id, input.chapterId, input.chapterUuid);
    const secondsRead = Math.min(3600, Math.max(0, Math.round(Number(input.secondsRead ?? 0))));

    await this.db.query(
      `INSERT INTO reading_progress
         (user_id, book_id, chapter_id, percent_complete, is_completed, completed_at, seconds_read)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         chapter_id = VALUES(chapter_id),
         percent_complete = VALUES(percent_complete),
         is_completed = VALUES(is_completed),
         completed_at = VALUES(completed_at),
         seconds_read = seconds_read + VALUES(seconds_read),
         last_read_at = NOW(3)`,
      [userId, book.book_id, chapterId, pct, completed ? 1 : 0, completed ? new Date() : null, secondsRead],
    );

    await this.db.query(
      `UPDATE user_library SET status = ?, last_opened_at = NOW(3), finished_at = COALESCE(finished_at, IF(? = 1, NOW(3), NULL))
       WHERE user_id = ? AND book_id = ? AND removed_at IS NULL`,
      [completed ? 'finished' : 'reading', completed ? 1 : 0, userId, book.book_id],
    );

    await this.db.query(
      `INSERT INTO reading_history (user_id, book_id, chapter_id, source, pages_read)
       VALUES (?, ?, ?, 'web', 1)`,
      [userId, book.book_id, chapterId],
    );

    return { percentComplete: pct, isCompleted: completed };
  }

  /**
   * Chấp nhận `chapterUuid` (an toàn để deep-link) hoặc `chapterId` cũ và
   * xác minh chương thuộc đúng sách để không ghi lịch sử chéo sách.
   */
  private async resolveChapterId(
    bookId: number,
    chapterId?: number,
    chapterUuid?: string,
  ): Promise<number | null> {
    const uuid = (chapterUuid ?? '').trim();
    if (uuid) {
      const rows = await this.db.query<{ chapter_id: number }[]>(
        `SELECT chapter_id FROM book_chapters WHERE chapter_uuid = ? AND book_id = ? LIMIT 1`,
        [uuid, bookId],
      );
      if (rows.length === 0) {
        throw new BadRequestException('Chương không thuộc sách này.');
      }
      return Number(rows[0].chapter_id);
    }
    if (chapterId === undefined || chapterId === null) return null;
    const rows = await this.db.query<{ chapter_id: number }[]>(
      `SELECT chapter_id FROM book_chapters WHERE chapter_id = ? AND book_id = ? LIMIT 1`,
      [chapterId, bookId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Chương không thuộc sách này.');
    }
    return Number(rows[0].chapter_id);
  }

  async getHistory(userId: number) {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT rh.history_id, rh.started_at, rh.pages_read,
              b.book_uuid, b.slug, b.title,
              c.chapter_uuid, c.chapter_number, c.title AS chapter_title
       FROM reading_history rh
       JOIN books b ON b.book_id = rh.book_id
       LEFT JOIN book_chapters c ON c.chapter_id = rh.chapter_id
       WHERE rh.user_id = ? AND b.deleted_at IS NULL
       ORDER BY rh.started_at DESC
       LIMIT 50`,
      [userId],
    );
    return { data: rows };
  }


  async listComments(slug: string) {
    const book = await this.resolveBook(slug);
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT c.comment_uuid, c.body, c.thread_depth, c.reply_count, c.like_count, c.created_at,
              u.username, u.user_uuid
       FROM comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.book_id = ? AND c.status = 'published' AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [book.book_id],
    );
    return { data: rows };
  }

  async addComment(userId: number, slug: string, body: string) {
    const book = await this.resolveBook(slug);
    const text = (body ?? '').trim();
    if (!text || text.length > 5000) {
      throw new ForbiddenException('Nội dung bình luận không hợp lệ.');
    }
    const commentUuid = randomUUID();
    await this.db.query(
      `INSERT INTO comments (comment_uuid, book_id, user_id, body, status, thread_depth)
       VALUES (?, ?, ?, ?, 'published', 0)`,
      [commentUuid, book.book_id, userId, text],
    );
    return { commentUuid };
  }

  async updateComment(userId: number, commentUuid: string, body: string) {
    const text = (body ?? '').trim();
    if (!text || text.length > 5000) {
      throw new ForbiddenException('Nội dung bình luận không hợp lệ.');
    }
    const rows = await this.db.query<{ comment_id: number; user_id: number }[]>(
      `SELECT comment_id, user_id FROM comments
       WHERE comment_uuid = ? AND deleted_at IS NULL AND status = 'published'
       LIMIT 1`,
      [commentUuid],
    );
    if (rows.length === 0) throw new NotFoundException('Không tìm thấy bình luận.');
    if (rows[0].user_id !== userId) throw new ForbiddenException('Không có quyền với bình luận này.');
    await this.db.query(`UPDATE comments SET body = ? WHERE comment_id = ?`, [text, rows[0].comment_id]);
    return { commentUuid, body: text };
  }

  async deleteComment(userId: number, commentUuid: string) {
    const rows = await this.db.query<{ comment_id: number; user_id: number }[]>(
      `SELECT comment_id, user_id FROM comments WHERE comment_uuid = ? AND deleted_at IS NULL LIMIT 1`,
      [commentUuid],
    );
    if (rows.length === 0) throw new NotFoundException('Không tìm thấy bình luận.');
    if (rows[0].user_id !== userId) throw new ForbiddenException('Không có quyền với bình luận này.');
    await this.db.query(
      `UPDATE comments SET status = 'deleted', deleted_at = NOW(3) WHERE comment_id = ?`,
      [rows[0].comment_id],
    );
    return { status: 'ok' };
  }

  async listReviews(slug: string) {
    const book = await this.resolveBook(slug);
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT r.review_uuid, r.rating, r.title, r.body, r.helpful_count, r.published_at, u.username, u.user_uuid
       FROM reviews r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.book_id = ? AND r.status = 'published' AND r.deleted_at IS NULL
       ORDER BY r.published_at DESC
       LIMIT 100`,
      [book.book_id],
    );
    const [{ avg, count }] = await this.db.query<{ avg: number | null; count: number }[]>(
      `SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews
       WHERE book_id = ? AND status = 'published' AND deleted_at IS NULL`,
      [book.book_id],
    );
    return { data: rows, meta: { average: avg === null ? 0 : Number(avg), count: Number(count) } };
  }

  async addReview(userId: number, slug: string, input: { rating?: number; title?: string; body?: string }) {
    const book = await this.resolveBook(slug);
    const rating = Number(input.rating ?? 0);
    if (!Number.isFinite(rating) || rating < 0.5 || rating > 5) {
      throw new ForbiddenException('Điểm đánh giá phải từ 0.5 đến 5.');
    }
    const reviewUuid = randomUUID();
    await this.db.query(
      `INSERT INTO reviews (review_uuid, user_id, book_id, rating, title, body, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, 'published', NOW(3))
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating), title = VALUES(title), body = VALUES(body),
         status = 'published', published_at = NOW(3), deleted_at = NULL`,
      [reviewUuid, userId, book.book_id, rating, input.title ?? null, input.body ?? null],
    );
    return { reviewUuid, rating };
  }
}
