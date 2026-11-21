# PRODUCTION_READINESS.md

> Trạng thái sẵn sàng. Chỉ READY TO MIGRATE khi mọi mục READY.

| Hạng mục | Trạng thái |
|---|---|
| Frontend build | READY |
| Backend build/deploy VPS | READY |
| API gọi từ origin khác (CORS) | READY (allowlist env) |
| Authentication (register/login/logout/session/Recovery Key) | READY (user) |
| Rate limiting + security headers | READY (user auth) |
| Admin auth + DB isolation grants | BLOCKED (chưa tách service accounts/verify grants) |
| SQL Storage 400 MiB | BLOCKED (chưa có bảng/logic) |
| Author Studio | BLOCKED (chưa có) |
| Office Workspace (Writer/Calc/Impress/Draw) | BLOCKED (RAM; hướng nhẹ) |
| Worker/Scheduler/Notifications/Alerts | BLOCKED (chưa có) |
| Cloudflare Workers build/preview | BLOCKED (chưa cài adapter; chưa kết nối tài khoản) |

## Kết luận

- **Chưa đạt READY TO MIGRATE** cho toàn hệ thống.
- Các phần đã sẵn sàng (frontend/backend/auth/CORS) có thể migrate frontend trước sau khi cài OpenNext + Wrangler và test preview.
