# ENVIRONMENT_VARIABLES.md

> Danh mục biến môi trường. Giá trị thật nằm trong `.env` (mode 600, không commit).

## Server-only (backend, KHÔNG để trong NEXT_PUBLIC)

| Biến | Mục đích |
|---|---|
| `MARIADB_ROOT_PASSWORD` | quản trị/backup DB |
| `BOOKUSER_DB_*` | kết nối bookuser |
| `BOOKADMIN_DB_*` | kết nối bookadmin |
| `REDIS_PASSWORD` | Redis auth |
| `MINIO_ROOT_USER/PASSWORD` | MinIO |
| `MEILI_MASTER_KEY` | Meilisearch |
| `SESSION_SECRET` | (dự phòng) |
| `TOKEN_HMAC_SECRET` | HMAC Security Token |
| `RECOVERY_KEY_HMAC_SECRET` | HMAC Recovery Key |
| `CORS_ORIGINS` | allowlist frontend origins |
| `SMTP_*` | email tùy chọn |

## Public (client, có thể lộ, KHÔNG chứa secret)

| Biến | Mục đích |
|---|---|
| `NEXT_PUBLIC_API_URL` | base URL API (HTTPS VPS) |
| `NEXT_PUBLIC_APP_URL` | URL app (metadata) |

## Quy tắc

- Không đưa bất kỳ password/key/token vào `NEXT_PUBLIC_*`.
- Cloudflare: `NEXT_PUBLIC_*` đặt trong `wrangler.toml [vars]`; secret backend KHÔNG đưa lên Cloudflare.
