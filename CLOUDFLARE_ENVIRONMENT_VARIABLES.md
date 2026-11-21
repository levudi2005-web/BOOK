# CLOUDFLARE_ENVIRONMENT_VARIABLES.md

> Biến môi trường cho Frontend/Workers (Cloudflare) và Backend/VPS.

## Frontend Workers (`NEXT_PUBLIC_*` — không chứa secret)

| Biến | Ví dụ |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://freedombook.duckdns.org/api` |
| `NEXT_PUBLIC_APP_URL` | `https://freedombook.duckdns.org` |

## VPS Backend (server-only)

`GATEWAY_HMAC_SECRET`, `TOKEN_HMAC_SECRET`, `RECOVERY_KEY_HMAC_SECRET`, `CORS_ORIGINS`, DB/Redis/MinIO/Meili secrets.

## Quy tắc

- Cloudflare `vars`/`.dev.vars` chỉ chứa `NEXT_PUBLIC_*`.
- Secret backend nằm trong `.env` VPS + Wrangler secrets khi cần (không commit).
