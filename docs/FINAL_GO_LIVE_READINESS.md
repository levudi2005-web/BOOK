# FINAL GO-LIVE READINESS — BOOKFORFREEDOM

> Ngày: 2026-11-21; cập nhật trạng thái: 2026-11-23.
> Kết luận mới: **ĐÃ DEPLOY production/staging Cloudflare + VPS**, domain canonical đã hoạt động. Xem `docs/DEPLOYMENT_STATUS.md`.
> Bản ghi dưới đây là checklist lịch sử trước khi deploy.

> Ngày lịch sử: 2026-11-21.
> Kết luận lịch sử: **READY TO DEPLOY — CHƯA DEPLOY.**

## 1. Frontend Cloudflare (OpenNext)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Cấu hình OpenNext + wrangler | IMPLEMENTED | `apps/web/open-next.config.ts`, `wrangler.jsonc` |
| OpenNext build | TESTED | `.open-next/worker.js` (phiên trước) |
| Wrangler local preview | TESTED | 12 route → 200 (phiên trước) |
| Frontend chức năng nối API thật | IMPLEMENTED + TESTED | E2E Playwright 10/10 |

## 2. Backend Workers API

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| `apps/workers-api` (CF fetch handler + router + HMAC) | IMPLEMENTED | `src/index.ts`, `router.ts`, `hmac.ts` |
| HMAC đồng bộ VPS | TESTED | `gateway-hmac.test.ts`: Node crypto == Web Crypto (hex) |
| Typecheck | TESTED | `tsc -p apps/workers-api/tsconfig.json --noEmit` sạch |

## 3. VPS Data Gateway

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| HMAC + anti-replay | TESTED | integration test (health 200 / thiếu/sai 401) |
| Business endpoints | TESTED | `GET /gateway/books|categories|authors|publishers`, `POST /gateway/auth/*` |
| Internal endpoints | TESTED | `POST /gateway/internal/storage/cleanup|reconcile`, `/search/reindex` |
| Body limit | IMPLEMENTED | 8mb (chunk upload) |

## 4. Database

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| bookuser + bookadmin schema | VERIFIED | `SHOW CREATE TABLE` (bảng đầy đủ) |
| Migration 010 (storage 7 bảng) | APPLIED | `SHOW TABLES` bookuser |
| Migration 011 (book_versions, office_documents) | APPLIED | `SHOW TABLES` bookuser |
| Backup trước migration | DONE | `/var/backups/bookforfreedom/pre-migration-010-*.sql.gz` |

## 5. Storage (400 MiB = 419430400 bytes/user)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Upload chunk/resume/retry/complete | TESTED | integration + E2E (upload→list→trash→restore→permanent delete) |
| Quota | TESTED | quota đúng 419430400; trash giữ quota; permanent delete giải phóng |
| Stream download (không load cả file) | IMPLEMENTED | `downloadStream` (Readable chunk-by-chunk) |
| Ownership | TESTED | user B đọc object của A → 403 |
| Storage UI `/storage` | IMPLEMENTED + TESTED | E2E upload qua trình duyệt |

## 6. Authentication

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Register (không email) + Recovery Key | TESTED | E2E hiển thị recovery key 1 lần |
| Login/Logout/Session (opaque, TTL 7d) | TESTED | E2E + integration |
| Change password / rotate recovery key | IMPLEMENTED + TESTED | integration (phiên trước) |
| Rate limit + CORS + security headers | TESTED | integration |
| Ownership | TESTED | E2E + integration (403 cross-user) |

## 7. Admin

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Admin login/session/recovery | TESTED | E2E login admin UI |
| RBAC | TESTED | integration (user thường → admin API 401) |
| GRANT isolation | VERIFIED | `SHOW GRANTS` cho svc_user_auth / svc_admin_auth / svc_admin_mgmt (thật) |

