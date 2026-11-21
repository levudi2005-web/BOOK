# WORKER_SCHEDULER.md

> Trạng thái Worker/Scheduler: **IMPLEMENTED** — `apps/worker` BullMQ worker + repeatable jobs.

## Đã triển khai

- `apps/worker/src/index.ts` — queue `bff-maintenance` + Worker (concurrency 1) + repeatable jobs.
- `apps/worker/src/jobs.ts` — handlers: `storage.cleanup-expired-sessions`, `storage.reconcile-quota`, `search.reindex`.
- `apps/worker/src/gateway-client.ts` — HMAC sign + gọi VPS gateway (service-to-service).
- Smoke test: worker `callGateway('GET','/gateway/health')` → 200 với gateway production thật.

## Lịch

- cleanup expired upload sessions: 15 phút.
- reconcile quota: 60 phút.
- reindex search: 30 phút.

## Phân chia Cloudflare vs VPS

- Tác vụ cần Node.js/CPU/RAM (LibreOffice conversion, xử lý file lớn) → **VPS Worker**.
- Không chuyển tác vụ nặng lên Workers.

