# STORAGE_ARCHITECTURE.md — SQL Cloud Storage

> Thiết kế lưu trữ file cá nhân trong MariaDB (yêu cầu cố định). **Trạng thái: IMPLEMENTED + TESTED.**

## Nguyên tắc

- File cá nhân lưu **trong MariaDB** dạng binary, không filesystem/volume/MinIO/S3.
- Chia chunk (<= 4 MiB) để tránh `max_allowed_packet`, stream upload/download, không load cả file vào RAM.
- InnoDB, `MEDIUMBLOB` mỗi chunk.

## Bảng (migration `010_storage.sql`, bookuser)

| Bảng | Vai trò |
|---|---|
| `storage_objects` | metadata file (owner, filename, MIME, size, SHA-256, chunks, status) |
| `storage_chunks` | binary payload + chunk index + size + checksum |
| `storage_upload_sessions` | phiên upload/resume/retry |
| `user_storage_accounts` | quota per user (400 MiB = 419430400 bytes) |
| `user_storage_reservations` | bytes đang reserve khi upload |
| `storage_usage_entries` | lịch sử usage |
| `storage_object_versions` | phiên bản file |

## Quy trình upload

1. Khởi tạo session → kiểm tra quota → reserve bytes.
2. Upload chunk (retry/upsert, checksum SHA-256).
3. Complete → verify checksum → chuyển `reserved → used`.
4. Cancel/timeout → giải phóng reservation (worker).

## Quota

`used_bytes + reserved_bytes + new_upload_bytes <= 419430400`.

## Đã kiểm thử

`apps/api/test/integration.test.ts`: init → chunk → complete → download stream → quota → delete → ownership 403. Dọn sạch test data.

