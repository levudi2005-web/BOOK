# PROJECT_AUDIT.md — BOOKFORFREEDOM

> Audit thực tế hệ thống BOOKFORFREEDOM. Trạng thái cập nhật: 2026-11-20.
> Nguyên tắc: chỉ đánh dấu COMPLETED khi chức năng đã triển khai và kiểm thử; không đánh dấu giả.

## 1. Tóm tắt hiện trạng

- **Frontend:** Next.js 15.5.29 + React 19 + Tailwind CSS 3.4. Giao diện Premium Library đã redesign, chạy production, có Light/Dark, responsive, animation.
- **Backend:** NestJS 11, hiện đã nối MariaDB qua `mysql2` (pool + prepared statements). Có endpoint `/health` (kiểm tra DB), catalog `/books`, `/books/:slug`, `/categories`, `/authors`, `/publishers`.
- **Database:** 2 database trên cùng một MariaDB: `bookuser` (35 bảng + 1 view) và `bookadmin` (28 bảng + 2 views). Schema hoàn chỉnh, **nhưng hiện toàn bộ dữ liệu = 0 dòng** (chưa có user/sách/category thật).
- **MariaDB thực tế:** có **2 instance**:
  - Host MariaDB `10.11.14` đang chạy tại `127.0.0.1:3306` (systemd active).
  - Docker MariaDB `mariadb:10.11` đang chạy tại `127.0.0.1:3307` (volume `mariadb_data`, 224 MB datadir).
  - Ứng dụng hiện kết nối **Docker MariaDB** (đã có schema + dữ liệu vận hành). Host MariaDB chưa được dùng cho ứng dụng.
- **Docker:** compose đang chạy 6 service: mariadb, redis, minio, meilisearch, api, web. **Chưa có service Worker và Scheduler**.
- **Deployment:** live tại `https://freedombook.duckdns.org` (HTTP 200, TLS tới 2027-02-18, HTTP→HTTPS redirect). Domain dùng DuckDNS.

## 2. Bảng trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| User UI | COMPLETED | Premium Library redesign; Home/Discover/Categories/Book detail đã nối API thật; các trang còn lại là shell + empty state |
| Admin UI | PARTIAL | Shell + Overview + login UI + section empty states; chưa có auth/admin data thật |
| Backend | PARTIAL | NestJS + mysql2 pool + catalog endpoints + health(DB); chưa auth/CRUD/storage |
| Authentication | NOT IMPLEMENTED | Chỉ có UI form; backend chưa có auth |
| Authorization | NOT IMPLEMENTED | Chưa có RBAC runtime |
| bookuser | COMPLETED (schema) | 35 bảng + 1 view; 0 dòng dữ liệu |
| bookadmin | COMPLETED (schema) | 28 bảng + 2 views; 0 dòng dữ liệu |
| Author Studio | NOT IMPLEMENTED | Chỉ có README placeholder (`writing-studio`, `cover-studio`, `print-studio`) |
| Book Editor | NOT IMPLEMENTED | Chưa có rich text editor |
| Book Design | NOT IMPLEMENTED | Chưa có design studio |
| SQL Storage | NOT IMPLEMENTED | Chưa tạo bảng `storage_*` |
| 400 MiB Quota | NOT IMPLEMENTED | Chưa có logic quota |
| Notifications | NOT IMPLEMENTED | Bảng `notifications`/`admin_notifications` đã có, chưa có logic |
| Docker | PARTIAL | 6 service chạy; thiếu worker/scheduler |
| Monitoring | NOT IMPLEMENTED | Chỉ có healthcheck container; chưa có dashboard/log tập trung |
| Deployment | COMPLETED | Live HTTPS, Nginx + Certbot; DNS DuckDNS hoạt động |

## 3. Kết quả kiểm tra quan trọng

1. `git remote` = `https://github.com/levudi2005-web/BOOK.git`; nhiều file chưa commit (source, docs, database). **Chưa push.**
2. API mới đã được deploy: `GET /api/health` → `{"status":"ok","database":"up"}`.
3. Frontend gọi API thật qua `NEXT_PUBLIC_API_URL=https://freedombook.duckdns.org/api`.
4. Không có dữ liệu người dùng/sách; mọi danh sách đang trả `[]` (đúng, không fake).
5. Bảng `storage_*` chưa tồn tại trong `bookuser` → SQL Storage/Quota 400 MiB chưa thể hoạt động.
6. `apps/worker` có dependency `bullmq` nhưng `src/index.ts` chỉ `export {}` → worker chưa có logic.

## 4. Rủi ro cần lưu ý

- **Di trú MariaDB:** yêu cầu "MariaDB chạy trực tiếp trên VPS" chưa khớp thực tế (app đang dùng Docker MariaDB). Cần kế hoạch di trú an toàn riêng (dump → import host MariaDB → đổi cấu hình) — **chưa thực hiện** để tránh mất dữ liệu.
- **SQL Storage 400 MiB:** phải benchmark khả năng VPS trước khi mở. VPS 54 GB disk / 3.9 GB RAM / ~0.9 GB free (tại thời điểm audit) — cần đánh giá tải trước khi cho nhiều tài khoản lưu BLOB.
- **Bảo mật:** chưa có auth, RBAC, rate limit, CSRF cho endpoint mới; chỉ có parameterized queries + service account quyền tối thiểu.

## 5. Việc đã làm trong phiên này

- Nối backend thật vào MariaDB (service `app_bookuser`, prepared statements).
- Thêm endpoint catalog + health kiểm tra DB.
- Nối frontend Discover/Home/Categories/Book detail vào API thật.
- Rebuild + deploy live cả `api` và `web`.

## 6. Việc còn lại (theo thứ tự ưu tiên)

1. Di trú MariaDB sang host (hoặc xác nhận giữ Docker MariaDB) — cần quyết định an toàn.
2. Auth + RBAC runtime.
3. Author Studio + Rich Text Editor + quản lý chương.
4. SQL Storage (tạo bảng `storage_*`, chunked upload, quota 400 MiB).
5. Worker + Scheduler + Outbox/Inbox.
6. Notifications + Alert Center.
7. Admin CRUD + monitoring.
8. Import/Export PDF/EPUB/DOCX.
