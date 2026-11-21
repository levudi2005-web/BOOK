import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { RecoveryCredentialService } from '../security/recovery-credential.service.js';
import { SessionService } from '../security/session.service.js';
import { hashPassword, verifyPassword } from '../security/crypto.util.js';

type UserRow = {
  user_id: number;
  username: string;
  email: string;
  status: string;
  password_hash: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly recovery: RecoveryCredentialService,
    private readonly sessions: SessionService,
  ) {}

  async register(username: string, email: string, password: string) {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
      throw new UnauthorizedException('Tên đăng nhập không hợp lệ.');
    }
    if (password.length < 8) {
      throw new UnauthorizedException('Mật khẩu phải có ít nhất 8 ký tự.');
    }

    const existing = await this.db.query<{ user_id: number }[]>(
      `SELECT user_id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [normalizedUsername, normalizedEmail],
    );
    if (existing.length > 0) {
      throw new ConflictException('Tên đăng nhập hoặc email đã được sử dụng.');
    }

    const passwordHash = await hashPassword(password);
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO users (user_uuid, username, email, password_hash, password_algorithm, status)
       VALUES (?, ?, ?, ?, 'scrypt', 'active')`,
      [randomUUID(), normalizedUsername, normalizedEmail, passwordHash],
    );

    const userId = result.insertId;
    const { raw } = await this.recovery.issue(userId);
    return { status: 'active', userId, recoveryKey: raw };
  }

  private async findByIdentifier(identifier: string): Promise<UserRow | null> {
    const rows = await this.db.query<UserRow[]>(
      `SELECT user_id, username, email, status, password_hash
       FROM users
       WHERE (username = ? OR email = ?) AND deleted_at IS NULL
       LIMIT 1`,
      [identifier, identifier.toLowerCase()],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async login(identifier: string, password: string) {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Tài khoản chưa hoặc không thể đăng nhập.');
    }
    const passwordOk = await verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    }

    const session = await this.sessions.create(user.user_id);
    return { accessToken: session.raw, expiresAt: session.expiresAt.toISOString(), userId: user.user_id };
  }

  async logout(sessionToken: string) {
    await this.sessions.revoke(sessionToken);
    return { status: 'ok' };
  }

  private async requireSession(sessionToken: string): Promise<number> {
    const userId = await this.sessions.resolve(sessionToken);
    if (userId === null) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    return userId;
  }

  async resetPassword(identifier: string, recoveryKey: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new UnauthorizedException('Mật khẩu phải có ít nhất 8 ký tự.');
    }
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const keyOk = await this.recovery.verify(user.user_id, recoveryKey);
    if (!keyOk) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db.query(
      `UPDATE users SET password_hash = ?, password_algorithm = 'scrypt' WHERE user_id = ?`,
      [passwordHash, user.user_id],
    );
    await this.sessions.revokeAll(user.user_id);
    return { status: 'ok' };
  }

  async changePassword(sessionToken: string, currentPassword: string, recoveryKey: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new UnauthorizedException('Mật khẩu phải có ít nhất 8 ký tự.');
    }
    const userId = await this.requireSession(sessionToken);
    const rows = await this.db.query<{ password_hash: string }[]>(
      `SELECT password_hash FROM users WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const passwordOk = await verifyPassword(currentPassword, rows[0].password_hash);
    if (!passwordOk) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const keyOk = await this.recovery.verify(userId, recoveryKey);
    if (!keyOk) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db.query(
      `UPDATE users SET password_hash = ?, password_algorithm = 'scrypt' WHERE user_id = ?`,
      [passwordHash, userId],
    );
    await this.sessions.revokeAll(userId);
    return { status: 'ok' };
  }

  async rotateRecoveryKey(sessionToken: string, currentPassword: string, currentRecoveryKey: string) {
    const userId = await this.requireSession(sessionToken);
    const rows = await this.db.query<{ password_hash: string }[]>(
      `SELECT password_hash FROM users WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const passwordOk = await verifyPassword(currentPassword, rows[0].password_hash);
    if (!passwordOk) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const rotated = await this.recovery.rotate(userId, currentRecoveryKey);
    if (rotated === null) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    return { recoveryKey: rotated.raw };
  }
}
