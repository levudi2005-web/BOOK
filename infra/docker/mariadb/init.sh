#!/bin/bash
# =====================================================================
# BOOKFORFREEDOM - khởi tạo MariaDB trong Docker
# ---------------------------------------------------------------------
# Script này chỉ chạy khi volume `mariadb_data` còn trống. Nó:
#   1. Cài hai schema bookadmin/bookuser từ database/sql/install_all.sql
#   2. Tạo hai user ứng dụng với quyền tối thiểu
#   3. Cấp SELECT trên bookadmin.admin_announcements cho user bookuser
#      (bắt buộc vì view v_public_announcements là SQL SECURITY INVOKER)
#
# Biến môi trường (được docker-compose truyền vào):
#   MARIADB_ROOT_PASSWORD, BOOKUSER_DB_USER/PASSWORD, BOOKADMIN_DB_USER/PASSWORD
# =====================================================================
set -Eeuo pipefail

ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-}"
BOOKUSER_USER="${BOOKUSER_DB_USER:-app_bookuser}"
BOOKUSER_PASSWORD="${BOOKUSER_DB_PASSWORD:-replace-this-bookuser-password}"
BOOKADMIN_USER="${BOOKADMIN_DB_USER:-app_bookadmin}"
BOOKADMIN_PASSWORD="${BOOKADMIN_DB_PASSWORD:-replace-this-bookadmin-password}"
SQL_DIR="/opt/bookfreedom/sql"

escape_sql() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"
}

# Trong lúc init, root có thể đã có mật khẩu hoặc chưa (tùy phiên bản image).
# Thử bằng MYSQL_PWD trước, sau đó fallback về socket không mật khẩu.
sql_root() {
  if [ -n "$ROOT_PASSWORD" ] \
    && MYSQL_PWD="$ROOT_PASSWORD" mariadb --protocol=socket -uroot -e 'SELECT 1' >/dev/null 2>&1; then
    MYSQL_PWD="$ROOT_PASSWORD" mariadb --protocol=socket -uroot "$@"
  else
    mariadb --protocol=socket -uroot "$@"
  fi
}

if [ ! -f "$SQL_DIR/install_all.sql" ]; then
  echo "LỖI: không tìm thấy $SQL_DIR/install_all.sql" >&2
  exit 1
fi

echo "[bookfreedom] Đang cài đặt schema bookadmin + bookuser..."
cd "$SQL_DIR"
sql_root --default-character-set=utf8mb4 < install_all.sql

BOOKUSER_USER_SQL="$(escape_sql "$BOOKUSER_USER")"
BOOKUSER_PASSWORD_SQL="$(escape_sql "$BOOKUSER_PASSWORD")"
BOOKADMIN_USER_SQL="$(escape_sql "$BOOKADMIN_USER")"
BOOKADMIN_PASSWORD_SQL="$(escape_sql "$BOOKADMIN_PASSWORD")"

echo "[bookfreedom] Đang tạo user ứng dụng và cấp quyền tối thiểu..."
sql_root --default-character-set=utf8mb4 <<SQL
CREATE USER IF NOT EXISTS '${BOOKUSER_USER_SQL}'@'%' IDENTIFIED BY '${BOOKUSER_PASSWORD_SQL}';
ALTER USER '${BOOKUSER_USER_SQL}'@'%' IDENTIFIED BY '${BOOKUSER_PASSWORD_SQL}';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.* TO '${BOOKUSER_USER_SQL}'@'%';
GRANT SELECT ON bookadmin.admin_announcements TO '${BOOKUSER_USER_SQL}'@'%';

CREATE USER IF NOT EXISTS '${BOOKADMIN_USER_SQL}'@'%' IDENTIFIED BY '${BOOKADMIN_PASSWORD_SQL}';
ALTER USER '${BOOKADMIN_USER_SQL}'@'%' IDENTIFIED BY '${BOOKADMIN_PASSWORD_SQL}';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.* TO '${BOOKADMIN_USER_SQL}'@'%';
SQL

echo "[bookfreedom] Khởi tạo database hoàn tất."
