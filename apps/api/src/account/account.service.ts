import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { hashPassword } from '../security/crypto.util.js';
import { SessionService } from '../security/session.service.js';

const PURPOSES = {
  emailVerify: 'email_verify',
  passwordReset: 'password_reset',
} as const;

const EMAIL_VERIFY_TTL_MINUTES = 24 * 60;
const PASSWORD_RESET_TTL_MINUTES = 30;

/** Token thô chỉ tồn tại trong link gửi đi; DB lưu HMAC-SHA256. */
function hashToken(raw: string): Buffer {
  const secret = process.env.TOKEN_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(raw).digest();
}

function appBaseUrl(): string {
  const explicit = process.env.APP_PUBLIC_URL ?? '';
  if (explicit) return explicit.replace(/\/+$/, '');
  const cors = (process.env.CORS_ORIGINS ?? '').split(',')[0]?.trim() ?? '';
  return cors.replace(/\/+$/, '');
}

@Injectable()
export class AccountService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly sessions: SessionService,
  ) {}

  private async issueToken(userId: number, purpose: string, ttlMinutes: number): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    const tokenId = randomBytes(16);
    await this.db.query(
      `INSERT INTO user_security_tokens (token_id, user_id, purpose, token_hash, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL ? MINUTE))`,
      [tokenId, userId, purpose, hashToken(raw), ttlMinutes],
    );
    return raw;
  }

  private async consumeToken(raw: string, purpose: string): Promise<number | null> {
    if (!raw || raw.length > 512) return null;
    const rows = await this.db.query<{ token_id: Buffer; user_id: number }[]>(
      `SELECT token_id, user_id FROM user_security_tokens
       WHERE token_hash = ? AND purpose = ?
         AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > NOW(3)
       LIMIT 1`,
      [hashToken(raw), purpose],
    );
    if (rows.length === 0) return null;
    await this.db.query(`UPDATE user_security_tokens SET consumed_at = NOW(3) WHERE token_id = ?`, [
      rows[0].token_id,
    ]);
    return Number(rows[0].user_id);
  }

  async requestEmailVerification(userId: number) {
    const rows = await this.db.query<{ email: string; email_verified_at: Date | null }[]>(
      `SELECT email, email_verified_at FROM users WHERE user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) throw new BadRequestException('Không tìm thấy tài khoản.');
    if (rows[0].email_verified_at) return { status: 'ok', delivery: 'already_verified' };

    const token = await this.issueToken(userId, PURPOSES.emailVerify, EMAIL_VERIFY_TTL_MINUTES);
    const link = `${appBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const delivery = await this.mail.send({
      to: rows[0].email,
      subject: 'Xác minh email BOOKFORFREEDOM',
      text: `Xin chào,\n\nXác minh email của bạn (hết hạn sau 24 giờ):\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    });

    // Chỉ báo "đã gửi" khi transport thực sự nhận email.
    return { status: 'ok', delivery: delivery.delivered ? 'sent' : 'unavailable' };
  }

  async confirmEmailVerification(token: string) {
    const userId = await this.consumeToken(token, PURPOSES.emailVerify);
    if (userId === null) {
      throw new BadRequestException('Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
    }
    await this.db.query(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW(3)) WHERE user_id = ?`,
      [userId],
    );
    return { status: 'ok' };
  }

  /**
   * Luôn trả cùng một phản hồi để không tiết lộ tài khoản có tồn tại hay không.
   * Email chỉ được gửi khi tài khoản tồn tại; khi SMTP chưa cấu hình thì không
   * giả vờ là đã gửi (delivery: 'unavailable').
   */
  async requestPasswordReset(identifier: string) {
    const value = (identifier ?? '').trim();
    if (!value || value.length > 320) return { status: 'ok' };

    const rows = await this.db.query<{ user_id: number; email: string }[]>(
      `SELECT user_id, email FROM users
       WHERE (username = ? OR email = ?) AND deleted_at IS NULL AND status = 'active'
       LIMIT 1`,
      [value, value],
    );
    if (rows.length === 0) return { status: 'ok' };

    const token = await this.issueToken(rows[0].user_id, PURPOSES.passwordReset, PASSWORD_RESET_TTL_MINUTES);
    const link = `${appBaseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.send({
      to: rows[0].email,
      subject: 'Đặt lại mật khẩu BOOKFORFREEDOM',
      text: `Xin chào,\n\nĐặt lại mật khẩu (hết hạn sau 30 phút):\n${link}\n\nNếu không phải bạn, hãy bỏ qua email này.`,
    });

    // Body giống hệt trường hợp tài khoản không tồn tại (chống enumeration).
    return { status: 'ok' };
  }

  async resetPassword(token: string, newPassword: string) {
    const password = newPassword ?? '';
    if (password.length < 8 || password.length > 200) {
      throw new BadRequestException('Mật khẩu phải từ 8 đến 200 ký tự.');
    }
    const userId = await this.consumeToken(token, PURPOSES.passwordReset);
    if (userId === null) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const passwordHash = await hashPassword(password);
    await this.db.query(
      `UPDATE users SET password_hash = ?, password_algorithm = 'scrypt' WHERE user_id = ?`,
      [passwordHash, userId],
    );
    // Mọi phiên cũ bị thu hồi sau khi đổi mật khẩu.
    await this.sessions.revokeAll(userId);
    return { status: 'ok' };
  }
}
