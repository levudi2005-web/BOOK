# VPS_CLEANUP_PLAN.md

> Kế hoạch dọn dẹp SAU khi frontend chuyển Cloudflare thành công. **Không thực hiện trong nhiệm vụ này.**

1. Giữ backend API, Redis (nếu cần), MariaDB, MinIO/Meilisearch (nếu còn dùng).
2. Sau khi Cloudflare đã serve frontend ổn định (healthcheck + rollback):
   - Dừng container `bookforfreedom-web` (không xóa volume/image ngay).
3. Theo dõi RAM/CPU sau khi dừng web.
4. Xóa image/build cache cũ chỉ khi xác nhận không cần rollback về Docker web.
5. Không chạy `docker system prune -a`, không `docker volume prune`.

## Mục tiêu tiết kiệm tài nguyên

- Web container hiện dùng ~10 MiB (nhỏ); phần lớn RAM là MinIO (~188 MiB) và hệ thống.
- Di trú web lên Cloudflare giúp giảm tải build/SSR trên VPS, nhưng tiết kiệm RAM không lớn bằng việc xem xét MinIO/office processing.
