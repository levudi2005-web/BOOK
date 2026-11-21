# Hướng dẫn reverse engineer bằng PowerDesigner

## 1. Mục tiêu

Từ DDL MariaDB thực tế, dựng lại **Physical Data Model (PDM)** cho từng schema để:
- Xem bảng/cột/PK/UK/FK/index/comment.
- Sinh báo cáo thiết kế, sơ đồ ER, tài liệu bàn giao.
- So sánh phiên bản và đánh giá tác động trước khi đổi schema.

Không dùng PowerDesigner để tự động phát hành DDL vào production. Nguồn chuẩn vẫn là các file trong `database/sql/`.

## 2. Đầu vào

| Tệp | Nội dung | Dùng cho |
|---|---|---|
| `database/ddl/bookuser_schema.sql` | 35 bảng, 57 FK, 1 view | Reverse engineer schema người dùng |
| `database/ddl/bookadmin_schema.sql` | 28 bảng, 31 FK, 2 view | Reverse engineer schema quản trị |
| `database/sql/**` | DDL đầy đủ + trigger + seed | Đối chiếu, không nạp toàn bộ vào PD |

Tổng quan: **63 bảng**, **88 FK**, **3 view**, **802 cột** (chỉ bảng vật lý), 15 kiểu dữ liệu.

Hai file `ddl/*_schema.sql` được sinh lại bằng:

```bash
./database/scripts/export_ddl.sh
```

Script dùng `mariadb-dump --no-data`, bỏ trigger (PowerDesigner không mô hình hóa trigger; trigger gốc ở `002`/`003`) và bỏ dòng sandbox để parser không lỗi.

> Không sửa trực tiếp file trong `database/ddl/`; luôn sửa SQL nguồn rồi export lại.

## 3. Chuẩn bị PowerDesigner

- PowerDesigner **16.7 SP04+** (bản cũ hơn có thể không nhận `CHECK`, cột generated, `DATETIME(3)`).
- Ngôn ngữ mô hình: chọn **MySQL 5.7** hoặc **MySQL 8.0** — gần MariaDB 10.11 nhất.
- Encoding: UTF-8; font hỗ trợ tiếng Việt.
- Tắt Auto-fix tên (Physical Names) để giữ nguyên `snake_case`.
- Nếu dùng kết nối trực tiếp: cài **MariaDB ODBC Driver 3.1+**, tạo DSN read-only; ưu tiên reverse bằng script file để tái lập được.

## 4. Các bước reverse engineer (script file)

### 4.1 Tạo model

1. `File > New Model > Physical Data Model`.
2. Đặt tên: `BOOKFORFREEDOM_bookuser` (làm riêng cho từng schema).
3. Chọn DBMS `MySQL 5.7` (hoặc 8.0).
4. Lưu `.pdm` vào thư mục ngoài repo hoặc `database/powerdesigner/` nếu nhóm dùng chung.

### 4.2 Nạp DDL

1. `File > Reverse Engineer > Database...`.
2. Chọn `Using script files`.
3. Thêm đúng một file: `database/ddl/bookuser_schema.sql`.
4. Nhấn `Options` và bật:
   - `Create tables`, `Create columns`, `Create primary keys`, `Create alternate keys`.
   - `Create indexes`, `Create foreign keys`, `Create views`.
   - `File encoding: UTF-8`.
   - `Ignore unknown statements` (nếu có).
5. Bỏ chọn `Create triggers`, `Create procedures` (file export không chứa trigger).
6. `OK` để chạy; lặp lại với model thứ hai và `bookadmin_schema.sql`.

### 4.3 Kiểm tra ngay sau khi nạp

| Kiểm tra | `bookuser` | `bookadmin` |
|---|---|---|
| Số bảng | 35 | 28 |
| Số FK | 57 | 31 |
| Số view | 1 | 2 |
| FK xuyên schema | 0 | 0 |
| Bảng audit | — | `admin_audit_logs`, `security_events` |

Nếu số lượng lệch: mở `Output` xem dòng bị bỏ qua; thường do `ENUM`, cột generated hoặc `CHECK`.

### 4.4 Vì sao tách hai model

- Không có FK xuyên database; gộp hai schema vào một PDM dễ tạo FK ảo hoặc gộp nhầm `user_id`.
- Mỗi schema có vòng đời và quyền khác nhau.
- Liên kết logic (`user_id`, `book_id`, UUID, `event_id`) mô tả ở **Conceptual Data Model** riêng hoặc trong `cross_database_integration.md`.

Nếu bắt buộc một model vật lý duy nhất: reverse lần lượt, dùng `Merge Models` và **không** tạo FK giữa hai package.

## 5. Ánh xạ kiểu dữ liệu MariaDB → PowerDesigner

