# VPS_DEPLOYMENT.md

> Triển khai backend/data trên VPS (hiện tại đang chạy).

## Dịch vụ đang chạy (Docker Compose)

`web`, `api`, `mariadb`, `redis`, `minio`, `meilisearch` — tất cả Up; MariaDB/Redis/MinIO/Meili healthy.

## Deploy API

```bash
cd /var/www/BOOKFORFREEDOM
docker compose config --quiet
docker compose build api
docker compose up -d --no-deps api
curl -fsS https://freedombook.duckdns.org/api/health
```

## Nginx

- `/` → web:3000, `/api/` → api:3001, `/health` → api:3001.
- TLS Certbot; HTTP→HTTPS redirect.

## Giới hạn

- Không mở MariaDB/Redis public.
- Không dùng DB root trong app.
- Không chạy dev server production.
