# TEST_REPORT.md

> Kết quả kiểm thử phiên 2026-11-20.

## Đã chạy và PASS

| Kiểm tra | Kết quả |
|---|---|
| `pnpm --filter @bff/api typecheck` | PASS |
| `pnpm --filter @bff/api build` | PASS |
| `pnpm --filter @bff/web typecheck` | PASS |
| `pnpm --filter @bff/web build` | PASS (17 routes) |
| `docker compose build api` | PASS |
| `docker compose build web` | PASS |
| `docker compose up -d` | PASS (6/6 Up) |
| `GET /api/health` | `{"status":"ok","database":"up"}` |
| `GET /api/books?limit=2` | JSON hợp lệ (`data:[], meta`) |
| `GET /api/categories`, `/api/authors` | JSON hợp lệ (`data:[]`) |
| `POST /api/auth/register` | trả `status: active` + `recoveryKey` (một lần), không email |
| `POST /api/auth/reset-password` (sai key / đúng key) | 401 / 200 |
| `POST /api/auth/change-password` | 200 (verify current password + recovery key) |
| `POST /api/auth/security-key/rotate` | trả key mới; key cũ bị revoke |
| `POST /api/auth/login` / `logout` | login trả accessToken; logout revoke session |
| `POST /api/auth/change-password` (không/đúng session) | 401 / 200 |
| `POST /api/auth/security-key/rotate` (yêu cầu session) | 200; session cũ bị revoke |
| SQL `user_recovery_credentials` | `token_hash` 32 bytes HMAC-SHA256, không raw key |
| Web 200 các route chính | PASS |

## Chưa thực hiện (cần backend/đủ dữ liệu)

- Workflow A (user), B (author), C (SQL storage), D (admin), E (docker/production full) — chưa chạy được vì auth/storage/worker chưa có.
- E2E/Playwright chưa được cài đặt.
- Benchmark upload BLOB chưa thực hiện (chưa có bảng `storage_*`).

## Ghi chú

- DB đang 0 dòng nên mọi truy vấn catalog trả rỗng — đúng dữ liệu thật, không phải lỗi.
- Lỗi ESLint duy nhất là cảnh báo "Next.js plugin not detected" (cấu hình cũ), không chặn build.
