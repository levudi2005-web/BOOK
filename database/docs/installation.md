# Hướng dẫn cài đặt và vận hành database

## 1. Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|---|---|
| MariaDB Server | **10.11+** (đã kiểm thử 10.11.14 native và 10.11.19 trong Docker), InnoDB, `utf8mb4` |
| Client | `mariadb`/`mysql` CLI, hỗ trợ `SOURCE` |
| Docker (tùy chọn) | Docker Engine + Compose plugin cho chế độ container |
| Python (tùy chọn) | 3.9+ (chỉ dùng thư viện chuẩn) để sinh tài liệu |
| Múi giờ | UTC cho cả server và phiên |
| Dung lượng | ≥ 2 GB trống cho dữ liệu + backup ban đầu |

Kiểm tra nhanh:

```bash
mysql -N -B -e "SELECT VERSION(), @@global.time_zone, @@system_time_zone, @@character_set_server;"
# Kỳ vọng: 10.11.x | +00:00 hoặc SYSTEM (nếu OS đã là UTC) | UTC | utf8mb4
```

Nếu `time_zone` chưa phải UTC, đặt trong `/etc/mysql/mariadb.conf.d/99-bookfreedom.cnf`:

```ini
[mysqld]
default-time-zone = '+00:00'
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

rồi `systemctl restart mariadb`.

## 2. Cấu trúc gói

```
database/
├── sql/
│   ├── install_all.sql              # cài đặt toàn bộ, đúng thứ tự
│   ├── bookadmin/001..007_*.sql
│   └── bookuser/001..007_*.sql
├── scripts/
│   ├── generate_data_dictionary.py
│   ├── generate_relationships.py
│   └── generate_erds.py
├── docs/                            # data dictionary, quan hệ, API, bảo mật...
└── diagrams/                        # architecture.mmd, erd_*.mmd
```

Thứ tự file trong mỗi schema:
1. `001_create_database.sql` — tạo database, charset/collation.
2. `002_create_tables.sql` — bảng, cột, PK/UK/CHECK, generated column, trigger audit.
3. `003_create_constraints.sql` — FK (idempotent qua helper).
4. `004_create_indexes.sql` — index bổ sung.
5. `005_create_views.sql` — view đọc/tổng hợp.
6. `006_seed_reference_data.sql` — dữ liệu tham chiếu (idempotent).
7. `007_verify.sql` — kiểm tra PASS/FAIL/INFO.

## 3. Cài đặt lần đầu

```bash
cd /var/www/BOOKFORFREEDOM/database/sql
sudo mysql --default-character-set=utf8mb4 < install_all.sql
```

Ghi log để đối chiếu:

```bash
sudo mysql --default-character-set=utf8mb4 < install_all.sql 2>&1 | tee /tmp/bookfreedom_install.log
grep -E "FAIL|ERROR" /tmp/bookfreedom_install.log || echo "Không có FAIL/ERROR"
```

`install_all.sql` chạy **bookadmin 001→006** trước, sau đó **bookuser 001→007**, cuối cùng **bookadmin 007**. Lý do: `bookuser.v_public_announcements` đọc `bookadmin.admin_announcements`.

Đặc điểm an toàn:
- Không chứa `DROP DATABASE`; chạy lại không mất dữ liệu.
- Không tạo tài khoản admin/mật khẩu mặc định.
- DDL idempotent (`CREATE TABLE IF NOT EXISTS`, helper FK kiểm tra `information_schema`).

### 3.1 Cài riêng từng schema

```bash
cd /var/www/BOOKFORFREEDOM/database/sql/bookadmin
for f in 001_*.sql 002_*.sql 003_*.sql 004_*.sql 005_*.sql 006_*.sql; do
  sudo mysql --default-character-set=utf8mb4 < "$f" || exit 1
done

cd ../bookuser
for f in 001_*.sql 002_*.sql 003_*.sql 004_*.sql 005_*.sql 006_*.sql 007_*.sql; do
  sudo mysql --default-character-set=utf8mb4 < "$f" || exit 1
done

cd ../bookadmin && sudo mysql --default-character-set=utf8mb4 < 007_verify.sql
```

> Khi cài riêng `bookuser` trên server chưa có `bookadmin`, bỏ qua `005_create_views.sql` (view `v_public_announcements` sẽ lỗi 1146), cài `bookadmin` trước rồi quay lại bước này.

## 4. Cài lại sạch (chỉ môi trường phát triển)

```bash
# CẢNH BÁO: xóa toàn bộ dữ liệu hai schema
sudo mysql -e "DROP DATABASE IF EXISTS bookuser; DROP DATABASE IF EXISTS bookadmin;"

