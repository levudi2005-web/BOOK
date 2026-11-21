# ROLLBACK_GUIDE.md

> Quy trình rollback cho từng phần.

## Frontend (Cloudflare)

1. `wrangler rollback` (về version trước).
2. Hoặc deploy lại version artifact cũ bằng `wrangler deploy`.

## Backend (VPS)

```bash
cd /var/www/BOOKFORFREEDOM
# quay lại image cũ nếu đã giữ tag/commit
docker compose build api
docker compose up -d --no-deps api
# kiểm tra
curl -fsS https://freedombook.duckdns.org/api/health
```

## Database migration

1. Trước migration: backup.
2. Rollback: chạy file rollback tương ứng (nếu có), hoặc restore dump trước migration.
3. Không `DROP DATABASE`; không `down -v`.

## Nguyên tắc chung

- Luôn backup trước khi thay đổi.
- Không xóa volume cũ trước khi xác minh cutover.
- Không push/purge khi chưa kiểm tra.
