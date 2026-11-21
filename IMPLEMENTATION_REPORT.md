# IMPLEMENTATION_REPORT.md — BOOKFORFREEDOM

> Báo cáo triển khai phiên 2026-11-20 (tiếp nối dự án có sẵn).

## Đã hoàn thành và kiểm thử trong phiên này

1. **Audit toàn bộ hệ thống** — kiểm tra Git, source, DB schema (63 bảng), MariaDB (Docker + host), Docker, tài nguyên VPS.
2. **Backend nối MariaDB thật**
   - Thêm `mysql2` vào `apps/api`.
   - `DatabaseService` dùng connection pool + prepared statements (`execute`).
   - Endpoint mới: `GET /health` (kiểm tra DB), `GET /books`, `GET /books/:slug`, `GET /categories`, `GET /authors`, `GET /publishers`.
3. **Frontend nối API thật**
   - `lib/api.ts` gọi `NEXT_PUBLIC_API_URL`.
   - Home (sách nổi bật), Discover (lọc/sắp xếp/phân trang/grid-list), Categories, Book detail đều fetch từ API.
4. **Deploy live**
   - Rebuild Docker image `api` và `web`, recreate container.
   - `https://freedombook.duckdns.org/api/health` → `{"status":"ok","database":"up"}`.
   - Web 200; các route 200.

## Kiểm thử

- `pnpm --filter @bff/api typecheck` PASS; `build` PASS.
- `pnpm --filter @bff/web typecheck` PASS; `pnpm build` PASS (17 routes).
- `docker compose build api/web` PASS.
- Curl trực tiếp endpoint catalog trả JSON hợp lệ (`data: []`, `meta` đúng).

## Giới hạn trung thực

- Database hiện **0 dòng dữ liệu** nên các danh sách trả rỗng (đúng thực tế, không fake).
- Auth, Author Studio, SQL Storage 400 MiB, Worker/Scheduler, Notifications, Monitoring, Import/Export: **chưa triển khai** (xem `PROJECT_AUDIT.md`).
- Chưa di trú MariaDB từ Docker sang host (giữ nguyên để không mất dữ liệu).

## Phiên tiếp theo — Security Token Authentication (phía user)

1. **Migration 008** (`database/sql/migrations/008_security_tokens.sql`) tạo:
   - `bookuser.user_security_tokens`.
   - `bookadmin.admin_security_tokens`.
2. **Backend auth** (`apps/api/src/security`, `auth`, `email`):
   - `crypto.util.ts`: scrypt password hash/verify, sinh token 32 bytes base64url, HMAC-SHA256, constant-time compare.
   - `security-token.service.ts`: issue/find/consume (transaction `FOR UPDATE`)/revoke.
   - `auth.service.ts` + `auth.controller.ts`: register, verify-email, forgot-password, verify-reset-token, reset-password.
   - `email.service.ts`: email abstraction (SMTP chưa cấu hình → delivery failed, không bypass verify).
3. **Kiểm thử thật** (đã dọn test data):
   - Register trả `pending_verification` + `smtp_not_configured`, không lộ raw token.
   - `verify-email?token=garbage` → 401.
   - `forgot-password` trả cùng message cho email tồn tại/không tồn tại (chống enumeration).
   - SQL xác nhận `token_hash` 32 bytes, không lưu raw token.

## Trạng thái

- Security Token (user): **COMPLETED** về DB + logic + endpoint; **BLOCKED** phần gửi email do SMTP chưa cấu hình.
- Admin token auth, login/session/JWT, refresh token, rate limit, CSRF, change-password/email-change: **NOT IMPLEMENTED**.

## Phiên tiếp theo — Security Recovery Key (không email)

1. **Migration 009** (`database/sql/migrations/009_recovery_credentials.sql`): `bookuser.user_recovery_credentials` + `bookadmin.admin_recovery_credentials`.
2. **Bỏ xác minh email**: đăng ký xong → `status='active'`; email chỉ là thông tin liên hệ.
3. **Recovery Key**: CSPRNG 32 bytes base64url; lưu `HMAC-SHA256` hash (secret riêng `RECOVERY_KEY_HMAC_SECRET`); raw key chỉ trả một lần trong response đăng ký/rotate.
4. **Endpoints**: `register`, `reset-password` (identifier + recoveryKey + newPassword), `change-password` (currentPassword + recoveryKey), `security-key/rotate`.
5. **E2E test thật** (đã dọn test data): register → active + recoveryKey; sai key → 401; đúng key → 200; change-password → 200; rotate → key mới, key cũ bị revoke; SQL chỉ chứa `token_hash` 32 bytes.

## Đo tài nguyên VPS → RESOURCE_AUDIT.md

- RAM 3.9 GB, available ~480 MB, swap 4 GB (2.9 GB used), 4 vCPU, disk 29 GB free.
- Quyết định **Trường hợp B**: không cài Collabora/ONLYOFFICE production; ưu tiên Tiptap Writer + LibreOffice headless worker + import/export.

## Phiên tiếp theo — Login / Session (opaque token)

- `SessionService` tạo session lưu `user_sessions.session_token_hash` (SHA-256), TTL 7 ngày, `revoke`/`revokeAll`.
- `POST /api/auth/login` (identifier + password) → `accessToken`; `POST /api/auth/logout` → revoke.
- `change-password` và `security-key/rotate` giờ **yêu cầu Bearer session token** + currentPassword + recoveryKey.
- E2E test thật (đã dọn test data): login OK; change-password không session → 401; đúng session → 200 (revoke session); login bằng mật khẩu mới OK; rotate cần session; logout revoke; session cũ bị từ chối.