cd /var/www/BOOKFORFREEDOM/database/sql
sudo mysql --default-character-set=utf8mb4 < install_all.sql
```

Không dùng cách này trên production. Với production, dùng migration tăng dần (`008_*.sql`, ...).

## 5. Cấp quyền sau cài đặt

```sql
-- Ứng dụng người dùng
CREATE USER IF NOT EXISTS 'app_bookuser'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.* TO 'app_bookuser'@'10.0.%';
-- Bắt buộc cho view v_public_announcements (SQL SECURITY INVOKER)
GRANT SELECT ON bookadmin.admin_announcements TO 'app_bookuser'@'10.0.%';

-- Ứng dụng quản trị
CREATE USER IF NOT EXISTS 'app_bookadmin'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.* TO 'app_bookadmin'@'10.0.%';

-- Worker tích hợp
CREATE USER IF NOT EXISTS 'svc_integration'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, UPDATE ON bookuser.integration_outbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookuser.integration_inbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookadmin.integration_outbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookadmin.integration_inbox TO 'svc_integration'@'10.0.%';

FLUSH PRIVILEGES;
```

Kiểm tra quyền thực tế:

```sql
SHOW GRANTS FOR 'app_bookuser'@'10.0.%';
SELECT COUNT(*) FROM bookuser.v_public_announcements;  -- phải chạy được
```

Chi tiết mô hình quyền: xem `security.md`.

## 6. Kiểm tra sau cài đặt

```bash
sudo mysql --default-character-set=utf8mb4 < database/sql/bookuser/007_verify.sql
sudo mysql --default-character-set=utf8mb4 < database/sql/bookadmin/007_verify.sql
```

Cách đọc kết quả:
- `PASS`: đạt yêu cầu.
- `FAIL`: phải xử lý trước khi chạy ứng dụng.
- `INFO`: số liệu tham khảo (không chặn).

Kiểm tra nhanh thủ công:

```sql
SELECT table_schema, COUNT(*) AS tables
FROM information_schema.tables
WHERE table_schema IN ('bookuser','bookadmin') AND table_type='BASE TABLE'
GROUP BY table_schema;

SELECT COUNT(*) AS fk_total
FROM information_schema.referential_constraints
WHERE constraint_schema IN ('bookuser','bookadmin');

SELECT COUNT(*) AS cross_db_fk
FROM information_schema.key_column_usage
WHERE constraint_schema IN ('bookuser','bookadmin')
  AND referenced_table_schema <> constraint_schema;   -- kỳ vọng 0

SELECT COUNT(*) FROM bookadmin.admin_audit_logs WHERE 1=0;  -- bảng tồn tại
SELECT COUNT(*) FROM bookadmin.admin_roles;                  -- 7
SELECT COUNT(*) FROM bookadmin.admin_permissions;            -- 76
SELECT COUNT(*) FROM bookadmin.report_reasons;               -- 12
SELECT COUNT(*) FROM bookuser.licenses;                      -- 8
```

## 7. Cấu hình ứng dụng

Ứng dụng nên dùng **hai kết nối riêng** (hai user DB) để giữ ranh giới schema:

```dotenv
# Người dùng
BOOKUSER_DB_HOST=127.0.0.1
BOOKUSER_DB_PORT=3306            # 3307 nếu dùng MariaDB trong Docker
BOOKUSER_DB_NAME=bookuser
BOOKUSER_DB_USER=app_bookuser
BOOKUSER_DB_PASSWORD=<strong-secret>

