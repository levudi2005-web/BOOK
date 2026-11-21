-- =====================================================================
-- BOOKFORFREEDOM - Migration 008: Security Tokens (one-time)
-- ---------------------------------------------------------------------
-- Idempotent: CREATE TABLE IF NOT EXISTS. Không DROP, không mất dữ liệu.
-- Raw token KHÔNG được lưu; chỉ lưu token_hash (HMAC-SHA256, 32 bytes).
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- bookuser.user_security_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookuser.user_security_tokens (
  token_id         BINARY(16)     NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  purpose          VARCHAR(40)    NOT NULL,
  token_hash       BINARY(32)     NOT NULL,
  issued_at        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at       DATETIME(3)    NOT NULL,
  consumed_at      DATETIME(3)    NULL,
  revoked_at       DATETIME(3)    NULL,
  created_at       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_metadata JSON           NULL,
  PRIMARY KEY (token_id),
  UNIQUE KEY uk_user_token_hash (token_hash),
  KEY idx_user_id (user_id),
  KEY idx_purpose (purpose),
  KEY idx_expires_at (expires_at),
  CONSTRAINT fk_user_security_tokens_user
    FOREIGN KEY (user_id) REFERENCES bookuser.users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- bookadmin.admin_security_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookadmin.admin_security_tokens (
  token_id         BINARY(16)     NOT NULL,
  admin_id         BIGINT UNSIGNED NOT NULL,
  purpose          VARCHAR(40)    NOT NULL,
  token_hash       BINARY(32)     NOT NULL,
  issued_at        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at       DATETIME(3)    NOT NULL,
  consumed_at      DATETIME(3)    NULL,
  revoked_at       DATETIME(3)    NULL,
  created_at       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_metadata JSON           NULL,
  PRIMARY KEY (token_id),
  UNIQUE KEY uk_admin_token_hash (token_hash),
  KEY idx_admin_id (admin_id),
  KEY idx_purpose (purpose),
  KEY idx_expires_at (expires_at),
  CONSTRAINT fk_admin_security_tokens_account
    FOREIGN KEY (admin_id) REFERENCES bookadmin.admin_accounts (admin_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
