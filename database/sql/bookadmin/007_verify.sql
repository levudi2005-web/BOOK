-- =====================================================================
-- BOOKFORFREEDOM - Schema bookadmin
-- 007_verify.sql : Kiểm tra cấu trúc sau khi cài đặt (chỉ đọc)
-- =====================================================================
USE `bookadmin`;
SET NAMES utf8mb4;

SELECT '01. Charset/collation database' AS `check_name`,
       CONCAT(s.`default_character_set_name`, '/', s.`default_collation_name`) AS `actual`,
       'utf8mb4/utf8mb4_unicode_ci' AS `expected`,
       IF(s.`default_character_set_name` = 'utf8mb4' AND s.`default_collation_name` = 'utf8mb4_unicode_ci', 'PASS', 'FAIL') AS `status`
FROM information_schema.schemata s WHERE s.`schema_name` = 'bookadmin'
UNION ALL
SELECT '02. Số bảng (base table)', COUNT(*), '28', IF(COUNT(*) = 28, 'PASS', 'FAIL')
FROM information_schema.tables WHERE `table_schema` = 'bookadmin' AND `table_type` = 'BASE TABLE'
UNION ALL
SELECT '03. Số view', COUNT(*), '2', IF(COUNT(*) = 2, 'PASS', 'FAIL')
FROM information_schema.views WHERE `table_schema` = 'bookadmin'
UNION ALL
SELECT '04. Số khóa ngoại', COUNT(*), '31', IF(COUNT(*) = 31, 'PASS', 'FAIL')
FROM information_schema.referential_constraints WHERE `constraint_schema` = 'bookadmin'
UNION ALL
SELECT '05. Bảng thiếu PRIMARY KEY', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.tables t
WHERE t.`table_schema` = 'bookadmin' AND t.`table_type` = 'BASE TABLE'
  AND NOT EXISTS (SELECT 1 FROM information_schema.statistics st
                  WHERE st.`table_schema` = t.`table_schema` AND st.`table_name` = t.`table_name`
                    AND st.`index_name` = 'PRIMARY')
UNION ALL
SELECT '06. Bảng không dùng InnoDB', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.tables WHERE `table_schema` = 'bookadmin' AND `table_type` = 'BASE TABLE' AND `engine` <> 'InnoDB'
UNION ALL
SELECT '07. Bảng không phải utf8mb4', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.tables WHERE `table_schema` = 'bookadmin' AND `table_type` = 'BASE TABLE' AND `table_collation` NOT LIKE 'utf8mb4%'
UNION ALL
SELECT '08. Bảng thiếu COMMENT', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.tables WHERE `table_schema` = 'bookadmin' AND `table_type` = 'BASE TABLE' AND `table_comment` = ''
UNION ALL
SELECT '09. Cột thiếu COMMENT', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.columns c
WHERE c.`table_schema` = 'bookadmin' AND c.`column_comment` = ''
  AND EXISTS (SELECT 1 FROM information_schema.tables t
              WHERE t.`table_schema` = c.`table_schema` AND t.`table_name` = c.`table_name` AND t.`table_type` = 'BASE TABLE')
UNION ALL
SELECT '10. FK xuyên database', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.referential_constraints
WHERE `constraint_schema` = 'bookadmin' AND `unique_constraint_schema` <> 'bookadmin'
UNION ALL
SELECT '11. FK lệch kiểu dữ liệu', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.key_column_usage k
JOIN information_schema.columns c
  ON c.`table_schema` = k.`table_schema` AND c.`table_name` = k.`table_name` AND c.`column_name` = k.`column_name`
JOIN information_schema.referential_constraints rc
  ON rc.`constraint_schema` = k.`constraint_schema` AND rc.`constraint_name` = k.`constraint_name`
JOIN information_schema.key_column_usage k2
  ON k2.`constraint_schema` = rc.`unique_constraint_schema` AND k2.`constraint_name` = rc.`unique_constraint_name`
 AND k2.`ordinal_position` = k.`ordinal_position`
JOIN information_schema.columns c2
  ON c2.`table_schema` = k2.`table_schema` AND c2.`table_name` = k2.`table_name` AND c2.`column_name` = k2.`column_name`
