# API_MAPPING.md

> Ánh xạ API hiện có → runtime mục tiêu (Cloudflare vs VPS). Đã triển khai.

| Endpoint (public) | Cloudflare Workers | VPS Data Gateway |
|---|---|---|
| `GET /books`, `/books/:slug`, `/categories`, `/authors`, `/publishers` | forward HMAC | `GET /gateway/...` (read-only) |
| `POST /auth/register|login|logout|reset-password|change-password|security-key/rotate` | forward HMAC | `POST /gateway/auth/*` |
| `POST /gateway/internal/storage/cleanup|reconcile`, `/search/reindex` | — (worker gọi thẳng) | HMAC-only |
| `GET /search` | forward HMAC (đánh giá) | `SearchService` (Meilisearch) |

## Nguyên tắc mapping

- Business logic NestJS giữ nguyên trên VPS; Workers chỉ transport + HMAC sign.
- Auth/DB private logic ở VPS; không để DB driver chạy trên Workers.
- Không tạo hai hệ nghiệp vụ độc lập.

