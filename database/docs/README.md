# Tài liệu cơ sở dữ liệu BOOKFORFREEDOM

Hai schema MariaDB 10.11: `bookuser` (35 bảng, 1 view) và `bookadmin` (28 bảng, 2 view), 88 FK, không FK xuyên database.

## Đọc theo nhu cầu

| Tài liệu | Nội dung |
|---|---|
| [data_dictionary.md](data_dictionary.md) | Từ điển bảng/cột/khóa/comment đầy đủ, sinh tự động từ `information_schema` |
| [relationships.md](relationships.md) | Toàn bộ FK vật lý + quan hệ logic giữa hai schema |
| [data_types.md](data_types.md) | Quy ước kiểu dữ liệu, charset, thời gian, JSON, token |
| [cross_database_integration.md](cross_database_integration.md) | Outbox/inbox, danh mục sự kiện, retry, đối soát |
| [api_contract.md](api_contract.md) | Ánh xạ endpoint → bảng/quyền, lỗi, phân trang, bất biến dữ liệu |
| [security.md](security.md) | Argon2id, token hash, MFA, RBAC, audit append-only, GRANT |
| [installation.md](installation.md) | Cài đặt, cấp quyền, nâng cấp, backup, xử lý sự cố |
| [powerdesigner_guide.md](powerdesigner_guide.md) | Reverse engineer DDL, ánh xạ kiểu, hạn chế, round-trip |
| [verification_report.md](verification_report.md) | Kết quả 41 PASS / 2 INFO / 0 FAIL và kiểm thử DML |
| [final_report.md](final_report.md) | Báo cáo tổng kết 12 hạng mục bàn giao |

## Sơ đồ

- [architecture.mmd](../diagrams/architecture.mmd) — kiến trúc hai schema và luồng tích hợp.
- [erd_bookuser.mmd](../diagrams/erd_bookuser.mmd) — ERD `bookuser`.
- [erd_bookadmin.mmd](../diagrams/erd_bookadmin.mmd) — ERD `bookadmin`.

## DDL và script

| Đường dẫn | Mục đích |
|---|---|
| [`../sql/install_all.sql`](../sql/install_all.sql) | Cài đặt toàn bộ, đúng thứ tự, idempotent |
| [`../sql/bookuser/`](../sql/bookuser) | DDL/seed/verify schema người dùng |
| [`../sql/bookadmin/`](../sql/bookadmin) | DDL/seed/verify schema quản trị |
| [`../ddl/`](../ddl) | Bản export DDL-only để reverse engineer |
| [`../scripts/`](../scripts) | Sinh tài liệu, ERD, export DDL |

## Quy ước

- Mọi thay đổi schema đi qua file `NNN_*.sql` mới; không sửa file đã phát hành.
- Sau thay đổi: chạy `007_verify.sql`, `export_ddl.sh`, và ba script sinh tài liệu.
- Không tạo FK giữa `bookuser` và `bookadmin`; dùng outbox/inbox và UUID.
