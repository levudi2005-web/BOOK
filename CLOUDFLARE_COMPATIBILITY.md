# CLOUDFLARE_COMPATIBILITY.md

> Đánh giá tương thích Next.js 15.5.29 + React 19 với Cloudflare Workers.

## Kết luận

- Dùng **OpenNext Cloudflare Adapter** (`@opennextjs/cloudflare`). **Chưa cài** trong repo (cần cài khi bắt đầu migrate).
- Không dùng `next start`/Node runtime trên Workers. Không chuyển sang static export (mất SSR/route handlers).

## Cần kiểm tra trước khi migrate

1. Cài `@opennextjs/cloudflare` + `wrangler` với version tương thích Next 15.5.
2. Tạo `open-next.config.ts` (nếu cần tuỳ biến) và `wrangler.toml` (chỉ placeholder, không secret).
3. Build: `opennextjs-cloudflare build` → artifact `.open-next/` → `wrangler deploy`.
4. Preview local: `wrangler dev`.
5. Kiểm tra SSR, client navigation, route handlers, middleware/proxy.
6. Image optimization: Workers không có Next Image Optimization server; dùng Cloudflare Images hoặc tắt `next/image` (hiện dự án chưa dùng `next/image`).
7. Node.js APIs (`crypto`, `fs`, `child_process`) không chạy trên Workers; phải tránh trong route handlers/SSR.
8. Env: `NEXT_PUBLIC_*` chỉ cho client (không chứa secret); secret dùng Wrangler secrets/`.dev.vars`.
9. Cookie/session: authentication dùng Bearer token (không phụ thuộc cookie server) nên tương thích; nếu dùng cookie thì phải xử lý trên Workers runtime.

## Rủi ro

- Version adapter phải khớp Next; kiểm tra matrix của OpenNext.
- Không mặc định mọi Next API chạy trên Workers — phải test từng route.
