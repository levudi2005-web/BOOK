import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { generateSecurityToken, hashSessionToken } from './crypto.util.js';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

type SessionRow = { user_id: number };

@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number): Promise<{ raw: string; expiresAt: Date }> {
    const raw = generateSecurityToken();
    const hash = hashSessionToken(raw);
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    await this.db.query(
      `INSERT INTO user_sessions (user_id, session_token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, hash, expiresAt],
    );

    return { raw, expiresAt };
  }

  /** Resolve a session token to a user id, or null if invalid/expired/revoked. */
  async resolve(rawToken: string): Promise<number | null> {
    if (!rawToken) return null;
    const hash = hashSessionToken(rawToken);
    const rows = await this.db.query<SessionRow[]>(
      `SELECT user_id FROM user_sessions
       WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW(3)
       LIMIT 1`,
      [hash],
    );
    if (rows.length === 0) return null;

    await this.db.query(
      `UPDATE user_sessions SET last_seen_at = NOW(3) WHERE session_token_hash = ?`,
      [hash],
    );
    return rows[0].user_id;
  }

  async revoke(rawToken: string): Promise<void> {
    if (!rawToken) return;
    await this.db.query(
      `UPDATE user_sessions SET revoked_at = NOW(3), revoked_reason = 'logout'
       WHERE session_token_hash = ?`,
      [hashSessionToken(rawToken)],
    );
  }

  async revokeAll(userId: number): Promise<void> {
    await this.db.query(
      `UPDATE user_sessions SET revoked_at = NOW(3), revoked_reason = 'security'
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  }
}
