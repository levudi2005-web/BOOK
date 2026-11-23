import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

type ProfileRow = {
  user_id: number;
  user_uuid: string;
  username: string;
  email: string;
  status: string;
  created_at: Date | string;
  last_login_at: Date | string | null;
  display_name: string | null;
  bio: string | null;
  website_url: string | null;
  is_public: number | null;
};

/**
 * Session-scoped profile of the authenticated user. Deliberately never returns
 * password hashes, session tokens or recovery-key material.
 */
@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async getMe(userId: number) {
    const rows = await this.db.query<ProfileRow[]>(
      `SELECT u.user_id, u.user_uuid, u.username, u.email, u.status, u.created_at, u.last_login_at,
              p.display_name, p.bio, p.website_url, p.is_public
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.user_id AND p.deleted_at IS NULL
       WHERE u.user_id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }
    const row = rows[0];
    const [counts] = await this.db.query<
      {
        library_count: number;
        reading_count: number;
        book_count: number;
        comment_count: number;
        reading_seconds: number | string;
      }[]
    >(
      `SELECT
         (SELECT COUNT(*) FROM user_library WHERE user_id = ? AND removed_at IS NULL) AS library_count,
         (SELECT COUNT(*) FROM reading_progress WHERE user_id = ?) AS reading_count,
         (SELECT COUNT(*) FROM books WHERE created_by_user_id = ? AND deleted_at IS NULL) AS book_count,
         (SELECT COUNT(*) FROM comments WHERE user_id = ? AND deleted_at IS NULL) AS comment_count,
         (SELECT COALESCE(SUM(seconds_read), 0) FROM reading_progress WHERE user_id = ?) AS reading_seconds`,
      [userId, userId, userId, userId, userId],
    );

    return {
      userId: row.user_id,
      userUuid: row.user_uuid,
      username: row.username,
      email: row.email,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      profile: {
        displayName: row.display_name ?? '',
        bio: row.bio ?? '',
        websiteUrl: row.website_url ?? '',
        isPublic: row.is_public === null ? true : Boolean(row.is_public),
      },
      stats: {
        library: Number(counts?.library_count ?? 0),
        reading: Number(counts?.reading_count ?? 0),
        books: Number(counts?.book_count ?? 0),
        comments: Number(counts?.comment_count ?? 0),
        readingMinutes: Math.floor(Number(counts?.reading_seconds ?? 0) / 60),
      },
    };
  }

  async updateMe(
    userId: number,
    input: { displayName?: string; bio?: string; websiteUrl?: string; isPublic?: boolean },
  ) {
    const displayName = (input.displayName ?? '').trim();
    const bio = (input.bio ?? '').trim();
    const websiteUrl = (input.websiteUrl ?? '').trim();
    if (displayName.length > 100) {
      throw new BadRequestException('Tên hiển thị tối đa 100 ký tự.');
    }
    if (bio.length > 2000) {
      throw new BadRequestException('Giới thiệu tối đa 2000 ký tự.');
    }
    if (websiteUrl && !/^https?:\/\/[^\s]+$/i.test(websiteUrl)) {
      throw new BadRequestException('Website phải là URL http(s) hợp lệ.');
    }

    await this.db.query(
      `INSERT INTO user_profiles (user_id, display_name, bio, website_url, is_public)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), bio = VALUES(bio),
         website_url = VALUES(website_url), is_public = VALUES(is_public), deleted_at = NULL`,
      [userId, displayName, bio, websiteUrl || null, input.isPublic === false ? 0 : 1],
    );
    return this.getMe(userId);
  }

  /**
   * Sở thích đọc lưu trong `user_settings.preferences` dưới dạng JSON.
   * Chỉ lưu slug của thể loại con đang active, không lưu id dễ lệch giữa môi trường.
   */
  async getPreferences(userId: number) {
    const rows = await this.db.query<{ preferences: unknown }[]>(
      `SELECT preferences FROM user_settings WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    let parsed: unknown = rows[0]?.preferences ?? null;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed) as unknown;
      } catch {
        parsed = null;
      }
    }
    const categorySlugs =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as { categorySlugs?: unknown }).categorySlugs)
        ? ((parsed as { categorySlugs: unknown[] }).categorySlugs.filter(
            (value): value is string => typeof value === 'string',
          ))
        : [];
    return { categorySlugs };
  }

  async updatePreferences(userId: number, input: string[]) {
    const categorySlugs = [...new Set(input.filter((slug) => typeof slug === 'string' && slug.trim()))]
      .map((slug) => slug.trim())
      .slice(0, 64);
    if (categorySlugs.length > 0) {
      const placeholders = categorySlugs.map(() => '?').join(',');
      const existing = await this.db.query<{ slug: string }[]>(
        `SELECT slug FROM categories
         WHERE is_active = 1 AND parent_category_id IS NOT NULL AND slug IN (${placeholders})`,
        categorySlugs,
      );
      if (existing.length !== categorySlugs.length) {
        throw new BadRequestException('Sở thích chứa thể loại không hợp lệ.');
      }
    }
    await this.db.query(
      `INSERT INTO user_settings (user_id, preferences)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE preferences = VALUES(preferences)`,
      [userId, JSON.stringify({ categorySlugs })],
    );
    return { categorySlugs };
  }
}
