import { Injectable } from '@nestjs/common';
import { AdminDatabaseService } from './admin-database.service.js';
import { generateSecurityToken, hashSessionToken } from '../security/crypto.util.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours for admins

@Injectable()
export class AdminSessionService {
  constructor(private readonly db: AdminDatabaseService) {}

  async create(adminId: number): Promise<{ raw: string; expiresAt: Date }> {
    const raw = generateSecurityToken();
    const hash = hashSessionToken(raw);
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await this.db.query(
      `INSERT INTO admin_sessions (admin_id, session_token_hash, mfa_verified, expires_at)
       VALUES (?, ?, 1, ?)`,
      [adminId, hash, expiresAt],
    );
    return { raw, expiresAt };
  }

  async resolve(rawToken: string): Promise<number | null> {
    if (!rawToken) return null;
    const hash = hashSessionToken(rawToken);
    const rows = await this.db.query<{ admin_id: number }[]>(
      `SELECT admin_id FROM admin_sessions
       WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW(3)
       LIMIT 1`,
      [hash],
    );
    if (rows.length === 0) return null;
    await this.db.query(
      `UPDATE admin_sessions SET last_seen_at = NOW(3) WHERE session_token_hash = ?`,
      [hash],
    );
    return rows[0].admin_id;
  }

  async revoke(rawToken: string): Promise<void> {
    if (!rawToken) return;
    await this.db.query(
      `UPDATE admin_sessions SET revoked_at = NOW(3), revoked_reason = 'logout'
       WHERE session_token_hash = ?`,
      [hashSessionToken(rawToken)],
    );
  }

  async revokeAll(adminId: number): Promise<void> {
    await this.db.query(
      `UPDATE admin_sessions SET revoked_at = NOW(3), revoked_reason = 'security'
       WHERE admin_id = ? AND revoked_at IS NULL`,
      [adminId],
    );
  }
}
