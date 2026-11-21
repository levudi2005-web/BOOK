-- =====================================================================
-- BOOKFORFREEDOM - Migration 010: SQL Cloud Storage (400 MiB/user)
-- ---------------------------------------------------------------------
-- File cá nhân lưu TRONG MariaDB (binary), không lưu filesystem/volume/MinIO.
-- Chia chunk (<= 4 MiB) để tránh max_allowed_packet; stream upload/download.
-- Quota cố định: 400 MiB = 419430400 bytes / user.
-- Idempotent: CREATE TABLE IF NOT EXISTS. Không DROP, không mất dữ liệu.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

CREATE TABLE IF NOT EXISTS `storage_objects` (
  `object_id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `object_uuid`      CHAR(36)        NOT NULL,
  `owner_user_id`    BIGINT UNSIGNED NOT NULL,
  `filename`         VARCHAR(512)    NOT NULL,
  `mime_type`        VARCHAR(255)    NOT NULL DEFAULT 'application/octet-stream',
  `size_bytes`       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `checksum_sha256`  BINARY(32)      NULL,
  `chunk_size`       INT UNSIGNED    NOT NULL DEFAULT 4194304,
  `chunk_count`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `status`           ENUM('uploading','complete','failed','deleted') NOT NULL DEFAULT 'uploading',
  `is_public`        TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`       DATETIME(3)     NULL,
  PRIMARY KEY (`object_id`),
  UNIQUE KEY `uq_storage_objects_uuid` (`object_uuid`),
  KEY `idx_storage_objects_owner` (`owner_user_id`, `status`),
  KEY `idx_storage_objects_checksum` (`checksum_sha256`),
  CONSTRAINT `fk_storage_objects_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Metadata file cá nhân lưu trong MariaDB (không lưu file ngoài)';

CREATE TABLE IF NOT EXISTS `storage_chunks` (
  `chunk_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `object_id`        BIGINT UNSIGNED NOT NULL,
  `chunk_index`      INT UNSIGNED    NOT NULL,
  `size_bytes`       INT UNSIGNED    NOT NULL,
  `checksum_sha256`  BINARY(32)      NULL,
  `payload`          MEDIUMBLOB      NOT NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`chunk_id`),
  UNIQUE KEY `uq_storage_chunks_object_index` (`object_id`, `chunk_index`),
  CONSTRAINT `fk_storage_chunks_object`
    FOREIGN KEY (`object_id`) REFERENCES `storage_objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Binary payload theo chunk (<= 4 MiB) của file cá nhân';

CREATE TABLE IF NOT EXISTS `storage_upload_sessions` (
  `session_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_uuid`     CHAR(36)        NOT NULL,
  `object_id`        BIGINT UNSIGNED NOT NULL,
  `owner_user_id`    BIGINT UNSIGNED NOT NULL,
  `status`           ENUM('active','complete','cancelled','expired') NOT NULL DEFAULT 'active',
  `total_bytes`      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `uploaded_chunks`  INT UNSIGNED    NOT NULL DEFAULT 0,
  `expires_at`       DATETIME(3)     NOT NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_storage_upload_sessions_uuid` (`session_uuid`),
  KEY `idx_storage_upload_sessions_object` (`object_id`),
  KEY `idx_storage_upload_sessions_expiry` (`expires_at`, `status`),
  CONSTRAINT `fk_storage_upload_sessions_object`
    FOREIGN KEY (`object_id`) REFERENCES `storage_objects` (`object_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_storage_upload_sessions_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phiên upload/resume/retry; hết hạn thì worker giải phóng reservation';

CREATE TABLE IF NOT EXISTS `user_storage_accounts` (
  `account_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `quota_bytes`      BIGINT UNSIGNED NOT NULL DEFAULT 419430400,
  `used_bytes`       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `reserved_bytes`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `last_warning_level` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `warning_reset_at` DATETIME(3)     NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_user_storage_accounts_user` (`user_id`),
  CONSTRAINT `fk_user_storage_accounts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hạn mức và số dư lưu trữ từng user (quota 419430400 bytes)';

CREATE TABLE IF NOT EXISTS `user_storage_reservations` (
  `reservation_id`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `object_id`        BIGINT UNSIGNED NOT NULL,
  `bytes_reserved`   BIGINT UNSIGNED NOT NULL,
  `status`           ENUM('reserved','released','consumed') NOT NULL DEFAULT 'reserved',
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`reservation_id`),
  KEY `idx_user_storage_reservations_user` (`user_id`),
  KEY `idx_user_storage_reservations_object` (`object_id`),
  CONSTRAINT `fk_user_storage_reservations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_storage_reservations_object`
    FOREIGN KEY (`object_id`) REFERENCES `storage_objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bytes đang reserved trong lúc upload (chống vượt quota song song)';

CREATE TABLE IF NOT EXISTS `storage_usage_entries` (
  `entry_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `object_id`        BIGINT UNSIGNED NULL,
  `delta_bytes`      BIGINT          NOT NULL,
  `reason`           VARCHAR(50)     NOT NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`entry_id`),
  KEY `idx_storage_usage_entries_user` (`user_id`, `created_at`),
  CONSTRAINT `fk_storage_usage_entries_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử biến động usage để đối soát';

CREATE TABLE IF NOT EXISTS `storage_object_versions` (
  `version_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `object_id`        BIGINT UNSIGNED NOT NULL,
  `version_number`   INT UNSIGNED    NOT NULL,
  `size_bytes`       BIGINT UNSIGNED NOT NULL,
  `checksum_sha256`  BINARY(32)      NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`version_id`),
  UNIQUE KEY `uq_storage_object_versions` (`object_id`, `version_number`),
  CONSTRAINT `fk_storage_object_versions_object`
    FOREIGN KEY (`object_id`) REFERENCES `storage_objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phiên bản file (giữ lâu dài, tính vào quota)';

