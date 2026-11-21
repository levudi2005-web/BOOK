-- =====================================================================
-- BOOKFORFREEDOM - Schema bookuser
-- 005_create_views.sql : View công khai cho ứng dụng người dùng
-- ---------------------------------------------------------------------
-- v_public_announcements đọc bảng admin_announcements của schema bookadmin.
-- Đây là phụ thuộc MỘT CHIỀU (bookuser -> bookadmin), chỉ đọc, không FK.
-- View dùng SQL SECURITY INVOKER: tài khoản ứng dụng cần được cấp:
--   GRANT SELECT ON `bookadmin`.`admin_announcements` TO '<app_user>'@'<host>';
-- (xem database/docs/installation.md - phần phân quyền DB)
-- =====================================================================

USE `bookuser`;
SET NAMES utf8mb4;

DROP VIEW IF EXISTS `v_public_announcements`;

CREATE SQL SECURITY INVOKER VIEW `v_public_announcements` AS
SELECT
  a.`announcement_uuid`,
  a.`title`,
  a.`body`,
  a.`severity`,
  a.`publish_at`,
  a.`expires_at`,
  a.`created_at`,
  a.`updated_at`
FROM `bookadmin`.`admin_announcements` a
WHERE a.`status` = 'published'
  AND a.`audience` IN ('all', 'users')
  AND (a.`publish_at` IS NULL OR a.`publish_at` <= NOW(3))
  AND (a.`expires_at` IS NULL OR a.`expires_at` > NOW(3));

-- =====================================================================
-- Hết 005_create_views.sql (bookuser)
-- =====================================================================