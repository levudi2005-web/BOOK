# RESOURCE_AUDIT.md

> Đo tài nguyên VPS thực tế (2026-11-20) trước khi quyết định triển khai Office Server.

## Kết quả đo

| Tài nguyên | Thực tế | Mức cần cho dịch vụ | Đánh giá |
|---|---|---|---|
| Tổng RAM | 3915 MB (3.9 GB) | Collabora/ONLYOFFICE thường cần 2–4 GB+ riêng | Đủ tổng, nhưng không đủ dư |
| Available RAM (idle) | ~480 MB | — | **Thấp** |
| Swap | 4095 MB (2.9 GB used, 1.1 GB free) | — | Đang dùng nhiều |
| Disk total | 54 GB | — | OK |
| Disk free | 29 GB (45% used) | — | OK |
| vCPU | 4 | — | OK |
| Load average | 3.63 / 2.26 / 1.98 | — | Trung bình–cao |
| MariaDB datadir | 224 MB | — | OK |
| max_allowed_packet | 16 MiB | chunk ≤ 1–4 MiB | OK cho chunk |
| innodb_buffer_pool_size | 128 MiB | — | Hạn chế với BLOB lớn |
| Docker images | 2.47 GB | — | OK |
| Docker build cache | 9.06 GB (8.6 GB reclaimable) | — | Chiếm chỗ (không prune khi chưa duyệt) |

## Container memory (docker stats)

| Container | Mem usage |
|---|---|
| minio | 188.6 MiB |
| api | 35.8 MiB |
| web | 10.3 MiB |
| mariadb | 24.3 MiB |
| redis | 4.1 MiB |
| meilisearch | 3.7 MiB |

## Quyết định: TRƯỜNG HỢP B — Không cài Office Server nặng

Available RAM chỉ ~480 MB → **không cài Collabora/ONLYOFFICE production** trong tình trạng hiện tại (rủi ro OOM).

Hành động theo Trường hợp B:

1. Không cài Collabora/ONLYOFFICE.
2. Hoàn thiện **Tiptap Writer** (open-source) trước.
3. Hoàn thiện **LibreOffice headless worker** với `concurrency=1`, giới hạn RAM/timeout, xóa temp sau xử lý.
4. Hoàn thiện DOCX import/export + PDF export, PDF.js viewer, EPUB reader, Cover Designer.
5. Giữ Office Server là module optional để chuyển sang VPS mạnh hơn sau.

## Ghi chú an toàn

- Không chạy `docker system prune -a` khi chưa được duyệt (build cache đang chiếm 8.6 GB, chỉ dọn khi có kế hoạch).
- Trước khi mở SQL Storage 400 MiB/người, cần benchmark upload 1/10/50 MB và theo dõi datadir/disk.
