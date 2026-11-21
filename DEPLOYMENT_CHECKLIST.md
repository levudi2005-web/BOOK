# DEPLOYMENT_CHECKLIST.md

- [ ] Không có secret trong Git (`.env` ignored).
- [ ] `docker compose config --quiet` PASS.
- [ ] `@bff/api` typecheck + build PASS.
- [ ] `@bff/web` typecheck + build PASS.
- [ ] `git diff --check` PASS.
- [ ] Backup MariaDB trước migration.
- [ ] Migration có rollback.
- [ ] CORS_ORIGINS đúng frontend origin.
- [ ] `NEXT_PUBLIC_API_URL` trỏ VPS API HTTPS.
- [ ] Health check API: `database: up`.
- [ ] Frontend gọi API thành công (origin khác).
- [ ] Authentication hoạt động qua CORS.
- [ ] Admin không đọc được User credentials (grants).
- [ ] Cloudflare build/preview (khi migrate).
- [ ] Không chạy dev server trong production.