WHERE k.`constraint_schema` = 'bookadmin'
  AND (c.`column_type` <> c2.`column_type`
       OR IFNULL(c.`character_set_name`, '') <> IFNULL(c2.`character_set_name`, '')
       OR IFNULL(c.`collation_name`, '') <> IFNULL(c2.`collation_name`, ''))
UNION ALL
SELECT '12. Cột FK không có index trái cùng', COUNT(*), '0', IF(COUNT(*) = 0, 'PASS', 'FAIL')
FROM information_schema.key_column_usage k
WHERE k.`constraint_schema` = 'bookadmin' AND k.`ordinal_position` = 1
  AND NOT EXISTS (SELECT 1 FROM information_schema.statistics st
                  WHERE st.`table_schema` = k.`table_schema` AND st.`table_name` = k.`table_name`
                    AND st.`column_name` = k.`column_name` AND st.`seq_in_index` = 1)
UNION ALL
SELECT '13. Cột generated STORED (partial unique)', COUNT(*), '>=2', IF(COUNT(*) >= 2, 'PASS', 'FAIL')
FROM information_schema.columns WHERE `table_schema` = 'bookadmin' AND `extra` LIKE '%STORED GENERATED%'
UNION ALL
SELECT '14. CHECK constraint', COUNT(*), '>=1', IF(COUNT(*) >= 1, 'PASS', 'FAIL')
FROM information_schema.check_constraints WHERE `constraint_schema` = 'bookadmin'
UNION ALL
SELECT '15. Trigger bảo vệ append-only', COUNT(*), '4', IF(COUNT(*) = 4, 'PASS', 'FAIL')
FROM information_schema.triggers WHERE `trigger_schema` = 'bookadmin'
UNION ALL
SELECT '16. Cột hash chuỗi audit log', COUNT(*), '2', IF(COUNT(*) = 2, 'PASS', 'FAIL')
FROM information_schema.columns
WHERE `table_schema` = 'bookadmin' AND `table_name` = 'admin_audit_logs'
  AND `column_name` IN ('prev_hash', 'record_hash')
UNION ALL
SELECT '17. Vai trò hệ thống', COUNT(*), '7', IF(COUNT(*) = 7, 'PASS', 'FAIL')
FROM `admin_roles` WHERE `is_system` = 1
UNION ALL
SELECT '18. Quyền hệ thống', COUNT(*), '76', IF(COUNT(*) = 76, 'PASS', 'FAIL')
FROM `admin_permissions` WHERE `is_system` = 1
UNION ALL
SELECT '19. Gán quyền cho vai trò', COUNT(*), '>=200', IF(COUNT(*) >= 200, 'PASS', 'FAIL')
FROM `admin_role_permissions`
UNION ALL
SELECT '20. Lý do báo cáo', COUNT(*), '12', IF(COUNT(*) = 12, 'PASS', 'FAIL')
FROM `report_reasons` WHERE `is_active` = 1
UNION ALL
SELECT '21. Tài khoản quản trị khởi tạo (thông tin)', COUNT(*), '0', 'INFO'
FROM `admin_accounts`
UNION ALL
SELECT '22. Bảng outbox/inbox tồn tại', COUNT(*), '2', IF(COUNT(*) = 2, 'PASS', 'FAIL')
FROM information_schema.tables
WHERE `table_schema` = 'bookadmin' AND `table_name` IN ('integration_outbox', 'integration_inbox')
UNION ALL
SELECT '23. Unique event_id (outbox)', COUNT(*), '1', IF(COUNT(*) = 1, 'PASS', 'FAIL')
FROM information_schema.statistics
WHERE `table_schema` = 'bookadmin' AND `table_name` = 'integration_outbox'
  AND `column_name` = 'event_id' AND `non_unique` = 0
UNION ALL
SELECT '24. Unique event_id (inbox)', COUNT(*), '1', IF(COUNT(*) = 1, 'PASS', 'FAIL')
FROM information_schema.statistics
WHERE `table_schema` = 'bookadmin' AND `table_name` = 'integration_inbox'
  AND `column_name` = 'event_id' AND `non_unique` = 0;

-- =====================================================================
-- Hết 007_verify.sql (bookadmin)
-- =====================================================================