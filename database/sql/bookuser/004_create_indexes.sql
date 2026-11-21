-- =====================================================================
-- BOOKFORFREEDOM - Schema bookuser
-- 004_create_indexes.sql : Index bổ sung cho truy vấn nghiệp vụ
-- ---------------------------------------------------------------------
-- 002_create_tables.sql đã khai báo toàn bộ PK/UK/FK-index cơ sở.
-- File này chỉ thêm các index phục vụ tìm kiếm/tra cứu chuyên biệt.
-- Idempotent: CREATE [FULLTEXT] INDEX IF NOT EXISTS (MariaDB 10.11).
-- =====================================================================

USE `bookuser`;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Tìm kiếm toàn văn (catalog sách / tác giả)
-- ---------------------------------------------------------------------
CREATE FULLTEXT INDEX IF NOT EXISTS `ft_books_title_description`
  ON `books` (`title`, `description`);

CREATE FULLTEXT INDEX IF NOT EXISTS `ft_authors_name`
  ON `authors` (`name`, `bio`);

-- ---------------------------------------------------------------------
-- 2. Catalog công khai theo visibility + trạng thái xuất bản
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_books_visibility_status_published`
  ON `books` (`visibility`, `status`, `published_at`);

-- ---------------------------------------------------------------------
-- 3. Kiểm soát hạn mức tải xuống theo người dùng + đầu sách
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_downloads_user_book_time`
  ON `downloads` (`user_id`, `book_id`, `created_at`);

-- ---------------------------------------------------------------------
-- 4. Tra cứu phiên đang hoạt động của người dùng
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_user_sessions_active`
  ON `user_sessions` (`user_id`, `revoked_at`, `expires_at`);

-- =====================================================================
-- Hết 004_create_indexes.sql (bookuser)
-- =====================================================================