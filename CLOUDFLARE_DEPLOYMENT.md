# CLOUDFLARE_DEPLOYMENT.md

> Quy trình chuẩn bị deploy Frontend Next.js lên Cloudflare Workers.
> **Chưa kết nối tài khoản Cloudflare, chưa đổi nameserver, chưa deploy production.**

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
6. Deploy:
   ```bash
   cd apps/web && wrangler deploy
   ```

## Lưu ý

- `NEXT_PUBLIC_API_URL` trỏ về VPS API HTTPS (backend vẫn trên VPS).
- Không để secret trong `NEXT_PUBLIC_*`.
- Frontend origin phải được thêm vào `CORS_ORIGINS` của backend.