| MariaDB | PowerDesigner (MySQL DBMS) | Ghi chú |
|---|---|---|
| `BIGINT UNSIGNED` | `BIGINT` + thuộc tính Unsigned | Nếu model không giữ unsigned, tạo domain `BIGINT_UNSIGNED` |
| `INT UNSIGNED`, `SMALLINT UNSIGNED`, `TINYINT UNSIGNED` | Kiểu tương ứng + Unsigned | Kiểm tra lại sau khi nạp |
| `CHAR(36)` | `CHAR(36)` | Dùng domain `UUID` để đồng nhất |
| `VARCHAR(n)` | `VARCHAR(n)` | Giữ nguyên độ dài; không tự tăng |
| `BINARY(32)` / `VARBINARY(n)` | `BINARY` / `VARBINARY` | Dùng cho hash/token/IP; kiểm tra độ dài |
| `DATETIME(3)` | `DATETIME` | PowerDesigner có thể bỏ phần fractional seconds → ghi chú trong annotation |
| `DATE`, `TIME` | `DATE`, `TIME` | |
| `DECIMAL(p,s)` | `DECIMAL(p,s)` | Không đổi precision |
| `ENUM(...)` | `VARCHAR` + check/domain | PowerDesigner không mô hình hóa ENUM gốc; ghi rõ tập giá trị trong comment |
| `JSON` (MariaDB alias `LONGTEXT`) | `TEXT`/`LONGTEXT` | MariaDB lưu JSON dưới dạng text + CHECK `JSON_VALID` |
| `LONGTEXT`, `TEXT` | `LONGTEXT`, `TEXT` | |
| Cột generated (`... AS (...) STORED`) | Computed column (nếu hỗ trợ) | Nếu không, đánh dấu `<<generated>>` trong comment và kiểm tra thủ công |
| `AUTO_INCREMENT` | Identity/Identity column | Bật đúng cho PK |
| `CHECK (...)` | Table/column check | Hỗ trợ tùy phiên bản; nếu mất, ghi ở `Constraint`/annotation |
| `COMMENT '...'` | Table/column comment | Bật option giữ comment khi reverse |
| `COLLATE utf8mb4_unicode_ci` | Model option `Character set/Collation` | Đặt ở mức model để tránh lặp |

Khuyến nghị tạo **domain** dùng chung: `UUID`, `EMAIL`, `TOKEN_HASH`, `IP_ADDRESS`, `JSON_DOC`, `TIMESTAMP_MS`, `BIGINT_UNSIGNED`.

## 6. Hạn chế đã biết và cách xử lý

| Vấn đề | Biểu hiện | Cách xử lý |
|---|---|---|
| `UNSIGNED` bị mất | Cột thành `BIGINT` có dấu | Bật Unsigned hoặc dùng domain; đối chiếu `column_type` |
| `DATETIME(3)` thành `DATETIME` | Mất milliseconds | Ghi annotation; không dùng PDM để phát hành DDL |
| `ENUM` thành `VARCHAR` | Mất tập giá trị | Tạo domain + comment liệt kê giá trị |
| Cột generated bị bỏ qua | Thiếu `active_book_id`, `active_name`, `primary_book_id`... | Kiểm tra danh sách cột; bổ sung computed column thủ công |
| `CHECK` bị bỏ qua | Mất ràng buộc `JSON_VALID`, `octet_length` | Ghi trong annotation; nguồn chuẩn là file SQL |
| `ON UPDATE CURRENT_TIMESTAMP(3)` | Mất thuộc tính | Ghi comment; không dựa vào PDM để tạo bảng |
| `DEFINER` / `DELIMITER` | Parser lỗi | File export đã bỏ trigger; không nạp file có trigger |
| `CREATE DATABASE` / `USE` | Owner/database gán sai | Chọn đúng owner trong model; hoặc bỏ 2 dòng này khỏi bản sao khi nạp |
| `/*!50003 ... */` | Câu lệnh bị bỏ qua | Bình thường; đây là conditional comment |
| Tên khóa quá dài | PD cắt tên | Giữ `%Name%` gốc; tắt auto-fix; đối chiếu `constraint_name` |
| Index prefix `(col(20))` | Không nhận | Mô tả trong annotation; kiểm tra thủ công |
| View phụ thuộc schema khác | `v_public_announcements` lỗi khi chỉ nạp `bookuser` | Nạp `bookuser` sau khi đã có model `bookadmin`, hoặc chấp nhận view không resolve |

Nguyên tắc: **PDM là tài liệu thiết kế**, không phải nguồn phát hành. Mọi khác biệt phải được ghi lại và đối chiếu với `data_dictionary.md`.

## 7. Tổ chức mô hình và sơ đồ

Gói (package) đề xuất cho `bookuser`:
1. `identity` — users, profiles, settings, sessions, devices, tokens.
2. `catalog` — books, chapters, files, authors, publishers, categories, tags.
3. `engagement` — reviews, comments, reports, votes.
4. `library` — user_library, reading_progress, bookmarks, reading_lists.
5. `commerce` — licenses, downloads, book_rights.
6. `ops` — notifications, announcements (view), integration, audit.

