-- =====================================================================
-- BOOKFORFREEDOM - Migration 017
-- Cấu hình khung trang sách, thời gian đọc và phản hồi người dùng.
-- Idempotent, chỉ thêm cột/bảng, không xoá dữ liệu.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

ALTER TABLE `books`
  ADD COLUMN IF NOT EXISTS `trim_size` VARCHAR(20) NOT NULL DEFAULT 'A5' AFTER `age_rating`,
  ADD COLUMN IF NOT EXISTS `trim_width_mm` DECIMAL(6,2) NOT NULL DEFAULT 148.00 AFTER `trim_size`,
  ADD COLUMN IF NOT EXISTS `trim_height_mm` DECIMAL(6,2) NOT NULL DEFAULT 210.00 AFTER `trim_width_mm`,
  ADD COLUMN IF NOT EXISTS `page_style` ENUM('blank','lines','grid') NOT NULL DEFAULT 'lines' AFTER `trim_height_mm`,
  ADD COLUMN IF NOT EXISTS `page_effect` ENUM('paper','flip','web') NOT NULL DEFAULT 'paper' AFTER `page_style`,
  ADD COLUMN IF NOT EXISTS `show_page_numbers` TINYINT(1) NOT NULL DEFAULT 1 AFTER `page_effect`,
  ADD COLUMN IF NOT EXISTS `reader_default_mode` ENUM('page','flip','scroll') NOT NULL DEFAULT 'page' AFTER `show_page_numbers`;

ALTER TABLE `reading_progress`
  ADD COLUMN IF NOT EXISTS `seconds_read` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `total_pages`;

CREATE TABLE IF NOT EXISTS `user_feedback` (
  `feedback_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `feedback_uuid` CHAR(36) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `kind` ENUM('feedback','report','idea') NOT NULL DEFAULT 'feedback',
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `page_path` VARCHAR(500) NULL DEFAULT NULL,
  `status` ENUM('new','read','resolved') NOT NULL DEFAULT 'new',
  `admin_note` VARCHAR(1000) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`feedback_id`),
  UNIQUE KEY `uq_user_feedback_uuid` (`feedback_uuid`),
  KEY `idx_user_feedback_status_created` (`status`, `created_at`),
  KEY `idx_user_feedback_user` (`user_id`, `created_at`),
  KEY `idx_user_feedback_kind` (`kind`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phản hồi/báo cáo/ý tưởng một chiều gửi tới admin';

INSERT INTO `bff_migration_log` (`migration_name`, `postcondition_json`, `status`)
VALUES (
  '017_book_layout_reading_feedback',
  JSON_OBJECT(
    'books_with_layout', (SELECT COUNT(*) FROM `books` WHERE `trim_width_mm` > 0),
    'feedback_rows', (SELECT COUNT(*) FROM `user_feedback`)
  ),
  'applied'
) ON DUPLICATE KEY UPDATE
  `postcondition_json` = VALUES(`postcondition_json`),
  `status` = 'applied';
