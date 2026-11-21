# NOTEPROJECT.md — BOOKFORFREEDOM

> Ghi chú tổng hợp trạng thái dự án, kiến trúc, cấu hình Docker/MariaDB, database, lệnh vận hành, kết quả kiểm chứng và các việc còn lại.
> Đây là điểm vào nhanh; tài liệu chuyên sâu vẫn nằm trong `database/docs/`, `docs/` và `infra/`.

- **Cập nhật lần cuối:** 2026-11-20
- **Thư mục làm việc:** `/var/www/BOOKFORFREEDOM`
- **Nhánh Git:** `main`
- **Commit gần nhất:** `17a7db2` — `Initial commit - BOOKFORFREEDOM`
- **Trạng thái:** Giai đoạn 0 — nền móng; hạ tầng và database đã có, ứng dụng mới là khung.
- **Ngôn ngữ tài liệu:** tiếng Việt.

---

## Mục lục

- [0. Tóm tắt nhanh](#0-tóm-tắt-nhanh)
- [1. Mục tiêu và phạm vi](#1-mục-tiêu-và-phạm-vi)
- [2. Trạng thái hiện tại](#2-trạng-thái-hiện-tại)
- [3. Kiến trúc và tech stack](#3-kiến-trúc-và-tech-stack)
- [4. Cấu trúc thư mục](#4-cấu-trúc-thư-mục)
- [5. Docker và các service](#5-docker-và-các-service)
- [6. Database](#6-database)
- [7. Biến môi trường](#7-biến-môi-trường)
- [8. Lệnh thường dùng](#8-lệnh-thường-dùng)
- [9. API, Web và triển khai](#9-api-web-và-triển-khai)
- [10. Bảo mật](#10-bảo-mật)
- [11. Kiểm chứng và chất lượng](#11-kiểm-chứng-và-chất-lượng)
- [12. Lịch sử thay đổi: PostgreSQL → MariaDB](#12-lịch-sử-thay-đổi-postgresql--mariadb)
- [13. Vấn đề đã biết và lưu ý](#13-vấn-đề-đã-biết-và-lưu-ý)
- [14. Việc cần làm tiếp](#14-việc-cần-làm-tiếp)
- [15. Troubleshooting](#15-troubleshooting)
- [16. Checklist vận hành và bàn giao](#16-checklist-vận-hành-và-bàn-giao)
- [17. Tài liệu tham khảo](#17-tài-liệu-tham-khảo)
- [18. Nhật ký thay đổi của file này](#18-nhật-ký-thay-đổi-của-file-này)
- [19. Quy ước duy trì file này](#19-quy-ước-duy-trì-file-này)

---

## 0. Tóm tắt nhanh

| Hạng mục | Giá trị hiện tại |
|---|---|
| Tên dự án | BOOKFORFREEDOM (trước đây là BOOKVERSE) |
| Mục tiêu | Nền tảng viết, thiết kế bìa, dàn trang, xuất bản và đọc sách |
| Domain triển khai | https://freedombook.duckdns.org |
| Kiến trúc | Monorepo pnpm: `apps/*` + `packages/*` |
| Web | Next.js 15, React 19, TypeScript, Tailwind CSS |
| API | NestJS 11, TypeScript; hiện chỉ có `GET /health` |
| Worker | Node.js + TypeScript + BullMQ; hiện chưa có job |
| Database | MariaDB 10.11, hai schema `bookuser` và `bookadmin` |
| Cache/queue | Redis 7 |
| Object storage | MinIO |
| Search | Meilisearch 1.12 |
| Reverse proxy | Nginx + Certbot TLS |
| Container | Docker Compose |
| Database thực tế | 63 bảng, 3 view, 88 FK, 93 CHECK, 0 FK xuyên database |
| Kiểm chứng DB | 41 PASS / 2 INFO / 0 FAIL + 8 kiểm thử DML |
| Trạng thái code ứng dụng | Chưa có auth, CRUD, ORM/repository hay giao diện sản phẩm |
| Trạng thái Git | `database/` và `infra/docker/mariadb/` đang untracked; nhiều file đã sửa nhưng chưa commit |

### Đang chạy được

- `docker compose up -d` khởi động 6 service: MariaDB, Redis, MinIO, Meilisearch, API, Web.
- MariaDB tự cài hai schema và tạo hai user ứng dụng khi volume mới.
- API trả `{"status":"ok"}` tại `http://127.0.0.1:3001/health`.
- Web placeholder trả trang tại `http://127.0.0.1:3000`.
- Backup bằng `mariadb-dump` đã chạy thử thành công.
- Kết nối MariaDB từ host qua `127.0.0.1:3307` đã chạy thử thành công.

### Chưa có

- Chưa có driver MariaDB/MySQL trong `packages/db` hay API.
- Chưa có đăng ký/đăng nhập, phân quyền thực thi, CRUD sách, upload, tìm kiếm.
- Chưa có job worker, pipeline xuất PDF/EPUB, xử lý ảnh/font.
- Chưa có bộ test tự động, CI, load test hay test PowerDesigner thực tế.
- Chưa có migration tăng dần ngoài bộ `001–007` hiện tại.
- Chưa có tài khoản admin mặc định (cố ý, vì bảo mật).

## 1. Mục tiêu và phạm vi

### 1.1 Mục tiêu sản phẩm

BOOKFORFREEDOM hướng tới một nền tảng tích hợp:

1. Viết bản thảo có cấu trúc.
2. Thiết kế bìa.
3. Dàn trang và tính gáy sách.
4. Xuất bản PDF/EPUB/DOCX.
5. Đọc sách, thư viện cá nhân và tương tác cộng đồng.
6. Quản trị nội dung, kiểm duyệt, bản quyền, người dùng và audit.

### 1.2 Phạm vi giai đoạn hiện tại

- Dựng monorepo và workspace.
- Chuẩn hóa môi trường Docker.
- Thiết kế, cài đặt và kiểm chứng hai schema database.
- Chuẩn bị tài liệu API, bảo mật, tích hợp, ERD và PowerDesigner.
- **Không** triển khai nghiệp vụ sản phẩm trong giai đoạn này.

### 1.3 Lộ trình

| Giai đoạn | Nội dung |
|---|---|
| 0 | Nền móng: workspace, Docker, database, RBAC, audit, outbox/inbox, document-model |
| 1 | MVP: auth, dashboard, Writing Studio, xuất EPUB/PDF cơ bản, reader |
| 2 | Layout Studio, Cover Studio, Tool Library |
| 3 | Print nâng cao và cộng đồng |
| 4 | Giao diện Admin, thực hiện sau cùng |

Nguyên tắc: nền tảng dữ liệu và kiểm soát (RBAC, audit, trạng thái) phải có từ Giai đoạn 0 dù giao diện Admin làm sau.

---

## 2. Trạng thái hiện tại

### 2.1 Đã hoàn thành

- [x] Monorepo pnpm với `apps/web`, `apps/api`, `apps/worker`.
- [x] Các package khung: `config`, `db`, `document-model`, `layout-engine`, `permissions`, `shared-types`, `spine-calculator`, `ui`.
- [x] Docker Compose cho MariaDB, Redis, MinIO, Meilisearch, API, Web.
- [x] MariaDB 10.11 với `utf8mb4`, UTC, `sql_mode` strict, healthcheck.
- [x] Init script tự cài schema và tạo user ứng dụng quyền tối thiểu.
- [x] Hai schema `bookuser` (35 bảng, 1 view) và `bookadmin` (28 bảng, 2 view).
- [x] 88 FK, 93 CHECK, 8 cột generated, 4 bảng outbox/inbox.
- [x] RBAC: 7 vai trò, 76 permission, 212 gán quyền.
- [x] Audit append-only bằng trigger.
- [x] Tài liệu dữ liệu, quan hệ, kiểu dữ liệu, API contract, bảo mật, cài đặt, PowerDesigner.
- [x] ERD Mermaid và DDL export cho reverse engineer.
- [x] API healthcheck và web placeholder chạy trong Docker.
- [x] Nginx virtual host + TLS Certbot cho domain.
- [x] `.env` production đầy đủ (44 biến), secret ngẫu nhiên, quyền `600`, đã bị Git ignore.
- [x] Rotate mật khẩu MariaDB/MinIO, bật Redis auth và Meilisearch production mode trên VPS.
- [x] Redesign giao diện web Premium Library: design system, Light/Dark Mode, responsive, animation; trang user + admin + reader (Next build PASS).

### 2.2 Chưa hoàn thành

- [ ] Lớp kết nối DB thực tế (`mysql2` hoặc `mariadb`) và repository/ORM.
- [ ] Config validation cho biến môi trường.
- [ ] Healthcheck API có kiểm tra DB/Redis.
- [ ] Auth, session, MFA, RBAC runtime.
- [ ] CRUD sách, chương, file, quyền nội dung.
- [ ] Worker BullMQ và các job xuất bản.
- [ ] Giao diện sản phẩm.
- [ ] Test tự động, CI, load test.
- [ ] Migration tăng dần và quy trình rollback.
- [ ] Monitoring/logging tập trung.

### 2.3 Runtime snapshot ngày 2026-11-20

| Service | Image | Container | Cổng host | Trạng thái |
|---|---|---|---|---|
| MariaDB | `mariadb:10.11` (thực tế 10.11.19) | `bookforfreedom-mariadb-1` | `127.0.0.1:3307 → 3306` | Up, healthy |
| Redis | `redis:7-alpine` | `bookforfreedom-redis-1` | `127.0.0.1:6379 → 6379` | Up, healthy |
| MinIO | `bitnamilegacy/minio:latest` | `bookforfreedom-minio-1` | `127.0.0.1:9000–9001` | Up, healthy |
| Meilisearch | `getmeili/meilisearch:v1.12` | `bookforfreedom-meilisearch-1` | `127.0.0.1:7700 → 7700` | Up, healthy |
| API | build `apps/api/Dockerfile` | `bookforfreedom-api-1` | `127.0.0.1:3001 → 3001` | Up |
| Web | build `apps/web/Dockerfile` | `bookforfreedom-web-1` | `127.0.0.1:3000 → 3000` | Up |

Thông tin môi trường đã kiểm tra:

```text
Node.js:        v24.22.3  (yêu cầu tối thiểu 20)
pnpm:           12.21.0    (packageManager: pnpm@12.21.0)
Docker:         29.9.3
Compose:        5.7.1
MariaDB:        10.11.19-MariaDB-ubu2204
Charset:        utf8mb4 / utf8mb4_unicode_ci
Time zone:      +00:00
sql_mode:       STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

> `.env` production đã được tạo ngày 2026-11-20 (mode `600`, bị `.gitignore` chặn). Compose đọc biến từ file này; các giá trị fallback trong `docker-compose.yml` chỉ còn là lưới an toàn cho dev và không được dùng trên VPS.

### 2.4 Kiểm chứng deployment công khai — 2026-11-20 19:37 UTC

| Hạng mục | Kết quả |
|---|---|
| Trang chủ `https://freedombook.duckdns.org/` | HTTP 200, 4.681 B, có `BOOKFORFREEDOM` và `USaD` |
| API `https://freedombook.duckdns.org/api/health` | HTTP 200, `{"status":"ok"}` |
| HTTP → HTTPS | HTTP 301 → `https://freedombook.duckdns.org/` |
| TLS | Certificate valid, hết hạn 2027-02-18; `certbot renew --dry-run` PASS |
| Container | 6/6 Up; MariaDB, Redis, MinIO, Meilisearch healthy; API/Web chưa có healthcheck |
| Restart policy | `unless-stopped` cho cả 6 service |
| Database | `bookuser` 35 bảng + `bookadmin` 28 bảng = 63 bảng |
| Nginx | `nginx -t` PASS; site đã enable; Docker/Nginx/Certbot timer enabled |
| Reconcile | `docker compose up -d --remove-orphans` không tạo thay đổi |
| Image | API build 14:38 UTC, Web build 14:45 UTC; mới hơn source app tương ứng |

Lưu ý: snapshot 19:37 UTC được chụp trước khi áp dụng `.env`; từ 19:59 UTC stack đã dùng secret mới. Xem §2.5.

### 2.5 Cấu hình môi trường production — 2026-11-20 19:59 UTC

| Hạng mục | Kết quả |
|---|---|
| File môi trường | `/var/www/BOOKFORFREEDOM/.env`, 44 biến, `root:root`, mode `600` |
| Git | `.env` bị `.gitignore` chặn; không có trong `git status` |
| Secret | 32 byte hex cho root DB, hai user DB, Redis, Meili, session; MinIO 16 byte hex; không ghi vào tài liệu |
| MariaDB | Đã `ALTER USER` cho `root`, `app_bookuser`, `app_bookadmin`; mật khẩu cũ bị từ chối |
| Redis | Bật `--requirepass`; không auth trả `NOAUTH`, có auth trả `PONG` |
| Meilisearch | `MEILI_ENV=production`, `MEILI_NO_ANALYTICS=true`; không key `401`, key cũ `403`, key mới `200` |
| MinIO | Restart với mật khẩu mới; `boto3 list_buckets` auth OK, mật khẩu cũ bị từ chối; health `200` |
| API | Nhận DB/Redis/Meili/session/SMTP qua Compose; `/health` trả `{"status":"ok"}` |
| Web | Nhận `APP_URL`, `APP_NAME`, `API_PUBLIC_URL`, `WEB_PUBLIC_URL`, `NEXT_PUBLIC_API_URL`; trang chủ HTTP 200 |
| Web build arg | `NEXT_PUBLIC_API_URL` đã cấu hình trong Compose/Dockerfile; image web hiện tại chưa rebuild vì placeholder chưa dùng biến |
| Dữ liệu | Giữ nguyên 63 bảng (`bookuser` 35 + `bookadmin` 28); volume không bị xóa |
| Backup trước rotate | `/var/backups/bookforfreedom/pre-env-20261120T1955Z.sql.gz` (gzip hợp lệ) |
| Recreate | `docker compose up -d --remove-orphans` exit 0; 6/6 container Up, 4 healthcheck healthy |
| Public | `https://freedombook.duckdns.org/` HTTP 200; `/api/health` HTTP 200; TLS giữ nguyên |

Các biến nhạy cảm **không** được đưa vào container ứng dụng: `MARIADB_ROOT_PASSWORD` chỉ dùng cho quản trị/backup; API chỉ nhận user `app_bookuser`/`app_bookadmin` và mật khẩu tương ứng.

Cảnh báo còn lại: Redis log `vm.overcommit_memory` đang tắt. Không ảnh hưởng health hiện tại, nhưng nên bật trên host trước khi dùng queue/background save thật:

```bash
sudo sysctl -w vm.overcommit_memory=1
echo 'vm.overcommit_memory=1' | sudo tee /etc/sysctl.d/99-redis.conf
sudo sysctl --system
```

## 3. Kiến trúc và tech stack

### 3.1 Sơ đồ tổng quát

```text
Internet
   │ HTTPS 443 (Certbot)
   ▼
Nginx trên host — freedombook.duckdns.org
   ├── /        → 127.0.0.1:3000  Web (Next.js)
   ├── /api/    → 127.0.0.1:3001  API (NestJS, bỏ prefix /api/)
   └── /health  → 127.0.0.1:3001  API health

Docker Compose network
   ├── web:3000
   ├── api:3001 ──► mariadb:3306
   │           └──► redis:6379
   ├── worker (dự kiến) ──► redis, mariadb
   ├── mariadb:3306 ──► volume mariadb_data
   ├── redis:6379   ──► volume redis_data
   ├── minio:9000   ──► volume minio_data
   └── meilisearch:7700 ──► volume meilisearch_data
```

Hiện tại:

- Web chưa gọi API.
- API chưa kết nối MariaDB/Redis dù đã nhận biến môi trường.
- MinIO và Meilisearch chưa được ứng dụng sử dụng.
- Worker chưa có job.

### 3.2 Tech stack

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Runtime | Node.js 20+ | Máy hiện tại dùng Node 24 |
| Package manager | pnpm workspace | `pnpm-workspace.yaml`: `apps/*`, `packages/*` |
| Web | Next.js 15.5.6, React 19, Tailwind 3.4 | App Router, TypeScript |
| API | NestJS 11 + Express | Chỉ có health controller |
| Worker | TypeScript + BullMQ 5 | Chưa có queue/job |
| Database | MariaDB 10.11 / InnoDB | Hai schema, không FK xuyên database |
| Cache | Redis 7 | Chưa dùng |
| Object storage | MinIO | Chưa dùng |
| Search | Meilisearch 1.12 | Chưa dùng |
| Reverse proxy | Nginx + Certbot | TLS tự động |
| Container | Docker Compose | 6 service |
| Test | Node.js test runner | Chưa có test |
| Lint/format | ESLint 9 + Prettier 3 | Cấu hình trong `packages/config` |

### 3.3 Quyết định kiến trúc đã ghi nhận

| ADR / quyết định | Nội dung |
|---|---|
| ADR 0001 | Dùng pnpm monorepo cho `apps/*` và `packages/*` |
| ADR 0002 | Bản thảo lưu JSON có `schemaVersion`, không lưu HTML tự do |
| Tách schema | `bookuser` và `bookadmin` tách quyền, không FK vật lý giữa hai schema |
| Tích hợp | Outbox/inbox + UUID, at-least-once, consumer idempotent |
| MariaDB | Chuyển từ PostgreSQL sang MariaDB 10.11 theo yêu cầu dự án |

> Chưa có file ADR riêng cho MariaDB. Nếu muốn chuẩn hóa, nên thêm `docs/adr/0003-mariadb.md`.

---

## 4. Cấu trúc thư mục

```text
BOOKFORFREEDOM/
├── apps/
│   ├── api/                 NestJS API, hiện chỉ /health
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── app.module.ts
│   │       ├── index.ts
│   │       └── */README.md  Khung module nghiệp vụ
│   ├── web/                 Next.js placeholder
│   │   ├── Dockerfile
│   │   └── src/app/
│   └── worker/              Worker BullMQ, hiện rỗng
│       └── src/index.ts
├── packages/
│   ├── config/              ESLint, Prettier, TypeScript dùng chung
│   ├── db/                  Khung kết nối DB (chưa có driver)
│   ├── document-model/      Mô hình bản thảo JSON
│   ├── layout-engine/       Dàn trang (Giai đoạn 2)
│   ├── permissions/         Quyền dùng chung
│   ├── shared-types/        Kiểu dữ liệu dùng chung
│   ├── spine-calculator/    Tính gáy sách (Giai đoạn 3)
│   └── ui/                  Component dùng chung
├── database/
│   ├── sql/
│   │   ├── install_all.sql
│   │   ├── bookuser/001–007_*.sql
│   │   └── bookadmin/001–007_*.sql
│   ├── ddl/                 DDL export cho PowerDesigner
│   ├── docs/                Từ điển, quan hệ, API, bảo mật, cài đặt...
│   ├── diagrams/            architecture.mmd, erd_*.mmd
│   └── scripts/             Sinh tài liệu, ERD, export DDL
├── infra/
│   ├── docker/
│   │   ├── README.md
│   │   └── mariadb/init.sh  Init schema + user khi volume mới
│   ├── deploy/nginx/        Virtual host + ghi chú TLS
│   └── backup-scripts/      Hướng dẫn backup/restore
├── docs/
│   ├── 00-project-overview/
│   ├── adr/
│   ├── database/
│   ├── document-model/
│   ├── legal/
│   └── roadmap/
├── resources/               Template, font, ảnh, palette, license index
├── scripts/                 Script hỗ trợ (chưa có)
├── tests/                   Test tự động (chưa có)
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── NOTEPROJECT.md           File này
```

### 4.1 Trạng thái từng app/package

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| `apps/web` | Placeholder | Trang hiển thị `BOOKFORFREEDOM` và `USaD` |
| `apps/api` | Khung | Chỉ `GET /health` |
| `apps/worker` | Khung | `src/index.ts` là `export {}` |
| `packages/db` | Khung | Chưa có driver/ORM |
| `packages/document-model` | Khung | Chưa có schema/validator |
| `packages/permissions` | Khung | Chưa có logic runtime |
| `packages/shared-types` | Khung | Chưa có type nghiệp vụ |
| `packages/layout-engine` | Khung | Giai đoạn 2 |
| `packages/spine-calculator` | Khung | Giai đoạn 3 |
| `packages/ui` | Khung | Chưa có component |
| `packages/config` | Dùng được | ESLint/Prettier/TS config |

---

## 5. Docker và các service

### 5.1 Thành phần Compose

| Service | Image / build | Cổng host | Cổng nội bộ | Volume | Healthcheck |
|---|---|---|---|---|---|
| `mariadb` | `mariadb:10.11` | `127.0.0.1:3307` | `3306` | `mariadb_data` | `healthcheck.sh --connect --innodb_initialized` |
| `redis` | `redis:7-alpine` | `127.0.0.1:6379` | `6379` | `redis_data` | `redis-cli ping` |
| `minio` | `bitnamilegacy/minio:latest` | `127.0.0.1:9000`, `9001` | `9000`, `9001` | `minio_data` | HTTP `/minio/health/live` |
| `meilisearch` | `getmeili/meilisearch:v1.12` | `127.0.0.1:7700` | `7700` | `meilisearch_data` | HTTP `/health` |
| `api` | `apps/api/Dockerfile` | `127.0.0.1:3001` | `3001` | — | Không |
| `web` | `apps/web/Dockerfile` | `127.0.0.1:3000` | `3000` | — | Không |

Tất cả cổng chỉ bind `127.0.0.1`; truy cập công khai đi qua Nginx.

### 5.2 Volume hiện có

```text
bookforfreedom_mariadb_data
bookforfreedom_redis_data
bookforfreedom_minio_data
bookforfreedom_meilisearch_data
bookforfreedom_postgres_data     ← volume cũ, còn tồn tại
```

- `bookforfreedom_postgres_data` là volume của stack PostgreSQL trước đây.
- Volume này **không** được dùng bởi Compose hiện tại và **không** bị xóa tự động.
- Chỉ xóa khi đã xác nhận không cần dữ liệu cũ:
  ```bash
  docker volume rm bookforfreedom_postgres_data
  ```
- `docker compose down -v` xóa **toàn bộ** volume của project, không chỉ MariaDB.

### 5.3 Cấu hình MariaDB

```yaml
image: mariadb:10.11
command:
  - --character-set-server=utf8mb4
  - --collation-server=utf8mb4_unicode_ci
  - --default-time-zone=+00:00
  - --sql-mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

Đặc điểm:

- Engine mặc định InnoDB.
- Charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
- Thời gian UTC ở server.
- `sql_mode` strict, không tự thay đổi engine.
- Healthcheck dùng script có sẵn trong image, không cần cài `mysqladmin`.
- Dữ liệu ở `/var/lib/mysql` trong volume `mariadb_data`.

### 5.4 Init script `infra/docker/mariadb/init.sh`

Chỉ chạy khi `/var/lib/mysql` còn trống (lần đầu tạo volume). Script thực hiện:

1. Đọc biến `BOOKUSER_DB_USER`, `BOOKUSER_DB_PASSWORD`, `BOOKADMIN_DB_USER`, `BOOKADMIN_DB_PASSWORD`, `MARIADB_ROOT_PASSWORD`.
2. Chạy `database/sql/install_all.sql` bằng root.
3. Tạo user ứng dụng người dùng và cấp quyền.
4. Tạo user ứng dụng quản trị và cấp quyền.
5. Dùng `--default-character-set=utf8mb4` khi chạy SQL.

Quyền được cấp:

| User | Quyền | Phạm vi |
|---|---|---|
| `app_bookuser` | `SELECT, INSERT, UPDATE, DELETE` | `bookuser.*` |
| `app_bookuser` | `SELECT` | `bookadmin.admin_announcements` |
| `app_bookadmin` | `SELECT, INSERT, UPDATE, DELETE` | `bookadmin.*` |

Lý do cấp quyền đặc biệt cho `app_bookuser`:

- `bookuser.v_public_announcements` là `SQL SECURITY INVOKER`.
- View đọc bảng `bookadmin.admin_announcements`.
- Nếu không có `GRANT SELECT` trên bảng nguồn, user ứng dụng sẽ bị lỗi quyền khi đọc view.

### 5.5 Tài khoản MariaDB hiện có

| Tài khoản | Host | Mục đích |
|---|---|---|
| `root` | `%` / local | Quản trị container, chạy init/backup |
| `app_bookuser` | `%` | API/người dùng đọc ghi `bookuser` |
| `app_bookadmin` | `%` | Tiến trình quản trị đọc ghi `bookadmin` |

Chưa tạo:

- `svc_integration` — user worker tích hợp outbox/inbox được mô tả trong tài liệu nhưng **chưa** có trong Docker init.
- Không có tài khoản admin ứng dụng nào trong `bookadmin.admin_accounts`.

### 5.6 Lưu ý quan trọng về vòng đời container

- Init script **không chạy lại** khi container restart hoặc khi volume đã có dữ liệu.
- Đổi mật khẩu trong `.env` **không** tự đổi mật khẩu tài khoản đã tạo, kể cả root.
- Muốn đổi mật khẩu: dùng `ALTER USER`, hoặc xóa volume rồi tạo lại (mất dữ liệu).
- Ngày 2026-11-20 đã rotate `root`, `app_bookuser`, `app_bookadmin` bằng `ALTER USER`; mật khẩu cũ đã bị từ chối.
- Muốn nâng cấp schema trên volume cũ: chạy lại `install_all.sql` idempotent, không xóa volume.
- `install_all.sql` không chứa `DROP DATABASE`; chạy lại an toàn với dữ liệu hiện có.

---

## 6. Database

### 6.1 Tổng quan

| Chỉ số | `bookuser` | `bookadmin` | Tổng |
|---|---:|---:|---:|
| Bảng vật lý | 35 | 28 | **63** |
| View | 1 | 2 | **3** |
| Khóa ngoại | 57 | 31 | **88** |
| PK | 35 | 28 | 63 |
| CHECK constraint | 47 | 46 | **93** |
| Cột generated STORED | 6 | 2 | **8** |
| Bảng outbox + inbox | 2 | 2 | **4** |
| Số cột | — | — | **802** |
| Số kiểu dữ liệu dùng | — | — | **15** |

Thông số kỹ thuật:

- Engine InnoDB.
- Charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
- Thời gian `DATETIME(3)` lưu UTC.
- **0 FK xuyên database**.
- Mọi bảng/cột có COMMENT tiếng Việt.
- Không seed user/admin; chỉ seed dữ liệu tham chiếu.

### 6.2 Miền dữ liệu `bookuser` (35 bảng)

| Miền | Bảng |
|---|---|
| Danh tính | `users`, `user_profiles`, `user_settings`, `user_sessions`, `user_devices`, `password_reset_tokens`, `email_verification_tokens` |
| Danh mục sách | `books`, `book_chapters`, `book_files`, `authors`, `book_authors`, `publishers`, `categories`, `book_categories`, `tags`, `book_tags`, `licenses` |
| Quyền nội dung | `book_rights` |
| Tương tác | `reviews`, `comments`, `comment_reactions`, `user_reports` |
| Thư viện/đọc | `user_library`, `reading_progress`, `reading_history`, `bookmarks`, `reading_lists`, `reading_list_books`, `downloads` |
| Xã hội | `user_follows` |
| Thông báo | `notifications`, `notification_preferences` |
| Tích hợp | `integration_outbox`, `integration_inbox` |

View:

- `bookuser.v_public_announcements` — thông báo công khai còn hiệu lực, đọc bảng `bookadmin.admin_announcements`.

### 6.3 Miền dữ liệu `bookadmin` (28 bảng)

| Miền | Bảng |
|---|---|
| Danh tính admin | `admin_accounts`, `admin_profiles`, `admin_sessions`, `admin_mfa_methods`, `admin_password_reset_tokens`, `admin_login_attempts` |
| RBAC | `admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_account_roles` |
| Kiểm duyệt | `content_reports`, `report_reasons`, `moderation_cases`, `moderation_actions` |
| Quản trị người dùng | `admin_user_notes`, `user_restrictions`, `user_verification_reviews` |
| Bản quyền nội dung | `book_rights_reviews` |
| Vận hành | `admin_announcements`, `admin_notifications`, `feature_flags`, `system_settings`, `maintenance_windows`, `system_metrics_daily` |
| Audit/bảo mật | `admin_audit_logs`, `security_events` |
| Tích hợp | `integration_outbox`, `integration_inbox` |

View:

- `bookadmin.v_user_summary` — tổng hợp người dùng cho dashboard/quản trị.
- `bookadmin.v_book_summary` — tổng hợp sách cho dashboard/quản trị.

### 6.4 Quy ước thiết kế

- **PK nghiệp vụ:** `BIGINT UNSIGNED AUTO_INCREMENT`, tên `<entity>_id`.
- **Bảng liên kết:** 7 bảng dùng PK tổng hợp 2 cột.
- **UUID công khai:** `CHAR(36)`, có UNIQUE ở bảng cần định danh ra ngoài.
- **Hash/token:** `BINARY(32)`, không lưu plaintext.
- **IP:** `VARBINARY(16)` để hỗ trợ IPv4/IPv6.
- **JSON:** `LONGTEXT` + `utf8mb4_bin` + CHECK `JSON_VALID`.
- **Tiền tệ:** `DECIMAL`, không dùng `FLOAT`.
- **Boolean:** `TINYINT(1)` + CHECK.
- **Thời gian:** UTC; ứng dụng quy đổi khi hiển thị.
- **Xóa mềm:** dùng `deleted_at`/`status`, bảo toàn lịch sử.
- **Không FK xuyên database:** liên kết logic qua `user_id`, `book_id`, `*_uuid`, `event_id`.
- **Partial unique:** dùng cột generated STORED + UNIQUE (do MariaDB không có filtered index).
  - `reviews.active_book_id`.
  - `reading_lists.active_name`.
- **Index:** theo truy vấn thực tế — trạng thái + thời gian, FK, slug/email, dashboard admin.

### 6.5 Tích hợp hai schema

- Mỗi schema có `integration_outbox` và `integration_inbox`.
- `UNIQUE(event_id)` trên cả outbox và inbox.
- Ghi sự kiện cùng transaction nghiệp vụ.
- Worker đọc outbox bằng `FOR UPDATE SKIP LOCKED`.
- Retry lũy tiến; hết lượt chuyển `dead_letter`.
- Consumer chèn inbox trước, xử lý idempotent, đánh dấu `processed` cùng transaction.
- Danh mục:
  - 14 sự kiện `bookuser → bookadmin`.
  - 9 sự kiện `bookadmin → bookuser`.
- Có truy vấn đối soát báo cáo, hạn chế, outbox tồn đọng và job lưu trữ.

### 6.6 RBAC, audit và dữ liệu tham chiếu

RBAC:

- 7 vai trò hệ thống.
- 76 permission dạng `resource.action`.
- 212 gán quyền vai trò–permission.
- Phân bổ:
  - `SUPER_ADMIN`: 76
  - `ADMIN`: 71
  - `CONTENT_MODERATOR`: 31
  - `SUPPORT_AGENT`: 13
  - `RIGHTS_REVIEWER`: 8
  - `AUDITOR`: 7
  - `ANALYST`: 6
- `ADMIN` không có `role.manage`/`permission.manage`; chỉ `SUPER_ADMIN` có.

Audit:

- `admin_audit_logs` có `prev_hash`, `record_hash` tạo chuỗi hash.
- 4 trigger chặn `UPDATE`/`DELETE`: 2 trên `admin_audit_logs`, 2 trên `security_events`.
- Trigger ném `SQLSTATE 45000`.
- Ghi audit cùng transaction với thao tác; có `correlation_id`, IP nhị phân, before/after/diff.

Seed:

- `bookadmin`: 7 role, 76 permission, 212 gán quyền, 12 `report_reasons`.
- `bookuser`: 8 `licenses`.
- `bookuser.users` = 0.
- `bookadmin.admin_accounts` = 0.
- Không có mật khẩu mặc định.

### 6.7 Thứ tự cài đặt

`install_all.sql` chạy:

1. `bookadmin/001` → `006`
2. `bookuser/001` → `007`
3. `bookadmin/007` (verify cuối)

Lý do: `bookuser.v_public_announcements` phụ thuộc bảng `bookadmin.admin_announcements`.

Thứ tự trong mỗi schema:

| File | Nội dung |
|---|---|
| `001_create_database.sql` | Tạo database, charset/collation |
| `002_create_tables.sql` | Bảng, cột, PK/UK/CHECK, generated column, trigger audit |
| `003_create_constraints.sql` | FK, idempotent qua kiểm tra `information_schema` |
| `004_create_indexes.sql` | Index bổ sung |
| `005_create_views.sql` | View |
| `006_seed_reference_data.sql` | Dữ liệu tham chiếu, idempotent |
| `007_verify.sql` | Kiểm tra PASS/FAIL/INFO |

Quy ước thay đổi schema:

- Không sửa file `NNN_*.sql` đã phát hành.
- Thay đổi mới thêm file `008_*.sql`, `009_*.sql`...
- Sau thay đổi: chạy verify, export DDL, sinh lại tài liệu/ERD.
- Production dùng migration tăng dần, không `DROP DATABASE`.

### 6.8 Tài liệu, ERD và DDL

| Sản phẩm | Đường dẫn |
|---|---|
| Mục lục tài liệu DB | `database/docs/README.md` |
| Từ điển dữ liệu | `database/docs/data_dictionary.md` |
| Quan hệ | `database/docs/relationships.md` |
| Kiểu dữ liệu | `database/docs/data_types.md` |
| Tích hợp outbox/inbox | `database/docs/cross_database_integration.md` |
| Hợp đồng API | `database/docs/api_contract.md` |
| Bảo mật | `database/docs/security.md` |
| Cài đặt/vận hành | `database/docs/installation.md` |
| PowerDesigner | `database/docs/powerdesigner_guide.md` |
| Kiểm chứng | `database/docs/verification_report.md` |
| Tổng kết | `database/docs/final_report.md` |
| Kiến trúc | `database/diagrams/architecture.mmd` |
| ERD | `database/diagrams/erd_bookuser.mmd`, `erd_bookadmin.mmd` |
| DDL reverse | `database/ddl/bookuser_schema.sql`, `bookadmin_schema.sql` |
| Script sinh tài liệu | `database/scripts/generate_*.py`, `export_ddl.sh` |

Lưu ý:

- Tài liệu/ERD được sinh từ `information_schema`, không viết tay.
- DDL export chỉ để reverse engineer; có `DROP TABLE`, **không dùng để cài đặt**.
- Export bỏ trigger vì PowerDesigner không mô hình hóa trigger và `DEFINER` không phù hợp để phát hành.
- Script Python hiện gọi client `mysql`; trên máy chỉ có `mariadb` cần alias hoặc sửa lệnh.

### 6.9 Kiểm chứng database

Kết quả đã ghi nhận:

| Hạng mục | Kết quả |
|---|---|
| `install_all.sql` trên môi trường sạch | Không lỗi |
| Chạy lại lần hai | Idempotent, không lỗi |
| Tổng kiểm tra | 41 PASS, 2 INFO, 0 FAIL |
| Kiểm thử DML có rollback | 8/8 PASS |
| Docker image thực tế | MariaDB 10.11.19 |
| Bảng/view/FK trong Docker | 63 / 3 / 88 |
| `app_bookuser` đọc view công khai | PASS |
| `app_bookadmin` đọc RBAC | PASS |
| `app_bookuser` đọc `admin_roles` | Bị từ chối đúng quyền |
| `app_bookadmin` truy cập `bookuser` | Bị từ chối đúng quyền |
| Backup `mariadb-dump` | Chạy được |
| Kết nối host `127.0.0.1:3307` | Chạy được |

8 kiểm thử DML:

1. Đọc view xuyên schema.
2. JOIN FK `books` → `book_chapters`.
3. Generated column `reviews.active_book_id`.
4. Chặn `UPDATE` audit.
5. Chặn `DELETE` audit.
6. Chặn trùng `event_id` outbox.
7. Retry outbox `failed → pending → processed`.
8. Chặn trùng `event_id` inbox.

Lệnh tái lập:

```bash
cd /var/www/BOOKFORFREEDOM/database/sql
sudo mysql --default-character-set=utf8mb4 < install_all.sql 2>&1 | tee /tmp/bookfreedom_install.log
grep -E "FAIL|ERROR" /tmp/bookfreedom_install.log || echo "0 FAIL/ERROR"

sudo mysql --default-character-set=utf8mb4 < bookuser/007_verify.sql
sudo mysql --default-character-set=utf8mb4 < bookadmin/007_verify.sql
```

Kiểm tra nhanh trong Docker:

```bash
docker compose exec -T mariadb sh -c '
  mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -B -e "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema IN (\"bookuser\",\"bookadmin\") AND table_type=\"BASE TABLE\";
    SELECT COUNT(*) FROM information_schema.views
    WHERE table_schema IN (\"bookuser\",\"bookadmin\");
    SELECT COUNT(*) FROM information_schema.referential_constraints
    WHERE constraint_schema IN (\"bookuser\",\"bookadmin\");
  "
'
```

### 6.10 Backup, restore và nâng cấp

Backup:

```bash
docker compose exec -T mariadb sh -c \
  'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --events --databases bookuser bookadmin' \
  > bookfreedom-$(date +%F).sql
```

Restore:

```bash
docker compose exec -T mariadb sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' \
  < bookfreedom-YYYY-MM-DD.sql
```

Nâng cấp schema trên volume đã có:

```bash
docker compose exec -T mariadb sh -c \
  'cd /opt/bookfreedom/sql && mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < install_all.sql'
```

Nguyên tắc:

- Backup trước mọi thay đổi schema hoặc redeploy lớn.
- Lưu backup ngoài volume Docker.
- Định kỳ restore thử vào database tạm để kiểm tra backup.
- Không dùng `DROP DATABASE` trên production.

---

## 7. Biến môi trường

Nguồn mẫu: `.env.example`. Bản production: `.env` ở thư mục gốc, 44 biến, mode `600`, đã bị Git ignore.

### 7.1 Ứng dụng, URL và MariaDB

| Biến | Giá trị production | Ý nghĩa |
|---|---|---|
| `NODE_ENV` | `production` | Môi trường chạy |
| `APP_ENV` | `production` | Tên môi trường logic |
| `APP_NAME` | `BOOKFORFREEDOM` | Tên hiển thị |
| `APP_URL` | `https://freedombook.duckdns.org` | URL công khai của web |
| `API_PUBLIC_URL` | `https://freedombook.duckdns.org/api` | URL công khai của API |
| `NEXT_PUBLIC_API_URL` | `https://freedombook.duckdns.org/api` | URL API cho client Next.js; phải có ở build time |
| `WEB_PUBLIC_URL` | `https://freedombook.duckdns.org` | URL công khai của web |
| `TZ` | `UTC` | Timezone container |
| `LOG_LEVEL` | `info` | Mức log ứng dụng |
| `MARIADB_ROOT_PASSWORD` | `<secret 64 hex>` | Mật khẩu root container; chỉ dùng quản trị/backup |
| `MARIADB_PORT` | `3307` | Cổng host của MariaDB |
| `BOOKUSER_DB_HOST` | `localhost` | Host DB người dùng; trong Compose là `mariadb` |
| `BOOKUSER_DB_PORT` | `3307` | Cổng DB người dùng từ host; trong Compose là `3306` |
| `BOOKUSER_DB_NAME` | `bookuser` | Tên schema người dùng |
| `BOOKUSER_DB_USER` | `app_bookuser` | User ứng dụng người dùng |
| `BOOKUSER_DB_PASSWORD` | `<secret 64 hex>` | Mật khẩu user ứng dụng |
| `BOOKADMIN_DB_HOST` | `localhost` | Host DB quản trị; trong Compose là `mariadb` |
| `BOOKADMIN_DB_PORT` | `3307` | Cổng DB quản trị từ host; trong Compose là `3306` |
| `BOOKADMIN_DB_NAME` | `bookadmin` | Tên schema quản trị |
| `BOOKADMIN_DB_USER` | `app_bookadmin` | User ứng dụng quản trị |
| `BOOKADMIN_DB_PASSWORD` | `<secret 64 hex>` | Mật khẩu user quản trị |
| `DATABASE_URL` | `mysql://app_bookuser:<secret>@localhost:3307/bookuser` | URL tiện dụng cho driver |
| `BOOKADMIN_DATABASE_URL` | `mysql://app_bookadmin:<secret>@localhost:3307/bookadmin` | URL tiện dụng cho admin |
| `SESSION_SECRET` | `<secret 64 hex>` | Secret ký session |
| `SESSION_COOKIE_NAME` | `bff_session` | Tên cookie session |
| `COOKIE_SECURE` | `true` | Chỉ gửi cookie qua HTTPS |
| `COOKIE_SAME_SITE` | `lax` | Chính sách SameSite |
| `SMTP_HOST` | rỗng | SMTP chưa cấu hình; API nhận biến rỗng |
| `SMTP_PORT` | `587` | Cổng SMTP dự kiến |
| `SMTP_USER` | rỗng | SMTP user |
| `SMTP_PASSWORD` | rỗng | SMTP password |
| `SMTP_FROM` | `BOOKFORFREEDOM <noreply@freedombook.duckdns.org>` | Địa chỉ gửi |

### 7.2 Hạ tầng

| Biến | Giá trị production | Ý nghĩa |
|---|---|---|
| `REDIS_PASSWORD` | `<secret 64 hex>` | Mật khẩu Redis; Compose truyền vào `--requirepass` |
| `REDIS_URL` | `redis://:<secret>@localhost:6379` | Redis từ host; trong Compose là `redis://:<secret>@redis:6379` |
| `MINIO_ROOT_USER` | `bff_minio` | Tài khoản root MinIO |
| `MINIO_ROOT_PASSWORD` | `<secret 32 hex>` | Mật khẩu root MinIO |
| `MINIO_ENDPOINT` | `localhost` | Host MinIO; trong Compose API nhận `minio` |
| `MINIO_PORT` | `9000` | Cổng API MinIO |
| `MINIO_CONSOLE_PORT` | `9001` | Cổng console MinIO |
| `MINIO_USE_SSL` | `false` | Dùng TLS cho MinIO hay không |
| `MEILI_ENV` | `production` | Chế độ Meilisearch |
| `MEILI_NO_ANALYTICS` | `true` | Tắt telemetry |
| `MEILI_MASTER_KEY` | `<secret 64 hex>` | Master key Meilisearch |
| `MEILI_HOST` | `http://localhost:7700` | URL Meilisearch; trong Compose API nhận `http://meilisearch:7700` |

### 7.3 Biến chỉ có trong Compose

| Biến | Giá trị | Service |
|---|---|---|
| `API_PORT` | `3001` | API |
| `PORT` | `3000` | Web |
| `HOSTNAME` | `0.0.0.0` | Web |
| `MINIO_API_PORT_NUMBER` | `9000` | MinIO |
| `MINIO_CONSOLE_PORT_NUMBER` | `9001` | MinIO |

`TZ`, `MEILI_ENV` và `MEILI_NO_ANALYTICS` không còn hardcode trong Compose; chúng lấy từ `.env` với giá trị mặc định an toàn.

### 7.4 Lưu ý bảo mật và định dạng

- Không commit `.env`; `.gitignore` đã chặn `.env` và `.env.*`, chỉ cho `.env.example`.
- `.env` production dùng secret hex sinh bằng `openssl rand -hex 32` (MinIO dùng 16 byte); nhờ vậy không cần URL-encode trong `DATABASE_URL`/`REDIS_URL`.
- `MARIADB_ROOT_PASSWORD` chỉ dùng cho init/backup/quản trị, **không** truyền cho API/Web.
- API trong Compose luôn dùng host `mariadb`, port `3306`, `redis:6379`, `minio:9000`, `meilisearch:7700`; biến trong `.env` dùng cổng host `3307`/`6379`/`9000`/`7700` khi chạy app ngoài Docker.
- `NEXT_PUBLIC_API_URL` là biến build-time của Next.js; `apps/web/Dockerfile` nhận qua `ARG`, Compose truyền từ `.env`. Đổi URL này phải rebuild web, không chỉ restart.
- Trong `docker-compose.yml`, ký tự `$` trong giá trị có thể bị Compose interpolate; cần escape `$$` hoặc dùng Docker secret.
- Đổi secret phải làm cả hai phía: cập nhật `.env` **và** đổi credential trong dịch vụ tương ứng. Với MariaDB:
  ```sql
  ALTER USER 'app_bookuser'@'%' IDENTIFIED BY '<new-password>';
  ALTER USER 'app_bookadmin'@'%' IDENTIFIED BY '<new-password>';
  ALTER USER 'root'@'localhost' IDENTIFIED BY '<new-password>';
  ```
- Sau khi đổi `.env`, chạy `docker compose up -d --remove-orphans` để recreate; không dùng `down -v` vì sẽ xóa volume.
- `.env.example` chỉ là mẫu dev; các placeholder như `replace-this-*` không được dùng trên VPS.

---

## 8. Lệnh thường dùng

### 8.1 Yêu cầu

- Node.js 20+ (khuyến nghị theo `.nvmrc` nếu bổ sung sau này).
- pnpm 9+.
- Docker Engine + Compose plugin.

### 8.2 Chạy lần đầu

```bash
cd /var/www/BOOKFORFREEDOM
# Local/dev: sao chép mẫu rồi thay placeholder.
# Production: tạo .env từ secret store, KHÔNG dùng placeholder.
cp .env.example .env
# Sinh secret mạnh thay cho placeholder:
# openssl rand -hex 32
# openssl rand -hex 16   # MinIO
chmod 600 .env
pnpm install
docker compose up -d
```

Kiểm tra:

```bash
docker compose ps
curl -fsS http://127.0.0.1:3001/health
curl -I http://127.0.0.1:3000
```

### 8.3 Phát triển local

```bash
pnpm install
pnpm dev          # web + api + worker
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Chạy riêng:

```bash
pnpm --filter @bff/web dev
pnpm --filter @bff/api dev
pnpm --filter @bff/worker dev
```

### 8.4 Docker

```bash
docker compose up -d
docker compose up -d --build
docker compose up -d --remove-orphans
docker compose ps
docker compose logs -f
docker compose logs -f mariadb
docker compose restart mariadb
docker compose stop
docker compose down
```

Cảnh báo:

```bash
docker compose down -v   # xóa TẤT CẢ volume của project
```

### 8.5 Database

```bash
# Xem database
docker compose exec mariadb sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES;"'

# Đọc view bằng user ứng dụng
docker compose exec mariadb sh -c \
  'mariadb -uapp_bookuser -p"$BOOKUSER_DB_PASSWORD" bookuser -e "SELECT COUNT(*) FROM v_public_announcements;"'

# Đọc RBAC bằng user admin
docker compose exec mariadb sh -c \
  'mariadb -uapp_bookadmin -p"$BOOKADMIN_DB_PASSWORD" bookadmin -e "SELECT COUNT(*) FROM admin_roles;"'

# Kết nối từ host
mariadb -h127.0.0.1 -P3307 -uapp_bookuser -p bookuser
```

### 8.6 Reset riêng MariaDB

```bash
docker compose rm -sf mariadb
docker volume rm bookforfreedom_mariadb_data
docker compose up -d mariadb
```

Chỉ dùng khi chấp nhận mất toàn bộ dữ liệu MariaDB.

### 8.7 Sinh lại tài liệu DB

```bash
cd /var/www/BOOKFORFREEDOM
python3 database/scripts/generate_data_dictionary.py
python3 database/scripts/generate_relationships.py
python3 database/scripts/generate_erds.py
./database/scripts/export_ddl.sh
```

Yêu cầu client `mysql`/`mariadb` kết nối được và có quyền đọc `information_schema`.

---

## 9. API, Web và triển khai

### 9.1 API hiện tại

Mã nguồn:

```ts
@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

- Endpoint: `GET /health`.
- Response: `{"status":"ok"}`.
- Không kiểm tra database, Redis, MinIO hay Meilisearch.
- Không có global prefix `/api/v1`; Nginx bỏ prefix `/api/` khi proxy.
- Không có validation, auth, logging nghiệp vụ hay error filter.

### 9.2 Hợp đồng API dự kiến

Tài liệu `database/docs/api_contract.md` quy định:

- Base URL: `/api/v1`.
- JSON UTF-8; thời gian ISO-8601 UTC.
- Định danh công khai dùng `*_uuid`, không nhận `BIGINT`.
- Phân trang cursor, `limit` mặc định 20, tối đa 100.
- Bao kết quả `data` + `meta` + `request_id`.
- Lỗi chuẩn hóa `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- `Idempotency-Key` cho POST quan trọng.
- Rate limit auth/report/admin.
- Audit admin trong cùng transaction.

Đây là **hợp đồng dự kiến**, chưa được implement.

### 9.3 Web hiện tại

- Next.js App Router.
- Trang chủ hiển thị `BOOKFORFREEDOM` và dòng `USaD`.
- Chưa có layout sản phẩm, auth, dashboard hay gọi API.
- Docker build dùng Next standalone output.

### 9.4 Worker hiện tại

- `apps/worker/src/index.ts` là `export {}`.
- Có dependency BullMQ nhưng chưa khởi tạo queue/worker.
- Các thư mục nghiệp vụ chỉ có README: `pdf-export`, `print-export`, `epub-export`, `docx-convert`, `image-processing`, `font-processing`, `backup-jobs`.

### 9.5 Nginx và domain

- Domain: `freedombook.duckdns.org`.
- TLS do Certbot quản lý.
- HTTP 80 chuyển hướng 443; host khác trả 404.
- `client_max_body_size 25m`.
- Route:
  - `/` → `127.0.0.1:3000`.
  - `/api/` → `127.0.0.1:3001/` (bỏ prefix).
  - `/health` → `127.0.0.1:3001/health`.
- Chưa cấu hình WebSocket, upload riêng hay rate limit tại Nginx.
- Chưa có healthcheck container API/Web để Nginx biết trạng thái.

---

## 10. Bảo mật

### 10.1 Nguyên tắc đã áp dụng

- Tách hai schema và hai user DB.
- Không dùng tài khoản root cho ứng dụng.
- Quyền tối thiểu: chỉ DML cần thiết, không `GRANT ALL`.
- Không seed admin/mật khẩu mặc định.
- Audit append-only, chặn sửa/xóa bằng trigger.
- Mọi thay đổi admin dự kiến ghi audit cùng transaction.
- TLS bắt buộc ở Nginx.
- Cổng nội bộ chỉ bind localhost.

### 10.2 Thiết kế bảo mật dự kiến

- Mật khẩu Argon2id.
- Token chỉ lưu SHA-256 `BINARY(32)`.
- Session thu hồi được, refresh token luân chuyển.
- MFA bắt buộc với `SUPER_ADMIN`/`ADMIN`.
- RBAC kiểm tra server-side cho mọi endpoint.
- Cookie `HttpOnly; Secure; SameSite=Lax`.
- Che PII trong audit (`before_data`, `after_data`, `diff`).
- Rate limit auth, báo cáo, admin.

Các mục trên **chưa được implement trong code**.

### 10.3 Việc bắt buộc trước production

- [x] Tạo `.env` thật, đổi toàn bộ mật khẩu (2026-11-20).
- [x] Runtime VPS không dùng mật khẩu fallback; fallback trong Compose chỉ còn cho dev.
- [ ] Cân nhắc Docker secret hoặc file secret thay vì env cho production.
- [x] Đổi `MEILI_ENV` sang `production` và đặt master key mạnh.
- [ ] Pin image MinIO thay vì `latest`/legacy.
- [ ] Bật backup định kỳ và restore test.
- [ ] Bật firewall chỉ cho 80/443; không mở 3000/3001/3307 ra ngoài.
- [ ] Cấu hình log rotation và monitoring.
- [ ] Kiểm tra lại quyền user DB sau mỗi migration.
- [ ] Tạo quy trình cấp/thu hồi admin đầu tiên có kiểm soát.

### 10.4 Rủi ro hiện tại

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| Secret nằm trong `.env` dạng plaintext | Trung bình | Mode `600`, không commit; cân nhắc Docker secret |
| Fallback password vẫn tồn tại trong Compose | Thấp | Chỉ dùng khi thiếu `.env`; VPS đã có `.env` |
| Chưa có auth/RBAC runtime | Cao | Database có RBAC nhưng API chưa dùng |
| Chưa có test tự động | Trung bình | Dễ regression khi thêm code |
| API health không kiểm tra DB | Trung bình | Có thể báo ok khi DB lỗi |
| Image MinIO legacy/latest | Trung bình | Không reproducible, có thể hết hỗ trợ |
| Redis `vm.overcommit_memory` đang tắt | Thấp | Chưa ảnh hưởng; nên bật trước khi dùng queue |
| SMTP chưa cấu hình | Thấp | API nhận biến rỗng; chưa gửi mail được |
| Volume PostgreSQL cũ còn dữ liệu | Thấp | Không dùng, nhưng chiếm chỗ |
| Tài liệu overview còn câu cũ | Thấp | Nói chưa có schema chi tiết |

---

## 11. Kiểm chứng và chất lượng

### 11.1 Đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `docker compose config --quiet` | PASS |
| `bash -n infra/docker/mariadb/init.sh` | PASS |
| `git diff --check` | PASS |
| Link Markdown trong các tài liệu chính | PASS |
| API `/health` | `{"status":"ok"}` |
| Web HTTP | 200 |
| MariaDB healthcheck | healthy |
| MariaDB `sql_mode` | strict đúng cấu hình |
| MariaDB timezone | `+00:00` |
| Bảng/view/FK | 63 / 3 / 88 |
| RBAC seed | 7 role / 76 permission / 212 gán |
| Report reasons | 12 |
| Licenses | 8 |
| Users/admins | 0 / 0 |
| Backup `mariadb-dump` | PASS |
| Backup trước rotate | `/var/backups/bookforfreedom/pre-env-20261120T1955Z.sql.gz`, gzip PASS |
| `.env` production | 44 biến, mode `600`, `git check-ignore` PASS |
| Rotate DB credential | `root`/`bookuser`/`bookadmin` PASS; mật khẩu cũ bị từ chối |
| Redis auth | Không key `NOAUTH`; có key `PONG` |
| Meilisearch production | Không key `401`; key cũ `403`; key mới `200` |
| MinIO credential | Boto3 `list_buckets` PASS; mật khẩu cũ bị từ chối; health `200` |
| Kết nối host port 3307 | PASS |

### 11.2 Chưa có

- Test unit/integration tự động.
- CI pipeline.
- Test API với database thật.
- Load test.
- Test backup restore tự động.
- Test PowerDesigner thực tế.
- Test bảo mật/penetration.
- Đo coverage.

### 11.3 Khuyến nghị kiểm tra trước khi commit

```bash
cd /var/www/BOOKFORFREEDOM
docker compose config --quiet
bash -n infra/docker/mariadb/init.sh
git diff --check
pnpm typecheck
pnpm lint
pnpm test
```

---

## 12. Lịch sử thay đổi: PostgreSQL → MariaDB

### 12.1 Trước khi chuyển

- Compose có service `postgres`.
- Biến môi trường dùng `POSTGRES_*`, `DATABASE_URL=postgresql://...`.
- Volume `postgres_data`.
- Chưa có database schema hoàn chỉnh trong repo.
- API chỉ có healthcheck.

### 12.2 Sau khi chuyển

| Hạng mục | Trước | Sau |
|---|---|---|
| Image DB | PostgreSQL | `mariadb:10.11` |
| Service | `postgres` | `mariadb` |
| Volume | `postgres_data` | `mariadb_data` |
| Cổng host | 5432 | 3307 |
| URL | `postgresql://` | `mysql://` |
| Schema | Chưa có | `bookuser`, `bookadmin` |
| Init | Không | `infra/docker/mariadb/init.sh` |
| User ứng dụng | Chưa có | `app_bookuser`, `app_bookadmin` |
| Healthcheck | — | `healthcheck.sh` |

### 12.3 File đã thay đổi

| File | Thay đổi |
|---|---|
| `docker-compose.yml` | Thay PostgreSQL bằng MariaDB; volume, env, healthcheck, depends_on |
| `.env.example` | Đổi toàn bộ biến sang MariaDB/MySQL URL |
| `infra/docker/mariadb/init.sh` | Tạo mới: cài schema + user + grant |
| `README.md` | Hướng dẫn MariaDB, cổng 3307, Docker |
| `infra/docker/README.md` | Runbook MariaDB đầy đủ |
| `infra/deploy/README.md` | Ghi chú MariaDB trong deploy |
| `infra/backup-scripts/README.md` | Lệnh backup/restore MariaDB |
| `database/docs/installation.md` | Mục Docker Compose, cổng, user, backup |
| `database/docs/verification_report.md` | Kết quả kiểm chứng Docker |
| `database/docs/final_report.md` | Ghi nhận hạ tầng MariaDB |
| `docs/database/README.md` | Cập nhật mô tả DB |
| `packages/db/README.md` | Ghi chú MariaDB, hai user |
| `apps/api/README.md` | Ghi chú biến môi trường DB |

### 12.4 Kiểm chứng sau chuyển

- `docker compose config` hợp lệ.
- Container MariaDB healthy.
- Init sạch tạo 63 bảng, 3 view, 88 FK.
- `app_bookuser` đọc view, `app_bookadmin` đọc RBAC.
- Phân quyền chéo bị từ chối đúng thiết kế.
- Reinstall `install_all.sql` idempotent.
- Backup command hoạt động; quy trình restore đã có nhưng chưa diễn tập đầy đủ.
- Kết nối host `127.0.0.1:3307` hoạt động.
- API/Web vẫn chạy sau khi đổi DB.

### 12.5 Di sản còn lại

- Volume `postgres_data` cũ vẫn tồn tại, không dùng.
- Các tài liệu có thể còn câu “PostgreSQL” trong ngữ cảnh lịch sử; đã rà soát và chỉ còn ghi chú chuyển đổi.
- Chưa có script migrate dữ liệu từ PostgreSQL sang MariaDB vì trước đây chưa có schema ứng dụng thực tế.

---

## 13. Vấn đề đã biết và lưu ý

1. **Init script chỉ chạy khi volume trống**
   - Không tự cập nhật schema/user khi restart.
   - Nâng cấp bằng cách chạy lại `install_all.sql`; đổi mật khẩu bằng `ALTER USER` hoặc tạo lại volume.

2. **Fallback trong `docker-compose.yml`**
   - Runtime VPS dùng `.env`; fallback chỉ dành cho dev.
   - Không được xóa `.env` khi redeploy; nếu mất, phải khôi phục từ secret store.
   - Đổi mật khẩu DB phải dùng `ALTER USER`, không chỉ sửa `.env`.

3. **Cổng host 3307**
   - Chọn để tránh MariaDB hệ thống ở 3306.
   - API trong Compose dùng `mariadb:3306`; app ngoài Docker dùng `127.0.0.1:3307`.

4. **View `v_public_announcements` cần grant đặc biệt**
   - View là `SQL SECURITY INVOKER`.
   - `app_bookuser` phải có `SELECT` trên `bookadmin.admin_announcements`.
   - Nếu thiếu, đọc view sẽ bị `ERROR 1142`.

5. **Không có FK xuyên database**
   - Đây là thiết kế có chủ đích.
   - Liên kết qua UUID/event, đối soát bằng outbox/inbox.
   - Không thêm FK vật lý giữa `bookuser` và `bookadmin`.

6. **Chưa có lớp DB trong ứng dụng**
   - `packages/db` chỉ `export {}`.
   - API chưa có driver, repository hay ORM.
   - Cần chọn `mysql2` hoặc `mariadb` trước khi viết nghiệp vụ.

7. **API healthcheck chưa phản ánh DB**
   - `/health` luôn trả `ok` nếu process sống.
   - Cần thêm readiness check khi có DB layer.

8. **Volume PostgreSQL cũ**
   - `bookforfreedom_postgres_data` vẫn tồn tại.
   - Không ảnh hưởng runtime; chỉ xóa sau khi xác nhận.

9. **`svc_integration` chưa được tạo**
   - Tài liệu mô tả user worker tích hợp.
   - Docker init mới chỉ tạo hai user ứng dụng.
   - Cần bổ sung khi làm worker outbox/inbox.

10. **Image MinIO dùng legacy/latest**
    - Không pin version, khó tái lập.
    - Nên chọn image chính thức hoặc tag cố định.

11. **Meilisearch production**
    - Đã đặt `MEILI_ENV=production`, `MEILI_NO_ANALYTICS=true`, master key mạnh.
    - Gọi `/indexes` không key trả `401`; phải gửi bearer key.

12. **Chưa có healthcheck cho API/Web**
    - `web` depends_on `api` nhưng không chờ API sẵn sàng.
    - Nên thêm healthcheck hoặc startup retry.

13. **Tài liệu overview còn câu cũ**
    - `docs/00-project-overview/overview.md` nói scaffold chưa có schema chi tiết.
    - Thực tế `database/` đã có schema đầy đủ; nên cập nhật câu này.

14. **Web còn chữ `USaD`**
    - Đây là nội dung placeholder, không phải thương hiệu.
    - Cần thay khi làm giao diện thật.

15. **Git chưa commit**
    - `database/` và `infra/docker/mariadb/` đang untracked.
    - Các file `.env.example`, `README.md`, `docker-compose.yml`, tài liệu đang modified.
    - Không commit `.env` hay backup chứa dữ liệu thật.

16. **`docker compose down -v` rất nguy hiểm**
    - Xóa toàn bộ volume: MariaDB, Redis, MinIO, Meilisearch.
    - Chỉ dùng khi muốn reset toàn bộ môi trường.

17. **Ký tự đặc biệt trong mật khẩu**
    - URL phải URL-encode.
    - Compose có thể interpolate `$`; dùng `$$` hoặc secret file.

18. **DDL export không dùng để cài**
    - Có `DROP TABLE`.
    - Chỉ dùng cho PowerDesigner/reverse engineer.

---

## 14. Việc cần làm tiếp

### 14.1 Ưu tiên P0 — ngay sau giai đoạn nền móng

1. **Review và commit phần hạ tầng/database**
   - Commit `database/`, `infra/docker/mariadb/`, `docker-compose.yml`, `.env.example` và tài liệu.
   - Không commit `.env`, backup, file dump hay dữ liệu thật.
   - Kiểm tra `git diff --check` trước khi commit.

2. **Tạo `.env` thật và đổi toàn bộ mật khẩu**
   - `cp .env.example .env`.
   - Đổi root, app user, MinIO, Meili, session, SMTP.
   - Nếu volume đã tạo trước đó, dùng `ALTER USER` hoặc tạo lại volume.

3. **Chọn driver DB và implement lớp kết nối**
   - Ứng viên: `mysql2` hoặc `mariadb`.
   - Tạo pool cho `bookuser` và `bookadmin`.
   - Đọc config từ `BOOKUSER_DB_*`/`BOOKADMIN_DB_*`.
   - Validate biến môi trường khi khởi động.
   - Không dùng chung một pool cho hai schema nếu muốn giữ ranh giới quyền.

4. **Thêm health/readiness check có DB**
   - `GET /health` giữ trạng thái process.
   - Thêm `GET /ready` kiểm tra `SELECT 1` trên cả hai schema (hoặc schema cần thiết).
   - Không trả chi tiết lỗi DB ra ngoài.

5. **Viết integration test với MariaDB thật**
   - Test kết nối, quyền, view, constraint.
   - Test API health/ready.
   - Chạy trong CI bằng Docker service.

6. **Tạo `svc_integration` và worker outbox/inbox**
   - Cấp quyền tối thiểu như tài liệu.
   - Implement đọc outbox `FOR UPDATE SKIP LOCKED`.
   - Retry, dead-letter, inbox idempotent.
   - Đối soát định kỳ.

7. **CI tối thiểu**
   - `pnpm install --frozen-lockfile`
   - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
   - `docker compose config`
   - Khởi động MariaDB và chạy verify SQL.

8. **Đồng bộ tài liệu**
   - Sửa câu cũ trong `docs/00-project-overview/overview.md`.
   - Thêm ADR MariaDB nếu cần.
   - Ghi lại quyết định driver/ORM/migration.

### 14.2 Ưu tiên P1 — MVP

- Auth: đăng ký, đăng nhập, xác minh email, quên mật khẩu, session.
- RBAC runtime và permission guard.
- Dashboard người dùng.
- CRUD sách/chương và upload file.
- Writing Studio.
- Xuất EPUB/PDF cơ bản.
- Reader.
- Tìm kiếm Meilisearch.
- Lưu trữ file với MinIO và presigned URL.
- Audit cho hành động admin.

### 14.3 Ưu tiên P2 — mở rộng

- Layout Studio.
- Cover Studio.
- Tool Library.
- Print nâng cao.
- Cộng đồng: follow, bình luận, đánh giá.
- Admin UI đầy đủ.
- Backup tự động, monitoring, alerting.

### 14.4 Quyết định cần chốt

| Quyết định | Lựa chọn | Ghi chú |
|---|---|---|
| Driver MariaDB | `mysql2` / `mariadb` | `mysql2` phổ biến, hỗ trợ promise; `mariadb` native connector |
| Query layer | SQL thuần / Kysely / Drizzle / Prisma | Cân nhắc hỗ trợ MariaDB và migration |
| Migration | SQL files hiện tại / công cụ | Đang dùng `NNN_*.sql` |
| Session store | Redis / MariaDB | Redis phù hợp TTL và thu hồi |
| API prefix | `/api/v1` / `/v1` | Nginx đang bỏ `/api/` |
| Test framework | `node:test` / Vitest / Jest | Root script đang dùng `node --test` |
| MinIO image | Pin tag / image chính thức | Tránh `latest` legacy |
| Worker integration user | `svc_integration` | Chưa tạo trong init |

---

## 15. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Container MariaDB lên nhưng không có bảng | Volume đã tồn tại từ trước, init không chạy lại | Chạy `install_all.sql` thủ công hoặc tạo lại volume |
| `ERROR 1142` khi đọc `v_public_announcements` | Thiếu `GRANT SELECT` trên `bookadmin.admin_announcements` | Cấp quyền như mục 5.4 |
| `Access denied for user 'app_bookuser'` | Sai mật khẩu trong `.env` hoặc user chưa được tạo | Kiểm tra env; `ALTER USER` hoặc tạo lại volume |
| `port is already allocated` | Cổng 3307 bị chiếm | Đổi `MARIADB_PORT` hoặc dừng process đang dùng |
| Không kết nối được từ host | MariaDB chỉ bind `127.0.0.1`; dùng sai port | Dùng `127.0.0.1:3307`, kiểm tra firewall |
| Container `unhealthy` | Init lỗi, quyền volume, hết dung lượng | Xem `docker compose logs mariadb`; kiểm tra disk |
| Lỗi charset khi restore | Thiếu `--default-character-set=utf8mb4` | Thêm flag khi dump/restore |
| Mật khẩu có `$` bị sai | Compose interpolate biến | Escape `$$` hoặc dùng secret file |
| Web không vào được | Container web lỗi hoặc Nginx sai upstream | `docker compose logs web`; `curl 127.0.0.1:3000` |
| API `/health` ok nhưng DB lỗi | Healthcheck không kiểm tra DB | Thêm readiness check |
| `mariadb-dump: not found` | Image/client không có binary | Dùng `mariadb-dump` trong container hoặc cài client |
| Restore lỗi vì database đã tồn tại | Dump có `CREATE DATABASE` | Dùng `--databases` đúng cách hoặc restore vào DB tạm |
| Admin không đọc được `bookuser` | Phân quyền tách schema | Dùng outbox/inbox hoặc user riêng có quyền phù hợp |
| Init script không chạy | File không executable hoặc volume không trống | `chmod +x`; xóa volume nếu chấp nhận mất dữ liệu |
| Dữ liệu sai múi giờ | Ứng dụng gửi local time | Luôn gửi UTC; kiểm tra `@@time_zone` |

---

## 16. Checklist vận hành và bàn giao

### 16.1 Trước khi deploy

- [x] `.env` tồn tại, mode `600`, và không nằm trong Git.
- [x] Đã đổi toàn bộ mật khẩu mặc định và rotate credential dịch vụ.
- [x] `docker compose config --quiet` không lỗi.
- [x] Có backup mới nhất của MariaDB (`pre-env-20261120T1955Z.sql.gz`).
- [ ] Đã kiểm tra dung lượng disk.
- [ ] Đã review thay đổi schema và migration.
- [ ] Đã chạy `install_all.sql`/migration trên môi trường staging nếu có.
- [x] Đã kiểm tra domain, DNS và chứng chỉ TLS.

### 16.2 Deploy

```bash
cd /var/www/BOOKFORFREEDOM
docker compose config --quiet
docker compose up -d --build --remove-orphans
docker compose ps
docker compose logs --tail=100 mariadb
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

Kiểm tra:

```bash
curl -fsS http://127.0.0.1:3001/health
curl -fsS http://127.0.0.1:3000 >/dev/null && echo "web ok"
curl -fsS https://freedombook.duckdns.org/health
```

### 16.3 Sau deploy

- [ ] MariaDB healthy.
- [ ] 63 bảng, 3 view, 88 FK.
- [ ] `app_bookuser` đọc được `v_public_announcements`.
- [ ] `app_bookadmin` đọc được `admin_roles`.
- [ ] API health trả `ok`.
- [ ] Web trả HTTP 200.
- [ ] Log không có `ERROR`/`FAIL` bất thường.
- [ ] Backup định kỳ đã bật.

### 16.4 Khi có sự cố

1. Không chạy `docker compose down -v`.
2. Kiểm tra `docker compose ps`, `logs`, dung lượng disk.
3. Kiểm tra kết nối DB bằng user ứng dụng.
4. Nếu schema lỗi: chạy verify, không xóa database.
5. Nếu cần rollback code: dùng image/commit trước đó.
6. Nếu cần rollback dữ liệu: restore backup vào database tạm trước, xác nhận rồi mới restore chính thức.
7. Ghi lại thời điểm, nguyên nhân, hành động và kết quả.

### 16.5 Bàn giao

- [ ] Tài liệu `NOTEPROJECT.md`, `README.md`, `database/docs/README.md`.
- [ ] `.env.example` đầy đủ, không chứa secret thật.
- [ ] Quyền truy cập server/domain được bàn giao an toàn.
- [ ] Quy trình backup/restore được diễn tập.
- [ ] Danh sách việc còn lại và quyết định mở được ghi nhận.

---

## 17. Tài liệu tham khảo

### 17.1 Tài liệu gốc trong repo

- [README.md](README.md)
- [Tổng quan dự án](docs/00-project-overview/README.md)
- [Lộ trình](docs/roadmap/roadmap.md)
- [ADR 0001 — pnpm monorepo](docs/adr/0001-monorepo-pnpm.md)
- [ADR 0002 — Document model JSON](docs/adr/0002-document-model-json.md)
- [Mục lục database](database/docs/README.md)
- [Cài đặt database](database/docs/installation.md)
- [Từ điển dữ liệu](database/docs/data_dictionary.md)
- [Quan hệ](database/docs/relationships.md)
- [Kiểu dữ liệu](database/docs/data_types.md)
- [Tích hợp hai schema](database/docs/cross_database_integration.md)
- [Hợp đồng API](database/docs/api_contract.md)
- [Bảo mật](database/docs/security.md)
- [PowerDesigner](database/docs/powerdesigner_guide.md)
- [Kiểm chứng](database/docs/verification_report.md)
- [Tổng kết database](database/docs/final_report.md)
- [Docker runbook](infra/docker/README.md)
- [Deploy](infra/deploy/README.md)
- [Backup/restore](infra/backup-scripts/README.md)
- [Nginx config](infra/deploy/nginx/freedombook.duckdns.org.conf)

### 17.2 Lệnh tham chiếu nhanh

```bash
# Trạng thái
docker compose ps
cd /var/www/BOOKFORFREEDOM && git status --short

# Health
curl -fsS http://127.0.0.1:3001/health
curl -I http://127.0.0.1:3000

# MariaDB
docker compose exec -T mariadb sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SELECT VERSION();"'

# Backup
docker compose exec -T mariadb sh -c \
  'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --databases bookuser bookadmin' \
  > bookfreedom-$(date +%F).sql

# Verify
docker compose exec -T mariadb sh -c \
  'cd /opt/bookfreedom/sql && mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < bookuser/007_verify.sql'
docker compose exec -T mariadb sh -c \
  'cd /opt/bookfreedom/sql && mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < bookadmin/007_verify.sql'
```

---

## 18. Nhật ký thay đổi của file này

| Ngày | Thay đổi |
|---|---|
| 2026-11-20 | Tạo `NOTEPROJECT.md`; ghi nhận trạng thái Giai đoạn 0, kiến trúc, Docker/MariaDB, 63 bảng/3 view/88 FK, kết quả kiểm chứng, việc còn lại và troubleshooting |
| 2026-11-20 | Ghi nhận hoàn tất chuyển PostgreSQL → MariaDB 10.11; volume PostgreSQL cũ vẫn tồn tại; `database/` và `infra/docker/mariadb/` chưa commit |
| 2026-11-20 | Tạo `.env` production 44 biến (mode `600`); rotate MariaDB/MinIO; bật Redis auth và Meilisearch production; thêm `NEXT_PUBLIC_API_URL` build-arg; verify 6/6 container, 63 bảng, web/API 200 |
| 2026-11-20 | Redesign toàn bộ giao diện web: design system Premium Library (màu, typography, component), Light/Dark Mode, responsive, animation; trang user, reader và admin shell; `next build` PASS |

### Mẫu cập nhật tiếp theo

```markdown
| YYYY-MM-DD | Mô tả ngắn thay đổi, file chính, kết quả kiểm chứng |
```

---

## 19. Quy ước duy trì file này

- Cập nhật `NOTEPROJECT.md` sau mỗi mốc lớn: migration, thay đổi schema, thêm service, đổi cổng, đổi quyền, deploy production.
- Giữ số liệu database đồng bộ với `database/docs/verification_report.md`.
- Không ghi mật khẩu, token, connection string thật hoặc dữ liệu cá nhân vào file.
- Ghi rõ “đã kiểm chứng” và “chưa kiểm chứng”; không trộn dự kiến với thực tế.
- Khi mâu thuẫn với tài liệu khác, ưu tiên:
  1. `database/sql/` và `docker-compose.yml` (thực thi).
  2. `database/docs/verification_report.md` (kết quả đo).
  3. `NOTEPROJECT.md` (tổng hợp).
  4. Tài liệu mô tả/dự kiến.

> **Trạng thái cuối:** Hạ tầng MariaDB, secret production và hai schema đã sẵn sàng; ứng dụng vẫn là scaffold. Bước tiếp theo hợp lý nhất là commit phần nền móng, triển khai lớp kết nối DB + readiness check, rồi làm auth/MVP.
