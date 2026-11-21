#!/bin/bash
# =====================================================================
# BOOKFORFREEDOM - Áp dụng MIGRATIONS cho MariaDB TEST/STAGING cô lập
# ---------------------------------------------------------------------
# `install_all.sql` chỉ chứa baseline (bookuser/bookadmin 001-007).
# Các bảng bắt buộc cho auth/session/storage/studio nằm trong
# migrations/008..011, nên test stack phải áp dụng chúng sau baseline.
#
# Script chỉ được mount vào database test/staging cô lập (volume mới).
# =====================================================================
set -Eeuo pipefail

ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-}"
SQL_DIR="/opt/bookfreedom/sql"

run_root() {
  if [ -n "$ROOT_PASSWORD" ] \
    && MYSQL_PWD="$ROOT_PASSWORD" mariadb --protocol=socket -uroot -e 'SELECT 1' >/dev/null 2>&1; then
    MYSQL_PWD="$ROOT_PASSWORD" mariadb --protocol=socket -uroot "$@"
  else
    mariadb --protocol=socket -uroot "$@"
  fi
}

for file in \
  008_security_tokens.sql \
  009_recovery_credentials.sql \
  010_storage.sql \
  011_author_studio.sql \
  012_seed_categories.sql \
  013_publication_scopes.sql; do
  echo "[bookfreedom-test] applying migrations/$file"
  run_root --default-character-set=utf8mb4 < "$SQL_DIR/migrations/$file"
done

echo "[bookfreedom-test] migrations applied."
