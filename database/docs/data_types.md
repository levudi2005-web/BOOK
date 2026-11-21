# Quy ước kiểu dữ liệu — BOOKFORFREEDOM

Áp dụng thống nhất cho `bookuser` và `bookadmin` (MariaDB 10.11).

## 1. Nguyên tắc nền

| Hạng mục | Quy ước |
|---|---|
| Engine | `InnoDB` cho mọi bảng (transaction, FK, row lock) |
| Character set | `utf8mb4`, collation `utf8mb4_unicode_ci` |
| Múi giờ | Mọi `DATETIME` lưu **UTC**; ứng dụng chịu trách nhiệm quy đổi hiển thị |
| Khóa chính | `BIGINT UNSIGNED AUTO_INCREMENT`, tên `<entity>_id`; bảng liên kết dùng PK tổng hợp 2 cột |
| Định danh công khai | `CHAR(36)` UUID v4, tên `<entity>_uuid`, có `UNIQUE`; cột `*_admin_uuid`/`*_by_uuid` chỉ là tham chiếu |
| Naming | `snake_case`; bảng số nhiều; FK `fk_<child>_<parent>`; UK `uq_<table>_<cols>`; index `idx_<table>_<cols>`; CHECK `chk_<table>_<rule>` |
| Xóa mềm | `deleted_at DATETIME(3) NULL` và/hoặc `status='deleted'`; không xóa cứng dữ liệu nghiệp vụ |
| COMMENT | Bắt buộc cho mọi bảng và mọi cột (tiếng Việt) |

## 2. Kiểu dữ liệu sử dụng

Thống kê thực tế: 802 cột trong bảng vật lý (838 cột nếu tính cả view), 15 kiểu dữ liệu, 196 cột thời gian, 169 cột `BIGINT`.

| Kiểu | Số cột | Dùng cho | Ghi chú |
|---|---:|---|---|
| `datetime(3)` | 196 | `created_at`, `updated_at`, `*_at` | Độ chính xác mili giây, UTC |
| `bigint unsigned` | 169 | PK, FK, bộ đếm lớn | Không dùng `INT` cho PK |
| `varchar(n)` | 139 | Tên, tiêu đề, email, URL, mã | Độ dài theo ngữ nghĩa |
| `enum(...)` | 70 | Trạng thái, loại, mức độ | 59 enum khác nhau; đổi giá trị cần migration |
| `tinyint(1)` | 55 | Cờ boolean | 0/1, có CHECK khi cần |
| `char(n)` | 53 | UUID `CHAR(36)`, ISBN, mã quốc gia | Độ dài cố định |
| `text` | 29 | Nội dung dài | |
| `longtext` | 27 | JSON, nội dung rất dài | `utf8mb4_bin` + CHECK `JSON_VALID` cho JSON |
| `int` | 24 | Bộ đếm vừa, `page_count`, `word_count` | 20 cột là `int unsigned` |
| `varbinary(16)` | 15 | Địa chỉ IP | `INET6_ATON` / `INET6_NTOA` |
| `binary(32)` | 8 | Token hash SHA-256, hash chuỗi audit | So sánh nhị phân chính xác |
| `decimal(p,s)` | 6 | Điểm đánh giá, dung lượng, chi phí | Không dùng `FLOAT` cho tiền/điểm |
| `date` | 5 | Ngày sinh, ngày xuất bản | Không kèm giờ |
| `smallint unsigned` | 4 | Bộ đếm nhỏ (`failed_login_count`) | |
| `time` | 2 | Giờ trong ngày (cấu hình) | |

## 3. Quy tắc chi tiết

### 3.1 Khóa và định danh
- PK kỹ thuật `BIGINT UNSIGNED`; không lộ ra API khi không cần — dùng `*_uuid`.
- Mọi bảng nghiệp vụ có `*_uuid CHAR(36) NOT NULL UNIQUE` (trừ bảng liên kết N-N thuần).
- FK vật lý **chỉ trong cùng schema**; tham chiếu chéo schema dùng ID/UUID sao chép (xem `relationships.md`).

### 3.2 Thời gian
- `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`.
- `updated_at ... ON UPDATE CURRENT_TIMESTAMP(3)`.
- Token hết hạn: `expires_at`; phiên: `last_used_at`, `revoked_at`; audit: `created_at` bất biến.
- Không dùng `TIMESTAMP` để tránh phụ thuộc `time_zone` phiên.

