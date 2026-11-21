# VPS_BACKEND_DEPLOYMENT.md

> Backend NestJS tiếp tục chạy trên VPS; frontend (Cloudflare) gọi API qua HTTPS.

## Hiện trạng (đang chạy)

- Nginx: `/` → web:3000, `/api/` → api:3001, `/health` → api:3001.
- API Docker image: `bookforfreedom-api` (NestJS 11 + mysql2).
- HTTPS qua Certbot; HTTP→HTTPS redirect.

## Triển khai backend (VPS)

```bash
cd /var/www/BOOKFORFREEDOM
docker compose config --quiet
docker compose build api
docker compose up -d --no-deps api
curl -fsS https://freedombook.duckdns.org/api/health
```

## CORS

- `CORS_ORIGINS` (comma-separated) trong `.env` là allowlist frontend origins.
- Khi frontend lên Cloudflare, thêm origin Cloudflare vào `CORS_ORIGINS` rồi recreate API.

## Bảo mật

- MariaDB/Redis chỉ bind localhost, không mở public.
- Không dùng DB root trong app; service account quyền tối thiểu.
- Bearer session token (opaque, hash), không phụ thuộc cookie server.
