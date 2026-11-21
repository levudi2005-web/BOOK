import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

export const DEFAULT_QUOTA_BYTES = 419430400; // 400 MiB
const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB

type ObjectRow = {
  object_id: number;
  object_uuid: string;
  owner_user_id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  chunk_size: number;
  chunk_count: number;
  status: string;
  checksum_sha256: Buffer | null;
  is_public: number;
};

type AccountRow = {
  account_id: number;
  user_id: number;
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  last_warning_level: number;
};

type SessionRow = {
  session_id: number;
  session_uuid: string;
  object_id: number;
  owner_user_id: number;
  status: string;
  total_bytes: number;
  uploaded_chunks: number;
  expires_at: Date | string;
};

@Injectable()
export class StorageService {
  constructor(private readonly db: DatabaseService) {}

  async ensureAccount(userId: number): Promise<AccountRow> {
    await this.db.query(
      `INSERT INTO user_storage_accounts (user_id, quota_bytes)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId, DEFAULT_QUOTA_BYTES],
    );
    const rows = await this.db.query<AccountRow[]>(
      `SELECT account_id, user_id, quota_bytes, used_bytes, reserved_bytes, last_warning_level
       FROM user_storage_accounts WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  async getQuota(userId: number) {
    const account = await this.ensureAccount(userId);
    const usedPct = Math.floor((account.used_bytes / account.quota_bytes) * 100);
    const level = usedPct >= 100 ? 100 : usedPct >= 95 ? 95 : usedPct >= 85 ? 85 : usedPct >= 70 ? 70 : 0;
    return {
      quotaBytes: Number(account.quota_bytes),
      usedBytes: Number(account.used_bytes),
      reservedBytes: Number(account.reserved_bytes),
      availableBytes: Number(account.quota_bytes - account.used_bytes - account.reserved_bytes),
      usagePercent: usedPct,
      warningLevel: level,
    };
  }

  async initUpload(userId: number, filename: string, mimeType: string, totalBytes: number) {
    const name = filename.trim();
    if (!name || name.length > 512) {
      throw new ForbiddenException('Tên file không hợp lệ.');
    }
    if (!Number.isInteger(totalBytes) || totalBytes <= 0) {
      throw new ForbiddenException('Kích thước file không hợp lệ.');
    }

    const account = await this.ensureAccount(userId);
    if (account.used_bytes + account.reserved_bytes + totalBytes > account.quota_bytes) {
      throw new PayloadTooLargeException('Đã vượt quá hạn mức lưu trữ 400 MiB.');
    }

    const objectUuid = randomUUID();
    const sessionUuid = randomUUID();
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();

      const [objectResult] = await connection.execute(
        `INSERT INTO storage_objects
           (object_uuid, owner_user_id, filename, mime_type, size_bytes, chunk_size, status)
         VALUES (?, ?, ?, ?, ?, ?, 'uploading')`,
        [objectUuid, userId, name, mimeType || 'application/octet-stream', totalBytes, MAX_CHUNK_SIZE],
      );
      const objectId = Number((objectResult as { insertId: number }).insertId);

      await connection.execute(
        `INSERT INTO user_storage_reservations
           (user_id, object_id, bytes_reserved, status)
         VALUES (?, ?, ?, 'reserved')`,
        [userId, objectId, totalBytes],
      );

      await connection.execute(
        `UPDATE user_storage_accounts
         SET reserved_bytes = reserved_bytes + ?
         WHERE user_id = ?`,
        [totalBytes, userId],
      );

      await connection.execute(
        `INSERT INTO storage_upload_sessions
           (session_uuid, object_id, owner_user_id, total_bytes, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL 24 HOUR))`,
        [sessionUuid, objectId, userId, totalBytes],
      );

      await connection.commit();
      return { objectUuid, sessionUuid, chunkSize: MAX_CHUNK_SIZE, chunkCount: Math.ceil(totalBytes / MAX_CHUNK_SIZE) };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async uploadChunk(userId: number, sessionUuid: string, chunkIndex: number, payloadBase64: string) {
    const session = await this.findSession(userId, sessionUuid);
    if (session.status !== 'active') {
      throw new ForbiddenException('Phiên upload đã kết thúc.');
    }
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      throw new ForbiddenException('Chỉ số chunk không hợp lệ.');
    }

    const payload = Buffer.from(payloadBase64, 'base64');
    if (payload.length === 0 || payload.length > MAX_CHUNK_SIZE) {
      throw new ForbiddenException('Kích thước chunk vượt giới hạn 4 MiB.');
    }

    const checksum = createHash('sha256').update(payload).digest();

    await this.db.query(
      `INSERT INTO storage_chunks (object_id, chunk_index, size_bytes, checksum_sha256, payload)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         size_bytes = VALUES(size_bytes),
         checksum_sha256 = VALUES(checksum_sha256),
         payload = VALUES(payload)`,
      [session.object_id, chunkIndex, payload.length, checksum, payload],
    );

    await this.db.query(
      `UPDATE storage_upload_sessions
       SET uploaded_chunks = GREATEST(uploaded_chunks, ?)
       WHERE session_id = ?`,
      [chunkIndex + 1, session.session_id],
    );

    return { chunkIndex, sizeBytes: payload.length };
  }

  async completeUpload(userId: number, sessionUuid: string) {
    const session = await this.findSession(userId, sessionUuid);
    if (session.status !== 'active') {
      throw new ForbiddenException('Phiên upload đã kết thúc.');
    }

    const chunkCount = Math.ceil(session.total_bytes / MAX_CHUNK_SIZE);
    const chunks = await this.db.query<{ chunk_index: number }[]>(
      `SELECT chunk_index FROM storage_chunks WHERE object_id = ? ORDER BY chunk_index`,
      [session.object_id],
    );
    if (chunks.length !== chunkCount) {
      throw new ForbiddenException('Chưa đủ chunk để hoàn tất upload.');
    }

    const hasher = createHash('sha256');
    let total = 0;
    for (let index = 0; index < chunkCount; index += 1) {
      const rows = await this.db.query<{ payload: Buffer }[]>(
        `SELECT payload FROM storage_chunks WHERE object_id = ? AND chunk_index = ? LIMIT 1`,
        [session.object_id, index],
      );
      if (rows.length === 0) {
        throw new ForbiddenException('Thiếu chunk trong file.');
      }
      hasher.update(rows[0].payload);
      total += rows[0].payload.length;
    }

    const checksum = hasher.digest();
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE storage_objects
         SET status = 'complete', chunk_count = ?, checksum_sha256 = ?, size_bytes = ?
         WHERE object_id = ?`,
        [chunkCount, checksum, total, session.object_id],
      );

      await connection.execute(
        `UPDATE user_storage_reservations
         SET status = 'consumed'
         WHERE object_id = ? AND user_id = ? AND status = 'reserved'`,
        [session.object_id, userId],
      );

      await connection.execute(
        `UPDATE user_storage_accounts
         SET reserved_bytes = reserved_bytes - ?, used_bytes = used_bytes + ?
         WHERE user_id = ?`,
        [total, total, userId],
      );

      await connection.execute(
        `INSERT INTO storage_usage_entries (user_id, object_id, delta_bytes, reason)
         VALUES (?, ?, ?, 'upload_complete')`,
        [userId, session.object_id, total],
      );

      await connection.execute(
        `UPDATE storage_upload_sessions SET status = 'complete' WHERE session_id = ?`,
        [session.session_id],
      );

      await connection.commit();

      const objects = await this.db.query<ObjectRow[]>(
        `SELECT object_id, object_uuid, owner_user_id, filename, mime_type, size_bytes,
                chunk_size, chunk_count, status, checksum_sha256, is_public
         FROM storage_objects WHERE object_id = ? LIMIT 1`,
        [session.object_id],
      );
      return this.toObjectDto(objects[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async cancelUpload(userId: number, sessionUuid: string) {
    const session = await this.findSession(userId, sessionUuid);
    if (session.status !== 'active') {
      return { status: 'ok' };
    }
    await this.releaseReservation(userId, session.object_id, session.session_id);
    return { status: 'ok' };
  }

  async listObjects(userId: number) {
    const rows = await this.db.query<ObjectRow[]>(
      `SELECT object_id, object_uuid, owner_user_id, filename, mime_type, size_bytes,
              chunk_size, chunk_count, status, checksum_sha256, is_public
       FROM storage_objects
       WHERE owner_user_id = ? AND status != 'deleted'
       ORDER BY created_at DESC`,
      [userId],
    );
    return { data: rows.map((row) => this.toObjectDto(row)) };
  }

  async getObject(userId: number, objectUuid: string) {
    const row = await this.findObject(userId, objectUuid);
    return this.toObjectDto(row);
  }

  /** Move to trash (soft delete). Trash still counts against quota until permanently deleted. */
  async deleteObject(userId: number, objectUuid: string) {
    const row = await this.findObject(userId, objectUuid);
    await this.db.query(
      `UPDATE storage_objects SET status = 'deleted', deleted_at = NOW(3) WHERE object_id = ?`,
      [row.object_id],
    );
    return { status: 'ok' };
  }

  async listTrash(userId: number) {
    const rows = await this.db.query<ObjectRow[]>(
      `SELECT object_id, object_uuid, owner_user_id, filename, mime_type, size_bytes,
              chunk_size, chunk_count, status, checksum_sha256, is_public
       FROM storage_objects
       WHERE owner_user_id = ? AND status = 'deleted'
       ORDER BY deleted_at DESC`,
      [userId],
    );
    return { data: rows.map((row) => this.toObjectDto(row)) };
  }

  /** Restore a trashed object back to `complete`. */
  async restoreObject(userId: number, objectUuid: string) {
    const row = await this.findAnyObject(userId, objectUuid);
    if (row.status !== 'deleted') {
      throw new ForbiddenException('Chỉ có thể khôi phục file trong thùng rác.');
    }
    await this.db.query(
      `UPDATE storage_objects SET status = 'complete', deleted_at = NULL WHERE object_id = ?`,
      [row.object_id],
    );
    return this.toObjectDto(row);
  }

  /** Permanently delete an object (and its chunks) and release quota. */
  async permanentDelete(userId: number, objectUuid: string) {
    const row = await this.findAnyObject(userId, objectUuid);
    await this.db.query(`DELETE FROM storage_objects WHERE object_id = ?`, [row.object_id]);
    await this.db.query(
      `UPDATE user_storage_accounts SET used_bytes = GREATEST(used_bytes - ?, 0) WHERE user_id = ?`,
      [row.size_bytes, userId],
    );
    await this.db.query(
      `INSERT INTO storage_usage_entries (user_id, object_id, delta_bytes, reason)
       VALUES (?, ?, ?, 'delete_permanent')`,
      [userId, row.object_id, -row.size_bytes],
    );
    return { status: 'ok' };
  }

  async download(
    userId: number,
    objectUuid: string,
  ): Promise<{ dto: ReturnType<StorageService['toObjectDto']>; chunks: Buffer[] }> {
    const row = await this.findObject(userId, objectUuid);
    if (row.status !== 'complete') {
      throw new ForbiddenException('File chưa hoàn tất upload.');
    }
    const chunks = await this.db.query<{ payload: Buffer }[]>(
      `SELECT payload FROM storage_chunks WHERE object_id = ? ORDER BY chunk_index`,
      [row.object_id],
    );
    return { dto: this.toObjectDto(row), chunks: chunks.map((c) => c.payload) };
  }


  async cleanupExpiredSessions(): Promise<{ released: number }> {
    const sessions = await this.db.query<SessionRow[]>(
      `SELECT session_id, object_id, owner_user_id
       FROM storage_upload_sessions
       WHERE status = 'active' AND expires_at < NOW(3)`,
    );
    for (const session of sessions) {
      await this.releaseReservation(session.owner_user_id, session.object_id, session.session_id, 'expired');
    }
    return { released: sessions.length };
  }

  async reconcileQuota(): Promise<{ fixed: number }> {
    const rows = await this.db.query<{ user_id: number; used: number }[]>(
      `SELECT owner_user_id AS user_id, COALESCE(SUM(size_bytes), 0) AS used
       FROM storage_objects WHERE status = 'complete' GROUP BY owner_user_id`,
    );
    let fixed = 0;
    for (const row of rows) {
      await this.db.query(
        `UPDATE user_storage_accounts SET used_bytes = ? WHERE user_id = ?`,
        [row.used, row.user_id],
      );
      fixed += 1;
    }
    return { fixed };
  }

  private async releaseReservation(
    userId: number,
    objectId: number,
    sessionId: number,
    sessionStatus: 'cancelled' | 'expired' = 'cancelled',
  ) {
    const reservations = await this.db.query<{ bytes_reserved: number }[]>(
      `SELECT bytes_reserved FROM user_storage_reservations
       WHERE object_id = ? AND user_id = ? AND status = 'reserved' LIMIT 1`,
      [objectId, userId],
    );
    const reserved = reservations.length > 0 ? reservations[0].bytes_reserved : 0;

    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      if (reserved > 0) {
        await connection.execute(
          `UPDATE user_storage_reservations SET status = 'released' WHERE object_id = ? AND user_id = ? AND status = 'reserved'`,
          [objectId, userId],
        );
        await connection.execute(
          `UPDATE user_storage_accounts SET reserved_bytes = reserved_bytes - ? WHERE user_id = ?`,
          [reserved, userId],
        );
      }
      await connection.execute(
        `UPDATE storage_upload_sessions SET status = ? WHERE session_id = ?`,
        [sessionStatus, sessionId],
      );
      await connection.execute(
        `UPDATE storage_objects SET status = 'failed' WHERE object_id = ? AND status = 'uploading'`,
        [objectId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async findSession(userId: number, sessionUuid: string): Promise<SessionRow> {
    const rows = await this.db.query<SessionRow[]>(
      `SELECT session_id, session_uuid, object_id, owner_user_id, status, total_bytes, uploaded_chunks, expires_at
       FROM storage_upload_sessions WHERE session_uuid = ? LIMIT 1`,
      [sessionUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy phiên upload.');
    }
    if (rows[0].owner_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với phiên upload này.');
    }
    return rows[0];
  }

  private async findObject(userId: number, objectUuid: string): Promise<ObjectRow> {
    const rows = await this.db.query<ObjectRow[]>(
      `SELECT object_id, object_uuid, owner_user_id, filename, mime_type, size_bytes,
              chunk_size, chunk_count, status, checksum_sha256, is_public
       FROM storage_objects WHERE object_uuid = ? AND status != 'deleted' LIMIT 1`,
      [objectUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy file.');
    }
    if (rows[0].owner_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với file này.');
    }
    return rows[0];
  }

  private async findAnyObject(userId: number, objectUuid: string): Promise<ObjectRow> {
    const rows = await this.db.query<ObjectRow[]>(
      `SELECT object_id, object_uuid, owner_user_id, filename, mime_type, size_bytes,
              chunk_size, chunk_count, status, checksum_sha256, is_public
       FROM storage_objects WHERE object_uuid = ? LIMIT 1`,
      [objectUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy file.');
    }
    if (rows[0].owner_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với file này.');
    }
    return rows[0];
  }

  private toObjectDto(row: ObjectRow) {
    return {
      objectUuid: row.object_uuid,
      filename: row.filename,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      chunkSize: Number(row.chunk_size),
      chunkCount: Number(row.chunk_count),
      status: row.status,
      checksumSha256: row.checksum_sha256 ? row.checksum_sha256.toString('hex') : null,
      isPublic: Number(row.is_public) === 1,
    };
  }

  /** Stream chunks without loading the whole file into memory. */
  async downloadStream(userId: number, objectUuid: string) {
    const row = await this.findObject(userId, objectUuid);
    if (row.status !== 'complete') {
      throw new ForbiddenException('File chưa hoàn tất upload.');
    }
    const db = this.db;
    const objectId = row.object_id;
    const chunkCount = row.chunk_count;
    async function* generator() {
      for (let index = 0; index < chunkCount; index += 1) {
        const rows = await db.query<{ payload: Buffer }[]>(
          `SELECT payload FROM storage_chunks WHERE object_id = ? AND chunk_index = ? LIMIT 1`,
          [objectId, index],
        );
        if (rows.length > 0) yield rows[0].payload;
      }
    }
    return { dto: this.toObjectDto(row), stream: generator() };
  }

}

