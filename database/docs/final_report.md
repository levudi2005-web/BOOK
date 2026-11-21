# Báo cáo tổng kết — Hai schema `bookuser` & `bookadmin`

## 1. Phạm vi và kết quả

Đã hoàn thành thiết kế, triển khai và kiểm chứng hai schema MariaDB 10.11 cho BOOKFORFREEDOM:

| Chỉ số | `bookuser` | `bookadmin` | Tổng |
|---|---:|---:|---:|
| Bảng vật lý | 35 | 28 | **63** |
| View | 1 | 2 | **3** |
| Khóa ngoại | 57 | 31 | **88** |
| PK | 35 | 28 | 63 |
| CHECK constraint | 47 | 46 | 93 |
| Cột generated STORED | 6 | 2 | 8 |
| Bảng outbox/inbox | 2 | 2 | 4 |

- Charset `utf8mb4`, collation `utf8mb4_unicode_ci`, InnoDB, `DATETIME(3)` UTC.
- Không có FK xuyên database; mọi bảng/cột có COMMENT tiếng Việt.
- `install_all.sql` chạy sạch trên môi trường mới và **idempotent** khi chạy lại.
- Kiểm tra tự động: **41 PASS, 2 INFO, 0 FAIL**.
- Không seed tài khoản/mật khẩu mặc định.

## 2. Kiến trúc phân tách schema

```
Ứng dụng người dùng ──► bookuser  (hồ sơ, sách, đọc, tương tác)
        │                    │
        │                    └─ integration_outbox ──┐
        │                                            ▼
        └──────────────► bookadmin (vận hành, duyệt, audit)
                             └─ integration_inbox / outbox
```

- `bookuser` là nguồn sự thật cho danh tính người dùng, nội dung công khai, thư viện và tương tác.
- `bookadmin` là nguồn sự thật cho tài khoản quản trị, RBAC, kiểm duyệt, hạn chế, bản quyền, audit.
- Liên kết logic qua `user_id`, `book_id`, `*_uuid`, `source_user_report_id`, `event_id` — không FK vật lý.
- View `bookuser.v_public_announcements` đọc `bookadmin.admin_announcements` với `SQL SECURITY INVOKER`; cần `GRANT SELECT` tương ứng.

## 3. Danh mục bảng theo miền

### 3.1 `bookuser` (35 bảng)

| Miền | Bảng |
|---|---|
| Danh tính | `users`, `user_profiles`, `user_settings`, `user_sessions`, `user_devices`, `password_reset_tokens`, `email_verification_tokens` |
| Danh mục sách | `books`, `book_chapters`, `book_files`, `authors`, `book_authors`, `publishers`, `categories`, `book_categories`, `tags`, `book_tags`, `licenses` |
| Quyền nội dung | `book_rights` |
| Tương tác | `reviews`, `comments`, `comment_reactions`, `user_reports` |
| Thư viện/đọc | `user_library`, `reading_progress`, `reading_history`, `bookmarks`, `reading_lists`, `reading_list_books`, `downloads` |
| Xã hội | `user_follows` |
| Thông báo | `notifications`, `notification_preferences` |
| Tích hợp | `integration_outbox`, `integration_inbox` |

### 3.2 `bookadmin` (28 bảng)

| Miền | Bảng |
|---|---|
| Danh tính admin | `admin_accounts`, `admin_profiles`, `admin_sessions`, `admin_mfa_methods`, `admin_password_reset_tokens`, `admin_login_attempts` |
| RBAC | `admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_account_roles` |
| Kiểm duyệt | `content_reports`, `report_reasons`, `moderation_cases`, `moderation_actions` |
| Quản trị người dùng | `admin_user_notes`, `user_restrictions`, `user_verification_reviews` |
| Bản quyền nội dung | `book_rights_reviews` |
| Vận hành | `admin_announcements`, `admin_notifications`, `feature_flags`, `system_settings`, `maintenance_windows`, `system_metrics_daily` |
| Audit/bảo mật | `admin_audit_logs`, `security_events` |
| Tích hợp | `integration_outbox`, `integration_inbox` |

## 4. Khóa, ràng buộc, index

- **PK**: bảng nghiệp vụ dùng `BIGINT UNSIGNED AUTO_INCREMENT`, tên `<entity>_id`; 7 bảng liên kết dùng PK tổng hợp 2 cột. UUID công khai `CHAR(36)` có UNIQUE ở bảng cần định danh ra ngoài.
- **FK**: 88 ràng buộc, đặt tên `fk_<child>_<parent>`, có index trái cùng; `ON DELETE` chọn theo ngữ nghĩa (CASCADE cho bảng phụ thuộc chặt, SET NULL/RESTRICT cho dữ liệu lịch sử).
- **UK**: email, username, slug, UUID, `event_id`, cặp quan hệ (ví dụ `book_authors`, `reading_list_books`).
- **CHECK**: trạng thái hợp lệ, khoảng thời gian (`expires_at > created_at`), `OCTET_LENGTH` cho hash/token, `JSON_VALID`.
- **Index**: theo truy vấn thực tế — trạng thái + thời gian, FK, tìm kiếm theo slug/email, dashboard admin.
- **Partial unique**: dùng cột generated STORED + UNIQUE (ví dụ `reviews.active_book_id`, `reading_lists.active_name`) để chỉ ràng buộc bản ghi chưa xóa.