# Quản trị (chỉ tiến trình admin/worker cần)
BOOKADMIN_DB_HOST=127.0.0.1
BOOKADMIN_DB_PORT=3306           # 3307 nếu dùng MariaDB trong Docker
BOOKADMIN_DB_NAME=bookadmin
BOOKADMIN_DB_USER=app_bookadmin
BOOKADMIN_DB_PASSWORD=<strong-secret>
```

Yêu cầu kết nối:
- `charset=utf8mb4`, `collation=utf8mb4_unicode_ci`, `timezone=Z`.
- Bật prepared statement; không nối chuỗi SQL.
- Pool nhỏ cho worker (tránh giữ transaction lâu khi gửi sự kiện).

> Lưu ý tích hợp repo: `docker-compose.yml` đã chuyển sang **MariaDB 10.11**. Service `mariadb` tự chạy `database/sql/install_all.sql` khi volume mới và tạo hai user ứng dụng. API trong Compose dùng `mariadb:3306`; chạy app ngoài Docker dùng cổng host mặc định `3307`. Dùng driver MariaDB/MySQL (`mysql2`/`mariadb`), không dùng driver PostgreSQL.

### 7.1 Chạy database bằng Docker Compose

```bash
cp .env.example .env          # đổi toàn bộ mật khẩu trước khi dùng thật
docker compose up -d mariadb
docker compose ps mariadb
```

Lần đầu với volume trống, `infra/docker/mariadb/init.sh` sẽ:
1. Cài `bookadmin` rồi `bookuser` từ `database/sql/install_all.sql`.
2. Tạo `app_bookuser` (`SELECT/INSERT/UPDATE/DELETE` trên `bookuser.*`).
3. Cấp `SELECT` trên `bookadmin.admin_announcements` cho `app_bookuser` (do view `v_public_announcements` là `SQL SECURITY INVOKER`).
4. Tạo `app_bookadmin` (`SELECT/INSERT/UPDATE/DELETE` trên `bookadmin.*`).

Kiểm tra từ container:

```bash
docker compose exec mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES;"'
docker compose exec mariadb sh -c 'mariadb -uapp_bookuser -p"$BOOKUSER_DB_PASSWORD" bookuser -e "SELECT COUNT(*) FROM v_public_announcements;"'
docker compose exec mariadb sh -c 'mariadb -uapp_bookadmin -p"$BOOKADMIN_DB_PASSWORD" bookadmin -e "SELECT COUNT(*) FROM admin_roles;"'
```

Kết nối từ máy host (app `pnpm dev`):

```bash
mariadb -h127.0.0.1 -P3307 -uapp_bookuser -p bookuser
```

Các điểm cần nhớ:
- Cổng host đổi bằng `MARIADB_PORT`; mặc định `3307` để không đụng MariaDB hệ thống ở `3306`.
- Init script chỉ chạy khi volume `mariadb_data` trống. Nâng cấp schema trên volume đã có bằng cách chạy lại `install_all.sql` (idempotent), không xóa volume.
- Đổi mật khẩu trong `.env` không tự cập nhật tài khoản đã tạo (kể cả root); dùng `ALTER USER` hoặc tạo lại volume.
- Reset riêng MariaDB: `docker compose rm -sf mariadb && docker volume rm bookforfreedom_mariadb_data && docker compose up -d mariadb`.
- Backup: `docker compose exec -T mariadb sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --databases bookuser bookadmin' > backup.sql`.

Chi tiết vận hành Docker: [`infra/docker/README.md`](../../infra/docker/README.md).

## 8. Tạo tài khoản quản trị đầu tiên

Không có seed admin vì lý do bảo mật. Quy trình khuyến nghị:

1. Tạo tài khoản qua CLI nội bộ có kiểm soát (sinh Argon2id ở ứng dụng, không ở SQL).
2. Gán vai trò `SUPER_ADMIN`:

```sql
INSERT INTO bookadmin.admin_accounts
  (admin_uuid, username, email, password_hash, password_algorithm,
   status, must_change_password, mfa_required)
VALUES
  (UUID(), 'rootadmin', 'rootadmin@example.com', '<argon2id-hash>', 'argon2id',
   'invited', 1, 1);

INSERT INTO bookadmin.admin_account_roles (admin_id, role_id, assigned_by_admin_id)
SELECT a.admin_id, r.role_id, a.admin_id
FROM bookadmin.admin_accounts a
JOIN bookadmin.admin_roles r ON r.code='SUPER_ADMIN'
WHERE a.username='rootadmin';
```

3. Đăng nhập, đổi mật khẩu, thiết lập TOTP/WebAuthn.
4. Tạo admin tiếp theo rồi giảm việc dùng `SUPER_ADMIN` hằng ngày.

Kiểm tra:

```sql
SELECT a.username, a.status, r.code
FROM bookadmin.admin_accounts a
JOIN bookadmin.admin_account_roles ar ON ar.admin_id=a.admin_id
JOIN bookadmin.admin_roles r ON r.role_id=ar.role_id
WHERE a.username='rootadmin';
```

## 9. Sinh lại tài liệu và sơ đồ

```bash
cd /var/www/BOOKFORFREEDOM
python3 database/scripts/generate_data_dictionary.py
python3 database/scripts/generate_relationships.py
python3 database/scripts/generate_erds.py
```

- Script đọc `information_schema` qua `mysql` CLI (không cần driver Python).
- Chạy lại sau mỗi thay đổi schema để tránh tài liệu lệch.
- Render Mermaid (nếu có `mmdc`):

