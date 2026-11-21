-- =====================================================================
-- BOOKFORFREEDOM - Schema bookuser
-- 003_create_constraints.sql : Khóa ngoại (FK)
-- ---------------------------------------------------------------------
-- Nguyên tắc:
--   * Chỉ FK trong nội bộ schema bookuser. Không có FK xuyên database.
--   * Liên kết sang bookadmin dùng tham chiếu logic (admin_uuid,
--     verified_by_admin_uuid, moderated_by_admin_uuid, source_event_id).
--   * Bảng audit/history không dùng ON DELETE CASCADE để bảo toàn bằng chứng.
--   * Script chạy lại được: mỗi FK chỉ được thêm khi chưa tồn tại.
-- =====================================================================

USE `bookuser`;
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
-- 1. Người dùng và xác thực
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('user_profiles', 'fk_user_profiles_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_settings', 'fk_user_settings_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_devices', 'fk_user_devices_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_sessions', 'fk_user_sessions_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_sessions', 'fk_user_sessions_device', '`device_id`', 'user_devices', '`device_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('email_verification_tokens', 'fk_email_verification_tokens_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('password_reset_tokens', 'fk_password_reset_tokens_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 2. Sách và nội dung
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('books', 'fk_books_publisher', '`publisher_id`', 'publishers', '`publisher_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('books', 'fk_books_created_by', '`created_by_user_id`', 'users', '`user_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('book_authors', 'fk_book_authors_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_authors', 'fk_book_authors_author', '`author_id`', 'authors', '`author_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('categories', 'fk_categories_parent', '`parent_category_id`', 'categories', '`category_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('book_categories', 'fk_book_categories_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_categories', 'fk_book_categories_category', '`category_id`', 'categories', '`category_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('book_tags', 'fk_book_tags_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_tags', 'fk_book_tags_tag', '`tag_id`', 'tags', '`tag_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_files', 'fk_book_files_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_files', 'fk_book_files_uploaded_by', '`uploaded_by_user_id`', 'users', '`user_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('book_chapters', 'fk_book_chapters_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('book_chapters', 'fk_book_chapters_parent', '`parent_chapter_id`', 'book_chapters', '`chapter_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('book_rights', 'fk_book_rights_book', '`book_id`', 'books', '`book_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('book_rights', 'fk_book_rights_license', '`license_id`', 'licenses', '`license_id`', 'RESTRICT', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 3. Thư viện và hoạt động đọc
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('user_library', 'fk_user_library_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_library', 'fk_user_library_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reading_progress', 'fk_reading_progress_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reading_progress', 'fk_reading_progress_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reading_progress', 'fk_reading_progress_chapter', '`chapter_id`', 'book_chapters', '`chapter_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_progress', 'fk_reading_progress_file', '`file_id`', 'book_files', '`file_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_progress', 'fk_reading_progress_device', '`device_id`', 'user_devices', '`device_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('bookmarks', 'fk_bookmarks_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('bookmarks', 'fk_bookmarks_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('bookmarks', 'fk_bookmarks_chapter', '`chapter_id`', 'book_chapters', '`chapter_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_history', 'fk_reading_history_user', '`user_id`', 'users', '`user_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('reading_history', 'fk_reading_history_book', '`book_id`', 'books', '`book_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('reading_history', 'fk_reading_history_chapter', '`chapter_id`', 'book_chapters', '`chapter_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_history', 'fk_reading_history_session', '`session_id`', 'user_sessions', '`session_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_history', 'fk_reading_history_device', '`device_id`', 'user_devices', '`device_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reading_lists', 'fk_reading_lists_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reading_list_books', 'fk_reading_list_books_list', '`list_id`', 'reading_lists', '`list_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reading_list_books', 'fk_reading_list_books_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');

-- ---------------------------------------------------------------------
-- 4. Tải xuống, cộng đồng, thông báo
-- ---------------------------------------------------------------------
CALL _ddl_add_fk('downloads', 'fk_downloads_user', '`user_id`', 'users', '`user_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('downloads', 'fk_downloads_book', '`book_id`', 'books', '`book_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('downloads', 'fk_downloads_file', '`file_id`', 'book_files', '`file_id`', 'RESTRICT', 'RESTRICT');
CALL _ddl_add_fk('downloads', 'fk_downloads_device', '`device_id`', 'user_devices', '`device_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('reviews', 'fk_reviews_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('reviews', 'fk_reviews_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('comments', 'fk_comments_book', '`book_id`', 'books', '`book_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('comments', 'fk_comments_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('comments', 'fk_comments_parent', '`parent_comment_id`', 'comments', '`comment_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('comments', 'fk_comments_review', '`review_id`', 'reviews', '`review_id`', 'SET NULL', 'RESTRICT');
CALL _ddl_add_fk('comment_reactions', 'fk_comment_reactions_comment', '`comment_id`', 'comments', '`comment_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('comment_reactions', 'fk_comment_reactions_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_follows', 'fk_user_follows_follower', '`follower_user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_follows', 'fk_user_follows_followed', '`followed_user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('notifications', 'fk_notifications_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('notification_preferences', 'fk_notification_preferences_user', '`user_id`', 'users', '`user_id`', 'CASCADE', 'RESTRICT');
CALL _ddl_add_fk('user_reports', 'fk_user_reports_reporter', '`reporter_user_id`', 'users', '`user_id`', 'RESTRICT', 'RESTRICT');

DROP PROCEDURE IF EXISTS `_ddl_add_fk`;

-- =====================================================================
-- Hết 003_create_constraints.sql (bookuser)
-- =====================================================================