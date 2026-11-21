#!/bin/bash
# =====================================================================
# BOOKFORFREEDOM - Tạo service accounts tách quyền (User Auth / Admin
# Auth / Admin Management) cho DB đang chạy. Idempotent, không DROP.
#
# Chạy:  set -a && . ./.env && set +a && bash scripts/create-service-accounts.sh
# =====================================================================
set -Eeuo pipefail

ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:?MARIADB_ROOT_PASSWORD missing}"

USER_AUTH_USER="${SVC_USER_AUTH_USER:-svc_user_auth}"
ADMIN_AUTH_USER="${SVC_ADMIN_AUTH_USER:-svc_admin_auth}"
ADMIN_MGMT_USER="${SVC_ADMIN_MGMT_USER:-svc_admin_mgmt}"

# Sinh mật khẩu ngẫu nhiên nếu chưa có (không ghi đè nếu đã cấu hình).
if [ -z "${SVC_USER_AUTH_PASSWORD:-}" ]; then
  SVC_USER_AUTH_PASSWORD="$(openssl rand -hex 32)"
fi
if [ -z "${SVC_ADMIN_AUTH_PASSWORD:-}" ]; then
  SVC_ADMIN_AUTH_PASSWORD="$(openssl rand -hex 32)"
fi
if [ -z "${SVC_ADMIN_MGMT_PASSWORD:-}" ]; then
  SVC_ADMIN_MGMT_PASSWORD="$(openssl rand -hex 32)"
fi

escape_sql() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"; }

UA_USER_SQL="$(escape_sql "$USER_AUTH_USER")"
UA_PASS_SQL="$(escape_sql "$SVC_USER_AUTH_PASSWORD")"
AA_USER_SQL="$(escape_sql "$ADMIN_AUTH_USER")"
AA_PASS_SQL="$(escape_sql "$SVC_ADMIN_AUTH_PASSWORD")"
AM_USER_SQL="$(escape_sql "$ADMIN_MGMT_USER")"
AM_PASS_SQL="$(escape_sql "$SVC_ADMIN_MGMT_PASSWORD")"

docker exec -i bookforfreedom-mariadb-1 mariadb -uroot -p"$ROOT_PASSWORD" --default-character-set=utf8mb4 <<SQL
-- User Auth: chỉ 4 bảng xác thực của bookuser
CREATE USER IF NOT EXISTS '${UA_USER_SQL}'@'%' IDENTIFIED BY '${UA_PASS_SQL}';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.users TO '${UA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.user_sessions TO '${UA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.user_recovery_credentials TO '${UA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.user_security_tokens TO '${UA_USER_SQL}'@'%';

-- Admin Auth: chỉ các bảng xác thực của bookadmin
CREATE USER IF NOT EXISTS '${AA_USER_SQL}'@'%' IDENTIFIED BY '${AA_PASS_SQL}';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_accounts TO '${AA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_sessions TO '${AA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_recovery_credentials TO '${AA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_security_tokens TO '${AA_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_login_attempts TO '${AA_USER_SQL}'@'%';

-- Admin Management: đọc bookuser (user lookup) + ghi bảng quản trị (không auth)
CREATE USER IF NOT EXISTS '${AM_USER_SQL}'@'%' IDENTIFIED BY '${AM_PASS_SQL}';
GRANT SELECT ON bookuser.* TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_audit_logs TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.admin_announcements TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.moderation_cases TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.moderation_actions TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.content_reports TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.user_restrictions TO '${AM_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.system_settings TO '${AM_USER_SQL}'@'%';
GRANT SELECT ON bookadmin.admin_roles TO '${AM_USER_SQL}'@'%';
GRANT SELECT ON bookadmin.admin_permissions TO '${AM_USER_SQL}'@'%';
GRANT SELECT ON bookadmin.admin_role_permissions TO '${AM_USER_SQL}'@'%';
GRANT SELECT ON bookadmin.admin_account_roles TO '${AM_USER_SQL}'@'%';
SQL

echo "=== VERIFY GRANTS (thật, từ MariaDB) ==="
for U in "$USER_AUTH_USER" "$ADMIN_AUTH_USER" "$ADMIN_MGMT_USER"; do
  echo "--- $U ---"
  docker exec bookforfreedom-mariadb-1 mariadb -uroot -p"$ROOT_PASSWORD" -e "SHOW GRANTS FOR '$U'@'%';" 2>/dev/null
done

echo ""
echo "=== SERVICE ACCOUNT PASSWORDS (lưu vào .env; KHÔNG commit) ==="
echo "SVC_USER_AUTH_PASSWORD=$SVC_USER_AUTH_PASSWORD"
echo "SVC_ADMIN_AUTH_PASSWORD=$SVC_ADMIN_AUTH_PASSWORD"
echo "SVC_ADMIN_MGMT_PASSWORD=$SVC_ADMIN_MGMT_PASSWORD"
