import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { generateSecurityToken, hashSecurityToken, newTokenId } from './crypto.util.js';

export type SecurityTokenPurpose =
  | 'email_verification'
  | 'password_reset'
  | 'password_change'
  | 'email_change'
  | 'account_recovery';

type TokenRow = {
  token_id: Buffer;
  user_id: number;
  purpose: string;
  token_hash: Buffer;
  expires_at: Date | string;
  consumed_at: Date | string | null;
  revoked_at: Date | string | null;
};

@Injectable()
export class SecurityTokenService {
  constructor(private readonly db: DatabaseService) {}

  /** Create a one-time token and revoke any previous active token of the same purpose. */
  async issue(
    userId: number,
    purpose: SecurityTokenPurpose,
    ttlSeconds: number,
    metadata: Record<string, unknown> | null = null,
  ): Promise<{ raw: string }> {
    const raw = generateSecurityToken();
    const tokenId = newTokenId();
    const tokenHash = hashSecurityToken(raw);

    await this.db.query(
      `UPDATE user_security_tokens
       SET revoked_at = NOW(3)
       WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND revoked_at IS NULL`,
      [userId, purpose],
    );

    await this.db.query(
      `INSERT INTO user_security_tokens
         (token_id, user_id, purpose, token_hash, issued_at, expires_at, request_metadata)
       VALUES (?, ?, ?, ?, NOW(3), DATE_ADD(NOW(3), INTERVAL ? SECOND), ?)`,
      [tokenId, userId, purpose, tokenHash, ttlSeconds, metadata ? JSON.stringify(metadata) : null],
    );

    return { raw };
  }

  /** Look up a valid (unused, unexpired, unreveoked) token for a purpose. */
  async findValid(purpose: SecurityTokenPurpose, rawToken: string): Promise<TokenRow | null> {
    const tokenHash = hashSecurityToken(rawToken);
    const rows = await this.db.query<TokenRow[]>(
      `SELECT token_id, user_id, purpose, token_hash, expires_at, consumed_at, revoked_at
       FROM user_security_tokens
       WHERE token_hash = ? LIMIT 1`,
      [tokenHash],
    );
    if (rows.length === 0) return null;

    const row = rows[0];
    if (row.purpose !== purpose || row.consumed_at || row.revoked_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return row;
  }

  /** Atomically consume a token (one-time use). Returns the owning user id. */
  async consume(purpose: SecurityTokenPurpose, rawToken: string): Promise<number | null> {
    const tokenHash = hashSecurityToken(rawToken);
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT token_id, user_id
         FROM user_security_tokens
         WHERE token_hash = ? AND purpose = ? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > NOW(3)
         FOR UPDATE`,
        [tokenHash, purpose],
      );
      if (Array.isArray(rows) && rows.length === 0) {
        await connection.rollback();
        return null;
      }
      const row = (rows as { token_id: Buffer; user_id: number }[])[0];
      await connection.execute(
        `UPDATE user_security_tokens SET consumed_at = NOW(3) WHERE token_id = ?`,
        [row.token_id],
      );
      await connection.commit();
      return row.user_id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** Revoke all active tokens for a user and purpose. */
  async revokeActive(userId: number, purpose: SecurityTokenPurpose): Promise<void> {
    await this.db.query(
      `UPDATE user_security_tokens
       SET revoked_at = NOW(3)
       WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND revoked_at IS NULL`,
      [userId, purpose],
    );
  }
}
