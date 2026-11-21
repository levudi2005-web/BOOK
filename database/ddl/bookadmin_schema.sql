
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `bookadmin` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `bookadmin`;
DROP TABLE IF EXISTS `admin_account_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_account_roles` (
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Tài khoản admin',
  `role_id` bigint(20) unsigned NOT NULL COMMENT 'Vai trò được gán',
  `assigned_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin thực hiện gán quyền',
  `assigned_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm gán (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Hết hạn gán quyền (NULL = vĩnh viễn)',
  PRIMARY KEY (`admin_id`,`role_id`),
  KEY `idx_admin_account_roles_role` (`role_id`),
  KEY `idx_admin_account_roles_assigned_by` (`assigned_by_admin_id`),
  KEY `idx_admin_account_roles_expires` (`expires_at`),
  CONSTRAINT `fk_admin_account_roles_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_account_roles_assigned_by` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_account_roles_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`role_id`),
  CONSTRAINT `chk_admin_account_roles_expiry` CHECK (`expires_at` is null or `expires_at` > `assigned_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N giữa admin_accounts và admin_roles';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_accounts` (
  `admin_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tài khoản quản trị',
  `admin_uuid` char(36) NOT NULL COMMENT 'Mã định danh công khai, external ID cho tham chiếu chéo từ bookuser',
  `username` varchar(50) NOT NULL COMMENT 'Tên đăng nhập admin, duy nhất',
  `email` varchar(254) NOT NULL COMMENT 'Email công vụ, duy nhất',
  `password_hash` varchar(255) NOT NULL COMMENT 'Hash Argon2id; không có mật khẩu mặc định',
  `password_algorithm` varchar(30) NOT NULL DEFAULT 'argon2id' COMMENT 'Thuật toán hash để nâng cấp dần',
  `status` enum('invited','active','suspended','disabled') NOT NULL DEFAULT 'invited' COMMENT 'Trạng thái tài khoản admin',
  `must_change_password` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Buộc đổi mật khẩu ở lần đăng nhập đầu',
  `mfa_required` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Bắt buộc xác thực đa yếu tố',
  `failed_login_count` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lần đăng nhập sai liên tiếp',
  `locked_until` datetime(3) DEFAULT NULL COMMENT 'Khóa tạm thời đến mốc này (UTC)',
  `password_changed_at` datetime(3) DEFAULT NULL COMMENT 'Lần đổi mật khẩu gần nhất (UTC)',
  `last_login_at` datetime(3) DEFAULT NULL COMMENT 'Đăng nhập thành công gần nhất (UTC)',
  `last_login_ip` varbinary(16) DEFAULT NULL COMMENT 'IP đăng nhập gần nhất dạng nhị phân',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm; ưu tiên disabled thay vì xóa cứng',
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_accounts_uuid` (`admin_uuid`),
  UNIQUE KEY `uq_admin_accounts_username` (`username`),
  UNIQUE KEY `uq_admin_accounts_email` (`email`),
  KEY `idx_admin_accounts_status_created` (`status`,`created_at`),
  KEY `idx_admin_accounts_last_login` (`last_login_at`),
  KEY `idx_admin_accounts_deleted` (`deleted_at`),
  CONSTRAINT `chk_admin_accounts_username_length` CHECK (char_length(`username`) >= 3),
  CONSTRAINT `chk_admin_accounts_email_length` CHECK (char_length(`email`) >= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản Super Admin/Admin; tách biệt hoàn toàn với users của bookuser';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_announcements` (
  `announcement_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo hệ thống',
  `announcement_uuid` char(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề thông báo',
  `body` text NOT NULL COMMENT 'Nội dung thông báo',
  `audience` enum('all','admins','users','specific_roles') NOT NULL DEFAULT 'admins' COMMENT 'Đối tượng nhận',
  `target_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Danh sách role nhận khi audience = specific_roles' CHECK (json_valid(`target_roles`)),
  `severity` enum('info','success','warning','error','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ hiển thị',
  `status` enum('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái phát hành',
  `publish_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm phát hành (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hết hiển thị (UTC)',
  `created_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin tạo',
  `published_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin phát hành',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`announcement_id`),
  UNIQUE KEY `uq_admin_announcements_uuid` (`announcement_uuid`),
  KEY `idx_admin_announcements_status_publish` (`status`,`publish_at`),
  KEY `idx_admin_announcements_audience` (`audience`),
  KEY `idx_admin_announcements_created_by` (`created_by_admin_id`),
  KEY `idx_admin_announcements_published_by` (`published_by_admin_id`),
  CONSTRAINT `fk_admin_announcements_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_announcements_published_by` FOREIGN KEY (`published_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_admin_announcements_window` CHECK (`expires_at` is null or `publish_at` is null or `expires_at` > `publish_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo do admin phát hành; view v_public_announcements lọc theo đối tượng và thời gian';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `audit_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính nhật ký kiểm toán',
  `audit_uuid` char(36) NOT NULL COMMENT 'Mã công khai của bản ghi kiểm toán',
  `admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin thực hiện; NULL nếu tài khoản đã bị xóa cứng',
  `admin_uuid` char(36) NOT NULL COMMENT 'Bản sao UUID admin tại thời điểm thao tác',
  `admin_username` varchar(50) NOT NULL COMMENT 'Bản sao username admin tại thời điểm thao tác',
  `actor_type` enum('admin','system','api_client') NOT NULL DEFAULT 'admin' COMMENT 'Loại chủ thể thực hiện',
  `action` varchar(100) NOT NULL COMMENT 'Mã hành động (books.update, users.lock...)',
  `resource_type` varchar(60) DEFAULT NULL COMMENT 'Loại tài nguyên bị tác động',
  `resource_id` varchar(100) DEFAULT NULL COMMENT 'ID tài nguyên dạng chuỗi (BIGINT hoặc UUID)',
  `http_method` varchar(10) DEFAULT NULL COMMENT 'Phương thức HTTP',
  `request_path` varchar(512) DEFAULT NULL COMMENT 'Đường dẫn API',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'IP nhị phân của chủ thể',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'User-Agent',
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ảnh chụp dữ liệu trước khi sửa (đã che dữ liệu nhạy cảm)' CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ảnh chụp dữ liệu sau khi sửa' CHECK (json_valid(`after_data`)),
  `diff` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Các trường thay đổi' CHECK (json_valid(`diff`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ngữ cảnh bổ sung (request id, trace id...)' CHECK (json_valid(`metadata`)),
  `status` enum('success','failure') NOT NULL DEFAULT 'success' COMMENT 'Kết quả thao tác',
  `error_message` text DEFAULT NULL COMMENT 'Lỗi nếu thao tác thất bại',
  `correlation_id` char(36) DEFAULT NULL COMMENT 'Mã tương quan xuyên request/event',
  `prev_hash` binary(32) DEFAULT NULL COMMENT 'Hash bản ghi trước trong chuỗi (do ứng dụng tính)',
  `record_hash` binary(32) DEFAULT NULL COMMENT 'Hash bản ghi hiện tại (do ứng dụng tính)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm ghi nhật ký (UTC)',
  PRIMARY KEY (`audit_id`),
  UNIQUE KEY `uq_admin_audit_logs_uuid` (`audit_uuid`),
  KEY `idx_admin_audit_logs_admin_time` (`admin_id`,`created_at`),
  KEY `idx_admin_audit_logs_resource` (`resource_type`,`resource_id`),
  KEY `idx_admin_audit_logs_action_time` (`action`,`created_at`),
  KEY `idx_admin_audit_logs_created` (`created_at`),
  KEY `idx_admin_audit_logs_correlation` (`correlation_id`),
  KEY `idx_admin_audit_logs_resource_time` (`resource_type`,`resource_id`,`created_at`),
  CONSTRAINT `fk_admin_audit_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_admin_audit_logs_action` CHECK (char_length(`action`) > 0)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log append-only; trigger chặn UPDATE/DELETE, ứng dụng chỉ được INSERT/SELECT';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_login_attempts` (
  `attempt_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lần đăng nhập',
  `admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin nếu nhận diện được tài khoản',
  `username_attempted` varchar(254) NOT NULL COMMENT 'Username/email đã nhập, kể cả không tồn tại',
  `success` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đăng nhập thành công',
  `failure_reason` varchar(100) DEFAULT NULL COMMENT 'Lý do thất bại (bad_password, locked, mfa_failed...)',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'IP nhị phân',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'User-Agent',
  `attempted_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm thử đăng nhập (UTC)',
  PRIMARY KEY (`attempt_id`),
  KEY `idx_admin_login_attempts_username_time` (`username_attempted`,`attempted_at`),
  KEY `idx_admin_login_attempts_ip_time` (`ip_address`,`attempted_at`),
  KEY `idx_admin_login_attempts_admin_time` (`admin_id`,`attempted_at`),
  KEY `idx_admin_login_attempts_success_time` (`success`,`attempted_at`),
  CONSTRAINT `fk_admin_login_attempts_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký đăng nhập admin (append-only), phục vụ phát hiện bất thường';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_mfa_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_mfa_methods` (
  `mfa_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phương thức MFA',
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Tài khoản admin sở hữu phương thức',
  `method` enum('totp','webauthn','email','recovery_codes') NOT NULL COMMENT 'Loại xác thực đa yếu tố',
  `label` varchar(100) NOT NULL DEFAULT 'primary' COMMENT 'Nhãn phân biệt nhiều phương thức cùng loại',
  `secret_encrypted` varbinary(1024) DEFAULT NULL COMMENT 'Secret TOTP đã mã hóa bằng khóa KMS/ứng dụng',
  `credential_id` varbinary(255) DEFAULT NULL COMMENT 'Credential ID WebAuthn',
  `credential_public_key` varbinary(1024) DEFAULT NULL COMMENT 'Public key WebAuthn',
  `recovery_code_hashes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Mảng hash của mã khôi phục dùng một lần' CHECK (json_valid(`recovery_code_hashes`)),
  `sign_count` bigint(20) unsigned NOT NULL DEFAULT 0 COMMENT 'Bộ đếm chống replay của WebAuthn',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = phương thức chính',
  `confirmed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm xác nhận thiết lập xong',
  `last_used_at` datetime(3) DEFAULT NULL COMMENT 'Lần sử dụng gần nhất (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`mfa_id`),
  UNIQUE KEY `uq_admin_mfa_admin_method_label` (`admin_id`,`method`,`label`),
  KEY `idx_admin_mfa_admin` (`admin_id`),
  KEY `idx_admin_mfa_primary` (`admin_id`,`is_primary`),
  CONSTRAINT `fk_admin_mfa_methods_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phương thức MFA của admin; secret/khóa luôn được mã hóa, không lưu plaintext';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_notifications` (
  `notification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo admin',
  `notification_uuid` char(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `recipient_admin_id` bigint(20) unsigned NOT NULL COMMENT 'Admin nhận thông báo',
  `type` enum('report_created','case_assigned','case_escalated','verification_pending','rights_review_pending','system_alert','security_alert','announcement','other') NOT NULL DEFAULT 'other' COMMENT 'Loại thông báo',
  `severity` enum('info','success','warning','error','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ hiển thị',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `body` text DEFAULT NULL COMMENT 'Nội dung',
  `action_url` varchar(512) DEFAULT NULL COMMENT 'Đường dẫn xử lý trong trang quản trị',
  `related_resource_type` varchar(60) DEFAULT NULL COMMENT 'Loại tài nguyên liên quan',
  `related_resource_id` varchar(100) DEFAULT NULL COMMENT 'ID tài nguyên liên quan',
  `is_read` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc',
  `read_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm đọc (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hết hạn hiển thị (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `uq_admin_notifications_uuid` (`notification_uuid`),
  KEY `idx_admin_notifications_recipient_read` (`recipient_admin_id`,`is_read`,`created_at`),
  KEY `idx_admin_notifications_type` (`type`,`created_at`),
  KEY `idx_admin_notifications_resource` (`related_resource_type`,`related_resource_id`),
  KEY `idx_admin_notifications_expires` (`expires_at`),
  CONSTRAINT `fk_admin_notifications_recipient` FOREIGN KEY (`recipient_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_admin_notifications_read` CHECK (`is_read` = 0 and `read_at` is null or `is_read` = 1 and `read_at` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo trong ứng dụng quản trị; đánh dấu đã đọc kèm thời điểm';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_password_reset_tokens` (
  `token_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token đặt lại mật khẩu admin',
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Tài khoản admin yêu cầu đặt lại',
  `token_hash` binary(32) NOT NULL COMMENT 'SHA-256 token; không lưu token gốc',
  `expires_at` datetime(3) NOT NULL COMMENT 'Hạn sử dụng (UTC)',
  `consumed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm sử dụng (UTC)',
  `requested_ip` varbinary(16) DEFAULT NULL COMMENT 'IP yêu cầu',
  `requested_user_agent` varchar(512) DEFAULT NULL COMMENT 'User-Agent khi yêu cầu',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_admin_password_reset_tokens_hash` (`token_hash`),
  KEY `idx_admin_password_reset_tokens_admin_exp` (`admin_id`,`expires_at`),
  CONSTRAINT `fk_admin_password_reset_tokens_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_admin_password_reset_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_admin_password_reset_tokens_hash` CHECK (octet_length(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token đặt lại mật khẩu admin, chỉ lưu hash SHA-256';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính quyền',
  `code` varchar(100) NOT NULL COMMENT 'Mã quyền dạng resource.action (ví dụ books.approve)',
  `resource` varchar(60) NOT NULL COMMENT 'Tài nguyên được kiểm soát',
  `action` varchar(40) NOT NULL COMMENT 'Hành động trên tài nguyên',
  `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả quyền',
  `is_system` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = quyền hệ thống do seed quản lý',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_admin_permissions_code` (`code`),
  UNIQUE KEY `uq_admin_permissions_resource_action` (`resource`,`action`),
  KEY `idx_admin_permissions_resource` (`resource`),
  CONSTRAINT `chk_admin_permissions_code` CHECK (char_length(`code`) >= 3)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục quyền chi tiết theo resource và action';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_profiles` (
  `profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ admin',
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Tài khoản admin sở hữu hồ sơ (1-1)',
  `full_name` varchar(150) NOT NULL COMMENT 'Họ tên đầy đủ',
  `display_name` varchar(100) DEFAULT NULL COMMENT 'Tên hiển thị trong giao diện quản trị',
  `phone` varchar(30) DEFAULT NULL COMMENT 'Số điện thoại liên hệ nội bộ',
  `job_title` varchar(100) DEFAULT NULL COMMENT 'Chức danh',
  `department` varchar(100) DEFAULT NULL COMMENT 'Bộ phận',
  `avatar_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh đại diện',
  `locale` varchar(10) NOT NULL DEFAULT 'vi-VN' COMMENT 'Ngôn ngữ giao diện quản trị',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'Múi giờ hiển thị; dữ liệu lưu UTC',
  `bio` text DEFAULT NULL COMMENT 'Ghi chú giới thiệu nội bộ',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_admin_profiles_admin` (`admin_id`),
  KEY `idx_admin_profiles_department` (`department`),
  CONSTRAINT `fk_admin_profiles_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_admin_profiles_full_name` CHECK (char_length(`full_name`) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ nội bộ của tài khoản quản trị, 1-1 với admin_accounts';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_role_permissions` (
  `role_id` bigint(20) unsigned NOT NULL COMMENT 'Vai trò',
  `permission_id` bigint(20) unsigned NOT NULL COMMENT 'Quyền được cấp',
  `granted_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin thực hiện cấp quyền',
  `granted_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm cấp (UTC)',
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `idx_admin_role_permissions_permission` (`permission_id`),
  KEY `idx_admin_role_permissions_granted_by` (`granted_by_admin_id`),
  CONSTRAINT `fk_admin_role_permissions_granted_by` FOREIGN KEY (`granted_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions` (`permission_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N giữa admin_roles và admin_permissions';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_roles` (
  `role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính vai trò',
  `code` varchar(50) NOT NULL COMMENT 'Mã vai trò ổn định, dùng trong kiểm tra phân quyền',
  `name` varchar(100) NOT NULL COMMENT 'Tên vai trò hiển thị',
  `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả phạm vi quyền',
  `hierarchy_level` tinyint(3) unsigned NOT NULL DEFAULT 100 COMMENT 'Số nhỏ hơn = cấp cao hơn (SUPER_ADMIN = 1)',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = vai trò hệ thống, không cho xóa',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_admin_roles_code` (`code`),
  UNIQUE KEY `uq_admin_roles_name` (`name`),
  KEY `idx_admin_roles_hierarchy` (`hierarchy_level`),
  CONSTRAINT `chk_admin_roles_hierarchy` CHECK (`hierarchy_level` between 1 and 250)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vai trò RBAC: Super Admin, Administrator, Content Manager, Moderator, Analyst';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_sessions` (
  `session_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phiên admin',
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Tài khoản admin của phiên',
  `session_token_hash` binary(32) NOT NULL COMMENT 'SHA-256 session token; không lưu token gốc',
  `mfa_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đã hoàn tất MFA trong phiên',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'IP nhị phân của phiên',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'Chuỗi User-Agent',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo phiên (UTC)',
  `last_seen_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Lần hoạt động gần nhất (UTC)',
  `expires_at` datetime(3) NOT NULL COMMENT 'Hết hạn tuyệt đối (UTC)',
  `revoked_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm thu hồi (UTC)',
  `revoked_reason` varchar(100) DEFAULT NULL COMMENT 'Lý do thu hồi phiên',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_admin_sessions_token` (`session_token_hash`),
  KEY `idx_admin_sessions_admin_created` (`admin_id`,`created_at`),
  KEY `idx_admin_sessions_admin_expires` (`admin_id`,`expires_at`),
  KEY `idx_admin_sessions_expires` (`expires_at`),
  KEY `idx_admin_sessions_revoked` (`revoked_at`),
  CONSTRAINT `fk_admin_sessions_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_admin_sessions_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_admin_sessions_token` CHECK (octet_length(`session_token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiên đăng nhập khu vực quản trị, yêu cầu MFA trước khi cấp quyền';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_user_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_user_notes` (
  `note_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính ghi chú nội bộ',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id (không FK chéo DB)',
  `user_uuid` char(36) DEFAULT NULL COMMENT 'Bản sao external ID để tra cứu khi bookuser không sẵn sàng',
  `author_admin_id` bigint(20) unsigned NOT NULL COMMENT 'Admin tạo ghi chú',
  `note_type` enum('general','support','risk','verification','moderation') NOT NULL DEFAULT 'general' COMMENT 'Phân loại ghi chú',
  `content` text NOT NULL COMMENT 'Nội dung ghi chú nội bộ',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Ghim ghi chú quan trọng',
  `visibility` enum('all_admins','super_admin_only') NOT NULL DEFAULT 'all_admins' COMMENT 'Phạm vi nhìn thấy',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm ghi chú',
  PRIMARY KEY (`note_id`),
  KEY `idx_admin_user_notes_user_time` (`user_id`,`created_at`),
  KEY `idx_admin_user_notes_author` (`author_admin_id`),
  KEY `idx_admin_user_notes_type` (`note_type`),
  KEY `idx_admin_user_notes_pinned` (`is_pinned`,`created_at`),
  CONSTRAINT `fk_admin_user_notes_author` FOREIGN KEY (`author_admin_id`) REFERENCES `admin_accounts` (`admin_id`),
  CONSTRAINT `chk_admin_user_notes_content` CHECK (char_length(`content`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ghi chú nội bộ về người dùng; user_id là tham chiếu logic sang bookuser';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_rights_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_rights_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính xét duyệt quyền sách',
  `review_uuid` char(36) NOT NULL COMMENT 'Mã công khai của hồ sơ xét duyệt quyền',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.books.book_id',
  `book_uuid` char(36) DEFAULT NULL COMMENT 'Bản sao external ID sách',
  `rights_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.book_rights.rights_id',
  `status` enum('pending','in_review','approved','rejected','expired','revoked') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xét duyệt',
  `source_type` enum('self_published','licensed','public_domain','creative_commons','unknown') NOT NULL DEFAULT 'unknown' COMMENT 'Nguồn gốc quyền',
  `license_code` varchar(50) DEFAULT NULL COMMENT 'Mã giấy phép tại thời điểm xét duyệt',
  `findings` text DEFAULT NULL COMMENT 'Kết luận/ghi nhận của người xét duyệt',
  `evidence_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ tài liệu bằng chứng',
  `reviewer_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin xét duyệt',
  `submitted_by_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `submitted_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm nộp (UTC)',
  `reviewed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hoàn tất xét duyệt (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hết hiệu lực của quyền (UTC)',
  `open_book_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`status` in ('pending','in_review'),`book_id`,NULL)) STORED COMMENT 'Khóa sinh tự động: mỗi sách chỉ có một hồ sơ xét duyệt đang mở',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_book_rights_reviews_uuid` (`review_uuid`),
  UNIQUE KEY `uq_book_rights_reviews_open_book` (`open_book_id`),
  KEY `idx_book_rights_reviews_status_submitted` (`status`,`submitted_at`),
  KEY `idx_book_rights_reviews_book_status` (`book_id`,`status`),
  KEY `idx_book_rights_reviews_rights` (`rights_id`),
  KEY `idx_book_rights_reviews_reviewer` (`reviewer_admin_id`),
  KEY `idx_book_rights_reviews_source` (`source_type`),
  CONSTRAINT `fk_book_rights_reviews_reviewer` FOREIGN KEY (`reviewer_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_book_rights_reviews_book` CHECK (`book_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Xét duyệt nguồn gốc/giấy phép sách; book_id, rights_id là tham chiếu logic sang bookuser';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `content_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_reports` (
  `report_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính báo cáo nội dung phía admin',
  `report_uuid` char(36) NOT NULL COMMENT 'Mã công khai của báo cáo',
  `source_user_report_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.user_reports.report_id; unique để chống nhận trùng',
  `reporter_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `reporter_user_uuid` char(36) DEFAULT NULL COMMENT 'Bản sao external ID người báo cáo',
  `target_type` enum('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị báo cáo',
  `target_id` bigint(20) unsigned NOT NULL COMMENT 'ID đối tượng trong bookuser (kiểm tra hợp lệ ở tầng dịch vụ)',
  `target_uuid` char(36) DEFAULT NULL COMMENT 'UUID đối tượng để đối soát chéo',
  `reason_id` bigint(20) unsigned NOT NULL COMMENT 'Lý do báo cáo',
  `description` text DEFAULT NULL COMMENT 'Mô tả chi tiết từ người báo cáo',
  `status` enum('new','triaged','in_review','resolved','rejected','duplicate') NOT NULL DEFAULT 'new' COMMENT 'Trạng thái xử lý',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal' COMMENT 'Mức ưu tiên',
  `assigned_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin được phân công',
  `resolution_summary` varchar(1000) DEFAULT NULL COMMENT 'Tóm tắt kết quả xử lý',
  `resolved_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm giải quyết (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tiếp nhận (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_content_reports_uuid` (`report_uuid`),
  UNIQUE KEY `uq_content_reports_source` (`source_user_report_id`),
  KEY `idx_content_reports_status_priority` (`status`,`priority`,`created_at`),
  KEY `idx_content_reports_target` (`target_type`,`target_id`),
  KEY `idx_content_reports_reason` (`reason_id`),
  KEY `idx_content_reports_assigned` (`assigned_admin_id`,`status`),
  KEY `idx_content_reports_reporter` (`reporter_user_id`,`created_at`),
  CONSTRAINT `fk_content_reports_assigned` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_content_reports_reason` FOREIGN KEY (`reason_id`) REFERENCES `report_reasons` (`reason_id`),
  CONSTRAINT `chk_content_reports_target` CHECK (`target_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Báo cáo nội dung vi phạm; các ID bookuser là tham chiếu logic, kiểm tra ở service';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `feature_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_flags` (
  `flag_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cờ tính năng',
  `flag_key` varchar(100) NOT NULL COMMENT 'Khóa cờ tính năng',
  `environment` enum('all','development','staging','production') NOT NULL DEFAULT 'all' COMMENT 'Môi trường áp dụng',
  `name` varchar(150) NOT NULL COMMENT 'Tên hiển thị',
  `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả tính năng',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = bật tính năng',
  `rollout_percentage` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tỷ lệ người dùng được bật (0-100)',
  `targeting_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Quy tắc nhắm mục tiêu (user id, role, thuộc tính)' CHECK (json_valid(`targeting_rules`)),
  `updated_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin cập nhật gần nhất',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`flag_id`),
  UNIQUE KEY `uq_feature_flags_key_env` (`flag_key`,`environment`),
  KEY `idx_feature_flags_enabled` (`is_enabled`,`environment`),
  KEY `idx_feature_flags_updated_by` (`updated_by_admin_id`),
  CONSTRAINT `fk_feature_flags_updated_by` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_feature_flags_rollout` CHECK (`rollout_percentage` >= 0 and `rollout_percentage` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cờ tính năng theo môi trường, hỗ trợ rollout theo phần trăm và quy tắc';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `integration_inbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_inbox` (
  `inbox_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi inbox',
  `event_id` char(36) NOT NULL COMMENT 'UUID sự kiện nhận được; UNIQUE để chống xử lý trùng',
  `source_schema` enum('bookuser','bookadmin','external') NOT NULL DEFAULT 'bookuser' COMMENT 'Nguồn phát sự kiện',
  `source_event_type` varchar(100) NOT NULL COMMENT 'Loại sự kiện gốc (user.updated, book.unpublished...)',
  `aggregate_type` varchar(60) NOT NULL COMMENT 'Loại aggregate liên quan',
  `aggregate_id` varchar(100) NOT NULL COMMENT 'ID aggregate dạng chuỗi',
  `aggregate_uuid` char(36) DEFAULT NULL COMMENT 'UUID aggregate nếu có',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Nội dung sự kiện nhận được' CHECK (json_valid(`payload`)),
  `headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Metadata vận chuyển (schema version, trace id)' CHECK (json_valid(`headers`)),
  `status` enum('pending','processing','processed','failed','skipped','dead_letter') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xử lý',
  `attempt_count` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lần thử xử lý',
  `max_attempts` tinyint(3) unsigned NOT NULL DEFAULT 10 COMMENT 'Số lần thử tối đa',
  `received_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm nhận (UTC)',
  `next_attempt_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm thử lại kế tiếp (UTC)',
  `processed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm xử lý xong (UTC)',
  `locked_by` varchar(100) DEFAULT NULL COMMENT 'Worker đang xử lý',
  `locked_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm khóa xử lý (UTC)',
  `last_error` text DEFAULT NULL COMMENT 'Lỗi gần nhất',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`inbox_id`),
  UNIQUE KEY `uq_integration_inbox_event` (`event_id`),
  KEY `idx_integration_inbox_dispatch` (`status`,`next_attempt_at`),
  KEY `idx_integration_inbox_source` (`source_schema`,`source_event_type`,`received_at`),
  KEY `idx_integration_inbox_aggregate` (`aggregate_type`,`aggregate_id`),
  KEY `idx_integration_inbox_received` (`received_at`),
  KEY `idx_integration_inbox_pending_due` (`status`,`next_attempt_at`,`received_at`),
  CONSTRAINT `chk_integration_inbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inbox idempotent của bookadmin: nhận sự kiện từ bookuser, chống trùng theo event_id';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `integration_outbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_outbox` (
  `outbox_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi outbox',
  `event_id` char(36) NOT NULL COMMENT 'UUID sự kiện, dùng chống trùng ở phía nhận',
  `aggregate_type` varchar(60) NOT NULL COMMENT 'Loại aggregate nguồn (user, book, review...)',
  `aggregate_id` varchar(100) NOT NULL COMMENT 'ID aggregate nguồn dạng chuỗi',
  `aggregate_uuid` char(36) DEFAULT NULL COMMENT 'UUID aggregate nếu có',
  `event_type` varchar(100) NOT NULL COMMENT 'Loại sự kiện (user.locked, book.published...)',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Nội dung sự kiện, không chứa dữ liệu nhạy cảm thô' CHECK (json_valid(`payload`)),
  `headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Metadata vận chuyển (schema version, trace id)' CHECK (json_valid(`headers`)),
  `status` enum('pending','processing','processed','failed','dead_letter') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái phát',
  `attempt_count` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lần thử phát',
  `max_attempts` tinyint(3) unsigned NOT NULL DEFAULT 10 COMMENT 'Số lần thử tối đa trước dead-letter',
  `next_attempt_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm thử lại kế tiếp (UTC)',
  `locked_by` varchar(100) DEFAULT NULL COMMENT 'Worker đang xử lý',
  `locked_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm khóa xử lý (UTC)',
  `last_error` text DEFAULT NULL COMMENT 'Lỗi gần nhất',
  `occurred_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm sự kiện phát sinh (UTC)',
  `processed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm phát thành công (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`outbox_id`),
  UNIQUE KEY `uq_integration_outbox_event` (`event_id`),
  KEY `idx_integration_outbox_dispatch` (`status`,`next_attempt_at`),
  KEY `idx_integration_outbox_aggregate` (`aggregate_type`,`aggregate_id`),
  KEY `idx_integration_outbox_event_type` (`event_type`,`created_at`),
  KEY `idx_integration_outbox_processed` (`processed_at`),
  KEY `idx_integration_outbox_pending_due` (`status`,`next_attempt_at`,`occurred_at`),
  CONSTRAINT `chk_integration_outbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transactional outbox của bookadmin: ghi cùng transaction nghiệp vụ, worker phát sang bookuser';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `maintenance_windows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_windows` (
  `window_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cửa sổ bảo trì',
  `window_uuid` char(36) NOT NULL COMMENT 'Mã công khai của cửa sổ bảo trì',
  `title` varchar(200) NOT NULL COMMENT 'Tiêu đề cửa sổ bảo trì',
  `description` text DEFAULT NULL COMMENT 'Mô tả phạm vi và lý do',
  `scope` enum('all','api','web','admin','worker','database') NOT NULL DEFAULT 'all' COMMENT 'Thành phần bị ảnh hưởng',
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled' COMMENT 'Trạng thái',
  `starts_at` datetime(3) NOT NULL COMMENT 'Bắt đầu (UTC)',
  `ends_at` datetime(3) NOT NULL COMMENT 'Kết thúc dự kiến (UTC)',
  `is_read_only` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = chỉ đọc trong thời gian bảo trì',
  `allow_admin_access` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = vẫn cho phép admin truy cập',
  `created_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin tạo cửa sổ bảo trì',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`window_id`),
  UNIQUE KEY `uq_maintenance_windows_uuid` (`window_uuid`),
  KEY `idx_maintenance_windows_time` (`starts_at`,`ends_at`),
  KEY `idx_maintenance_windows_status` (`status`,`starts_at`),
  KEY `idx_maintenance_windows_scope` (`scope`),
  KEY `idx_maintenance_windows_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_maintenance_windows_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_maintenance_windows_window` CHECK (`ends_at` > `starts_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch bảo trì hệ thống, dùng để bật chế độ chỉ đọc và thông báo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `moderation_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_actions` (
  `action_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hành động kiểm duyệt',
  `action_uuid` char(36) NOT NULL COMMENT 'Mã công khai của hành động',
  `case_id` bigint(20) unsigned NOT NULL COMMENT 'Hồ sơ kiểm duyệt',
  `action_type` enum('warn','hide_content','restore_content','remove_content','restrict_user','unrestrict_user','request_changes','approve','reject','note','escalate') NOT NULL COMMENT 'Loại hành động',
  `target_type` enum('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng tác động',
  `target_id` bigint(20) unsigned NOT NULL COMMENT 'ID đối tượng trong bookuser',
  `admin_id` bigint(20) unsigned NOT NULL COMMENT 'Admin thực hiện',
  `reason` text NOT NULL COMMENT 'Lý do, bắt buộc để truy vết',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú nội bộ',
  `previous_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ảnh chụp trạng thái trước khi thay đổi' CHECK (json_valid(`previous_state`)),
  `new_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ảnh chụp trạng thái sau khi thay đổi' CHECK (json_valid(`new_state`)),
  `effective_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm có hiệu lực (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hết hiệu lực (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm ghi nhận (UTC)',
  PRIMARY KEY (`action_id`),
  UNIQUE KEY `uq_moderation_actions_uuid` (`action_uuid`),
  KEY `idx_moderation_actions_case_time` (`case_id`,`created_at`),
  KEY `idx_moderation_actions_admin_time` (`admin_id`,`created_at`),
  KEY `idx_moderation_actions_target` (`target_type`,`target_id`),
  KEY `idx_moderation_actions_type` (`action_type`,`created_at`),
  CONSTRAINT `fk_moderation_actions_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`),
  CONSTRAINT `fk_moderation_actions_case` FOREIGN KEY (`case_id`) REFERENCES `moderation_cases` (`case_id`),
  CONSTRAINT `chk_moderation_actions_target` CHECK (`target_id` > 0),
  CONSTRAINT `chk_moderation_actions_expiry` CHECK (`expires_at` is null or `expires_at` > `effective_at`),
  CONSTRAINT `chk_moderation_actions_reason` CHECK (char_length(`reason`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký hành động kiểm duyệt, lưu trạng thái trước/sau để truy vết';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `moderation_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_cases` (
  `case_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ kiểm duyệt',
  `case_uuid` char(36) NOT NULL COMMENT 'Mã công khai của hồ sơ',
  `case_number` varchar(30) NOT NULL COMMENT 'Mã hồ sơ thân thiện (ví dụ MC-2026-000123)',
  `report_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Báo cáo nguồn; unique để một báo cáo chỉ mở một hồ sơ',
  `target_type` enum('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị kiểm duyệt',
  `target_id` bigint(20) unsigned NOT NULL COMMENT 'ID đối tượng trong bookuser (kiểm tra ở service)',
  `target_uuid` char(36) DEFAULT NULL COMMENT 'UUID đối tượng để đối soát',
  `status` enum('open','investigating','pending_action','resolved','closed','escalated') NOT NULL DEFAULT 'open' COMMENT 'Trạng thái hồ sơ',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal' COMMENT 'Mức ưu tiên',
  `assigned_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin đang xử lý',
  `opened_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin mở hồ sơ',
  `summary` text DEFAULT NULL COMMENT 'Tóm tắt nội dung vụ việc',
  `due_at` datetime(3) DEFAULT NULL COMMENT 'Hạn xử lý (UTC)',
  `opened_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm mở hồ sơ (UTC)',
  `closed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm đóng hồ sơ (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `uq_moderation_cases_uuid` (`case_uuid`),
  UNIQUE KEY `uq_moderation_cases_number` (`case_number`),
  UNIQUE KEY `uq_moderation_cases_report` (`report_id`),
  KEY `idx_moderation_cases_status_due` (`status`,`due_at`),
  KEY `idx_moderation_cases_assigned` (`assigned_admin_id`,`status`),
  KEY `idx_moderation_cases_target` (`target_type`,`target_id`),
  KEY `idx_moderation_cases_opened_by` (`opened_by_admin_id`),
  CONSTRAINT `fk_moderation_cases_assigned` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_moderation_cases_opened_by` FOREIGN KEY (`opened_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_moderation_cases_report` FOREIGN KEY (`report_id`) REFERENCES `content_reports` (`report_id`),
  CONSTRAINT `chk_moderation_cases_target` CHECK (`target_id` > 0),
  CONSTRAINT `chk_moderation_cases_closed` CHECK (`closed_at` is null or `closed_at` >= `opened_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ kiểm duyệt nội dung; kết nối báo cáo, phân công và quyết định xử lý';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `report_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_reasons` (
  `reason_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lý do báo cáo',
  `code` varchar(50) NOT NULL COMMENT 'Mã lý do ổn định, đồng bộ với bookuser.user_reports.reason_code',
  `label` varchar(150) NOT NULL COMMENT 'Nhãn hiển thị',
  `description` varchar(500) DEFAULT NULL COMMENT 'Giải thích chi tiết',
  `applies_to` enum('book','review','comment','user','author','any') NOT NULL DEFAULT 'any' COMMENT 'Loại đối tượng áp dụng',
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium' COMMENT 'Mức độ nghiêm trọng mặc định',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = còn sử dụng',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`reason_id`),
  UNIQUE KEY `uq_report_reasons_code` (`code`),
  KEY `idx_report_reasons_active_sort` (`is_active`,`sort_order`),
  KEY `idx_report_reasons_applies` (`applies_to`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục lý do báo cáo nội dung, dùng chung cho API và UI';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_events` (
  `event_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính sự kiện bảo mật',
  `event_uuid` char(36) NOT NULL COMMENT 'Mã công khai của sự kiện',
  `event_type` enum('login_success','login_failure','logout','password_changed','password_reset_requested','mfa_enabled','mfa_disabled','mfa_challenge_failed','account_locked','account_unlocked','permission_changed','role_changed','session_revoked','suspicious_activity','api_key_created','api_key_revoked') NOT NULL COMMENT 'Loại sự kiện bảo mật',
  `severity` enum('info','low','medium','high','critical') NOT NULL DEFAULT 'info' COMMENT 'Mức độ nghiêm trọng',
  `actor_type` enum('admin','user','system','anonymous') NOT NULL DEFAULT 'system' COMMENT 'Loại chủ thể',
  `admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin liên quan',
  `user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `subject_identifier` varchar(150) DEFAULT NULL COMMENT 'Email/username đã thử (đã chuẩn hóa)',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'Địa chỉ IP nhị phân',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'User-Agent',
  `outcome` enum('success','failure','blocked') NOT NULL DEFAULT 'success' COMMENT 'Kết quả',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Chi tiết bổ sung đã lọc dữ liệu nhạy cảm' CHECK (json_valid(`details`)),
  `risk_score` tinyint(3) unsigned DEFAULT NULL COMMENT 'Điểm rủi ro 0-100',
  `correlation_id` char(36) DEFAULT NULL COMMENT 'Mã tương quan với audit log',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm xảy ra (UTC)',
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uq_security_events_uuid` (`event_uuid`),
  KEY `idx_security_events_type_time` (`event_type`,`created_at`),
  KEY `idx_security_events_severity_time` (`severity`,`created_at`),
  KEY `idx_security_events_admin_time` (`admin_id`,`created_at`),
  KEY `idx_security_events_user` (`user_id`,`created_at`),
  KEY `idx_security_events_ip` (`ip_address`),
  KEY `idx_security_events_correlation` (`correlation_id`),
  CONSTRAINT `fk_security_events_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_security_events_risk` CHECK (`risk_score` is null or `risk_score` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sự kiện bảo mật phục vụ phát hiện bất thường; user_id là tham chiếu logic';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_metrics_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_metrics_daily` (
  `metric_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính chỉ số ngày',
  `metric_date` date NOT NULL COMMENT 'Ngày ghi nhận (UTC)',
  `metric_key` varchar(80) NOT NULL COMMENT 'Mã chỉ số (users.new, books.published...)',
  `dimension_key` varchar(100) NOT NULL DEFAULT '' COMMENT 'Khóa tổ hợp chiều phân tích (ví dụ language=vi)',
  `metric_value` decimal(18,4) NOT NULL DEFAULT 0.0000 COMMENT 'Giá trị chỉ số',
  `unit` varchar(20) NOT NULL DEFAULT 'count' COMMENT 'Đơn vị (count, percent, seconds, bytes)',
  `dimension` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Chi tiết chiều phân tích dạng JSON' CHECK (json_valid(`dimension`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tổng hợp (UTC)',
  PRIMARY KEY (`metric_id`),
  UNIQUE KEY `uq_system_metrics_daily` (`metric_date`,`metric_key`,`dimension_key`),
  KEY `idx_system_metrics_daily_key` (`metric_key`,`metric_date`),
  KEY `idx_system_metrics_daily_date` (`metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chỉ số tổng hợp theo ngày; dimension_key bảo đảm tính duy nhất khi dimension là JSON';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cấu hình hệ thống',
  `setting_key` varchar(100) NOT NULL COMMENT 'Khóa cấu hình duy nhất (dot.notation)',
  `value_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Giá trị cấu hình dạng JSON' CHECK (json_valid(`value_json`)),
  `value_type` enum('string','integer','decimal','boolean','json') NOT NULL DEFAULT 'string' COMMENT 'Kiểu dữ liệu logic của giá trị',
  `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Nhóm cấu hình',
  `label` varchar(150) NOT NULL COMMENT 'Nhãn hiển thị',
  `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả ý nghĩa cấu hình',
  `is_public` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = được phép trả ra API công khai',
  `is_editable` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = cho phép sửa qua giao diện quản trị',
  `updated_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin cập nhật gần nhất',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_system_settings_key` (`setting_key`),
  KEY `idx_system_settings_category` (`category`,`setting_key`),
  KEY `idx_system_settings_public` (`is_public`),
  KEY `idx_system_settings_updated_by` (`updated_by_admin_id`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_system_settings_key` CHECK (char_length(`setting_key`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cấu hình hệ thống có kiểu dữ liệu và phạm vi công khai rõ ràng';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_restrictions` (
  `restriction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lệnh hạn chế',
  `restriction_uuid` char(36) NOT NULL COMMENT 'Mã công khai của lệnh hạn chế',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `user_uuid` char(36) DEFAULT NULL COMMENT 'Bản sao external ID người dùng',
  `restriction_type` enum('account_lock','account_suspension','feature_restriction','download_block','comment_block','upload_block') NOT NULL COMMENT 'Loại hạn chế',
  `feature_code` varchar(60) DEFAULT NULL COMMENT 'Mã tính năng khi restriction_type = feature_restriction',
  `reason` text NOT NULL COMMENT 'Lý do hạn chế, bắt buộc để truy vết',
  `status` enum('active','expired','lifted') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hiệu lực',
  `issued_by_admin_id` bigint(20) unsigned NOT NULL COMMENT 'Admin ban hành',
  `lifted_by_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin gỡ bỏ hạn chế',
  `starts_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Bắt đầu hiệu lực (UTC)',
  `ends_at` datetime(3) DEFAULT NULL COMMENT 'Kết thúc hiệu lực; NULL = vô thời hạn',
  `lifted_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm gỡ bỏ (UTC)',
  `lift_reason` text DEFAULT NULL COMMENT 'Lý do gỡ bỏ',
  `source_event_id` char(36) DEFAULT NULL COMMENT 'event_id đã tạo lệnh này (idempotency với Inbox)',
  `active_lock_key` bigint(20) unsigned GENERATED ALWAYS AS (if(`status` = 'active' and `restriction_type` in ('account_lock','account_suspension'),`user_id`,NULL)) STORED COMMENT 'Khóa sinh tự động: tối đa một lệnh khóa tài khoản đang hiệu lực/người dùng',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`restriction_id`),
  UNIQUE KEY `uq_user_restrictions_uuid` (`restriction_uuid`),
  UNIQUE KEY `uq_user_restrictions_active_lock` (`active_lock_key`),
  KEY `idx_user_restrictions_user_status` (`user_id`,`status`,`ends_at`),
  KEY `idx_user_restrictions_status_ends` (`status`,`ends_at`),
  KEY `idx_user_restrictions_issued_by` (`issued_by_admin_id`),
  KEY `idx_user_restrictions_lifted_by` (`lifted_by_admin_id`),
  KEY `idx_user_restrictions_source_event` (`source_event_id`),
  KEY `idx_user_restrictions_user_type_status` (`user_id`,`restriction_type`,`status`),
  CONSTRAINT `fk_user_restrictions_issued_by` FOREIGN KEY (`issued_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`),
  CONSTRAINT `fk_user_restrictions_lifted_by` FOREIGN KEY (`lifted_by_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_restrictions_window` CHECK (`ends_at` is null or `ends_at` > `starts_at`),
  CONSTRAINT `chk_user_restrictions_reason` CHECK (char_length(`reason`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hạn chế/khóa/đình chỉ người dùng; user_id tham chiếu logic sang bookuser';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_verification_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_verification_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ xét duyệt',
  `review_uuid` char(36) NOT NULL COMMENT 'Mã công khai của hồ sơ xét duyệt',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Tham chiếu LOGIC tới bookuser.users.user_id',
  `user_uuid` char(36) DEFAULT NULL COMMENT 'Bản sao external ID người dùng',
  `verification_type` enum('email','identity','author','publisher') NOT NULL DEFAULT 'identity' COMMENT 'Loại xác minh',
  `status` enum('pending','in_review','approved','rejected','needs_more_info') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xử lý',
  `submitted_documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Danh sách storage_key tài liệu, không chứa dữ liệu nhị phân' CHECK (json_valid(`submitted_documents`)),
  `reviewer_admin_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin xử lý',
  `decision_reason` text DEFAULT NULL COMMENT 'Lý do quyết định',
  `submitted_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm nộp (UTC)',
  `reviewed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hoàn tất xét duyệt (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_user_verification_reviews_uuid` (`review_uuid`),
  KEY `idx_user_verification_reviews_user_status` (`user_id`,`status`),
  KEY `idx_user_verification_reviews_status_submitted` (`status`,`submitted_at`),
  KEY `idx_user_verification_reviews_reviewer` (`reviewer_admin_id`),
  KEY `idx_user_verification_reviews_type` (`verification_type`,`status`),
  CONSTRAINT `fk_user_verification_reviews_reviewer` FOREIGN KEY (`reviewer_admin_id`) REFERENCES `admin_accounts` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ xác minh người dùng (email/CMND/tác giả/NXB); user_id tham chiếu logic';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_book_summary`;
/*!50001 DROP VIEW IF EXISTS `v_book_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_book_summary` AS SELECT
 1 AS `book_id`,
  1 AS `book_uuid`,
  1 AS `rights_review_count`,
  1 AS `approved_rights_review_count`,
  1 AS `open_rights_review_count`,
  1 AS `has_approved_rights`,
  1 AS `latest_rights_status`,
  1 AS `last_rights_reviewed_at`,
  1 AS `open_report_count`,
  1 AS `total_report_count`,
  1 AS `last_report_at`,
  1 AS `open_case_count`,
  1 AS `total_case_count`,
  1 AS `last_case_opened_at` */;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_user_summary`;
/*!50001 DROP VIEW IF EXISTS `v_user_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_user_summary` AS SELECT
 1 AS `user_id`,
  1 AS `user_uuid`,
  1 AS `note_count`,
  1 AS `pinned_note_count`,
  1 AS `last_note_at`,
  1 AS `active_restriction_count`,
  1 AS `total_restriction_count`,
  1 AS `last_restriction_at`,
  1 AS `pending_verification_count`,
  1 AS `approved_verification_count`,
  1 AS `last_verification_at`,
  1 AS `open_report_count`,
  1 AS `total_report_count`,
  1 AS `last_report_at` */;
SET character_set_client = @saved_cs_client;

USE `bookadmin`;
/*!50001 DROP VIEW IF EXISTS `v_book_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_book_summary` AS select `ids`.`book_id` AS `book_id`,`ids`.`book_uuid` AS `book_uuid`,coalesce(`rr`.`rights_review_count`,0) AS `rights_review_count`,coalesce(`rr`.`approved_rights_review_count`,0) AS `approved_rights_review_count`,coalesce(`rr`.`open_rights_review_count`,0) AS `open_rights_review_count`,ifnull(`rr`.`approved_rights_review_count`,0) > 0 AS `has_approved_rights`,(select `rr2`.`status` from `book_rights_reviews` `rr2` where `rr2`.`book_id` = `ids`.`book_id` order by `rr2`.`updated_at` desc,`rr2`.`review_id` desc limit 1) AS `latest_rights_status`,`rr`.`last_rights_reviewed_at` AS `last_rights_reviewed_at`,coalesce(`rep`.`open_report_count`,0) AS `open_report_count`,coalesce(`rep`.`total_report_count`,0) AS `total_report_count`,`rep`.`last_report_at` AS `last_report_at`,coalesce(`mc`.`open_case_count`,0) AS `open_case_count`,coalesce(`mc`.`total_case_count`,0) AS `total_case_count`,`mc`.`last_case_opened_at` AS `last_case_opened_at` from ((((select `b`.`book_id` AS `book_id`,max(`b`.`book_uuid`) AS `book_uuid` from (select `book_rights_reviews`.`book_id` AS `book_id`,`book_rights_reviews`.`book_uuid` AS `book_uuid` from `book_rights_reviews` union all select `content_reports`.`target_id` AS `target_id`,`content_reports`.`target_uuid` AS `target_uuid` from `content_reports` where `content_reports`.`target_type` = 'book' union all select `moderation_cases`.`target_id` AS `target_id`,`moderation_cases`.`target_uuid` AS `target_uuid` from `moderation_cases` where `moderation_cases`.`target_type` = 'book') `b` group by `b`.`book_id`) `ids` left join (select `book_rights_reviews`.`book_id` AS `book_id`,count(0) AS `rights_review_count`,sum(`book_rights_reviews`.`status` = 'approved') AS `approved_rights_review_count`,sum(`book_rights_reviews`.`status` in ('pending','in_review')) AS `open_rights_review_count`,max(`book_rights_reviews`.`reviewed_at`) AS `last_rights_reviewed_at` from `book_rights_reviews` group by `book_rights_reviews`.`book_id`) `rr` on(`rr`.`book_id` = `ids`.`book_id`)) left join (select `content_reports`.`target_id` AS `book_id`,sum(`content_reports`.`status` in ('new','triaged','in_review')) AS `open_report_count`,count(0) AS `total_report_count`,max(`content_reports`.`created_at`) AS `last_report_at` from `content_reports` where `content_reports`.`target_type` = 'book' group by `content_reports`.`target_id`) `rep` on(`rep`.`book_id` = `ids`.`book_id`)) left join (select `moderation_cases`.`target_id` AS `book_id`,sum(`moderation_cases`.`status` in ('open','investigating','pending_action','escalated')) AS `open_case_count`,count(0) AS `total_case_count`,max(`moderation_cases`.`opened_at`) AS `last_case_opened_at` from `moderation_cases` where `moderation_cases`.`target_type` = 'book' group by `moderation_cases`.`target_id`) `mc` on(`mc`.`book_id` = `ids`.`book_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_user_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_user_summary` AS select `ids`.`user_id` AS `user_id`,`ids`.`user_uuid` AS `user_uuid`,coalesce(`n`.`note_count`,0) AS `note_count`,coalesce(`n`.`pinned_note_count`,0) AS `pinned_note_count`,`n`.`last_note_at` AS `last_note_at`,coalesce(`r`.`active_restriction_count`,0) AS `active_restriction_count`,coalesce(`r`.`total_restriction_count`,0) AS `total_restriction_count`,`r`.`last_restriction_at` AS `last_restriction_at`,coalesce(`v`.`pending_verification_count`,0) AS `pending_verification_count`,coalesce(`v`.`approved_verification_count`,0) AS `approved_verification_count`,`v`.`last_verification_at` AS `last_verification_at`,coalesce(`rep`.`open_report_count`,0) AS `open_report_count`,coalesce(`rep`.`total_report_count`,0) AS `total_report_count`,`rep`.`last_report_at` AS `last_report_at` from (((((select `u`.`user_id` AS `user_id`,max(`u`.`user_uuid`) AS `user_uuid` from (select `admin_user_notes`.`user_id` AS `user_id`,`admin_user_notes`.`user_uuid` AS `user_uuid` from `admin_user_notes` where `admin_user_notes`.`deleted_at` is null union all select `user_restrictions`.`user_id` AS `user_id`,`user_restrictions`.`user_uuid` AS `user_uuid` from `user_restrictions` union all select `user_verification_reviews`.`user_id` AS `user_id`,`user_verification_reviews`.`user_uuid` AS `user_uuid` from `user_verification_reviews` union all select `content_reports`.`target_id` AS `target_id`,`content_reports`.`target_uuid` AS `target_uuid` from `content_reports` where `content_reports`.`target_type` = 'user') `u` group by `u`.`user_id`) `ids` left join (select `admin_user_notes`.`user_id` AS `user_id`,count(0) AS `note_count`,sum(`admin_user_notes`.`is_pinned` = 1) AS `pinned_note_count`,max(`admin_user_notes`.`created_at`) AS `last_note_at` from `admin_user_notes` where `admin_user_notes`.`deleted_at` is null group by `admin_user_notes`.`user_id`) `n` on(`n`.`user_id` = `ids`.`user_id`)) left join (select `user_restrictions`.`user_id` AS `user_id`,sum(`user_restrictions`.`status` = 'active' and (`user_restrictions`.`ends_at` is null or `user_restrictions`.`ends_at` > current_timestamp(3))) AS `active_restriction_count`,count(0) AS `total_restriction_count`,max(`user_restrictions`.`created_at`) AS `last_restriction_at` from `user_restrictions` group by `user_restrictions`.`user_id`) `r` on(`r`.`user_id` = `ids`.`user_id`)) left join (select `user_verification_reviews`.`user_id` AS `user_id`,sum(`user_verification_reviews`.`status` in ('pending','in_review','needs_more_info')) AS `pending_verification_count`,sum(`user_verification_reviews`.`status` = 'approved') AS `approved_verification_count`,max(`user_verification_reviews`.`submitted_at`) AS `last_verification_at` from `user_verification_reviews` group by `user_verification_reviews`.`user_id`) `v` on(`v`.`user_id` = `ids`.`user_id`)) left join (select `content_reports`.`target_id` AS `user_id`,sum(`content_reports`.`status` in ('new','triaged','in_review')) AS `open_report_count`,count(0) AS `total_report_count`,max(`content_reports`.`created_at`) AS `last_report_at` from `content_reports` where `content_reports`.`target_type` = 'user' group by `content_reports`.`target_id`) `rep` on(`rep`.`user_id` = `ids`.`user_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