## 5. Kiểu dữ liệu và quy ước

- 802 cột trong bảng vật lý, 15 kiểu dữ liệu; `DATETIME(3)` 196 cột, `BIGINT` 169 cột, `ENUM` 70 cột (59 tập giá trị).
- Thời gian lưu UTC; ứng dụng quy đổi hiển thị.
- UUID `CHAR(36)`; hash/token `BINARY(32)`; IP `VARBINARY(16)`; MFA/WebAuthn `VARBINARY`.
- JSON lưu `LONGTEXT` + `utf8mb4_bin` + CHECK `JSON_VALID`.
- Tiền tệ `DECIMAL`, không dùng `FLOAT`; boolean `TINYINT(1)` + CHECK.
- Quy ước đầy đủ: [data_types.md](data_types.md).

## 6. Tối ưu và toàn vẹn dữ liệu

- **Generated column** giải quyết partial uniqueness mà MariaDB không có filtered index:
  - `reviews.active_book_id` = `book_id` khi chưa xóa, ngược lại NULL.
  - `reading_lists.active_name` = `name` khi chưa xóa mềm, ngược lại NULL.
- **CHECK** thay cho trigger khi có thể, giảm chi phí ghi.
- **Index tổng hợp** cho truy vấn nóng: trạng thái + thời gian, `(assigned_admin_id, status)`, `(reporter_user_id, created_at)`.
- **Không dùng FK xuyên DB** để tránh khóa chéo và phụ thuộc triển khai; đối soát bằng truy vấn định kỳ.
- **Xóa mềm** (`deleted_at`, `status`) bảo toàn lịch sử và tham chiếu.

## 7. RBAC và bảo mật

- 7 vai trò hệ thống, 76 permission, 212 gán quyền:
  - `SUPER_ADMIN` (76), `ADMIN` (71), `CONTENT_MODERATOR` (31), `SUPPORT_AGENT` (13), `RIGHTS_REVIEWER` (8), `AUDITOR` (7), `ANALYST` (6).
- Quyền dạng `resource.action`; kiểm tra ở server cho mọi endpoint.
- Mật khẩu Argon2id; token chỉ lưu SHA-256 `BINARY(32)`; session thu hồi được; MFA cho admin đặc quyền.
- `ADMIN` có `admin_account.create`, `setting.update`, `user.delete` nhưng **không** có `role.manage`/`permission.manage` (chỉ `SUPER_ADMIN`).
- Chi tiết: [security.md](security.md).

## 8. Audit append-only

- `admin_audit_logs` có `prev_hash`/`record_hash` (`BINARY(32)`) tạo chuỗi hash.
- 4 trigger chặn `UPDATE`/`DELETE`: 2 trên `admin_audit_logs`, 2 trên `security_events`; ném `SQLSTATE 45000`.
- Ghi audit trong cùng transaction với thao tác; có `correlation_id`, IP nhị phân, before/after/diff.
- `security_events` lưu sự kiện đăng nhập, MFA, thay đổi quyền, hoạt động đáng ngờ.
- Đã kiểm thử: UPDATE/DELETE bị từ chối.

## 9. Tích hợp outbox/inbox

- Mỗi schema có `integration_outbox` và `integration_inbox`, `UNIQUE(event_id)`.
- Ghi sự kiện cùng transaction nghiệp vụ; worker `FOR UPDATE SKIP LOCKED`; retry lũy tiến; `dead_letter` khi hết lượt.
- Consumer chèn inbox trước, xử lý idempotent, đánh dấu `processed` cùng transaction.
- Danh mục 14 sự kiện `bookuser → bookadmin` và 9 sự kiện `bookadmin → bookuser`.
- Có truy vấn đối soát báo cáo, hạn chế, outbox tồn đọng và job lưu trữ.
- Chi tiết: [cross_database_integration.md](cross_database_integration.md).

## 10. Dữ liệu tham chiếu và view

- `bookadmin`: 7 vai trò, 76 quyền, 212 gán quyền, 12 `report_reasons`.
- `bookuser`: 8 `licenses`.
- Không seed người dùng/admin — tránh mật khẩu mặc định.
- View:
  - `bookuser.v_public_announcements` — thông báo công khai đang hiệu lực.
  - `bookadmin` có 2 view tổng hợp phục vụ dashboard/điều hướng.
- Seed idempotent, chạy lại không nhân bản dữ liệu.

## 11. Tài liệu, ERD và PowerDesigner

