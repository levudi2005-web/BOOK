-- =====================================================================
-- BOOKFORFREEDOM - Schema bookadmin
-- 003_create_constraints.sql : Khóa ngoại (FK) + trigger append-only
-- ---------------------------------------------------------------------
-- Nguyên tắc:
--   * Chỉ FK trong nội bộ schema bookadmin. Không có FK xuyên database.
--   * Tham chiếu người dùng/sách là tham chiếu logic: user_id, user_uuid,
--     book_id, book_uuid, source_user_report_id, source_event_id.
--   * Bảng audit/evidence (admin_audit_logs, security_events,
--     moderation_actions, admin_login_attempts) không CASCADE.
--   * admin_audit_logs và security_events là append-only (trigger chặn
--     UPDATE/DELETE) để bảo toàn chuỗi hash và bằng chứng điều tra.
--   * Script chạy lại được: mỗi FK chỉ được thêm khi chưa tồn tại.
-- =====================================================================

USE `bookadmin`;
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `_ddl_add_fk`;
DELIMITER $$
CREATE PROCEDURE `_ddl_add_fk`(
  IN p_table VARCHAR(64),
  IN p_constraint VARCHAR(64),
  IN p_columns VARCHAR(255),
  IN p_ref_table VARCHAR(64),
  IN p_ref_columns VARCHAR(255),
  IN p_on_delete VARCHAR(20),
  IN p_on_update VARCHAR(20)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND CONSTRAINT_NAME = p_constraint
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_constraint,
      '` FOREIGN KEY (', p_columns, ') REFERENCES `', p_ref_table,
      '` (', p_ref_columns, ') ON DELETE ', p_on_delete, ' ON UPDATE ', p_on_update
    );
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- 1. Tài khoản quản trị, RBAC và phiên đăng nhập
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('admin_profiles', 'fk_admin_profiles_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_account_roles', 'fk_admin_account_roles_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_account_roles', 'fk_admin_account_roles_role', '`role_id`', 'admin_roles', '`role_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('admin_account_roles', 'fk_admin_account_roles_assigned_by', '`assigned_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('admin_role_permissions', 'fk_admin_role_permissions_role', '`role_id`', 'admin_roles', '`role_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_role_permissions', 'fk_admin_role_permissions_permission', '`permission_id`', 'admin_permissions', '`permission_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_role_permissions', 'fk_admin_role_permissions_granted_by', '`granted_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('admin_sessions', 'fk_admin_sessions_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_mfa_methods', 'fk_admin_mfa_methods_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_password_reset_tokens', 'fk_admin_password_reset_tokens_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('admin_login_attempts', 'fk_admin_login_attempts_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 2. Ghi chú nội bộ và hạn chế người dùng
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('admin_user_notes', 'fk_admin_user_notes_author', '`author_admin_id`', 'admin_accounts', '`admin_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('user_restrictions', 'fk_user_restrictions_issued_by', '`issued_by_admin_id`', 'admin_accounts', '`admin_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('user_restrictions', 'fk_user_restrictions_lifted_by', '`lifted_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 3. Kiểm duyệt, xác minh, báo cáo nội dung
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('user_verification_reviews', 'fk_user_verification_reviews_reviewer', '`reviewer_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('content_reports', 'fk_content_reports_reason', '`reason_id`', 'report_reasons', '`reason_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('content_reports', 'fk_content_reports_assigned', '`assigned_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('moderation_cases', 'fk_moderation_cases_report', '`report_id`', 'content_reports', '`report_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('moderation_cases', 'fk_moderation_cases_assigned', '`assigned_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('moderation_cases', 'fk_moderation_cases_opened_by', '`opened_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('moderation_actions', 'fk_moderation_actions_case', '`case_id`', 'moderation_cases', '`case_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('moderation_actions', 'fk_moderation_actions_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('book_rights_reviews', 'fk_book_rights_reviews_reviewer', '`reviewer_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 4. Audit, bảo mật, thông báo, cấu hình hệ thống
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('admin_audit_logs', 'fk_admin_audit_logs_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('security_events', 'fk_security_events_admin', '`admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('admin_notifications', 'fk_admin_notifications_recipient', '`recipient_admin_id`', 'admin_accounts', '`admin_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('system_settings', 'fk_system_settings_updated_by', '`updated_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('feature_flags', 'fk_feature_flags_updated_by', '`updated_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('maintenance_windows', 'fk_maintenance_windows_created_by', '`created_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('admin_announcements', 'fk_admin_announcements_created_by', '`created_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('admin_announcements', 'fk_admin_announcements_published_by', '`published_by_admin_id`', 'admin_accounts', '`admin_id`', 'SET NULL', 'RESTRICT');

DROP PROCEDURE IF EXISTS `_ddl_add_fk`;

-- =====================================================================
-- 5. Trigger append-only
-- =====================================================================
DROP TRIGGER IF EXISTS `trg_admin_audit_logs_no_update`;
DROP TRIGGER IF EXISTS `trg_admin_audit_logs_no_delete`;
DROP TRIGGER IF EXISTS `trg_security_events_no_update`;
DROP TRIGGER IF EXISTS `trg_security_events_no_delete`;

DELIMITER $$
CREATE TRIGGER `trg_admin_audit_logs_no_update`
BEFORE UPDATE ON `admin_audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'admin_audit_logs is append-only: UPDATE is not allowed';
END$$

CREATE TRIGGER `trg_admin_audit_logs_no_delete`
BEFORE DELETE ON `admin_audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'admin_audit_logs is append-only: DELETE is not allowed';
END$$

CREATE TRIGGER `trg_security_events_no_update`
BEFORE UPDATE ON `security_events`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'security_events is append-only: UPDATE is not allowed';
END$$

CREATE TRIGGER `trg_security_events_no_delete`
BEFORE DELETE ON `security_events`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'security_events is append-only: DELETE is not allowed';
END$$
DELIMITER ;

-- =====================================================================
-- Hết 003_create_constraints.sql (bookadmin)
-- =====================================================================