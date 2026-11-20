# BOOKFORFREEDOM

BOOKFORFREEDOM là nền tảng viết, thiết kế bìa, dàn trang, xuất bản và đọc sách. Repository này chỉ dựng khung monorepo pnpm; chưa triển khai nghiệp vụ hoặc giao diện sản phẩm.

## Yêu cầu

- Node.js 20 trở lên
- pnpm 9 trở lên
- Docker có plugin Compose

## Bắt đầu

```sh
cp .env.example .env
pnpm install
docker compose up -d
pnpm dev
```

Trang web placeholder chạy tại http://localhost:3000; endpoint API là http://localhost:3001/health. Dùng `pnpm typecheck`, `pnpm lint`, `pnpm test` và `pnpm build` để kiểm tra workspace.

## Triển khai

Domain: https://freedombook.duckdns.org; endpoint kiểm tra API: https://freedombook.duckdns.org/health. Dịch vụ được chạy bằng `docker compose up -d --build`, sau Nginx reverse proxy. Xem cấu hình và ghi chú TLS trong `infra/deploy/nginx/`.