Gói cho `bookadmin`:
1. `access` — admin_accounts, roles, permissions, sessions, MFA.
2. `moderation` — content_reports, cases, actions, reasons.
3. `governance` — user_restrictions, verification, rights reviews.
4. `content_ops` — announcements, categories, feature flags, settings.
5. `observability` — audit logs, security events, metrics.
6. `integration` — outbox, inbox.

Cách làm:
- `Tools > Display Preferences` chọn hiển thị PK/FK, kiểu dữ liệu, comment.
- Tạo diagram theo package, dùng auto-layout, khóa vị trí các bảng lõi.
- Màu: đỏ = audit/append-only; cam = tích hợp; xanh = danh mục; xám = bảng tra cứu.
- Đặt tên diagram: `ERD_bookuser_overview`, `ERD_bookadmin_moderation`...

## 8. Sinh báo cáo và đối chiếu

1. `Report > Report Wizard`, chọn model/package.
2. Bao gồm: Table List, Column List, Primary Key, Foreign Key, Index, View, Comment.
3. Xuất HTML/RTF; lưu vào `database/docs/powerdesigner/` (không bắt buộc commit).
4. Đối chiếu số liệu với `data_dictionary.md` và `relationships.md`.

Truy vấn đối chiếu nhanh:

```sql
SELECT table_name, COUNT(*) AS columns
FROM information_schema.columns
WHERE table_schema='bookuser'
GROUP BY table_name ORDER BY table_name;

SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
FROM information_schema.statistics
WHERE table_schema='bookadmin'
GROUP BY table_name, index_name ORDER BY table_name, index_name;

SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE constraint_schema='bookuser'
ORDER BY table_name, constraint_name;
```

So sánh DDL trước/sau thay đổi:

```bash
mysqldump --no-data --skip-triggers --skip-comments bookuser > /tmp/bookuser_before.sql
# ... chạy migration ...
mysqldump --no-data --skip-triggers --skip-comments bookuser > /tmp/bookuser_after.sql
diff -u /tmp/bookuser_before.sql /tmp/bookuser_after.sql
```

## 9. Quy trình round-trip an toàn

1. Sửa SQL nguồn (`008_*.sql`), **không** sửa PDM trước.
2. Chạy migration trên môi trường phát triển.
3. `export_ddl.sh` → reverse lại vào PDM mới.
4. Dùng `Tools > Compare and Merge Models` (hoặc `diff` DDL) để xem khác biệt.
5. Cập nhật tài liệu (`generate_*.py`).
6. Chỉ sau khi PDM khớp DDL mới dùng PDM để trình bày/báo cáo.

Không dùng `Database > Generate Database` trực tiếp lên production: PowerDesigner có thể phát ra DDL thiếu `UNSIGNED`, `CHECK`, generated column hoặc collation.

## 10. Quản lý phiên bản

- Lưu `.pdm` trong `database/powerdesigner/` và dùng **Git LFS** (file nhị phân).
- Kèm `README.md` ghi phiên bản PowerDesigner, DBMS target, ngày reverse, người thực hiện.
- Xuất thêm XMI/HTML để review trong pull request (không cần cài PowerDesigner).
- Khóa file khi chỉnh sửa đồng thời; tránh merge nhị phân.
- Đặt tên: `BOOKFORFREEDOM_bookuser_v1.pdm`, tăng version khi có thay đổi lớn.

## 11. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Unrecognized statement` | Trigger, `DELIMITER`, `DEFINER` | Dùng file export không trigger; bỏ qua cảnh báo |
| Không thấy bảng | Sai encoding/parse dừng sớm | Đổi UTF-8; kiểm tra `Output`; nạp từng file |
| FK không được tạo | Thiếu bảng đích hoặc kiểu không khớp | Nạp đủ bảng; kiểm tra unsigned/length |
| Tên cột lạ | Auto-fix tên | Tắt auto-fix, reverse lại |
| View lỗi | Phụ thuộc schema khác | Nạp đủ hai model hoặc bỏ view khỏi lần reverse đầu |
| Model chậm | Quá nhiều bảng/diagram | Tắt auto-layout, đóng diagram không dùng |

## 12. Checklist bàn giao PDM

- [ ] Đúng 35 bảng `bookuser`, 28 bảng `bookadmin`.
- [ ] Đúng 57 FK `bookuser`, 31 FK `bookadmin`, 0 FK xuyên schema.
- [ ] 1 view `bookuser`, 2 view `bookadmin`.
- [ ] PK/UK/index/comment hiển thị đầy đủ.
- [ ] Các cột `BIGINT UNSIGNED`, `DATETIME(3)`, `BINARY(32)`, generated đã được đánh dấu/kiểm tra.
- [ ] Không có FK ảo giữa hai schema.
- [ ] Diagram có chú giải màu và ngày reverse.
- [ ] Báo cáo HTML/RTF khớp `data_dictionary.md`.

---

Hết powerdesigner_guide.md
