# CLOUDFLARE_DEPLOYMENT.md

> Quy trình deploy Frontend Next.js lên Cloudflare Workers.
> Production Worker là `bookforfreedom-web`; staging dùng Worker độc lập
> `bookforfreedom-web-staging` và workers.dev, không gắn domain/routing.

## Bước (khi có tài khoản)

1. Cài dependency:
   ```bash
   pnpm --filter @bff/web add @opennextjs/cloudflare
   pnpm --filter @bff/web add -D wrangler
   ```
2. Tạo `apps/web/wrangler.toml` (placeholder, không chứa secret):
   ```toml
   name = "bookforfreedom-web"
   main = ".open-next/worker.js"
   compatibility_date = "2026-11-20"
   [vars]
   NEXT_PUBLIC_API_URL = "https://freedombook.duckdns.org/api"
   ```
3. Thêm script build Cloudflare vào `apps/web/package.json`:
   ```json
   "build:cloudflare": "opennextjs-cloudflare build"
   ```
4. Build artifact:
   ```bash
   pnpm --filter @bff/web build:cloudflare
   ```
5. Preview local:
   ```bash
   cd apps/web && wrangler dev
   ```
6. Staging build và deploy (không dùng script `deploy` vì script đó nhắm Production):
   ```bash
   NEXT_PUBLIC_API_URL=https://freedombook.duckdns.org/api \
   NEXT_PUBLIC_APP_URL=https://bookforfreedom-web-staging.levudi2005.workers.dev \
     pnpm --filter @bff/web run build:cloudflare
   pnpm --filter @bff/web exec wrangler deploy --config wrangler.staging.jsonc --dry-run
   pnpm --filter @bff/web run deploy:staging
   ```

## Lưu ý

- `NEXT_PUBLIC_API_URL` trỏ về VPS API HTTPS (backend vẫn trên VPS).
- `wrangler.staging.jsonc` giữ tên Worker, workers.dev và self-reference riêng
  cho staging; không thêm routes hoặc custom domains.
- Chỉ deploy staging bằng `deploy:staging`; `deploy` không được dùng trong quy trình staging.
- Không để secret trong `NEXT_PUBLIC_*`.
- Frontend origin phải được thêm vào `CORS_ORIGINS` của backend.
