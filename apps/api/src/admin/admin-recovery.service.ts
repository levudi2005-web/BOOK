import { Injectable } from '@nestjs/common';
import { AdminDatabaseService } from './admin-database.service.js';
import { generateRecoveryKey, hashRecoveryKey, newTokenId, recoveryKeyMatches } from '../security/crypto.util.js';

type CredentialRow = { credential_id: Buffer; token_hash: Buffer; status: string };

@Injectable()
export class AdminRecoveryCredentialService {
  constructor(private readonly db: AdminDatabaseService) {}

  async issue(adminId: number): Promise<{ raw: string }> {
    await this.db.query(
      `UPDATE admin_recovery_credentials
       SET status = 'revoked', revoked_at = NOW(3)
       WHERE admin_id = ? AND status = 'active'`,
      [adminId],
    );
    const raw = generateRecoveryKey();
    await this.db.query(
      `INSERT INTO admin_recovery_credentials
         (credential_id, admin_id, token_hash, hash_algorithm, status)
       VALUES (?, ?, ?, 'HMAC-SHA256', 'active')`,
      [newTokenId(), adminId, hashRecoveryKey(raw)],
    );
    return { raw };
  }

  async verify(adminId: number, rawKey: string): Promise<boolean> {
    const rows = await this.db.query<CredentialRow[]>(
      `SELECT credential_id, token_hash FROM admin_recovery_credentials
       WHERE admin_id = ? AND status = 'active' AND revoked_at IS NULL LIMIT 1`,
      [adminId],
    );
    if (rows.length === 0) return false;
    if (!recoveryKeyMatches(hashRecoveryKey(rawKey), rows[0].token_hash)) return false;
    await this.db.query(
      `UPDATE admin_recovery_credentials SET last_used_at = NOW(3) WHERE credential_id = ?`,
      [rows[0].credential_id],
    );
    return true;
  }

  async rotate(adminId: number, currentRawKey: string): Promise<{ raw: string } | null> {
    const valid = await this.verify(adminId, currentRawKey);
    if (!valid) return null;
    return this.issue(adminId);
  }
}