## 8. Author Studio

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Book/chapter CRUD + ownership + publish | TESTED | E2E tạo sách → chương → publish → catalog |

## 9. Reader / Library / Community

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Reader (chapters + progress) | IMPLEMENTED + TESTED | E2E đọc chương thật + progress |
| Library (favorite/status/remove) | IMPLEMENTED + TESTED | E2E + integration |
| Community (comments + ratings) | IMPLEMENTED + TESTED | E2E bình luận + đánh giá lưu thật |

## 10. Office

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Writer `/office/writer` + documents API | IMPLEMENTED + TESTED | E2E tạo → soạn → autosave → đọc lại |
| Calc / Impress / Draw | BLOCKED | chưa benchmark đủ RAM (xem mục Performance) |

## 11. Search (Meilisearch)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Index + `GET /search` + reindex qua gateway | IMPLEMENTED + TESTED | integration reindex → tìm thấy sách |

## 12. Worker / Scheduler

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| BullMQ worker + repeatable jobs | IMPLEMENTED | build sạch; smoke test worker→gateway 200 |

## 13. Security

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| `.env` không commit | VERIFIED | `git ls-files` không chứa `.env` |
| Secret không lọt vào tracked files | VERIFIED | `git grep <TOKEN_HMAC_SECRET>` → không khớp |
| Build artifacts tracked | FIXED | `git rm --cached apps/web/.next` (55 files → 0) |
| SQL injection | VERIFIED | prepared statements toàn bộ (`pool.execute`) |
| HMAC timestamp/nonce/replay | TESTED | integration + gateway-hmac |
| Audit logs | PARTIAL | bảng `admin_audit_logs` có; ghi audit gateway còn thiếu |

## 14. Performance (benchmark VPS thật)

- CPU: 4 core.
- RAM: 3.8 GiB (sau khi dừng minio không dùng ~1.2 GiB available).
- Swap: 4 GiB (đã dùng ~3.2 GiB khi chạy đủ test web dev + API + Chromium; bình thường thấp hơn).
- Disk: 54 GB, dùng 28 GB, còn 23 GB.
- Container (production): mariadb ~125 MB, meilisearch ~124 MB, web ~19 MB, api ~4 MB, redis ~12 MB.
- minio (bitnamilegacy/minio ~1.2 GiB) đã DỪNG — không dùng (storage là SQL-only); khuyến nghị gỡ khỏi docker-compose.

Kết luận Calc/Impress/Draw: KHÔNG cài office server nặng (Collabora/ONLYOFFICE) trên VPS hiện tại — RAM không đủ an toàn. Giữ BLOCKED, dùng giải pháp nhẹ (Writer SQL + import/export sau khi có worker).

## 15. Rollback

- Production VPS (web :3000, api :3001, nginx, MariaDB, Redis, Meilisearch) KHÔNG đổi, KHÔNG restart trong phiên này.
- Backup trước migration đã tạo. Service accounts mới là additive, không xóa GRANT cũ.
- Không chạy `wrangler deploy`, không đổi DNS, không gắn domain.

## 16. Kết quả kiểm thử (bằng chứng)

- Backend unit/integration: **11/11 pass** (`pnpm --filter @bff/api test`).
- Browser E2E (Playwright, Chromium thật): **10/10 pass** (auth, authorization, studio, storage, office, library+reader, community, admin).
- Build: API, Worker, Workers-API, Web typecheck đều sạch.
- Dữ liệu test đã dọn (0 user/admin/book/comment/doc test còn lại).
- Production website vẫn hoạt động: `/health` → `{"status":"ok","database":"up"}`, web 200.

## 17. Còn thiếu (không chặn deploy)

- Calc/Impress/Draw (BLOCKED bởi RAM).
- Refresh token/CSRF (hiện dùng opaque Bearer, không dùng cookie nên chưa cần CSRF).
- Audit log gateway (bảng đã có, chưa ghi ở tầng gateway).

