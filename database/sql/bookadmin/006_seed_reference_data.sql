-- =====================================================================
-- BOOKFORFREEDOM - Schema bookadmin
-- 006_seed_reference_data.sql : Dữ liệu tham chiếu (RBAC, lý do báo cáo)
-- ---------------------------------------------------------------------
-- * KHÔNG tạo tài khoản quản trị mặc định, KHÔNG chứa mật khẩu.
--   Việc tạo SUPER_ADMIN đầu tiên do quy trình vận hành thực hiện
--   (xem docs/installation.md) với mật khẩu Argon2id sinh ngẫu nhiên.
-- * Idempotent: INSERT ... ON DUPLICATE KEY UPDATE theo khóa UNIQUE.
-- =====================================================================

USE `bookadmin`;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Vai trò quản trị (hierarchy_level nhỏ = quyền cao hơn)
-- ---------------------------------------------------------------------
INSERT INTO `admin_roles` (`code`, `name`, `description`, `hierarchy_level`, `is_system`) VALUES
  ('SUPER_ADMIN', 'Quản trị tối cao', 'Toàn quyền hệ thống, quản lý vai trò và quyền', 1, 1),
  ('ADMIN', 'Quản trị hệ thống', 'Quản trị vận hành, không quản lý vai trò/quyền', 10, 1),
  ('CONTENT_MODERATOR', 'Kiểm duyệt nội dung', 'Xử lý báo cáo, kiểm duyệt sách/bình luận/đánh giá', 30, 1),
  ('RIGHTS_REVIEWER', 'Thẩm định bản quyền', 'Xét duyệt quyền phân phối và giấy phép', 35, 1),
  ('SUPPORT_AGENT', 'Hỗ trợ người dùng', 'Hỗ trợ, xác minh và ghi chú người dùng', 40, 1),
  ('ANALYST', 'Phân tích dữ liệu', 'Xem báo cáo và số liệu tổng hợp', 50, 1),
  ('AUDITOR', 'Kiểm toán nội bộ', 'Đọc audit log, sự kiện bảo mật, xuất bằng chứng', 60, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `hierarchy_level` = VALUES(`hierarchy_level`),
  `is_system` = VALUES(`is_system`);

-- ---------------------------------------------------------------------
-- 2. Quyền hạn (resource.action) - is_system = 1
-- ---------------------------------------------------------------------
INSERT INTO `admin_permissions` (`code`, `resource`, `action`, `description`, `is_system`)
SELECT CONCAT(t.`resource`, '.', t.`action`), t.`resource`, t.`action`, t.`description`, 1
FROM (
  SELECT 'user' AS `resource`, 'read' AS `action`, 'Xem thông tin người dùng' AS `description`
  UNION ALL SELECT 'user', 'update', 'Cập nhật thông tin người dùng'
  UNION ALL SELECT 'user', 'delete', 'Xóa mềm người dùng'
  UNION ALL SELECT 'user', 'export', 'Xuất dữ liệu người dùng'
  UNION ALL SELECT 'user_verification', 'read', 'Xem hồ sơ xác minh'
  UNION ALL SELECT 'user_verification', 'review', 'Kết luận hồ sơ xác minh'
  UNION ALL SELECT 'admin_user_note', 'read', 'Xem ghi chú nội bộ'
  UNION ALL SELECT 'admin_user_note', 'create', 'Tạo ghi chú nội bộ'
  UNION ALL SELECT 'admin_user_note', 'update', 'Sửa ghi chú nội bộ'
  UNION ALL SELECT 'admin_user_note', 'delete', 'Xóa ghi chú nội bộ'
  UNION ALL SELECT 'restriction', 'read', 'Xem hạn chế người dùng'
  UNION ALL SELECT 'restriction', 'create', 'Áp dụng hạn chế người dùng'
  UNION ALL SELECT 'restriction', 'lift', 'Gỡ hạn chế người dùng'
  UNION ALL SELECT 'book', 'read', 'Xem sách'
  UNION ALL SELECT 'book', 'create', 'Tạo sách'
  UNION ALL SELECT 'book', 'update', 'Cập nhật sách'
  UNION ALL SELECT 'book', 'delete', 'Xóa mềm sách'
  UNION ALL SELECT 'book', 'approve', 'Duyệt xuất bản sách'
  UNION ALL SELECT 'book', 'reject', 'Từ chối xuất bản sách'
  UNION ALL SELECT 'book', 'publish', 'Xuất bản sách'
  UNION ALL SELECT 'author', 'read', 'Xem tác giả'
  UNION ALL SELECT 'author', 'create', 'Tạo tác giả'
  UNION ALL SELECT 'author', 'update', 'Cập nhật tác giả'
  UNION ALL SELECT 'author', 'delete', 'Xóa tác giả'
) t
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `is_system` = VALUES(`is_system`);

INSERT INTO `admin_permissions` (`code`, `resource`, `action`, `description`, `is_system`)
SELECT CONCAT(t.`resource`, '.', t.`action`), t.`resource`, t.`action`, t.`description`, 1
FROM (
  SELECT 'publisher' AS `resource`, 'read' AS `action`, 'Xem nhà xuất bản' AS `description`
  UNION ALL SELECT 'publisher', 'create', 'Tạo nhà xuất bản'
  UNION ALL SELECT 'publisher', 'update', 'Cập nhật nhà xuất bản'
  UNION ALL SELECT 'publisher', 'delete', 'Xóa nhà xuất bản'
  UNION ALL SELECT 'category', 'read', 'Xem danh mục'
  UNION ALL SELECT 'category', 'create', 'Tạo danh mục'
  UNION ALL SELECT 'category', 'update', 'Cập nhật danh mục'
  UNION ALL SELECT 'category', 'delete', 'Xóa danh mục'
  UNION ALL SELECT 'rights', 'read', 'Xem hồ sơ quyền'
  UNION ALL SELECT 'rights', 'review', 'Thẩm định hồ sơ quyền'
  UNION ALL SELECT 'rights', 'approve', 'Chấp thuận quyền phân phối'
  UNION ALL SELECT 'rights', 'reject', 'Từ chối quyền phân phối'
  UNION ALL SELECT 'review', 'read', 'Xem đánh giá'
  UNION ALL SELECT 'review', 'moderate', 'Kiểm duyệt đánh giá'
  UNION ALL SELECT 'review', 'delete', 'Xóa đánh giá'
  UNION ALL SELECT 'comment', 'read', 'Xem bình luận'
  UNION ALL SELECT 'comment', 'moderate', 'Kiểm duyệt bình luận'
  UNION ALL SELECT 'comment', 'delete', 'Xóa bình luận'
) t
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `is_system` = VALUES(`is_system`);

INSERT INTO `admin_permissions` (`code`, `resource`, `action`, `description`, `is_system`)
SELECT CONCAT(t.`resource`, '.', t.`action`), t.`resource`, t.`action`, t.`description`, 1
FROM (
  SELECT 'report' AS `resource`, 'read' AS `action`, 'Xem báo cáo nội dung' AS `description`
  UNION ALL SELECT 'report', 'update', 'Cập nhật báo cáo nội dung'
  UNION ALL SELECT 'report', 'assign', 'Phân công báo cáo'
  UNION ALL SELECT 'report', 'resolve', 'Kết luận báo cáo'
  UNION ALL SELECT 'moderation_case', 'read', 'Xem hồ sơ kiểm duyệt'
  UNION ALL SELECT 'moderation_case', 'create', 'Tạo hồ sơ kiểm duyệt'
  UNION ALL SELECT 'moderation_case', 'update', 'Cập nhật hồ sơ kiểm duyệt'
  UNION ALL SELECT 'moderation_case', 'assign', 'Phân công hồ sơ kiểm duyệt'
  UNION ALL SELECT 'moderation_case', 'close', 'Đóng hồ sơ kiểm duyệt'
  UNION ALL SELECT 'announcement', 'read', 'Xem thông báo hệ thống'
  UNION ALL SELECT 'announcement', 'create', 'Tạo thông báo'
  UNION ALL SELECT 'announcement', 'update', 'Cập nhật thông báo'
  UNION ALL SELECT 'announcement', 'publish', 'Phát hành thông báo'
  UNION ALL SELECT 'announcement', 'delete', 'Lưu trữ thông báo'
  UNION ALL SELECT 'setting', 'read', 'Xem cấu hình hệ thống'
  UNION ALL SELECT 'setting', 'update', 'Cập nhật cấu hình hệ thống'
  UNION ALL SELECT 'feature_flag', 'read', 'Xem cờ tính năng'
  UNION ALL SELECT 'feature_flag', 'update', 'Bật/tắt cờ tính năng'
  UNION ALL SELECT 'admin_account', 'read', 'Xem tài khoản quản trị'
  UNION ALL SELECT 'admin_account', 'create', 'Tạo tài khoản quản trị'
  UNION ALL SELECT 'admin_account', 'update', 'Cập nhật tài khoản quản trị'
  UNION ALL SELECT 'admin_account', 'disable', 'Vô hiệu hóa tài khoản quản trị'
  UNION ALL SELECT 'role', 'read', 'Xem vai trò'
  UNION ALL SELECT 'role', 'manage', 'Quản lý vai trò và gán quyền'
  UNION ALL SELECT 'permission', 'read', 'Xem quyền hạn'
  UNION ALL SELECT 'permission', 'manage', 'Quản lý danh mục quyền'
  UNION ALL SELECT 'audit_log', 'read', 'Xem audit log'
  UNION ALL SELECT 'audit_log', 'export', 'Xuất audit log'
  UNION ALL SELECT 'security_event', 'read', 'Xem sự kiện bảo mật'
  UNION ALL SELECT 'security_event', 'export', 'Xuất sự kiện bảo mật'
  UNION ALL SELECT 'integration', 'read', 'Xem hàng đợi tích hợp'
  UNION ALL SELECT 'integration', 'retry', 'Gửi lại sự kiện tích hợp'
  UNION ALL SELECT 'metric', 'read', 'Xem số liệu hệ thống'
  UNION ALL SELECT 'metric', 'export', 'Xuất số liệu hệ thống'
) t
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `is_system` = VALUES(`is_system`);

-- ---------------------------------------------------------------------
-- 3. Lý do báo cáo nội dung (dùng cho content_reports.reason_id)
--    Mã code khớp với bookuser.user_reports.reason_code.
-- ---------------------------------------------------------------------
INSERT INTO `report_reasons` (`code`, `label`, `description`, `applies_to`, `severity`, `is_active`, `sort_order`) VALUES
  ('SPAM', 'Spam / quảng cáo', 'Nội dung rác, quảng cáo hoặc liên kết không mong muốn', 'any', 'medium', 1, 10),
  ('HARASSMENT', 'Quấy rối / đe dọa', 'Xúc phạm, quấy rối hoặc đe dọa cá nhân/tổ chức', 'any', 'high', 1, 20),
  ('HATE_SPEECH', 'Ngôn từ thù địch', 'Kích động thù địch dựa trên nhóm người', 'any', 'critical', 1, 30),
  ('VIOLENCE', 'Bạo lực', 'Mô tả hoặc kêu gọi bạo lực', 'any', 'critical', 1, 40),
  ('SEXUAL_CONTENT', 'Nội dung khiêu dâm', 'Nội dung người lớn hoặc không phù hợp', 'book', 'high', 1, 50),
  ('COPYRIGHT', 'Vi phạm bản quyền', 'Tác phẩm phân phối không có quyền hợp pháp', 'book', 'critical', 1, 60),
  ('MISINFORMATION', 'Thông tin sai lệch', 'Nội dung gây hiểu nhầm nghiêm trọng', 'book', 'high', 1, 70),
  ('IMPERSONATION', 'Mạo danh', 'Giả mạo cá nhân, tác giả hoặc tổ chức', 'user', 'high', 1, 80),
  ('PRIVACY', 'Xâm phạm riêng tư', 'Tiết lộ thông tin cá nhân không được phép', 'user', 'high', 1, 90),
  ('MALWARE', 'Mã độc / tệp nguy hiểm', 'Tệp đính kèm hoặc liên kết chứa mã độc', 'book', 'critical', 1, 100),
  ('BROKEN_CONTENT', 'Nội dung lỗi', 'Tệp hỏng, thiếu chương hoặc không đọc được', 'book', 'low', 1, 110),
  ('OTHER', 'Khác', 'Lý do khác, mô tả chi tiết trong nội dung báo cáo', 'any', 'low', 1, 120)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `applies_to` = VALUES(`applies_to`),
  `severity` = VALUES(`severity`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------
-- 4. Gán quyền cho vai trò (idempotent theo PK role_id + permission_id)
-- ---------------------------------------------------------------------
INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'ADMIN'
  AND p.`code` NOT IN ('role.manage', 'permission.manage', 'admin_account.disable', 'audit_log.export', 'security_event.export')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'CONTENT_MODERATOR'
  AND (
    p.`resource` IN ('book', 'review', 'comment', 'report', 'moderation_case', 'restriction')
    OR p.`code` IN ('user.read', 'user_verification.read', 'announcement.read',
                    'admin_user_note.read', 'admin_user_note.create', 'admin_user_note.update')
  )
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'RIGHTS_REVIEWER'
  AND p.`code` IN ('book.read', 'author.read', 'rights.read', 'rights.review',
                   'rights.approve', 'rights.reject', 'report.read', 'announcement.read')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'SUPPORT_AGENT'
  AND (
    p.`resource` IN ('user_verification', 'admin_user_note')
    OR p.`code` IN ('user.read', 'user.update', 'book.read', 'report.read',
                    'restriction.read', 'restriction.create', 'announcement.read')
  )
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'ANALYST'
  AND p.`code` IN ('metric.read', 'metric.export', 'report.read', 'book.read',
                   'user.read', 'audit_log.read')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`code` = 'AUDITOR'
  AND p.`code` IN ('audit_log.read', 'audit_log.export', 'security_event.read',
                   'security_event.export', 'report.read', 'integration.read', 'admin_account.read')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- ---------------------------------------------------------------------
-- 5. Tóm tắt dữ liệu tham chiếu
-- ---------------------------------------------------------------------
SELECT 'admin_roles' AS `ref_table`, COUNT(*) AS `row_count` FROM `admin_roles`
UNION ALL SELECT 'admin_permissions', COUNT(*) FROM `admin_permissions`
UNION ALL SELECT 'admin_role_permissions', COUNT(*) FROM `admin_role_permissions`
UNION ALL SELECT 'report_reasons', COUNT(*) FROM `report_reasons`;

-- =====================================================================
-- Hết 006_seed_reference_data.sql (bookadmin)
-- =====================================================================