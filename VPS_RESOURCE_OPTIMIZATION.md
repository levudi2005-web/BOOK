# VPS_RESOURCE_OPTIMIZATION.md

> Số liệu đo lại 2026-11-20.

## Tài nguyên hiện tại

| Hạng mục | Giá trị |
|---|---|
| RAM total | 3.8 GiB |
| RAM available | 940 MiB |
| Swap | 4 GiB (2.6 used) |
| vCPU | 4 |
| Load avg | 0.33 |
| Disk | 54 GB, 28 GB free (47%) |

## Container memory

| Container | Mem |
|---|---|
| minio | 194 MiB |
| api | 37 MiB |
| web | 14.5 MiB |
| mariadb | 13.6 MiB |
| meilisearch | 9 MiB |
| redis | 4.4 MiB |

## Volume/Disk

- Volumes: `mariadb_data`, `minio_data`, `meilisearch_data`, `redis_data`, `postgres_data` (legacy), + 3 anonymous volumes cũ.
- **Không xóa** volume/database khi chưa xác minh.

## Khuyến nghị (chỉ thực hiện khi có xác nhận)

1. Sau khi frontend lên Cloudflare: dừng container `web` (không xóa volume/image).
2. Xem xét MinIO (194 MiB) nếu không còn dùng object tạm.
3. Dọn build cache (đã có ~8.6 GB reclaimable) sau khi xác nhận không cần rollback.
4. Không `docker system prune -a`, không `docker volume prune`.
