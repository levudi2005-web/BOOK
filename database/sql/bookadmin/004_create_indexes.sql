-- =====================================================================
-- BOOKFORFREEDOM - Schema bookadmin
-- 004_create_indexes.sql : Index bổ sung cho truy vấn nghiệp vụ
-- ---------------------------------------------------------------------
-- 002_create_tables.sql đã khai báo toàn bộ PK/UK/FK-index cơ sở.
-- File này chỉ thêm các index phục vụ điều tra/queue chuyên biệt.
-- Idempotent: CREATE INDEX IF NOT EXISTS (MariaDB 10.11).
-- =====================================================================

USE `bookadmin`;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Dòng thời gian điều tra theo tài nguyên (audit trail)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_admin_audit_logs_resource_time`
  ON `admin_audit_logs` (`resource_type`, `resource_id`, `created_at`);

-- ---------------------------------------------------------------------
-- 2. Hàng đợi inbox: ưu tiên bản ghi quá hạn chưa xử lý
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_integration_inbox_pending_due`
  ON `integration_inbox` (`status`, `next_attempt_at`, `received_at`);

-- ---------------------------------------------------------------------
-- 3. Hàng đợi outbox: lấy sự kiện cũ nhất cần gửi
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_integration_outbox_pending_due`
  ON `integration_outbox` (`status`, `next_attempt_at`, `occurred_at`);

-- ---------------------------------------------------------------------
-- 4. Kiểm tra hạn chế đang hiệu lực theo người dùng + loại
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_user_restrictions_user_type_status`
  ON `user_restrictions` (`user_id`, `restriction_type`, `status`);

-- =====================================================================
-- Hết 004_create_indexes.sql (bookadmin)
-- =====================================================================