```bash
mmdc -i database/diagrams/erd_bookuser.mmd -o database/diagrams/erd_bookuser.svg
mmdc -i database/diagrams/erd_bookadmin.mmd -o database/diagrams/erd_bookadmin.svg
mmdc -i database/diagrams/architecture.mmd -o database/diagrams/architecture.svg
```

## 10. Nâng cấp schema (production)

1. Sao lưu: `mariabackup --backup --target-dir=/backup/$(date +%F)`.
2. Tạo file mới, không sửa file đã phát hành: `008_add_<feature>.sql`.
3. Viết idempotent: kiểm tra `information_schema` trước khi `ADD COLUMN`/`ADD INDEX`.
4. Diễn tập trên bản sao; đo thời gian khóa bảng (`ALTER ... ALGORITHM=INPLACE, LOCK=NONE` nếu hỗ trợ).
5. Chạy trong cửa sổ bảo trì, theo dõi `SHOW PROCESSLIST`.
6. Chạy lại `007_verify.sql`; cập nhật `install_all.sql` nếu là bản cài mới.
7. Sinh lại tài liệu + ERD; ghi changelog.

Quy ước đặt tên: `NNN_verb_noun.sql` (ví dụ `008_add_book_audio_assets.sql`).

## 11. Sao lưu và phục hồi

```bash
# Full backup
sudo mariabackup --backup --target-dir=/backup/full-$(date +%F) --user=backup

# Prepare + restore (ví dụ)
sudo mariabackup --prepare --target-dir=/backup/full-2026-11-20
sudo systemctl stop mariadb
sudo mariabackup --copy-back --target-dir=/backup/full-2026-11-20
sudo chown -R mysql:mysql /var/lib/mysql
sudo systemctl start mariadb
```

- Bật `binlog` để phục hồi điểm thời gian.
- Kiểm tra restore định kỳ ở môi trường tách biệt.
- Không backup bằng `mysqldump` đang mở transaction dài trên bảng lớn.

## 12. Xử lý sự cố thường gặp

| Mã lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `1045 Access denied` | Sai user/mật khẩu/host | Kiểm tra `SHOW GRANTS`, host `'10.0.%'` vs `localhost` |
| `1049 Unknown database` | Chưa chạy `001` | Chạy `001_create_database.sql` |
| `1050 Table already exists` | File không idempotent | Không sửa tay; dùng `IF NOT EXISTS` trong file mới |
| `1062 Duplicate entry` | Seed chạy lại hoặc dữ liệu trùng | Seed phải dùng `INSERT ... ON DUPLICATE KEY UPDATE`/`WHERE NOT EXISTS` |
| `1146 Table doesn't exist` | Sai thứ tự cài đặt | Chạy `install_all.sql` đúng thứ tự |
| `1215 Cannot add foreign key` | Kiểu/collation khác, thiếu index, thứ tự bảng | So sánh `column_type`, chạy `003` sau `002` cả hai schema |
| `1452 FK constraint fails` | Dữ liệu mồ côi | Nạp dữ liệu cha trước; kiểm tra bằng `LEFT JOIN ... IS NULL` |
| `1449 The user specified as a definer` | View/trigger có definer không tồn tại | Tạo lại view/trigger hoặc dùng definer hợp lệ |
| `45000 Append-only` | Cố `UPDATE/DELETE admin_audit_logs` | Đúng thiết kế; ghi bản ghi bù |
| `1114 Table is full` / `1206` | Hết dung lượng/`tmpdir` | Kiểm tra `df -h`, `innodb_temp_data_file_path` |
| View `v_public_announcements` lỗi quyền | Thiếu `GRANT SELECT` bảng nguồn | Cấp quyền như mục 5 |

Thu thập chẩn đoán:

```sql
SHOW ENGINE INNODB STATUS\G
SELECT * FROM information_schema.innodb_trx ORDER BY trx_started LIMIT 10;
SHOW FULL PROCESSLIST;
SHOW WARNINGS;
```

## 13. Checklist bàn giao

- [ ] `install_all.sql` chạy sạch trên server mới, không FAIL/ERROR.
- [ ] Chạy lại lần hai vẫn sạch (idempotent).
- [ ] `bookadmin/admin_announcements` cấp quyền cho user ứng dụng.
- [ ] Hai user DB riêng, không dùng `root`.
- [ ] `007_verify.sql` PASS cho cả hai schema.
- [ ] Tài khoản admin đầu tiên đã đổi mật khẩu + MFA.
- [ ] Backup tự động + đã thử restore.
- [ ] Tài liệu/ERD sinh lại từ schema thực tế.

---

Hết installation.md
