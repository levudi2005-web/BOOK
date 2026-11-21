# API Application

API nền trên NestJS và TypeScript; hiện chỉ có endpoint kiểm tra sức khỏe `/health`.
Cấu hình dữ liệu đọc từ `BOOKUSER_DB_*` và `BOOKADMIN_DB_*` (MariaDB 10.11); xem `.env.example` và `database/docs/installation.md`.
Dự kiến nền móng Giai đoạn 0, chức năng Giai đoạn 1; phụ thuộc các package dùng chung trong `packages/`.
