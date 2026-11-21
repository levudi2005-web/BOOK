# CLOUDFLARE_FRONTEND.md

> Frontend Next.js trên Cloudflare Workers bằng OpenNext. **Đã build + preview local thành công.**

## Đã cài (apps/web devDependencies)

- `@opennextjs/cloudflare@1.20.18`
- `wrangler@4.166.0`
- `rclone.js@0.6.6`

## File cấu hình

- `apps/web/open-next.config.ts` — `defineCloudflareConfig({})`.
- `apps/web/wrangler.jsonc` — `main = .open-next/worker.js`, assets binding `ASSETS`, vars `NEXT_PUBLIC_*`.
- `apps/web/.dev.vars.example`, `apps/web/.env.local` (build-time, gitignored).

## Scripts (apps/web/package.json)

- `build:cloudflare` → `opennextjs-cloudflare build`.
- `preview` → `wrangler dev`.
- `deploy` → `wrangler deploy` (chưa chạy).

## Kết quả kiểm chứng

- `pnpm --filter @bff/web build:cloudflare` → PASS (`Worker saved in .open-next/worker.js`).
- `wrangler dev --port 8787` → PASS, 12 route chính trả 200 (`/`, `/discover`, `/categories`, `/search`, `/library`, `/community`, `/profile`, `/auth/login`, `/auth/register`, `/admin`, `/books/demo`, `/reader/demo`).
