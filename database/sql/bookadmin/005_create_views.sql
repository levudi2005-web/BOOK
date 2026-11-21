-- =====================================================================
-- BOOKFORFREEDOM - Schema bookadmin
-- 005_create_views.sql : View tổng hợp phục vụ trang quản trị
-- ---------------------------------------------------------------------
-- View chỉ đọc dữ liệu thuộc bookadmin (không join xuyên database).
-- CREATE OR REPLACE VIEW: chạy lại an toàn.
-- =====================================================================

USE `bookadmin`;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- v_user_summary : hồ sơ vận hành của một người dùng
--   * note_count / pinned_note_count  : ghi chú nội bộ còn hiệu lực
--   * active_restriction_count        : hạn chế đang hiệu lực tại thời điểm truy vấn
--   * pending_verification_count      : hồ sơ xác minh chưa kết luận
--   * open_report_count               : báo cáo nhắm vào user chưa đóng
--   * Dữ liệu danh tính (email, tên) thuộc bookuser; view chỉ trả user_id/user_uuid
--     để API join logic với bookuser.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_user_summary` AS
SELECT
  ids.`user_id`,
  ids.`user_uuid`,
  COALESCE(n.`note_count`, 0) AS `note_count`,
  COALESCE(n.`pinned_note_count`, 0) AS `pinned_note_count`,
  n.`last_note_at`,
  COALESCE(r.`active_restriction_count`, 0) AS `active_restriction_count`,
  COALESCE(r.`total_restriction_count`, 0) AS `total_restriction_count`,
  r.`last_restriction_at`,
  COALESCE(v.`pending_verification_count`, 0) AS `pending_verification_count`,
  COALESCE(v.`approved_verification_count`, 0) AS `approved_verification_count`,
  v.`last_verification_at`,
  COALESCE(rep.`open_report_count`, 0) AS `open_report_count`,
  COALESCE(rep.`total_report_count`, 0) AS `total_report_count`,
  rep.`last_report_at`
FROM (
  SELECT u.`user_id`, MAX(u.`user_uuid`) AS `user_uuid`
  FROM (
    SELECT `user_id`, `user_uuid` FROM `admin_user_notes` WHERE `deleted_at` IS NULL
    UNION ALL
    SELECT `user_id`, `user_uuid` FROM `user_restrictions`
    UNION ALL
    SELECT `user_id`, `user_uuid` FROM `user_verification_reviews`
    UNION ALL
    SELECT `target_id`, `target_uuid` FROM `content_reports` WHERE `target_type` = 'user'
  ) u
  GROUP BY u.`user_id`
) ids
LEFT JOIN (
  SELECT `user_id`,
         COUNT(*) AS `note_count`,
         SUM(`is_pinned` = 1) AS `pinned_note_count`,
         MAX(`created_at`) AS `last_note_at`
  FROM `admin_user_notes`
  WHERE `deleted_at` IS NULL
  GROUP BY `user_id`
) n ON n.`user_id` = ids.`user_id`
LEFT JOIN (
  SELECT `user_id`,
         SUM(`status` = 'active' AND (`ends_at` IS NULL OR `ends_at` > NOW(3))) AS `active_restriction_count`,
         COUNT(*) AS `total_restriction_count`,
         MAX(`created_at`) AS `last_restriction_at`
  FROM `user_restrictions`
  GROUP BY `user_id`
) r ON r.`user_id` = ids.`user_id`
LEFT JOIN (
  SELECT `user_id`,
         SUM(`status` IN ('pending', 'in_review', 'needs_more_info')) AS `pending_verification_count`,
         SUM(`status` = 'approved') AS `approved_verification_count`,
         MAX(`submitted_at`) AS `last_verification_at`
  FROM `user_verification_reviews`
  GROUP BY `user_id`
) v ON v.`user_id` = ids.`user_id`
LEFT JOIN (
  SELECT `target_id` AS `user_id`,
         SUM(`status` IN ('new', 'triaged', 'in_review')) AS `open_report_count`,
         COUNT(*) AS `total_report_count`,
         MAX(`created_at`) AS `last_report_at`
  FROM `content_reports`
  WHERE `target_type` = 'user'
  GROUP BY `target_id`
) rep ON rep.`user_id` = ids.`user_id`;

-- ---------------------------------------------------------------------
-- v_book_summary : hồ sơ vận hành của một đầu sách
--   * rights_review_*  : trạng thái xét quyền phân phối
--   * report_*         : báo cáo nội dung nhắm vào sách
--   * case_*           : hồ sơ kiểm duyệt đang mở
--   * Dữ liệu thư mục (title, author...) thuộc bookuser; view chỉ trả
--     book_id/book_uuid để API join logic với bookuser.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_book_summary` AS
SELECT
  ids.`book_id`,
  ids.`book_uuid`,
  COALESCE(rr.`rights_review_count`, 0) AS `rights_review_count`,
  COALESCE(rr.`approved_rights_review_count`, 0) AS `approved_rights_review_count`,
  COALESCE(rr.`open_rights_review_count`, 0) AS `open_rights_review_count`,
  IFNULL(rr.`approved_rights_review_count`, 0) > 0 AS `has_approved_rights`,
  (
    SELECT rr2.`status`
    FROM `book_rights_reviews` rr2
    WHERE rr2.`book_id` = ids.`book_id`
    ORDER BY rr2.`updated_at` DESC, rr2.`review_id` DESC
    LIMIT 1
  ) AS `latest_rights_status`,
  rr.`last_rights_reviewed_at`,
  COALESCE(rep.`open_report_count`, 0) AS `open_report_count`,
  COALESCE(rep.`total_report_count`, 0) AS `total_report_count`,
  rep.`last_report_at`,
  COALESCE(mc.`open_case_count`, 0) AS `open_case_count`,
  COALESCE(mc.`total_case_count`, 0) AS `total_case_count`,
  mc.`last_case_opened_at`
