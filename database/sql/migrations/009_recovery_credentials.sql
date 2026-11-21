-- =====================================================================
-- BOOKFORFREEDOM - Migration 009: Recovery Credentials (long-lived)
-- ---------------------------------------------------------------------
-- Security Recovery Key: 32 bytes -> base64url, chỉ lưu HMAC-SHA256 hash.
-- KHÔNG lưu raw key. Key không hết hạn theo OTP; chỉ vô hiệu khi rotate/revoke.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS bookuser.user_recovery_credentials (
  credential_id   BINARY(16)     NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      BINARY(32)     NOT NULL,
  hash_algorithm  VARCHAR(32)    NOT NULL DEFAULT 'HMAC-SHA256',
  issued_at       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at    DATETIME(3)    NULL,
  rotated_at      DATETIME(3)    NULL,
  revoked_at      DATETIME(3)    NULL,
  status          VARCHAR(20)    NOT NULL DEFAULT 'active',
  created_at      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (credential_id),
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  CONSTRAINT fk_user_recovery_credentials_user
    FOREIGN KEY (user_id) REFERENCES bookuser.users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookadmin.admin_recovery_credentials (
  credential_id   BINARY(16)     NOT NULL,
  admin_id        BIGINT UNSIGNED NOT NULL,
  token_hash      BINARY(32)     NOT NULL,
  hash_algorithm  VARCHAR(32)    NOT NULL DEFAULT 'HMAC-SHA256',
  issued_at       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at    DATETIME(3)    NULL,
  rotated_at      DATETIME(3)    NULL,
  revoked_at      DATETIME(3)    NULL,
  status          VARCHAR(20)    NOT NULL DEFAULT 'active',
  created_at      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (credential_id),
  KEY idx_admin_id (admin_id),
  KEY idx_status (status),
  CONSTRAINT fk_admin_recovery_credentials_account
    FOREIGN KEY (admin_id) REFERENCES bookadmin.admin_accounts (admin_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
