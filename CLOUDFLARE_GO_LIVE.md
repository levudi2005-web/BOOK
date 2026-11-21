# CLOUDFLARE_GO_LIVE.md

> Quy trình go-live frontend Cloudflare (CHƯA THỰC HIỆN — chưa kết nối tài khoản).

1. Cài `@opennextjs/cloudflare` + `wrangler`.
2. Build `opennextjs-cloudflare build`; preview `wrangler dev`.
3. Test SSR/client nav/API calls/cookies/CORS.
4. Tạo `wrangler.toml` với `NEXT_PUBLIC_API_URL` (không secret).
5. Cấu hình CORS_ORIGINS backend thêm origin Cloudflare.
6. Deploy staging trước (`wrangler deploy --env staging`).
7. Test auth + upload/download + reader.
8. Deploy production; cập nhật DNS (chỉ khi có tài khoản + nameserver đã xác nhận).
9. Giữ Docker web trên VPS làm rollback tạm thời.

> Không đổi nameserver/DNS production khi chưa có tài khoản Cloudflare.