### 3.3 Boolean và trạng thái
- Cờ: `TINYINT(1) NOT NULL DEFAULT 0` + CHECK `IN (0,1)` khi có ý nghĩa nghiệp vụ.
- Trạng thái vòng đời: `ENUM` thay vì chuỗi tự do, ví dụ:
  - `users.status`: `pending, active, suspended, disabled, deleted`
  - `books.status`: `draft, submitted, under_review, approved, published, rejected, archived`
  - `integration_outbox.status`: `pending, processing, processed, failed, dead_letter`
  - `content_reports.status`: `new, triaged, in_review, resolved, rejected, duplicate`
- Bảng tra cứu (`report_reasons`, `licenses`) dùng `code` ổn định + `is_active` thay vì hard-code.

### 3.4 JSON
- Lưu `LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin` + `CHECK (JSON_VALID(col))`.
- Dùng cho: payload sự kiện, snapshot audit (`before_data`, `after_data`, `diff`, `metadata`), cấu hình (`value_json`), `target_roles`, `settings_json`.
- Không đặt JSON vào cột cần JOIN/INDEX thường xuyên; trường tra cứu phải là cột riêng.
- Ứng dụng kiểm tra schema JSON trước khi ghi; DB chỉ bảo đảm JSON hợp lệ.

### 3.5 Bảo mật
- Mật khẩu: `password_hash VARCHAR(255)` (Argon2id), kèm `password_algorithm`.
- Token gửi qua email/URL: chỉ lưu `token_hash BINARY(32)` (SHA-256) + `OCTET_LENGTH = 32`.
- MFA secret / WebAuthn public key: `VARBINARY`, không plaintext.
- IP: `VARBINARY(16)` + `INET6_ATON()`; index khi cần truy vấn.
- Không lưu số thẻ/CVV/CCCD thô; dữ liệu nhạy cảm trong audit phải che trước khi ghi.

### 3.6 Số và tiền
- Điểm đánh giá: `DECIMAL(3,2)` (0.00–5.00), có CHECK.
- Dung lượng: `BIGINT UNSIGNED` (byte).
- Tỷ lệ/chi phí: `DECIMAL(p,s)` với CHECK `>= 0`; không dùng `DOUBLE`.

### 3.7 Chuỗi và văn bản
- Email `VARCHAR(254)`, username `VARCHAR(50)`, tiêu đề sách `VARCHAR(500)`.
- `slug` duy nhất, `VARCHAR` dài hơn tên để tránh trùng.
- Nội dung dài: `TEXT` (mô tả ngắn) / `LONGTEXT` (nội dung, JSON).
- Cột `utf8mb4_bin` cho dữ liệu cần phân biệt hoa thường (JSON, hash text).

### 3.8 Cột sinh (generated) cho ràng buộc một phần
MariaDB không có partial index; dùng cột `STORED GENERATED` + `UNIQUE`:
- `book_categories.primary_book_id = IF(is_primary=1, book_id, NULL)`
- `book_files.primary_book_id = IF(is_primary=1, book_id, NULL)`
- `reading_lists.active_name = IF(deleted_at IS NULL, name, NULL)`
- `reading_lists.default_user_id = IF(is_default=1, user_id, NULL)`
- `reviews.active_book_id = IF(status<>'deleted' AND deleted_at IS NULL, book_id, NULL)`
- `user_library.active_book_id = IF(removed_at IS NULL, book_id, NULL)`
- `bookadmin.moderation_cases.open_marker`, `user_restrictions.active_lock_key`

## 4. Kiểm tra kiểu dữ liệu

```sql
-- Thống kê kiểu dữ liệu
SELECT data_type, COUNT(*) AS columns
FROM information_schema.columns
WHERE table_schema IN ('bookuser','bookadmin')
GROUP BY data_type ORDER BY columns DESC;

-- FK lệch kiểu giữa bảng con và bảng cha (kỳ vọng 0)
SELECT k.table_name, k.column_name, c.column_type, c2.column_type
FROM information_schema.key_column_usage k
JOIN information_schema.columns c
  ON c.table_schema=k.table_schema AND c.table_name=k.table_name AND c.column_name=k.column_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema=k.constraint_schema AND rc.constraint_name=k.constraint_name
JOIN information_schema.key_column_usage k2
  ON k2.constraint_schema=rc.unique_constraint_schema AND k2.constraint_name=rc.unique_constraint_name
 AND k2.ordinal_position=k.ordinal_position
JOIN information_schema.columns c2
  ON c2.table_schema=k2.table_schema AND c2.table_name=k2.table_name AND c2.column_name=k2.column_name
WHERE k.constraint_schema IN ('bookuser','bookadmin')
  AND (c.column_type<>c2.column_type
       OR IFNULL(c.character_set_name,'')<>IFNULL(c2.character_set_name,'')
       OR IFNULL(c.collation_name,'')<>IFNULL(c2.collation_name,''));
```

---

Hết data_types.md
