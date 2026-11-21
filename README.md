# BOOKFORFREEDOM

BOOKFORFREEDOM là nền tảng viết, thiết kế bìa, dàn trang, xuất bản và đọc sách. Repository này chỉ dựng khung monorepo pnpm; chưa triển khai nghiệp vụ hoặc giao diện sản phẩm.

## Yêu cầu

- Node.js 20 trở lên
- pnpm 9 trở lên
- Docker có plugin Compose

## Bắt đầu

```sh
cp .env.example .env
# Thay toàn bộ placeholder bằng secret thật, rồi:
chmod 600 .env
pnpm install
docker compose up -d
pnpm dev
```

Dịch vụ dữ liệu dùng **MariaDB 10.11** (`mariadb`) thay cho PostgreSQL. Lần đầu khởi động với volume trống, container tự chạy `database/sql/install_all.sql` để tạo hai schema `bookuser`, `bookadmin` và hai user ứng dụng quyền tối thiểu. MariaDB được công bố tại `127.0.0.1:3307` để không đụng MariaDB hệ thống ở cổng 3306; API trong Compose kết nối nội bộ `mariadb:3306`.

Trang web placeholder chạy tại http://localhost:3000; endpoint API là http://localhost:3001/health. Dùng `pnpm typecheck`, `pnpm lint`, `pnpm test` và `pnpm build` để kiểm tra workspace.

## Triển khai

Domain: https://freedombook.duckdns.org; endpoint kiểm tra API: https://freedombook.duckdns.org/health. Dịch vụ được chạy bằng `docker compose up -d --build`, sau Nginx reverse proxy. Xem cấu hình và ghi chú TLS trong `infra/deploy/nginx/`.

Production dùng `.env` tại thư mục gốc (mode `600`, không commit). Không chép placeholder từ `.env.example` lên VPS; xem `NOTEPROJECT.md` §7 và `infra/deploy/README.md`.
