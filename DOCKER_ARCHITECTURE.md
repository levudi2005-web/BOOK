# DOCKER_ARCHITECTURE.md

> Kiến trúc Docker hiện tại + mục tiêu. Cập nhật 2026-11-20.

## Hiện tại (đang chạy)

| Service | Image | Ghi chú |
|---|---|---|
| mariadb | `mariadb:10.11` | 127.0.0.1:3307→3306, volume `mariadb_data` |
| redis | `redis:7-alpine` | 127.0.0.1:6379, `requirepass` |
| minio | `bitnamilegacy/minio:latest` | 127.0.0.1:9000–9001 |
| meilisearch | `getmeili/meilisearch:v1.12` | production mode, master key |
| api | build `apps/api/Dockerfile` | NestJS, nối MariaDB qua `mysql2` |
| web | build `apps/web/Dockerfile` | Next.js standalone |

## Lưu ý quan trọng

- **Không dùng Docker volume cho file cá nhân.** SQL Storage sẽ nằm trong MariaDB.
- MariaDB đang chạy trong Docker (vì hệ thống hiện có). Host MariaDB `10.11.14` đang chạy trên 3306 là mục tiêu di trú nhưng **chưa thực hiện** để tránh rủi ro.
- Ứng dụng kết nối MariaDB qua service account quyền tối thiểu, không dùng root.

## Còn thiếu (mục tiêu)

- `worker` — xử lý upload completion, checksum, export/import PDF/EPUB/DOCX, outbox/inbox, notification, reconcile quota, cleanup temp.
- `scheduler` — cron: giải phóng reservation hết hạn, kiểm tra quota, failed jobs, cảnh báo, đối soát metadata ↔ chunks.
- Monitoring service (container status, CPU/RAM, restart, queue backlog).

## Yêu cầu cho từng service mới

Production build, healthcheck, `restart: unless-stopped`, non-root user, log rotation, env từ `.env`.
