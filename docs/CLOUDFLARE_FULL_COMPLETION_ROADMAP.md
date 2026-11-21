# CLOUDFLARE FULL COMPLETION ROADMAP

> Roadmap hoàn thiện BOOKFORFREEDOM trước khi deploy Cloudflare.
> Trạng thái: NOT STARTED / IN PROGRESS / BLOCKED / IMPLEMENTED / TESTED / VERIFIED.
> Cập nhật: 2026-11-20 (phiên triển khai backend + test).

## 1. Cloudflare Frontend

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| OpenNext cấu hình | IMPLEMENTED | `open-next.config.ts`, `wrangler.jsonc` |
| OpenNext build | TESTED | `Worker saved in .open-next/worker.js` |
| Wrangler local preview | TESTED | 12 route chính → 200 |
| Environment (NEXT_PUBLIC) | IMPLEMENTED | `.env.local`, `.dev.vars.example` |
| Deploy production | BLOCKED | chưa kết nối tài khoản Cloudflare (KHÔNG deploy trong phiên này) |

## 2. Cloudflare Backend Workers API

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| `apps/workers-api` (plain CF fetch handler) | IMPLEMENTED | `src/index.ts`, `src/router.ts`, `src/hmac.ts`, `wrangler.jsonc` |
| HMAC sign (Web Crypto) đồng bộ với VPS | TESTED | test `gateway-hmac.test.ts`: Node crypto == Web Crypto (hex) |
| Router auth/catalog → gateway | IMPLEMENTED | route table map `/books`→`/gateway/books`, `/auth/*`→`/gateway/auth/*` |
| Rate limit + CORS + forward | IMPLEMENTED | in-memory rate limit, CORS allowlist, `cf-connecting-ip` |
| Typecheck | TESTED | `tsc -p apps/workers-api/tsconfig.json` sạch |

## 3. VPS Data Gateway

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| HMAC + timestamp + nonce | IMPLEMENTED + TESTED | `gateway-sign.util.ts`, guard + anti-replay |
| Business endpoints qua gateway | IMPLEMENTED + TESTED | `GET /gateway/books|categories|authors|publishers`, `POST /gateway/auth/*` |
| Internal endpoints (service-to-service) | IMPLEMENTED + TESTED | `POST /gateway/internal/storage/cleanup|reconcile`, `/search/reindex` |
| Request size limit / timeout / audit | PARTIAL | body limit 8mb (chunk upload); audit gateway access còn thiếu |

## 4. Authentication & Security

| Hạng mục | Trạng thái |
|---|---|
| Register (không email) + Recovery Key | TESTED |
| Login/Logout/Session (opaque, TTL 7d, revoke) | TESTED |
| Reset/change password + rotate recovery key | TESTED |
| Rate limit (in-memory) + CORS + security headers | TESTED |
| SessionAuthGuard + ownership (storage/studio/documents) | IMPLEMENTED + TESTED |
| Admin auth (login/session/recovery/RBAC) | IMPLEMENTED + TESTED |
| DB service account isolation + GRANT verify | IMPLEMENTED + VERIFIED (`SHOW GRANTS`) |
| Refresh token / JWT / CSRF | NOT STARTED (đánh giá sau) |

## 5. SQL Storage 400 MiB/user (419430400 bytes)

- IMPLEMENTED + TESTED — migration `010_storage.sql` (7 bảng), `StorageService` + `StorageController`.
- Test: init → chunk → complete → download (stream) → quota → delete → ownership 403.

## 6. Author Studio

- IMPLEMENTED + TESTED — migration `011_author_studio.sql` (`book_versions`, `office_documents`), `StudioService` + `StudioController`.
- Test: tạo sách → tạo chương → publish → xuất hiện trên catalog. Ownership guard.

## 7. Office Workspace

- Writer `/office/writer`: IMPLEMENTED (frontend contentEditable + autosave) + documents API TESTED.
- Calc/Impress/Draw: NOT STARTED (BLOCKED bởi RAM — chưa benchmark office server nặng).

## 8. Worker / Scheduler

- IMPLEMENTED — `apps/worker` BullMQ queue + worker + repeatable jobs (cleanup/reconcile/reindex).
- Smoke test: `callGateway('GET','/gateway/health')` → 200 (worker HMAC ký đúng gateway production).

## 9. Meilisearch

- IMPLEMENTED + TESTED — `SearchService` (fetch REST) + `GET /search` + reindex qua gateway.
- Test: reindex → tìm thấy sách đã publish.

## 10. Admin & Database Isolation

- IMPLEMENTED + TESTED — `AdminService` (login/session/recovery/RBAC), `AdminRbacGuard`, `AdminController`.
- GRANT verify thật: `svc_user_auth`, `svc_admin_auth`, `svc_admin_mgmt` + `SHOW GRANTS` (xem `scripts/create-service-accounts.sh`).

## 11. Frontend chức năng

| Hạng mục | Trạng thái |
|---|---|
| Home/Discover/Categories/Book detail nối API thật | TESTED |
| Auth login/register nối API + hiện recovery key | TESTED (E2E Playwright) |
| Admin login nối API | TESTED (E2E Playwright) |
| Office Writer `/office/writer` | TESTED (E2E Playwright) |
| Author Studio `/write` | TESTED (E2E Playwright) |
| Storage UI `/storage` (upload/trash/restore/permanent/quota) | TESTED (E2E Playwright) |
| Library (favorite/status/remove) | TESTED (E2E + integration) |
| Reader (chapters + progress) | TESTED (E2E Playwright) |
| Community (comments + ratings) | TESTED (E2E Playwright) |

## 12. Kết luận

- **READY TO DEPLOY — CHƯA DEPLOY.** (chờ xác nhận; không deploy trong phiên này.)
- Backend: Workers API, Gateway, Storage, Author Studio, Worker, Meilisearch, Admin + isolation, Social (library/reader/community) — IMPLEMENTED + TESTED.
- Frontend: tất cả trang chính nối API thật + E2E Playwright 10/10 pass.
- Regression: API 11/11 pass, Web/Worker/Workers-API build sạch, production không đổi.
- Còn BLOCKED: Cloudflare deploy (chờ credentials), Office Calc/Impress/Draw (RAM).
- Xem báo cáo đầy đủ: `docs/FINAL_GO_LIVE_READINESS.md`.

