# Deployment

Cấu hình Nginx cho `freedombook.duckdns.org` nằm trong `nginx/`; ứng dụng chạy bằng Docker Compose.
Database là MariaDB 10.11 trong Compose (`mariadb`), dữ liệu ở volume `mariadb_data`; backup trước khi nâng cấp/redeploy.
TLS được cấp và tự gia hạn bằng Certbot; cần đặt email liên hệ của chủ domain để nhận thông báo hết hạn.
Giai đoạn 0; phụ thuộc Docker Compose, Nginx và Certbot.

## Môi trường production

- `.env` nằm tại thư mục gốc repo, quyền `600`, thuộc `root`, **không commit**.
- Không dùng placeholder `replace-this-*` từ `.env.example` trên VPS.
- Trước khi redeploy: `docker compose config --quiet` và backup DB.
- Recreate bằng `docker compose up -d --remove-orphans`; không dùng `down -v` vì xóa volume.
- Đổi mật khẩu DB phải chạy `ALTER USER` tương ứng, không chỉ sửa `.env`.
- Chi tiết biến và quy trình rotate: `NOTEPROJECT.md` §7.
