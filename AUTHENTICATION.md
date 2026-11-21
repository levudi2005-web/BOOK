# AUTHENTICATION.md

> Trạng thái xác thực (đã triển khai + E2E test).

## Đã hoạt động

- Register (không email, tài khoản active ngay) + trả Recovery Key một lần.
- Security Recovery Key: CSPRNG 32 bytes, HMAC-SHA256 hash, trả raw một lần.
- Login/Logout/Session: opaque token 32 bytes, SHA-256 hash, TTL 7 ngày, revoke/revokeAll.
- Reset password (identifier + recovery key), Change password, Rotate recovery key.
- Rate limit (in-memory 20 req/60s/IP cho `/api/auth/*`), security headers, CORS allowlist.
- SessionAuthGuard + resource ownership (storage/studio/documents).
- Admin auth: login/session/recovery/RBAC (12h session), `AdminRbacGuard`, `AdminSessionAuthGuard`.

## Chưa hoàn thành

- Refresh token rotation / gia hạn session.
- CSRF token cho cookie session (hiện dùng opaque Bearer, không cần cookie).
- Rate limit phân tán (hiện in-memory).

## Chi tiết

Xem `SECURITY_ARCHITECTURE.md`, `SECURITY_TOKEN_DESIGN.md`, `SECURITY_REPORT.md`.

