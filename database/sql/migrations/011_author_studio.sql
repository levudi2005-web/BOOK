-- =====================================================================
-- BOOKFORFREEDOM - Migration 011: Author Studio + Office Documents
-- ---------------------------------------------------------------------
-- Bảng phiên bản sách (Author Studio) và tài liệu Office Writer.
-- Idempotent: CREATE TABLE IF NOT EXISTS. Không DROP, không mất dữ liệu.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

CREATE TABLE IF NOT EXISTS `book_versions` (
  `version_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `book_id`          BIGINT UNSIGNED NOT NULL,
  `version_number`   INT UNSIGNED    NOT NULL,
  `title`            VARCHAR(500)    NOT NULL,
  `word_count`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `snapshot_json`    JSON            NULL,
  `created_by_user_id` BIGINT UNSIGNED NOT NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`version_id`),
  UNIQUE KEY `uq_book_versions_number` (`book_id`, `version_number`),
  KEY `idx_book_versions_book` (`book_id`, `created_at`),
  CONSTRAINT `fk_book_versions_book`
    FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_versions_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phiên bản snapshot của sách (Author Studio)';

CREATE TABLE IF NOT EXISTS `office_documents` (
  `document_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_uuid`    CHAR(36)        NOT NULL,
  `owner_user_id`    BIGINT UNSIGNED NOT NULL,
  `title`            VARCHAR(500)    NOT NULL,
  `kind`             VARCHAR(40)     NOT NULL DEFAULT 'writer',
  `content_json`     JSON            NULL,
  `word_count`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`       DATETIME(3)     NULL,
  PRIMARY KEY (`document_id`),
  UNIQUE KEY `uq_office_documents_uuid` (`document_uuid`),
  KEY `idx_office_documents_owner` (`owner_user_id`, `kind`, `updated_at`),
  CONSTRAINT `fk_office_documents_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài liệu Office Writer lưu JSON có cấu trúc (không lưu file ngoài)';
