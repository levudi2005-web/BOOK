-- =====================================================================
-- BOOKFORFREEDOM - bookadmin - 002: Tables
-- MariaDB 10.11 / InnoDB / utf8mb4_unicode_ci / UTC
-- NOTE: physical FOREIGN KEY constraints are added in 003. All user,
--       book, report and rights identifiers coming from bookuser are
--       LOGICAL references only (no cross-database FK).
-- Idempotent: CREATE TABLE IF NOT EXISTS (baseline install).
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookadmin`;

-- ---------------------------------------------------------------------
-- A. ADMIN ACCOUNTS AND RBAC
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin_accounts` (
  `admin_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tài khoản quản trị',
  `admin_uuid` CHAR(36) NOT NULL COMMENT 'Mã định danh công khai, external ID cho tham chiếu chéo từ bookuser',
  `username` VARCHAR(50) NOT NULL COMMENT 'Tên đăng nhập admin, duy nhất',
  `email` VARCHAR(254) NOT NULL COMMENT 'Email công vụ, duy nhất',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash Argon2id; không có mật khẩu mặc định',
  `password_algorithm` VARCHAR(30) NOT NULL DEFAULT 'argon2id' COMMENT 'Thuật toán hash để nâng cấp dần',
  `status` ENUM('invited','active','suspended','disabled') NOT NULL DEFAULT 'invited' COMMENT 'Trạng thái tài khoản admin',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Buộc đổi mật khẩu ở lần đăng nhập đầu',
  `mfa_required` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Bắt buộc xác thực đa yếu tố',
  `failed_login_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lần đăng nhập sai liên tiếp',
  `locked_until` DATETIME(3) NULL DEFAULT NULL COMMENT 'Khóa tạm thời đến mốc này (UTC)',
  `password_changed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Lần đổi mật khẩu gần nhất (UTC)',
  `last_login_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Đăng nhập thành công gần nhất (UTC)',
  `last_login_ip` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP đăng nhập gần nhất dạng nhị phân',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm; ưu tiên disabled thay vì xóa cứng',
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_accounts_uuid` (`admin_uuid`),
  UNIQUE KEY `uq_admin_accounts_username` (`username`),
  UNIQUE KEY `uq_admin_accounts_email` (`email`),
  KEY `idx_admin_accounts_status_created` (`status`, `created_at`),
  KEY `idx_admin_accounts_last_login` (`last_login_at`),
  KEY `idx_admin_accounts_deleted` (`deleted_at`),
  CONSTRAINT `chk_admin_accounts_username_length` CHECK (CHAR_LENGTH(`username`) >= 3),
  CONSTRAINT `chk_admin_accounts_email_length` CHECK (CHAR_LENGTH(`email`) >= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản Super Admin/Admin; tách biệt hoàn toàn với users của bookuser';

CREATE TABLE IF NOT EXISTS `admin_profiles` (
  `profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ admin',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản admin sở hữu hồ sơ (1-1)',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'Họ tên đầy đủ',
  `display_name` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Tên hiển thị trong giao diện quản trị',
  `phone` VARCHAR(30) NULL DEFAULT NULL COMMENT 'Số điện thoại liên hệ nội bộ',
  `job_title` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Chức danh',
  `department` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Bộ phận',
  `avatar_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh đại diện',
  `locale` VARCHAR(10) NOT NULL DEFAULT 'vi-VN' COMMENT 'Ngôn ngữ giao diện quản trị',
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'Múi giờ hiển thị; dữ liệu lưu UTC',
  `bio` TEXT NULL DEFAULT NULL COMMENT 'Ghi chú giới thiệu nội bộ',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_admin_profiles_admin` (`admin_id`),
  KEY `idx_admin_profiles_department` (`department`),
  CONSTRAINT `chk_admin_profiles_full_name` CHECK (CHAR_LENGTH(`full_name`) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hồ sơ nội bộ của tài khoản quản trị, 1-1 với admin_accounts';

CREATE TABLE IF NOT EXISTS `admin_roles` (
  `role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính vai trò',
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã vai trò ổn định, dùng trong kiểm tra phân quyền',
  `name` VARCHAR(100) NOT NULL COMMENT 'Tên vai trò hiển thị',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Mô tả phạm vi quyền',
  `hierarchy_level` TINYINT UNSIGNED NOT NULL DEFAULT 100 COMMENT 'Số nhỏ hơn = cấp cao hơn (SUPER_ADMIN = 1)',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = vai trò hệ thống, không cho xóa',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_admin_roles_code` (`code`),
  UNIQUE KEY `uq_admin_roles_name` (`name`),
  KEY `idx_admin_roles_hierarchy` (`hierarchy_level`),
  CONSTRAINT `chk_admin_roles_hierarchy` CHECK (`hierarchy_level` BETWEEN 1 AND 250)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Vai trò RBAC: Super Admin, Administrator, Content Manager, Moderator, Analyst';

CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `permission_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính quyền',
  `code` VARCHAR(100) NOT NULL COMMENT 'Mã quyền dạng resource.action (ví dụ books.approve)',
  `resource` VARCHAR(60) NOT NULL COMMENT 'Tài nguyên được kiểm soát',
  `action` VARCHAR(40) NOT NULL COMMENT 'Hành động trên tài nguyên',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Mô tả quyền',
  `is_system` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = quyền hệ thống do seed quản lý',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_admin_permissions_code` (`code`),
  UNIQUE KEY `uq_admin_permissions_resource_action` (`resource`, `action`),
  KEY `idx_admin_permissions_resource` (`resource`),
  CONSTRAINT `chk_admin_permissions_code` CHECK (CHAR_LENGTH(`code`) >= 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục quyền chi tiết theo resource và action';

CREATE TABLE IF NOT EXISTS `admin_account_roles` (
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản admin',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT 'Vai trò được gán',
  `assigned_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin thực hiện gán quyền',
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm gán (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Hết hạn gán quyền (NULL = vĩnh viễn)',
  PRIMARY KEY (`admin_id`, `role_id`),
  KEY `idx_admin_account_roles_role` (`role_id`),
  KEY `idx_admin_account_roles_assigned_by` (`assigned_by_admin_id`),
  KEY `idx_admin_account_roles_expires` (`expires_at`),
  CONSTRAINT `chk_admin_account_roles_expiry` CHECK (`expires_at` IS NULL OR `expires_at` > `assigned_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N giữa admin_accounts và admin_roles';

CREATE TABLE IF NOT EXISTS `admin_role_permissions` (
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT 'Vai trò',
  `permission_id` BIGINT UNSIGNED NOT NULL COMMENT 'Quyền được cấp',
  `granted_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin thực hiện cấp quyền',
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cấp (UTC)',
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_admin_role_permissions_permission` (`permission_id`),
  KEY `idx_admin_role_permissions_granted_by` (`granted_by_admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N giữa admin_roles và admin_permissions';

CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `session_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phiên admin',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản admin của phiên',
  `session_token_hash` BINARY(32) NOT NULL COMMENT 'SHA-256 session token; không lưu token gốc',
  `mfa_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã hoàn tất MFA trong phiên',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP nhị phân của phiên',
  `user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Chuỗi User-Agent',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo phiên (UTC)',
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Lần hoạt động gần nhất (UTC)',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Hết hạn tuyệt đối (UTC)',
  `revoked_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm thu hồi (UTC)',
  `revoked_reason` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Lý do thu hồi phiên',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_admin_sessions_token` (`session_token_hash`),
  KEY `idx_admin_sessions_admin_created` (`admin_id`, `created_at`),
  KEY `idx_admin_sessions_admin_expires` (`admin_id`, `expires_at`),
  KEY `idx_admin_sessions_expires` (`expires_at`),
  KEY `idx_admin_sessions_revoked` (`revoked_at`),
  CONSTRAINT `chk_admin_sessions_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_admin_sessions_token` CHECK (OCTET_LENGTH(`session_token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phiên đăng nhập khu vực quản trị, yêu cầu MFA trước khi cấp quyền';

CREATE TABLE IF NOT EXISTS `admin_mfa_methods` (
  `mfa_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phương thức MFA',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản admin sở hữu phương thức',
  `method` ENUM('totp','webauthn','email','recovery_codes') NOT NULL COMMENT 'Loại xác thực đa yếu tố',
  `label` VARCHAR(100) NOT NULL DEFAULT 'primary' COMMENT 'Nhãn phân biệt nhiều phương thức cùng loại',
  `secret_encrypted` VARBINARY(1024) NULL DEFAULT NULL COMMENT 'Secret TOTP đã mã hóa bằng khóa KMS/ứng dụng',
  `credential_id` VARBINARY(255) NULL DEFAULT NULL COMMENT 'Credential ID WebAuthn',
  `credential_public_key` VARBINARY(1024) NULL DEFAULT NULL COMMENT 'Public key WebAuthn',
  `recovery_code_hashes` JSON NULL DEFAULT NULL COMMENT 'Mảng hash của mã khôi phục dùng một lần',
  `sign_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Bộ đếm chống replay của WebAuthn',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = phương thức chính',
  `confirmed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm xác nhận thiết lập xong',
  `last_used_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Lần sử dụng gần nhất (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`mfa_id`),
  UNIQUE KEY `uq_admin_mfa_admin_method_label` (`admin_id`, `method`, `label`),
  KEY `idx_admin_mfa_admin` (`admin_id`),
  KEY `idx_admin_mfa_primary` (`admin_id`, `is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phương thức MFA của admin; secret/khóa luôn được mã hóa, không lưu plaintext';

CREATE TABLE IF NOT EXISTS `admin_password_reset_tokens` (
  `token_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token đặt lại mật khẩu admin',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản admin yêu cầu đặt lại',
  `token_hash` BINARY(32) NOT NULL COMMENT 'SHA-256 token; không lưu token gốc',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Hạn sử dụng (UTC)',
  `consumed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm sử dụng (UTC)',
  `requested_ip` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP yêu cầu',
  `requested_user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'User-Agent khi yêu cầu',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_admin_password_reset_tokens_hash` (`token_hash`),
  KEY `idx_admin_password_reset_tokens_admin_exp` (`admin_id`, `expires_at`),
  CONSTRAINT `chk_admin_password_reset_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_admin_password_reset_tokens_hash` CHECK (OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Token đặt lại mật khẩu admin, chỉ lưu hash SHA-256';

CREATE TABLE IF NOT EXISTS `admin_login_attempts` (
  `attempt_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lần đăng nhập',
  `admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin nếu nhận diện được tài khoản',
  `username_attempted` VARCHAR(254) NOT NULL COMMENT 'Username/email đã nhập, kể cả không tồn tại',
  `success` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đăng nhập thành công',
  `failure_reason` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Lý do thất bại (bad_password, locked, mfa_failed...)',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP nhị phân',
  `user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'User-Agent',
  `attempted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm thử đăng nhập (UTC)',
  PRIMARY KEY (`attempt_id`),
  KEY `idx_admin_login_attempts_username_time` (`username_attempted`, `attempted_at`),
  KEY `idx_admin_login_attempts_ip_time` (`ip_address`, `attempted_at`),
  KEY `idx_admin_login_attempts_admin_time` (`admin_id`, `attempted_at`),
  KEY `idx_admin_login_attempts_success_time` (`success`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký đăng nhập admin (append-only), phục vụ phát hiện bất thường';

CREATE TABLE IF NOT EXISTS `admin_user_notes` (
  `note_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính ghi chú nội bộ',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id (không FK chéo DB)',
  `user_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Bản sao external ID để tra cứu khi bookuser không sẵn sàng',
  `author_admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Admin tạo ghi chú',
  `note_type` ENUM('general','support','risk','verification','moderation') NOT NULL DEFAULT 'general' COMMENT 'Phân loại ghi chú',
  `content` TEXT NOT NULL COMMENT 'Nội dung ghi chú nội bộ',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Ghim ghi chú quan trọng',
  `visibility` ENUM('all_admins','super_admin_only') NOT NULL DEFAULT 'all_admins' COMMENT 'Phạm vi nhìn thấy',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm ghi chú',
  PRIMARY KEY (`note_id`),
  KEY `idx_admin_user_notes_user_time` (`user_id`, `created_at`),
  KEY `idx_admin_user_notes_author` (`author_admin_id`),
  KEY `idx_admin_user_notes_type` (`note_type`),
  KEY `idx_admin_user_notes_pinned` (`is_pinned`, `created_at`),
  CONSTRAINT `chk_admin_user_notes_content` CHECK (CHAR_LENGTH(`content`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ghi chú nội bộ về người dùng; user_id là tham chiếu logic sang bookuser';

CREATE TABLE IF NOT EXISTS `user_restrictions` (
  `restriction_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lệnh hạn chế',
  `restriction_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của lệnh hạn chế',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `user_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Bản sao external ID người dùng',
  `restriction_type` ENUM('account_lock','account_suspension','feature_restriction','download_block','comment_block','upload_block') NOT NULL COMMENT 'Loại hạn chế',
  `feature_code` VARCHAR(60) NULL DEFAULT NULL COMMENT 'Mã tính năng khi restriction_type = feature_restriction',
  `reason` TEXT NOT NULL COMMENT 'Lý do hạn chế, bắt buộc để truy vết',
  `status` ENUM('active','expired','lifted') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hiệu lực',
  `issued_by_admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Admin ban hành',
  `lifted_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin gỡ bỏ hạn chế',
  `starts_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Bắt đầu hiệu lực (UTC)',
  `ends_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Kết thúc hiệu lực; NULL = vô thời hạn',
  `lifted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm gỡ bỏ (UTC)',
  `lift_reason` TEXT NULL DEFAULT NULL COMMENT 'Lý do gỡ bỏ',
  `source_event_id` CHAR(36) NULL DEFAULT NULL COMMENT 'event_id đã tạo lệnh này (idempotency với Inbox)',
  `active_lock_key` BIGINT UNSIGNED AS (IF(`status` = 'active' AND `restriction_type` IN ('account_lock','account_suspension'), `user_id`, NULL)) STORED COMMENT 'Khóa sinh tự động: tối đa một lệnh khóa tài khoản đang hiệu lực/người dùng',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`restriction_id`),
  UNIQUE KEY `uq_user_restrictions_uuid` (`restriction_uuid`),
  UNIQUE KEY `uq_user_restrictions_active_lock` (`active_lock_key`),
  KEY `idx_user_restrictions_user_status` (`user_id`, `status`, `ends_at`),
  KEY `idx_user_restrictions_status_ends` (`status`, `ends_at`),
  KEY `idx_user_restrictions_issued_by` (`issued_by_admin_id`),
  KEY `idx_user_restrictions_lifted_by` (`lifted_by_admin_id`),
  KEY `idx_user_restrictions_source_event` (`source_event_id`),
  CONSTRAINT `chk_user_restrictions_window` CHECK (`ends_at` IS NULL OR `ends_at` > `starts_at`),
  CONSTRAINT `chk_user_restrictions_reason` CHECK (CHAR_LENGTH(`reason`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hạn chế/khóa/đình chỉ người dùng; user_id tham chiếu logic sang bookuser';

CREATE TABLE IF NOT EXISTS `user_verification_reviews` (
  `review_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ xét duyệt',
  `review_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của hồ sơ xét duyệt',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `user_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Bản sao external ID người dùng',
  `verification_type` ENUM('email','identity','author','publisher') NOT NULL DEFAULT 'identity' COMMENT 'Loại xác minh',
  `status` ENUM('pending','in_review','approved','rejected','needs_more_info') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xử lý',
  `submitted_documents` JSON NULL DEFAULT NULL COMMENT 'Danh sách storage_key tài liệu, không chứa dữ liệu nhị phân',
  `reviewer_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin xử lý',
  `decision_reason` TEXT NULL DEFAULT NULL COMMENT 'Lý do quyết định',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm nộp (UTC)',
  `reviewed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hoàn tất xét duyệt (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_user_verification_reviews_uuid` (`review_uuid`),
  KEY `idx_user_verification_reviews_user_status` (`user_id`, `status`),
  KEY `idx_user_verification_reviews_status_submitted` (`status`, `submitted_at`),
  KEY `idx_user_verification_reviews_reviewer` (`reviewer_admin_id`),
  KEY `idx_user_verification_reviews_type` (`verification_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hồ sơ xác minh người dùng (email/CMND/tác giả/NXB); user_id tham chiếu logic';

CREATE TABLE IF NOT EXISTS `report_reasons` (
  `reason_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lý do báo cáo',
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã lý do ổn định, đồng bộ với bookuser.user_reports.reason_code',
  `label` VARCHAR(150) NOT NULL COMMENT 'Nhãn hiển thị',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Giải thích chi tiết',
  `applies_to` ENUM('book','review','comment','user','author','any') NOT NULL DEFAULT 'any' COMMENT 'Loại đối tượng áp dụng',
  `severity` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium' COMMENT 'Mức độ nghiêm trọng mặc định',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = còn sử dụng',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`reason_id`),
  UNIQUE KEY `uq_report_reasons_code` (`code`),
  KEY `idx_report_reasons_active_sort` (`is_active`, `sort_order`),
  KEY `idx_report_reasons_applies` (`applies_to`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục lý do báo cáo nội dung, dùng chung cho API và UI';

CREATE TABLE IF NOT EXISTS `content_reports` (
  `report_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính báo cáo nội dung phía admin',
  `report_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của báo cáo',
  `source_user_report_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.user_reports.report_id; unique để chống nhận trùng',
  `reporter_user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `reporter_user_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Bản sao external ID người báo cáo',
  `target_type` ENUM('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị báo cáo',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID đối tượng trong bookuser (kiểm tra hợp lệ ở tầng dịch vụ)',
  `target_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID đối tượng để đối soát chéo',
  `reason_id` BIGINT UNSIGNED NOT NULL COMMENT 'Lý do báo cáo',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả chi tiết từ người báo cáo',
  `status` ENUM('new','triaged','in_review','resolved','rejected','duplicate') NOT NULL DEFAULT 'new' COMMENT 'Trạng thái xử lý',
  `priority` ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' COMMENT 'Mức ưu tiên',
  `assigned_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin được phân công',
  `resolution_summary` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'Tóm tắt kết quả xử lý',
  `resolved_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm giải quyết (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tiếp nhận (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_content_reports_uuid` (`report_uuid`),
  UNIQUE KEY `uq_content_reports_source` (`source_user_report_id`),
  KEY `idx_content_reports_status_priority` (`status`, `priority`, `created_at`),
  KEY `idx_content_reports_target` (`target_type`, `target_id`),
  KEY `idx_content_reports_reason` (`reason_id`),
  KEY `idx_content_reports_assigned` (`assigned_admin_id`, `status`),
  KEY `idx_content_reports_reporter` (`reporter_user_id`, `created_at`),
  CONSTRAINT `chk_content_reports_target` CHECK (`target_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Báo cáo nội dung vi phạm; các ID bookuser là tham chiếu logic, kiểm tra ở service';

CREATE TABLE IF NOT EXISTS `moderation_cases` (
  `case_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ kiểm duyệt',
  `case_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của hồ sơ',
  `case_number` VARCHAR(30) NOT NULL COMMENT 'Mã hồ sơ thân thiện (ví dụ MC-2026-000123)',
  `report_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Báo cáo nguồn; unique để một báo cáo chỉ mở một hồ sơ',
  `target_type` ENUM('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị kiểm duyệt',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID đối tượng trong bookuser (kiểm tra ở service)',
  `target_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID đối tượng để đối soát',
  `status` ENUM('open','investigating','pending_action','resolved','closed','escalated') NOT NULL DEFAULT 'open' COMMENT 'Trạng thái hồ sơ',
  `priority` ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' COMMENT 'Mức ưu tiên',
  `assigned_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin đang xử lý',
  `opened_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin mở hồ sơ',
  `summary` TEXT NULL DEFAULT NULL COMMENT 'Tóm tắt nội dung vụ việc',
  `due_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Hạn xử lý (UTC)',
  `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm mở hồ sơ (UTC)',
  `closed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm đóng hồ sơ (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `uq_moderation_cases_uuid` (`case_uuid`),
  UNIQUE KEY `uq_moderation_cases_number` (`case_number`),
  UNIQUE KEY `uq_moderation_cases_report` (`report_id`),
  KEY `idx_moderation_cases_status_due` (`status`, `due_at`),
  KEY `idx_moderation_cases_assigned` (`assigned_admin_id`, `status`),
  KEY `idx_moderation_cases_target` (`target_type`, `target_id`),
  KEY `idx_moderation_cases_opened_by` (`opened_by_admin_id`),
  CONSTRAINT `chk_moderation_cases_target` CHECK (`target_id` > 0),
  CONSTRAINT `chk_moderation_cases_closed` CHECK (`closed_at` IS NULL OR `closed_at` >= `opened_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hồ sơ kiểm duyệt nội dung; kết nối báo cáo, phân công và quyết định xử lý';

CREATE TABLE IF NOT EXISTS `moderation_actions` (
  `action_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hành động kiểm duyệt',
  `action_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của hành động',
  `case_id` BIGINT UNSIGNED NOT NULL COMMENT 'Hồ sơ kiểm duyệt',
  `action_type` ENUM('warn','hide_content','restore_content','remove_content','restrict_user','unrestrict_user','request_changes','approve','reject','note','escalate') NOT NULL COMMENT 'Loại hành động',
  `target_type` ENUM('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng tác động',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID đối tượng trong bookuser',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Admin thực hiện',
  `reason` TEXT NOT NULL COMMENT 'Lý do, bắt buộc để truy vết',
  `notes` TEXT NULL DEFAULT NULL COMMENT 'Ghi chú nội bộ',
  `previous_state` JSON NULL DEFAULT NULL COMMENT 'Ảnh chụp trạng thái trước khi thay đổi',
  `new_state` JSON NULL DEFAULT NULL COMMENT 'Ảnh chụp trạng thái sau khi thay đổi',
  `effective_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm có hiệu lực (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hết hiệu lực (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm ghi nhận (UTC)',
  PRIMARY KEY (`action_id`),
  UNIQUE KEY `uq_moderation_actions_uuid` (`action_uuid`),
  KEY `idx_moderation_actions_case_time` (`case_id`, `created_at`),
  KEY `idx_moderation_actions_admin_time` (`admin_id`, `created_at`),
  KEY `idx_moderation_actions_target` (`target_type`, `target_id`),
  KEY `idx_moderation_actions_type` (`action_type`, `created_at`),
  CONSTRAINT `chk_moderation_actions_target` CHECK (`target_id` > 0),
  CONSTRAINT `chk_moderation_actions_expiry` CHECK (`expires_at` IS NULL OR `expires_at` > `effective_at`),
  CONSTRAINT `chk_moderation_actions_reason` CHECK (CHAR_LENGTH(`reason`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký hành động kiểm duyệt, lưu trạng thái trước/sau để truy vết';

CREATE TABLE IF NOT EXISTS `book_rights_reviews` (
  `review_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính xét duyệt quyền sách',
  `review_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của hồ sơ xét duyệt quyền',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.books.book_id',
  `book_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Bản sao external ID sách',
  `rights_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.book_rights.rights_id',
  `status` ENUM('pending','in_review','approved','rejected','expired','revoked') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xét duyệt',
  `source_type` ENUM('self_published','licensed','public_domain','creative_commons','unknown') NOT NULL DEFAULT 'unknown' COMMENT 'Nguồn gốc quyền',
  `license_code` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Mã giấy phép tại thời điểm xét duyệt',
  `findings` TEXT NULL DEFAULT NULL COMMENT 'Kết luận/ghi nhận của người xét duyệt',
  `evidence_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ tài liệu bằng chứng',
  `reviewer_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin xét duyệt',
  `submitted_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm nộp (UTC)',
  `reviewed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hoàn tất xét duyệt (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hết hiệu lực của quyền (UTC)',
  `open_book_id` BIGINT UNSIGNED AS (IF(`status` IN ('pending','in_review'), `book_id`, NULL)) STORED COMMENT 'Khóa sinh tự động: mỗi sách chỉ có một hồ sơ xét duyệt đang mở',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_book_rights_reviews_uuid` (`review_uuid`),
  UNIQUE KEY `uq_book_rights_reviews_open_book` (`open_book_id`),
  KEY `idx_book_rights_reviews_status_submitted` (`status`, `submitted_at`),
  KEY `idx_book_rights_reviews_book_status` (`book_id`, `status`),
  KEY `idx_book_rights_reviews_rights` (`rights_id`),
  KEY `idx_book_rights_reviews_reviewer` (`reviewer_admin_id`),
  KEY `idx_book_rights_reviews_source` (`source_type`),
  CONSTRAINT `chk_book_rights_reviews_book` CHECK (`book_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Xét duyệt nguồn gốc/giấy phép sách; book_id, rights_id là tham chiếu logic sang bookuser';

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `audit_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính nhật ký kiểm toán',
  `audit_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của bản ghi kiểm toán',
  `admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin thực hiện; NULL nếu tài khoản đã bị xóa cứng',
  `admin_uuid` CHAR(36) NOT NULL COMMENT 'Bản sao UUID admin tại thời điểm thao tác',
  `admin_username` VARCHAR(50) NOT NULL COMMENT 'Bản sao username admin tại thời điểm thao tác',
  `actor_type` ENUM('admin','system','api_client') NOT NULL DEFAULT 'admin' COMMENT 'Loại chủ thể thực hiện',
  `action` VARCHAR(100) NOT NULL COMMENT 'Mã hành động (books.update, users.lock...)',
  `resource_type` VARCHAR(60) NULL DEFAULT NULL COMMENT 'Loại tài nguyên bị tác động',
  `resource_id` VARCHAR(100) NULL DEFAULT NULL COMMENT 'ID tài nguyên dạng chuỗi (BIGINT hoặc UUID)',
  `http_method` VARCHAR(10) NULL DEFAULT NULL COMMENT 'Phương thức HTTP',
  `request_path` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Đường dẫn API',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP nhị phân của chủ thể',
  `user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'User-Agent',
  `before_data` JSON NULL DEFAULT NULL COMMENT 'Ảnh chụp dữ liệu trước khi sửa (đã che dữ liệu nhạy cảm)',
  `after_data` JSON NULL DEFAULT NULL COMMENT 'Ảnh chụp dữ liệu sau khi sửa',
  `diff` JSON NULL DEFAULT NULL COMMENT 'Các trường thay đổi',
  `metadata` JSON NULL DEFAULT NULL COMMENT 'Ngữ cảnh bổ sung (request id, trace id...)',
  `status` ENUM('success','failure') NOT NULL DEFAULT 'success' COMMENT 'Kết quả thao tác',
  `error_message` TEXT NULL DEFAULT NULL COMMENT 'Lỗi nếu thao tác thất bại',
  `correlation_id` CHAR(36) NULL DEFAULT NULL COMMENT 'Mã tương quan xuyên request/event',
  `prev_hash` BINARY(32) NULL DEFAULT NULL COMMENT 'Hash bản ghi trước trong chuỗi (do ứng dụng tính)',
  `record_hash` BINARY(32) NULL DEFAULT NULL COMMENT 'Hash bản ghi hiện tại (do ứng dụng tính)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm ghi nhật ký (UTC)',
  PRIMARY KEY (`audit_id`),
  UNIQUE KEY `uq_admin_audit_logs_uuid` (`audit_uuid`),
  KEY `idx_admin_audit_logs_admin_time` (`admin_id`, `created_at`),
  KEY `idx_admin_audit_logs_resource` (`resource_type`, `resource_id`),
  KEY `idx_admin_audit_logs_action_time` (`action`, `created_at`),
  KEY `idx_admin_audit_logs_created` (`created_at`),
  KEY `idx_admin_audit_logs_correlation` (`correlation_id`),
  CONSTRAINT `chk_admin_audit_logs_action` CHECK (CHAR_LENGTH(`action`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit log append-only; trigger chặn UPDATE/DELETE, ứng dụng chỉ được INSERT/SELECT';

CREATE TABLE IF NOT EXISTS `security_events` (
  `event_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính sự kiện bảo mật',
  `event_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của sự kiện',
  `event_type` ENUM('login_success','login_failure','logout','password_changed','password_reset_requested','mfa_enabled','mfa_disabled','mfa_challenge_failed','account_locked','account_unlocked','permission_changed','role_changed','session_revoked','suspicious_activity','api_key_created','api_key_revoked') NOT NULL COMMENT 'Loại sự kiện bảo mật',
  `severity` ENUM('info','low','medium','high','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ nghiêm trọng',
  `actor_type` ENUM('admin','user','system','anonymous') NOT NULL DEFAULT 'system' COMMENT 'Loại chủ thể',
  `admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin liên quan',
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `subject_identifier` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Email/username đã thử (đã chuẩn hóa)',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'Địa chỉ IP nhị phân',
  `user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'User-Agent',
  `outcome` ENUM('success','failure','blocked') NOT NULL DEFAULT 'success' COMMENT 'Kết quả',
  `details` JSON NULL DEFAULT NULL COMMENT 'Chi tiết bổ sung đã lọc dữ liệu nhạy cảm',
  `risk_score` TINYINT UNSIGNED NULL DEFAULT NULL COMMENT 'Điểm rủi ro 0-100',
  `correlation_id` CHAR(36) NULL DEFAULT NULL COMMENT 'Mã tương quan với audit log',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm xảy ra (UTC)',
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uq_security_events_uuid` (`event_uuid`),
  KEY `idx_security_events_type_time` (`event_type`, `created_at`),
  KEY `idx_security_events_severity_time` (`severity`, `created_at`),
  KEY `idx_security_events_admin_time` (`admin_id`, `created_at`),
  KEY `idx_security_events_user` (`user_id`, `created_at`),
  KEY `idx_security_events_ip` (`ip_address`),
  KEY `idx_security_events_correlation` (`correlation_id`),
  CONSTRAINT `chk_security_events_risk` CHECK (`risk_score` IS NULL OR `risk_score` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sự kiện bảo mật phục vụ phát hiện bất thường; user_id là tham chiếu logic';

CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo admin',
  `notification_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `recipient_admin_id` BIGINT UNSIGNED NOT NULL COMMENT 'Admin nhận thông báo',
  `type` ENUM('report_created','case_assigned','case_escalated','verification_pending','rights_review_pending','system_alert','security_alert','announcement','other') NOT NULL DEFAULT 'other' COMMENT 'Loại thông báo',
  `severity` ENUM('info','success','warning','error','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ hiển thị',
  `title` VARCHAR(255) NOT NULL COMMENT 'Tiêu đề',
  `body` TEXT NULL DEFAULT NULL COMMENT 'Nội dung',
  `action_url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Đường dẫn xử lý trong trang quản trị',
  `related_resource_type` VARCHAR(60) NULL DEFAULT NULL COMMENT 'Loại tài nguyên liên quan',
  `related_resource_id` VARCHAR(100) NULL DEFAULT NULL COMMENT 'ID tài nguyên liên quan',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc',
  `read_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm đọc (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hết hạn hiển thị (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `uq_admin_notifications_uuid` (`notification_uuid`),
  KEY `idx_admin_notifications_recipient_read` (`recipient_admin_id`, `is_read`, `created_at`),
  KEY `idx_admin_notifications_type` (`type`, `created_at`),
  KEY `idx_admin_notifications_resource` (`related_resource_type`, `related_resource_id`),
  KEY `idx_admin_notifications_expires` (`expires_at`),
  CONSTRAINT `chk_admin_notifications_read` CHECK ((`is_read` = 0 AND `read_at` IS NULL) OR (`is_read` = 1 AND `read_at` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thông báo trong ứng dụng quản trị; đánh dấu đã đọc kèm thời điểm';

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cấu hình hệ thống',
  `setting_key` VARCHAR(100) NOT NULL COMMENT 'Khóa cấu hình duy nhất (dot.notation)',
  `value_json` JSON NULL DEFAULT NULL COMMENT 'Giá trị cấu hình dạng JSON',
  `value_type` ENUM('string','integer','decimal','boolean','json') NOT NULL DEFAULT 'string' COMMENT 'Kiểu dữ liệu logic của giá trị',
  `category` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT 'Nhóm cấu hình',
  `label` VARCHAR(150) NOT NULL COMMENT 'Nhãn hiển thị',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Mô tả ý nghĩa cấu hình',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = được phép trả ra API công khai',
  `is_editable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = cho phép sửa qua giao diện quản trị',
  `updated_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin cập nhật gần nhất',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_system_settings_key` (`setting_key`),
  KEY `idx_system_settings_category` (`category`, `setting_key`),
  KEY `idx_system_settings_public` (`is_public`),
  KEY `idx_system_settings_updated_by` (`updated_by_admin_id`),
  CONSTRAINT `chk_system_settings_key` CHECK (CHAR_LENGTH(`setting_key`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cấu hình hệ thống có kiểu dữ liệu và phạm vi công khai rõ ràng';

CREATE TABLE IF NOT EXISTS `feature_flags` (
  `flag_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cờ tính năng',
  `flag_key` VARCHAR(100) NOT NULL COMMENT 'Khóa cờ tính năng',
  `environment` ENUM('all','development','staging','production') NOT NULL DEFAULT 'all' COMMENT 'Môi trường áp dụng',
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên hiển thị',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Mô tả tính năng',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = bật tính năng',
  `rollout_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tỷ lệ người dùng được bật (0-100)',
  `targeting_rules` JSON NULL DEFAULT NULL COMMENT 'Quy tắc nhắm mục tiêu (user id, role, thuộc tính)',
  `updated_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin cập nhật gần nhất',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`flag_id`),
  UNIQUE KEY `uq_feature_flags_key_env` (`flag_key`, `environment`),
  KEY `idx_feature_flags_enabled` (`is_enabled`, `environment`),
  KEY `idx_feature_flags_updated_by` (`updated_by_admin_id`),
  CONSTRAINT `chk_feature_flags_rollout` CHECK (`rollout_percentage` >= 0 AND `rollout_percentage` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cờ tính năng theo môi trường, hỗ trợ rollout theo phần trăm và quy tắc';

CREATE TABLE IF NOT EXISTS `maintenance_windows` (
  `window_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cửa sổ bảo trì',
  `window_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của cửa sổ bảo trì',
  `title` VARCHAR(200) NOT NULL COMMENT 'Tiêu đề cửa sổ bảo trì',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả phạm vi và lý do',
  `scope` ENUM('all','api','web','admin','worker','database') NOT NULL DEFAULT 'all' COMMENT 'Thành phần bị ảnh hưởng',
  `status` ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled' COMMENT 'Trạng thái',
  `starts_at` DATETIME(3) NOT NULL COMMENT 'Bắt đầu (UTC)',
  `ends_at` DATETIME(3) NOT NULL COMMENT 'Kết thúc dự kiến (UTC)',
  `is_read_only` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = chỉ đọc trong thời gian bảo trì',
  `allow_admin_access` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = vẫn cho phép admin truy cập',
  `created_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin tạo cửa sổ bảo trì',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`window_id`),
  UNIQUE KEY `uq_maintenance_windows_uuid` (`window_uuid`),
  KEY `idx_maintenance_windows_time` (`starts_at`, `ends_at`),
  KEY `idx_maintenance_windows_status` (`status`, `starts_at`),
  KEY `idx_maintenance_windows_scope` (`scope`),
  KEY `idx_maintenance_windows_created_by` (`created_by_admin_id`),
  CONSTRAINT `chk_maintenance_windows_window` CHECK (`ends_at` > `starts_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch bảo trì hệ thống, dùng để bật chế độ chỉ đọc và thông báo';

CREATE TABLE IF NOT EXISTS `system_metrics_daily` (
  `metric_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính chỉ số ngày',
  `metric_date` DATE NOT NULL COMMENT 'Ngày ghi nhận (UTC)',
  `metric_key` VARCHAR(80) NOT NULL COMMENT 'Mã chỉ số (users.new, books.published...)',
  `dimension_key` VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'Khóa tổ hợp chiều phân tích (ví dụ language=vi)',
  `metric_value` DECIMAL(18,4) NOT NULL DEFAULT 0.0000 COMMENT 'Giá trị chỉ số',
  `unit` VARCHAR(20) NOT NULL DEFAULT 'count' COMMENT 'Đơn vị (count, percent, seconds, bytes)',
  `dimension` JSON NULL DEFAULT NULL COMMENT 'Chi tiết chiều phân tích dạng JSON',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tổng hợp (UTC)',
  PRIMARY KEY (`metric_id`),
  UNIQUE KEY `uq_system_metrics_daily` (`metric_date`, `metric_key`, `dimension_key`),
  KEY `idx_system_metrics_daily_key` (`metric_key`, `metric_date`),
  KEY `idx_system_metrics_daily_date` (`metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chỉ số tổng hợp theo ngày; dimension_key bảo đảm tính duy nhất khi dimension là JSON';

CREATE TABLE IF NOT EXISTS `admin_announcements` (
  `announcement_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo hệ thống',
  `announcement_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `title` VARCHAR(255) NOT NULL COMMENT 'Tiêu đề thông báo',
  `body` TEXT NOT NULL COMMENT 'Nội dung thông báo',
  `audience` ENUM('all','admins','users','specific_roles') NOT NULL DEFAULT 'admins' COMMENT 'Đối tượng nhận',
  `target_roles` JSON NULL DEFAULT NULL COMMENT 'Danh sách role nhận khi audience = specific_roles',
  `severity` ENUM('info','success','warning','error','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ hiển thị',
  `status` ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái phát hành',
  `publish_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm phát hành (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hết hiển thị (UTC)',
  `created_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin tạo',
  `published_by_admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Admin phát hành',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`announcement_id`),
  UNIQUE KEY `uq_admin_announcements_uuid` (`announcement_uuid`),
  KEY `idx_admin_announcements_status_publish` (`status`, `publish_at`),
  KEY `idx_admin_announcements_audience` (`audience`),
  KEY `idx_admin_announcements_created_by` (`created_by_admin_id`),
  KEY `idx_admin_announcements_published_by` (`published_by_admin_id`),
  CONSTRAINT `chk_admin_announcements_window` CHECK (`expires_at` IS NULL OR `publish_at` IS NULL OR `expires_at` > `publish_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thông báo do admin phát hành; view v_public_announcements lọc theo đối tượng và thời gian';

CREATE TABLE IF NOT EXISTS `integration_outbox` (
  `outbox_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi outbox',
  `event_id` CHAR(36) NOT NULL COMMENT 'UUID sự kiện, dùng chống trùng ở phía nhận',
  `aggregate_type` VARCHAR(60) NOT NULL COMMENT 'Loại aggregate nguồn (user, book, review...)',
  `aggregate_id` VARCHAR(100) NOT NULL COMMENT 'ID aggregate nguồn dạng chuỗi',
  `aggregate_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID aggregate nếu có',
  `event_type` VARCHAR(100) NOT NULL COMMENT 'Loại sự kiện (user.locked, book.published...)',
  `payload` JSON NOT NULL COMMENT 'Nội dung sự kiện, không chứa dữ liệu nhạy cảm thô',
  `headers` JSON NULL DEFAULT NULL COMMENT 'Metadata vận chuyển (schema version, trace id)',
  `status` ENUM('pending','processing','processed','failed','dead_letter') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái phát',
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lần thử phát',
  `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Số lần thử tối đa trước dead-letter',
  `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm thử lại kế tiếp (UTC)',
  `locked_by` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Worker đang xử lý',
  `locked_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm khóa xử lý (UTC)',
  `last_error` TEXT NULL DEFAULT NULL COMMENT 'Lỗi gần nhất',
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm sự kiện phát sinh (UTC)',
  `processed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm phát thành công (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`outbox_id`),
  UNIQUE KEY `uq_integration_outbox_event` (`event_id`),
  KEY `idx_integration_outbox_dispatch` (`status`, `next_attempt_at`),
  KEY `idx_integration_outbox_aggregate` (`aggregate_type`, `aggregate_id`),
  KEY `idx_integration_outbox_event_type` (`event_type`, `created_at`),
  KEY `idx_integration_outbox_processed` (`processed_at`),
  CONSTRAINT `chk_integration_outbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Transactional outbox của bookadmin: ghi cùng transaction nghiệp vụ, worker phát sang bookuser';

CREATE TABLE IF NOT EXISTS `integration_inbox` (
  `inbox_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi inbox',
  `event_id` CHAR(36) NOT NULL COMMENT 'UUID sự kiện nhận được; UNIQUE để chống xử lý trùng',
  `source_schema` ENUM('bookuser','bookadmin','external') NOT NULL DEFAULT 'bookuser' COMMENT 'Nguồn phát sự kiện',
  `source_event_type` VARCHAR(100) NOT NULL COMMENT 'Loại sự kiện gốc (user.updated, book.unpublished...)',
  `aggregate_type` VARCHAR(60) NOT NULL COMMENT 'Loại aggregate liên quan',
  `aggregate_id` VARCHAR(100) NOT NULL COMMENT 'ID aggregate dạng chuỗi',
  `aggregate_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID aggregate nếu có',
  `payload` JSON NOT NULL COMMENT 'Nội dung sự kiện nhận được',
  `headers` JSON NULL DEFAULT NULL COMMENT 'Metadata vận chuyển (schema version, trace id)',
  `status` ENUM('pending','processing','processed','failed','skipped','dead_letter') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xử lý',
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lần thử xử lý',
  `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Số lần thử tối đa',
  `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm nhận (UTC)',
  `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm thử lại kế tiếp (UTC)',
  `processed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm xử lý xong (UTC)',
  `locked_by` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Worker đang xử lý',
  `locked_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm khóa xử lý (UTC)',
  `last_error` TEXT NULL DEFAULT NULL COMMENT 'Lỗi gần nhất',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`inbox_id`),
  UNIQUE KEY `uq_integration_inbox_event` (`event_id`),
  KEY `idx_integration_inbox_dispatch` (`status`, `next_attempt_at`),
  KEY `idx_integration_inbox_source` (`source_schema`, `source_event_type`, `received_at`),
  KEY `idx_integration_inbox_aggregate` (`aggregate_type`, `aggregate_id`),
  KEY `idx_integration_inbox_received` (`received_at`),
  CONSTRAINT `chk_integration_inbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inbox idempotent của bookadmin: nhận sự kiện từ bookuser, chống trùng theo event_id';

-- Hết phần định nghĩa bảng của schema bookadmin.
