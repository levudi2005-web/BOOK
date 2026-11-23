-- =====================================================================
-- BOOKFORFREEDOM - Migration 016: phân loại độ tuổi riêng cho sách
-- ---------------------------------------------------------------------
-- Không trộn độ tuổi vào 64 thể loại.
-- Giá trị: all, 6+, 13+, 16+, 18+, 19+
-- Idempotent, additive, không xoá dữ liệu.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

ALTER TABLE `books`
  ADD COLUMN IF NOT EXISTS `age_rating`
    ENUM('all','6+','13+','16+','18+','19+') NOT NULL DEFAULT 'all'
    AFTER `publication_scope`;

INSERT INTO `bff_migration_log` (`migration_name`, `postcondition_json`, `status`)
VALUES (
  '016_age_rating',
  JSON_OBJECT(
    'books_with_age_rating', (SELECT COUNT(*) FROM `books` WHERE `age_rating` <> 'all'),
    'total_books', (SELECT COUNT(*) FROM `books`)
  ),
  'applied'
) ON DUPLICATE KEY UPDATE
  `postcondition_json` = VALUES(`postcondition_json`),
  `status` = 'applied';
