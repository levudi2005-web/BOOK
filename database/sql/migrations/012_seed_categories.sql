-- =====================================================================
-- BOOKFORFREEDOM - Migration 012: Seed danh mục nền tảng
-- ---------------------------------------------------------------------
-- Nguồn dữ liệu: apps/web/src/lib/site.ts (categories) — danh mục hiển thị
-- trên /categories và dùng trong Author Studio.
--
-- Idempotent: `slug` là UNIQUE nên ON DUPLICATE KEY UPDATE chỉ cập nhật
-- metadata, KHÔNG tạo bản ghi trùng khi chạy lại.
-- Không DROP, không xoá dữ liệu, không đụng tới sách/danh mục tự tạo.
-- =====================================================================

SET NAMES utf8mb4;
USE `bookuser`;

INSERT INTO `categories` (`name`, `slug`, `description`, `sort_order`, `is_active`)
VALUES
  ('Văn học',      'van-hoc',      'Tiểu thuyết, truyện ngắn và thơ ca.',               10, 1),
  ('Khoa học',     'khoa-hoc',     'Khám phá tri thức và tự nhiên.',                    20, 1),
  ('Lịch sử',      'lich-su',      'Những trang sử và bài học thời đại.',               30, 1),
  ('Triết học',    'triet-hoc',    'Tư tưởng và suy tưởng sâu sắc.',                    40, 1),
  ('Nghệ thuật',   'nghe-thuat',   'Hội họa, nhiếp ảnh và sáng tạo.',                   50, 1),
  ('Kinh tế',      'kinh-te',      'Kinh doanh, tài chính và chiến lược.',              60, 1),
  ('Tâm lý',       'tam-ly',       'Hiểu con người và đời sống nội tâm.',               70, 1),
  ('Kỹ năng sống', 'ky-nang-song', 'Phát triển bản thân mỗi ngày.',                     80, 1),
  ('Giáo dục',     'giao-duc',     'Học tập và phương pháp giảng dạy.',                 90, 1),
  ('Thiếu nhi',    'thieu-nhi',    'Câu chuyện nuôi dưỡng trí tưởng tượng.',           100, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);
