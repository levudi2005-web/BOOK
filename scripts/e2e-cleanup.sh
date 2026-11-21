#!/bin/bash
# Xóa dữ liệu test E2E (username like 'e2e_%', book title like 'E2E%', document title like 'Tài liệu E2E%').
# Idempotent; chỉ xóa dữ liệu test, không đụng dữ liệu thật.
set -Eeuo pipefail
cd /var/www/BOOKFORFREEDOM
set -a; . ./.env; set +a

docker exec -i bookforfreedom-mariadb-1 mariadb -u root -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 <<'SQL'
DELETE FROM bookuser.user_library WHERE user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.reading_progress WHERE user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.reading_history WHERE user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.comments WHERE user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.reviews WHERE user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.office_documents WHERE owner_user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%');
DELETE FROM bookuser.books WHERE created_by_user_id IN (SELECT user_id FROM bookuser.users WHERE username LIKE 'e2e_%') OR title LIKE 'E2E Sách %';
DELETE FROM bookuser.users WHERE username LIKE 'e2e_%';
DELETE FROM bookadmin.admin_sessions WHERE admin_id IN (SELECT admin_id FROM bookadmin.admin_accounts WHERE username LIKE 'e2e_%');
DELETE FROM bookadmin.admin_recovery_credentials WHERE admin_id IN (SELECT admin_id FROM bookadmin.admin_accounts WHERE username LIKE 'e2e_%');
DELETE FROM bookadmin.admin_account_roles WHERE admin_id IN (SELECT admin_id FROM bookadmin.admin_accounts WHERE username LIKE 'e2e_%');
DELETE FROM bookadmin.admin_accounts WHERE username LIKE 'e2e_%';
SQL
echo 'E2E cleanup done.'
