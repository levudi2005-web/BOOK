# CLOUDFLARE_LOCAL_TESTING.md

> Kiểm thử local Workers runtime (không cần tài khoản Cloudflare).

## Lệnh

```bash
cd /var/www/BOOKFORFREEDOM/apps/web
pnpm build:cloudflare      # OpenNext build -> .open-next/
pnpm preview               # wrangler dev (mặc định port 8787)
# hoặc
./node_modules/.bin/wrangler dev --port 8787 --ip 127.0.0.1
```

## Kết quả (đã chạy)

- Ready on `http://127.0.0.1:8787`.
- 12 route chính trả 200 (Home, Discover, Categories, Search, Library, Community, Profile, Auth, Admin, Book detail, Reader).
- Title trang chủ: `BOOKFORFREEDOM`.

## Dừng preview

```bash
pkill -f 'wrangler dev'; pkill -f workerd
```
