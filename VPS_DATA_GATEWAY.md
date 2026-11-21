# VPS_DATA_GATEWAY.md

> Data Gateway bảo mật trên VPS (NestJS hiện tại). **Đã triển khai + kiểm thử.**

## Cơ chế service-to-service

- Header: `X-Gateway-Timestamp`, `X-Gateway-Nonce`, `X-Gateway-Signature`.
- Signature = `HMAC-SHA256(GATEWAY_HMAC_SECRET, "{timestamp}.{nonce}.{METHOD}.{path}")` (hex).
- Chống replay: timestamp trong 300s + nonce không tái sử dụng.
- Constant-time compare (`crypto.timingSafeEqual`).

## Endpoints (đều yêu cầu signature)

- `GET /gateway/health`
- `GET /gateway/books`, `/books/:slug`, `/categories`, `/authors`, `/publishers`
- `POST /gateway/auth/register|login|logout|reset-password|change-password|security-key/rotate`
- `POST /gateway/internal/storage/cleanup`, `/storage/reconcile`, `/search/reindex` (service-to-service)

## Kết quả kiểm thử

| Trường hợp | Kết quả |
|---|---|
| Thiếu headers | 401 |
| Signature sai | 401 |
| Timestamp quá hạn | 401 |
| Signature hợp lệ | 200 |
| Replay cùng nonce | 401 |

## Lưu ý

- `GATEWAY_HMAC_SECRET` server-only; không expose MariaDB/Redis public.
- Body limit 8mb cho chunk upload; audit truy cập gateway còn thiếu.

