# CLOUDFLARE_BACKEND.md

> Kiến trúc Backend Cloudflare. **Trạng thái: IMPLEMENTED** — `apps/workers-api` là transport layer mỏng.

## Phân loại NestJS hiện tại

- Business logic (auth service, catalog queries, recovery key, session, storage, studio, admin) — **giữ nguyên trên VPS**.
- NestJS runtime phụ thuộc Node.js + MariaDB TCP + `mysql2` → **không chạy nguyên trạng trên Workers**.
- Workers API là **lớp transport mỏng**, gọi VPS Data Gateway qua HTTPS + HMAC signature; không mở kết nối DB trực tiếp.

## Đã triển khai thật

- `apps/workers-api/src/index.ts` — Cloudflare Workers fetch handler (rate limit + CORS + router).
- `apps/workers-api/src/router.ts` — route table map public path → gateway path, HMAC-sign + forward.
- `apps/workers-api/src/hmac.ts` — HMAC-SHA256 (Web Crypto), đồng bộ chữ ký với VPS (`gateway-sign.util.ts`).
- Test tương thích chữ ký: `apps/api/test/gateway-hmac.test.ts` (Node crypto == Web Crypto).

## Cách chạy

- Local typecheck: `./node_modules/.bin/tsc -p apps/workers-api/tsconfig.json --noEmit`.
- Deploy production cần tài khoản Cloudflare + `GATEWAY_HMAC_SECRET`/`VPS_GATEWAY_URL` (chưa deploy trong phiên này).

