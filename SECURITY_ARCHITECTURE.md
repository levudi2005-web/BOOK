# SECURITY_ARCHITECTURE.md

> Kiến trúc bảo mật tài khoản + Recovery Key. Cập nhật 2026-11-20 (không dùng email để xác minh).

## Nguyên tắc

- Đăng ký xong là tài khoản **active**, không cần xác minh email.
- Email chỉ là thông tin liên hệ tùy chọn (notification sau này nếu cấu hình SMTP).
- Mật khẩu hash `scrypt` (salt 16B, key 64B), lưu `password_algorithm='scrypt'`.
- Security Recovery Key: 32 bytes base64url; chỉ lưu `HMAC-SHA256` hash; raw key chỉ trả một lần.
- So sánh constant-time; prepared statements; generic errors chống enumeration.

## Bảng

- `bookuser.user_recovery_credentials` (migration 009) — key khôi phục lâu dài.
- `bookadmin.admin_recovery_credentials` (migration 009) — dành cho admin (chưa có logic).
- `bookuser.user_security_tokens` / `bookadmin.admin_security_tokens` (migration 008) — token one-time (giữ cho mục đích ngắn hạn khác).

## Thành phần backend

- `security/crypto.util.ts` — scrypt hash/verify, tạo token/key, HMAC-SHA256, constant-time compare.
- `security/recovery-credential.service.ts` — issue/verify/rotate/revoke Recovery Key.
- `security/security-token.service.ts` — issue/consume one-time token (giữ, hiện không dùng cho khôi phục).
- `auth/*` — register, reset-password, change-password, security-key/rotate.

## Secrets

- `TOKEN_HMAC_SECRET`, `RECOVERY_KEY_HMAC_SECRET` — hex 32 bytes, chỉ trong `.env`, truyền vào API qua Docker env, không commit.

## Admin Isolation

- Admin **không** được xem `user_recovery_credentials`, `user_security_tokens`, password hash, session secret hay raw key.
- Admin chỉ dùng action nghiệp vụ (khóa/mở khóa/yêu cầu User tự khôi phục), không có API trả token.
- Cần tách service accounts (User Auth / Admin Auth / Admin Management) — việc tiếp theo.

## Trạng thái

- Recovery Key + reset/change/rotate (user): **COMPLETED** (đã E2E test).
- Login/Logout/Session (opaque token, hashed, revoke): **COMPLETED** (đã E2E test).
- SessionAuthGuard + ownership: **COMPLETED** (storage/studio/documents test).
- Admin auth (login/session/recovery/RBAC) + token isolation grants: **COMPLETED** (đã test + SHOW GRANTS verify).
- Refresh token/JWT/CSRF: **NOT IMPLEMENTED**.
