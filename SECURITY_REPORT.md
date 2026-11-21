# SECURITY_REPORT.md

> Báo cáo bảo mật hiện trạng. Cập nhật 2026-11-20.

## Đã áp dụng

- Hai schema + hai service account quyền tối thiểu (`app_bookuser`, `app_bookadmin`); không dùng root cho app.
- Prepared statements (`mysql2` `execute`) chống SQL Injection.
- **Security Recovery Key (phía user)**: bảng `user_recovery_credentials` (migration 009), hash `HMAC-SHA256` với secret riêng, raw key chỉ trả một lần, constant-time compare, reset/change password + rotate; **không dùng email** cho xác thực.
- **Security Token one-time**: bảng `user_security_tokens` (migration 008) giữ cho mục đích ngắn hạn; tiêu thụ bằng transaction `FOR UPDATE`.
- `.env` mode 600, bị Git ignore; secret random hex.
- Redis có `requirepass`; Meilisearch production + master key; MinIO root password đã rotate.
- Nginx TLS (HTTPS), HTTP→HTTPS redirect; cổng nội bộ chỉ bind localhost.
- `.dockerignore` loại `.env` khỏi build context.

## Còn thiếu (phải làm trước production thật)

- Authentication + password hashing (Argon2id).
- Authorization/RBAC runtime cho mọi endpoint.
- Session cookie `HttpOnly; Secure; SameSite` + CSRF protection.
- Rate limiting (auth, search, upload, report, admin).
- File validation (MIME thật, magic bytes), chống path traversal, chống upload file thực thi.
- Private file access: kiểm tra owner + quyền + trạng thái xuất bản trước khi trả file.
- Audit log cho các thao tác nhạy cảm; MFA cho Admin.
- Security headers (CSP, X-Frame-Options, etc.) tại Nginx.

## Không được

- Trả file riêng tư chỉ dựa trên `file_id`.
- Lưu database password vào GitHub.
- Mở MariaDB ra Internet.
