# Docker

Cấu hình Docker phát triển và triển khai. Các service nền được khai báo tại `docker-compose.yml`; cấu hình riêng của MariaDB nằm trong `mariadb/`.

## MariaDB

Service `mariadb` dùng image `mariadb:10.11`, UTF-8 (`utf8mb4_unicode_ci`), múi giờ UTC, `sql_mode` strict và healthcheck bằng `healthcheck.sh`.

- Cổng host mặc định: `127.0.0.1:3307` → container `3306` (đổi bằng `MARIADB_PORT`). Cổng 3307 tránh xung đột với MariaDB cài trực tiếp trên máy.
- Volume dữ liệu: `mariadb_data`.
- Lần đầu tạo volume, container chạy `mariadb/init.sh`, script này:
  1. Chạy `database/sql/install_all.sql` (hai schema, view, seed, verify).
  2. Tạo `app_bookuser` với `SELECT/INSERT/UPDATE/DELETE` trên `bookuser.*`.
  3. Cấp thêm `SELECT` trên `bookadmin.admin_announcements` cho `app_bookuser` (view `v_public_announcements` là `SQL SECURITY INVOKER`).
  4. Tạo `app_bookadmin` với `SELECT/INSERT/UPDATE/DELETE` trên `bookadmin.*`.

Tài khoản lấy từ `.env`: `BOOKUSER_DB_USER/PASSWORD`, `BOOKADMIN_DB_USER/PASSWORD`.

### Lệnh thường dùng

```bash
docker compose up -d mariadb
docker compose logs -f mariadb
docker compose exec mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES;"'
docker compose exec mariadb sh -c 'mariadb -uapp_bookuser -p"$BOOKUSER_DB_PASSWORD" bookuser -e "SELECT COUNT(*) FROM v_public_announcements;"'
docker compose exec mariadb sh -c 'mariadb -uapp_bookadmin -p"$BOOKADMIN_DB_PASSWORD" bookadmin -e "SELECT COUNT(*) FROM admin_roles;"'
```

### Khởi tạo lại database

Init script **chỉ chạy khi volume còn trống**. Khi đổi mật khẩu trong `.env`, cập nhật tài khoản đã tạo (kể cả root) bằng `ALTER USER` hoặc xóa volume rồi tạo lại. Xóa volume MariaDB (không ảnh hưởng Redis/MinIO/Meilisearch):

```bash
docker compose rm -sf mariadb
docker volume rm bookforfreedom_mariadb_data
docker compose up -d mariadb
```

> `docker compose down -v` sẽ xóa **tất cả** volume của project, không chỉ MariaDB.

### Nâng cấp schema trên volume đã có

Chạy lại bộ SQL idempotent từ host:

```bash
docker compose exec -T mariadb sh -c 'cd /opt/bookfreedom/sql && mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < install_all.sql'
```

### Backup / restore

```bash
docker compose exec -T mariadb sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --events --databases bookuser bookadmin' > bookfreedom-$(date +%F).sql
docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' < bookfreedom-YYYY-MM-DD.sql
```

Kiểm tra cấu hình trước khi chạy: `docker compose config`. Khi chuyển từ stack PostgreSQL cũ, dùng `docker compose up -d --remove-orphans` để dọn container `postgres`; volume PostgreSQL cũ không bị xóa tự động.
