# GITHUB_WORKFLOW.md

> Đề xuất CI/CD (không chứa secret, không push tự động production).

## Frontend (Cloudflare Workers)

- Push nhánh → build frontend → chạy test → `wrangler deploy` (chỉ khi có secret trong GitHub Actions).
- Không để `NEXT_PUBLIC_API_URL` sai môi trường.

## Backend (VPS)

- Không để Cloudflare deploy backend.
- Pipeline VPS: pull code → `pnpm install` → typecheck/build → `docker compose build api` → `up -d` (có healthcheck + rollback).

## Secret

- Dùng GitHub Secrets cho môi trường staging/production; không commit `.env`.

## Ví dụ cấu trúc (chỉ tham khảo)

```yaml
# .github/workflows/frontend.yml (chưa tạo thật)
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @bff/web typecheck
      - run: pnpm --filter @bff/web build
```
