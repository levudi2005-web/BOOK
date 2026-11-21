# SECURITY_TOKEN_DESIGN.md

> Thiết kế bảo mật tài khoản: Security Recovery Key (long-lived) + Security Token (one-time).
> Cập nhật 2026-11-20: **bỏ hoàn toàn xác minh email**; tài khoản đăng ký xong dùng được ngay.

## 1. Security Recovery Key (khóa khôi phục lâu dài)

- Mỗi tài khoản được cấp **một** Recovery Key bằng CSPRNG: 32 bytes → Base64URL.
- Chỉ lưu `token_hash = HMAC-SHA256(RECOVERY_KEY_HMAC_SECRET, rawKey)` trong SQL.
- **Không** lưu raw key, không log, không lưu localStorage/sessionStorage/URL.
- Raw key chỉ trả về **đúng một lần** trong response đăng ký (và khi rotate).
- Key không hết hạn theo OTP; chỉ vô hiệu khi rotate/revoke.

### Bảng `bookuser.user_recovery_credentials` (migration 009)

| Cột | Kiểu |
|---|---|
| credential_id | BINARY(16) PK |
| user_id | BIGINT UNSIGNED FK → users.user_id |
| token_hash | BINARY(32) |
| hash_algorithm | VARCHAR(32) = HMAC-SHA256 |
| issued_at | DATETIME(3) |
| last_used_at | DATETIME(3) NULL |
| rotated_at | DATETIME(3) NULL |
| revoked_at | DATETIME(3) NULL |
| status | VARCHAR(20) = active/revoked |
| created_at / updated_at | DATETIME(3) |

Quy tắc: một tài khoản chỉ có một key `active` (app-level revoke trước khi issue); không lưu raw key.

### Bảng `bookadmin.admin_recovery_credentials` (migration 009)

Tương tự, FK → `admin_accounts.admin_id` (chưa có logic admin auth).

## 2. Security Token one-time (giữ từ migration 008)

`user_security_tokens` / `admin_security_tokens` vẫn giữ cho các mục đích ngắn hạn khác (nếu cần); **không dùng cho khôi phục mật khẩu nữa** vì không dùng email.

## 3. Endpoints hiện tại (không email)

- `POST /api/auth/register` → `{ status:'active', userId, recoveryKey }` (recoveryKey trả một lần).
- `POST /api/auth/login` → `{ accessToken, expiresAt, userId }` (opaque token, hash lưu `user_sessions`).
- `POST /api/auth/logout` → revoke session.
- `POST /api/auth/reset-password` → `{ identifier, recoveryKey, newPassword }`.
- `POST /api/auth/change-password` → cần Bearer token + `{ currentPassword, recoveryKey, newPassword }`.
- `POST /api/auth/security-key/rotate` → cần Bearer token + `{ currentPassword, currentRecoveryKey }` → trả recoveryKey mới một lần.

## 4. Bảo mật

- Mật khẩu hash `scrypt` (giữ nguyên, không đổi hàng loạt).
- HMAC secret riêng: `TOKEN_HMAC_SECRET` và `RECOVERY_KEY_HMAC_SECRET` (chỉ trong `.env`).
- Constant-time compare (`crypto.timingSafeEqual`).
- Prepared statements toàn bộ.
- Generic errors chống account enumeration.
- Raw key không bao giờ trong logs/URL/analytics.