FROM (
  SELECT b.`book_id`, MAX(b.`book_uuid`) AS `book_uuid`
  FROM (
    SELECT `book_id`, `book_uuid` FROM `book_rights_reviews`
    UNION ALL
    SELECT `target_id`, `target_uuid` FROM `content_reports` WHERE `target_type` = 'book'
    UNION ALL
    SELECT `target_id`, `target_uuid` FROM `moderation_cases` WHERE `target_type` = 'book'
  ) b
  GROUP BY b.`book_id`
) ids
LEFT JOIN (
  SELECT `book_id`,
         COUNT(*) AS `rights_review_count`,
         SUM(`status` = 'approved') AS `approved_rights_review_count`,
         SUM(`status` IN ('pending', 'in_review')) AS `open_rights_review_count`,
         MAX(`reviewed_at`) AS `last_rights_reviewed_at`
  FROM `book_rights_reviews`
  GROUP BY `book_id`
) rr ON rr.`book_id` = ids.`book_id`
LEFT JOIN (
  SELECT `target_id` AS `book_id`,
         SUM(`status` IN ('new', 'triaged', 'in_review')) AS `open_report_count`,
         COUNT(*) AS `total_report_count`,
         MAX(`created_at`) AS `last_report_at`
  FROM `content_reports`
  WHERE `target_type` = 'book'
  GROUP BY `target_id`
) rep ON rep.`book_id` = ids.`book_id`
LEFT JOIN (
  SELECT `target_id` AS `book_id`,
         SUM(`status` IN ('open', 'investigating', 'pending_action', 'escalated')) AS `open_case_count`,
         COUNT(*) AS `total_case_count`,
         MAX(`opened_at`) AS `last_case_opened_at`
  FROM `moderation_cases`
  WHERE `target_type` = 'book'
  GROUP BY `target_id`
) mc ON mc.`book_id` = ids.`book_id`;

-- =====================================================================
-- Hết 005_create_views.sql (bookadmin)
-- =====================================================================