# DEPLOYMENT_GUIDE.md

> Hướng dẫn triển khai BOOKFORFREEDOM trên VPS.

## Hiện trạng live

- Domain: `https://freedombook.duckdns.org` (DuckDNS + Certbot TLS).
- Nginx reverse proxy: `/` → web:3000, `/api/` → api:3001, `/health` → api:3001.
- Docker Compose chạy 6 service; API/web đã production build.

## Các lệnh chính

```bash
cd /var/www/BOOKFORFREEDOM

# Kiểm tra cấu hình + build
docker compose config --quiet
docker compose build api web

# Deploy (không xóa volume)
docker compose up -d --remove-orphans

# Kiểm tra
docker compose ps
curl -fsS https://freedombook.duckdns.org/api/health
curl -fsS https://freedombook.duckdns.org/ -o /dev/null -w '%{http_code}\n'
```

## Backup

```bash
docker compose exec -T mariadb sh -c \
  'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb-dump -uroot --single-transaction --routines --events --databases bookuser bookadmin' \
  | gzip -9 > /var/backups/bookforfreedom/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

## Nguyên tắc an toàn

- Không `docker compose down -v` (xóa volume).
- Không `docker system prune -a`.
- Không mở MariaDB 3306/3307 ra Internet.
- Không đưa `.env` lên Git.
- Không chạy dev server trong production.

## DNS/HTTPS

DuckDNS đang hoạt động; chứng chỉ tự gia hạn. Nếu đổi domain thật, cần cập nhật:
- `APP_URL`, `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` trong `.env`.
- Nginx `server_name` và Certbot.
