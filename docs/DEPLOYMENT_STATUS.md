# Deployment status — 2026-11-23

## Canonical domain

- Front door: **https://freedombook.duckdns.org**
- API: **https://freedombook.duckdns.org/api**
- TLS: Certbot certificate on VPS Nginx, auto-renew.
- Nginx proxies `/` to `127.0.0.1:3000` (VPS web container); `/api/` to `127.0.0.1:3001`.
- Cloudflare Worker fallback: `https://bookforfreedom-web.levudi2005.workers.dev`
- Staging Worker: `https://bookforfreedom-web-staging.levudi2005.workers.dev`
- Staging API: `https://freedombook.duckdns.org/staging-api`

## VPS services

- `bookforfreedom-web-1` — Next.js standalone, port `127.0.0.1:3000`
- `bookforfreedom-api-1` — NestJS, port `127.0.0.1:3001`
- `bookforfreedom-mariadb-1` — MariaDB 10.11, port `127.0.0.1:3307`
- `bookforfreedom-meilisearch-1` — Meilisearch, port `127.0.0.1:7700`
- staging stack: `bff-staging-*` (isolated DB/Meili/API)

## Database migrations applied

- `015_category_groups_64.sql` — 8 groups + 64 categories
- `016_age_rating.sql` — book age rating
- `017_book_layout_reading_feedback.sql` — page size/style/effect, reading seconds, user feedback

## Deploy commands

```bash
# Cloudflare production
cd /var/www/BOOKFORFREEDOM
pnpm --filter @bff/web build:cloudflare
pnpm --filter @bff/web exec wrangler deploy --config wrangler.jsonc

# Cloudflare staging
pnpm --filter @bff/web build:cloudflare:staging
pnpm --filter @bff/web exec wrangler deploy --config wrangler.staging.jsonc

# VPS web + API
docker compose config --quiet
docker compose build web api
docker compose up -d --no-deps web api
nginx -t && systemctl reload nginx

# Staging API
docker build -f apps/api/Dockerfile -t bookforfreedom-api:staging .
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate --no-deps api-staging
```

## Verification checklist

- `https://freedombook.duckdns.org/` → 200, no redirect to workers.dev.
- `https://freedombook.duckdns.org/api/health` → `{"status":"ok","database":"up"}`.
- Homepage: 8 category group cards.
- `/categories`: 8 accordion groups.
- Admin login + `/admin/categories`, `/admin/feedback`, `/admin/stats` → 200.
- Cloudflare production/staging workers → 200 and load 8 category groups.
- `pnpm typecheck`, lint, API tests, web tests, build — pass.
