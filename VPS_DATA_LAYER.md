# VPS_DATA_LAYER.md

> Kiến trúc VPS trở thành tầng dữ liệu (sau khi frontend/backend chuyển Cloudflare).

## VPS giữ

- MariaDB (schema `bookuser` + `bookadmin`, kho file cá nhân SQL Storage).
- Redis (nếu BullMQ/cache cần).
- MinIO (nếu còn dùng cho object tạm; kho chính thức vẫn là SQL).
- Meilisearch (search).
- Worker/Scheduler (BullMQ, xử lý chuyển đổi tài liệu, quota reconciliation).

## Kết nối Cloudflare → VPS (dự kiến)

- **Cloudflare Tunnel** (ưu tiên, không mở cổng public) để service-to-service.
- Hoặc HTTPS + request signing (HMAC + timestamp chống replay) nếu dùng IP public.
- Không public: MariaDB 3306, Redis 6379, Docker daemon, cổng quản trị.

## Data Gateway (nếu cần)

- API tối thiểu, không cho SQL tùy ý.
- Xác thực từng request + audit + giới hạn tải.

## Lưu ý hiện tại

- MariaDB đang chạy trong Docker (mariadb:10.11, volume `bookforfreedom_mariadb_data`).
- Còn host MariaDB 10.11.14 trên 3306 (chưa dùng cho app) — di trú cần kế hoạch riêng.
