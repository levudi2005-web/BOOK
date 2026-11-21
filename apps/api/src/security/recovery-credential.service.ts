import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  generateRecoveryKey,
  hashRecoveryKey,
  newTokenId,
  recoveryKeyMatches,
} from './crypto.util.js';

type CredentialRow = {
  credential_id: Buffer;
  user_id: number;
  token_hash: Buffer;
  status: string;
};

@Injectable()
export class RecoveryCredentialService {
  constructor(private readonly db: DatabaseService) {}

  /** Issue a new Recovery Key. Revokes any previous active key first. */
  async issue(userId: number): Promise<{ raw: string }> {
    await this.db.query(
      `UPDATE user_recovery_credentials
       SET status = 'revoked', revoked_at = NOW(3)
       WHERE user_id = ? AND status = 'active'`,
      [userId],
    );

    const raw = generateRecoveryKey();
    const credentialId = newTokenId();
    const tokenHash = hashRecoveryKey(raw);

    await this.db.query(
      `INSERT INTO user_recovery_credentials
         (credential_id, user_id, token_hash, hash_algorithm, status)
       VALUES (?, ?, ?, 'HMAC-SHA256', 'active')`,
      [credentialId, userId, tokenHash],
    );

    return { raw };
  }

  /** Verify a raw Recovery Key against the active credential of a user. */
  async verify(userId: number, rawKey: string): Promise<boolean> {
    const rows = await this.db.query<CredentialRow[]>(
      `SELECT credential_id, token_hash, status
       FROM user_recovery_credentials
       WHERE user_id = ? AND status = 'active' AND revoked_at IS NULL
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return false;

    const inputHash = hashRecoveryKey(rawKey);
    const storedHash = rows[0].token_hash;

    if (!recoveryKeyMatches(inputHash, storedHash)) return false;

    await this.db.query(
      `UPDATE user_recovery_credentials SET last_used_at = NOW(3) WHERE credential_id = ?`,
      [rows[0].credential_id],
    );
    return true;
  }

  /** Rotate to a new key after verifying the current key. */
  async rotate(userId: number, currentRawKey: string): Promise<{ raw: string } | null> {
    const valid = await this.verify(userId, currentRawKey);
    if (!valid) return null;
    return this.issue(userId);
  }

  async revokeAll(userId: number): Promise<void> {
    await this.db.query(
      `UPDATE user_recovery_credentials
       SET status = 'revoked', revoked_at = NOW(3)
       WHERE user_id = ? AND status = 'active'`,
      [userId],
    );
  }
}
