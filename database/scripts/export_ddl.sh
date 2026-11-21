#!/usr/bin/env bash
# =====================================================================
# Xuất DDL tổng hợp (không dữ liệu) để reverse engineer bằng PowerDesigner.
# Cách dùng:
#   ./database/scripts/export_ddl.sh
#   MYSQL_CMD="mysql -h127.0.0.1 -uroot -p" ./database/scripts/export_ddl.sh
# Yêu cầu: mariadb-dump (hoặc mysqldump) và quyền đọc information_schema.
# =====================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/database/ddl"
DUMP_BIN="${DUMP_BIN:-$(command -v mariadb-dump || command -v mysqldump)}"
# MYSQL_CMD chỉ dùng để kiểm tra kết nối; mariadb-dump tự đọc cấu hình mặc định.
MYSQL_CMD="${MYSQL_CMD:-mysql}"

if [[ -z "${DUMP_BIN:-}" ]]; then
  echo "LỖI: không tìm thấy mariadb-dump/mysqldump" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for schema in bookuser bookadmin; do
  out_file="$OUT_DIR/${schema}_schema.sql"
  echo "==> Xuất DDL $schema -> $out_file"
  # Bỏ trigger khỏi bản export: PowerDesigner không mô hình hóa trigger và
  # DEFINER trong dump không phù hợp để phát hành. Trigger gốc nằm ở 002/003.
  "$DUMP_BIN" \
    --no-data \
    --routines \
    --skip-triggers \
    --events \
    --single-transaction \
    --skip-dump-date \
    --skip-comments \
    --default-character-set=utf8mb4 \
    --databases "$schema" > "$out_file"

  # Bỏ dòng sandbox của mariadb-dump để PowerDesigner phân tích sạch
  sed -i '/\/\*M!999999/d' "$out_file"

  # Kiểm tra tối thiểu: có bảng và không có dữ liệu INSERT
  if ! grep -q "CREATE TABLE" "$out_file"; then
    echo "LỖI: $out_file không chứa CREATE TABLE" >&2
    exit 1
  fi
  if grep -qE "^INSERT INTO" "$out_file"; then
    echo "LỖI: $out_file chứa INSERT (phải là DDL-only)" >&2
    exit 1
  fi
  echo "    OK: $(grep -c 'CREATE TABLE' "$out_file") bảng, $(grep -c 'CONSTRAINT .*FOREIGN KEY' "$out_file") FK"
done

echo "Hoàn tất. Nạp hai file trong $OUT_DIR vào PowerDesigner (Reverse Engineer > Database > Using script files)."
