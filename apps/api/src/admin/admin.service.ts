import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdminDatabaseService } from './admin-database.service.js';
import { AdminSessionService } from './admin-session.service.js';
import { AdminRecoveryCredentialService } from './admin-recovery.service.js';
import { hashPassword, verifyPassword } from '../security/crypto.util.js';

type AdminRow = {
  admin_id: number;
  admin_uuid: string;
  username: string;
  email: string;
  status: string;
  password_hash: string;
  must_change_password: number;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly db: AdminDatabaseService,
    private readonly sessions: AdminSessionService,
    private readonly recovery: AdminRecoveryCredentialService,
  ) {}

  /** Bootstrap an admin account (internal; not exposed via HTTP). */
  async createAdmin(username: string, email: string, password: string, roleCode: string) {
    const name = username.trim();
    const mail = email.trim().toLowerCase();
    if (name.length < 3 || name.length > 50) {
      throw new UnauthorizedException('Tên đăng nhập không hợp lệ.');
    }
    if (password.length < 10) {
      throw new UnauthorizedException('Mật khẩu admin phải có ít nhất 10 ký tự.');
    }
    const existing = await this.db.query<{ admin_id: number }[]>(
      `SELECT admin_id FROM admin_accounts WHERE username = ? OR email = ? LIMIT 1`,
      [name, mail],
    );
    if (existing.length > 0) {
      throw new ConflictException('Tài khoản admin đã tồn tại.');
    }
    const role = await this.db.query<{ role_id: number }[]>(
      `SELECT role_id FROM admin_roles WHERE code = ? LIMIT 1`,
      [roleCode],
    );
    if (role.length === 0) {
      throw new UnauthorizedException('Vai trò không hợp lệ.');
    }
    const passwordHash = await hashPassword(password);
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO admin_accounts
         (admin_uuid, username, email, password_hash, password_algorithm, status, must_change_password, mfa_required)
       VALUES (?, ?, ?, ?, 'scrypt', 'active', 0, 0)`,
      [randomUUID(), name, mail, passwordHash],
    );
    const adminId = result.insertId;
    await this.db.query(
      `INSERT INTO admin_account_roles (admin_id, role_id) VALUES (?, ?)`,
      [adminId, role[0].role_id],
    );
    const { raw } = await this.recovery.issue(adminId);
    return { adminId, username: name, roleCode, recoveryKey: raw };
  }

  async login(identifier: string, password: string) {
    const rows = await this.db.query<AdminRow[]>(
      `SELECT admin_id, admin_uuid, username, email, status, password_hash, must_change_password
       FROM admin_accounts
       WHERE (username = ? OR email = ?) AND deleted_at IS NULL
       LIMIT 1`,
      [identifier, identifier.toLowerCase()],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    }
    const admin = rows[0];
    if (admin.status !== 'active') {
      throw new UnauthorizedException('Tài khoản không thể đăng nhập.');
    }
    if (!(await verifyPassword(password, admin.password_hash))) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    }
    const session = await this.sessions.create(admin.admin_id);
    return {
      accessToken: session.raw,
      expiresAt: session.expiresAt.toISOString(),
      adminId: admin.admin_id,
      username: admin.username,
      mustChangePassword: Number(admin.must_change_password) === 1,
    };
  }

  async logout(sessionToken: string) {
    await this.sessions.revoke(sessionToken);
    return { status: 'ok' };
  }

  async requireSession(sessionToken: string): Promise<number> {
    const adminId = await this.sessions.resolve(sessionToken);
    if (adminId === null) {
      throw new UnauthorizedException('Phiên admin không hợp lệ hoặc đã hết hạn.');
    }
    return adminId;
  }

  async getMe(adminId: number) {
    const rows = await this.db.query<{ admin_uuid: string; username: string; email: string; status: string }[]>(
      `SELECT admin_uuid, username, email, status FROM admin_accounts WHERE admin_id = ? LIMIT 1`,
      [adminId],
    );
    const roles = await this.db.query<{ code: string }[]>(
      `SELECT r.code FROM admin_roles r
       JOIN admin_account_roles ar ON ar.role_id = r.role_id
       WHERE ar.admin_id = ? AND (ar.expires_at IS NULL OR ar.expires_at > NOW(3))`,
      [adminId],
    );
    return { ...rows[0], roles: roles.map((r) => r.code) };
  }

  async permissionsOf(adminId: number): Promise<string[]> {
    const rows = await this.db.query<{ code: string }[]>(
      `SELECT DISTINCT p.code
       FROM admin_permissions p
       JOIN admin_role_permissions rp ON rp.permission_id = p.permission_id
       JOIN admin_account_roles ar ON ar.role_id = rp.role_id
       WHERE ar.admin_id = ? AND (ar.expires_at IS NULL OR ar.expires_at > NOW(3))`,
      [adminId],
    );
    return rows.map((r) => r.code);
  }

  async hasPermission(adminId: number, permission: string): Promise<boolean> {
    if (permission.includes('*')) {
      const prefix = permission.replaceAll('*', '');
      const permissions = await this.permissionsOf(adminId);
      return permissions.some((p) => p.startsWith(prefix));
    }
    const rows = await this.db.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n
       FROM admin_permissions p
       JOIN admin_role_permissions rp ON rp.permission_id = p.permission_id
       JOIN admin_account_roles ar ON ar.role_id = rp.role_id
       WHERE ar.admin_id = ? AND p.code = ? AND (ar.expires_at IS NULL OR ar.expires_at > NOW(3))`,
      [adminId, permission],
    );
    return rows[0].n > 0;
  }

  async changePassword(sessionToken: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 10) {
      throw new UnauthorizedException('Mật khẩu admin phải có ít nhất 10 ký tự.');
    }
    const adminId = await this.requireSession(sessionToken);
    const rows = await this.db.query<{ password_hash: string }[]>(
      `SELECT password_hash FROM admin_accounts WHERE admin_id = ? LIMIT 1`,
      [adminId],
    );
    if (rows.length === 0 || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    await this.db.query(
      `UPDATE admin_accounts
       SET password_hash = ?, password_algorithm = 'scrypt', must_change_password = 0, password_changed_at = NOW(3)
       WHERE admin_id = ?`,
      [await hashPassword(newPassword), adminId],
    );
    await this.sessions.revokeAll(adminId);
    return { status: 'ok' };
  }

  async resetPassword(identifier: string, recoveryKey: string, newPassword: string) {
    if (newPassword.length < 10) {
      throw new UnauthorizedException('Mật khẩu admin phải có ít nhất 10 ký tự.');
    }
    const rows = await this.db.query<AdminRow[]>(
      `SELECT admin_id, username, email, status, password_hash, must_change_password
       FROM admin_accounts
       WHERE (username = ? OR email = ?) AND deleted_at IS NULL LIMIT 1`,
      [identifier, identifier.toLowerCase()],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const admin = rows[0];
    if (!(await this.recovery.verify(admin.admin_id, recoveryKey))) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    await this.db.query(
      `UPDATE admin_accounts SET password_hash = ?, password_algorithm = 'scrypt' WHERE admin_id = ?`,
      [await hashPassword(newPassword), admin.admin_id],
    );
    await this.sessions.revokeAll(admin.admin_id);
    return { status: 'ok' };
  }

  async rotateRecoveryKey(sessionToken: string, currentPassword: string, currentRecoveryKey: string) {
    const adminId = await this.requireSession(sessionToken);
    const rows = await this.db.query<{ password_hash: string }[]>(
      `SELECT password_hash FROM admin_accounts WHERE admin_id = ? LIMIT 1`,
      [adminId],
    );
    if (rows.length === 0 || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    const rotated = await this.recovery.rotate(adminId, currentRecoveryKey);
    if (rotated === null) {
      throw new UnauthorizedException('Thông tin xác thực không hợp lệ.');
    }
    return { recoveryKey: rotated.raw };
  }
}

