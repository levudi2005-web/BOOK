# POWERDESIGNER_GUIDE.md

> Hướng dẫn phục vụ báo cáo niên luận (PowerDesigner MCD/MLD/PDM).

## Nguồn hiện có

- `database/sql/` — DDL SQL đầy đủ (có thể Reverse Engineer).
- `database/docs/` — tài liệu quan hệ, kiểu dữ liệu, ERD Mermaid, verification report.
- `NOTEPROJECT.md` §6 — tổng quan 63 bảng/3 view/88 FK/93 CHECK.

## Cách tạo PDM từ SQL (Reverse Engineer)

1. PowerDesigner → File → Reverse Engineer → Database.
2. Chọn DBMS = MariaDB (hoặc MySQL tương đương).
3. Chọn script DDL trong `database/sql/` (gộp cả `bookuser` và `bookadmin`).
4. PowerDesigner sẽ sinh PDM; chuyển PDM → MCD nếu cần.

## Lưu ý hai database

- Không có FK vật lý xuyên database. Quan hệ chéo (`v_public_announcements`, outbox/inbox, `*_uuid`) phải mô tả là **logical reference** trong MCD, không vẽ FK vật lý.
- Tách PDM/MCD riêng cho `bookuser` và `bookadmin`, cộng một sơ đồ tổng thể đánh dấu logical reference.

## Các file cần xuất (mục tiêu)

- MCD/MLD/PDM `bookuser`.
- MCD/MLD/PDM `bookadmin`.
- Sơ đồ tổng thể hai database.
- Data Dictionary (xem `DATABASE_DICTIONARY.md`).

> Chưa tạo file `.pdm/.mcd` nhị phân trong phiên này; SQL DDL và tài liệu đã sẵn để Reverse Engineer trực tiếp.