| Sản phẩm | Đường dẫn |
|---|---|
| Mục lục tài liệu | `database/docs/README.md` |
| Từ điển dữ liệu | `database/docs/data_dictionary.md` |
| Quan hệ | `database/docs/relationships.md` |
| Kiểu dữ liệu | `database/docs/data_types.md` |
| Tích hợp | `database/docs/cross_database_integration.md` |
| API | `database/docs/api_contract.md` |
| Bảo mật | `database/docs/security.md` |
| Cài đặt | `database/docs/installation.md` |
| PowerDesigner | `database/docs/powerdesigner_guide.md` |
| Kiểm chứng | `database/docs/verification_report.md` |
| Kiến trúc | `database/diagrams/architecture.mmd` |
| ERD | `database/diagrams/erd_bookuser.mmd`, `erd_bookadmin.mmd` |
| DDL reverse | `database/ddl/bookuser_schema.sql`, `bookadmin_schema.sql` |
| Script sinh tài liệu | `database/scripts/generate_*.py`, `export_ddl.sh` |

- ERD và từ điển dữ liệu sinh trực tiếp từ `information_schema`, không viết tay.
- Hướng dẫn reverse engineer gồm ánh xạ kiểu, hạn chế `UNSIGNED`/`DATETIME(3)`/`ENUM`/generated/CHECK và quy trình round-trip.

## 12. Kiểm thử, bàn giao và vận hành

- **43 dòng kiểm tra: 41 PASS (18 `bookuser` + 23 `bookadmin`) và 2 INFO, 0 FAIL**.
- 8 kiểm thử DML trong transaction có rollback: view xuyên schema, JOIN FK, generated column, chặn sửa audit, chống trùng outbox/inbox, retry.
- `install_all.sql` đã chạy sạch sau `DROP DATABASE` và chạy lại idempotent.
- Bàn giao kèm: hướng dẫn cài đặt, cấp quyền, tạo admin đầu tiên, nâng cấp, backup/restore, xử lý sự cố.
- **Giới hạn**:
  - Hạ tầng Docker đã chuyển sang MariaDB 10.11 (tự cài schema + tạo user); API vẫn là khung `/health`, chưa có repository/ORM đọc ghi dữ liệu.
  - Chưa có test CI tự động, kiểm thử tải, hay kiểm thử PowerDesigner thực tế.
  - Seed không có admin; phải tạo theo quy trình kiểm soát.
  - View công khai cần `GRANT SELECT` trên bảng nguồn.

## 13. Checklist hạng mục bàn giao

| # | Hạng mục | Sản phẩm | Trạng thái |
|---:|---|---|---|
| 1 | Thiết kế hai schema vật lý | `database/sql/bookuser/001–004`, `bookadmin/001–004` | ✅ 63 bảng, 3 view |
| 2 | Toàn vẹn và ràng buộc | PK/UK/FK/CHECK/index, 88 FK | ✅ 0 FK xuyên DB |
| 3 | Từ điển dữ liệu | `database/docs/data_dictionary.md` | ✅ Sinh tự động |
| 4 | Quan hệ và ERD | `relationships.md`, `diagrams/erd_*.mmd` | ✅ 88 quan hệ |
| 5 | Quy ước kiểu dữ liệu | `database/docs/data_types.md` | ✅ 15 kiểu |
| 6 | Tích hợp hai schema | `cross_database_integration.md`, 4 bảng outbox/inbox | ✅ At-least-once + idempotent |
| 7 | Hợp đồng API | `database/docs/api_contract.md` | ✅ Endpoint → bảng → quyền |
| 8 | Bảo mật và RBAC | `security.md`, 7 vai trò / 76 quyền | ✅ Audit append-only |
| 9 | Cài đặt và vận hành | `installation.md`, `install_all.sql`, `docker-compose.yml` | ✅ Idempotent, Docker tự cài, có backup/restore |
| 10 | Hỗ trợ PowerDesigner | `powerdesigner_guide.md`, `database/ddl/*.sql` | ✅ Sẵn sàng reverse (chưa chạy PD) |
| 11 | Kiểm chứng | `verification_report.md` | ✅ 41 PASS / 2 INFO / 0 FAIL |
| 12 | Báo cáo tổng kết | `database/docs/final_report.md` | ✅ Tài liệu này |

## Kết luận

Hai schema đã đạt mục tiêu: đầy đủ PK/FK/UK/index/CHECK/COMMENT, tách quyền rõ ràng, RBAC hoàn chỉnh, audit chống sửa, tích hợp outbox/inbox chống mất/trùng, tài liệu và DDL sẵn sàng cho PowerDesigner. Hạ tầng Docker đã chuyển sang MariaDB 10.11 và tự cài hai schema; rủi ro còn lại nằm ở việc API chưa có lớp repository/ORM và chưa kiểm thử tải — được ghi rõ để lên kế hoạch tiếp theo.

---

Hết final_report.md
