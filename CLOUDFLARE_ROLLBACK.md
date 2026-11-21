# CLOUDFLARE_ROLLBACK.md

> Rollback frontend Cloudflare (chỉ dùng khi đã migrate; hiện chưa deploy).

1. `wrangler rollback` — quay về version trước (nhanh).
2. Hoặc deploy lại artifact cũ: `wrangler deploy --env production` với build đã giữ.
3. Nếu lỗi DNS: cập nhật lại bản ghi về DuckDNS/VPS cũ.
4. Không xóa Docker web trên VPS cho tới khi Cloudflare ổn định và có xác nhận.

## Backend VPS rollback

Xem `ROLLBACK_GUIDE.md`. Tóm tắt: rebuild image API cũ → `up -d --no-deps api` → healthcheck.
