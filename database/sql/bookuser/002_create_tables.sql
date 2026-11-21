-- =====================================================================
-- BOOKFORFREEDOM - bookuser - 002: Tables
-- MariaDB 10.11 / InnoDB / utf8mb4_unicode_ci / UTC
-- NOTE: physical FOREIGN KEY constraints are added in 003 so that the
--       schema can be reviewed by domain; indexes required by FKs are
--       declared here (left-most column coverage).
-- Idempotent: CREATE TABLE IF NOT EXISTS (baseline install).
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

-- ---------------------------------------------------------------------
-- A. USER ACCOUNTS AND AUTHENTICATION
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính kỹ thuật của tài khoản',
  `user_uuid` CHAR(36) NOT NULL COMMENT 'Mã định danh công khai (UUID v4), external ID dùng khi trao đổi với bookadmin',
  `username` VARCHAR(50) NOT NULL COMMENT 'Tên đăng nhập duy nhất, không phân biệt hoa thường',
  `email` VARCHAR(254) NOT NULL COMMENT 'Email đăng nhập duy nhất, lưu dạng chữ thường',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash mật khẩu Argon2id; không bao giờ lưu mật khẩu gốc',
  `password_algorithm` VARCHAR(30) NOT NULL DEFAULT 'argon2id' COMMENT 'Thuật toán hash, hỗ trợ nâng cấp dần',
  `status` ENUM('pending','active','suspended','disabled','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái vòng đời tài khoản',
  `email_verified_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm xác minh email (UTC)',
  `failed_login_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lần đăng nhập sai liên tiếp',
  `locked_until` DATETIME(3) NULL DEFAULT NULL COMMENT 'Khóa đăng nhập tạm thời đến mốc này (UTC)',
  `last_login_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Lần đăng nhập thành công gần nhất (UTC)',
  `last_login_ip` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IPv4/IPv6 nhị phân (INET6_ATON); hiển thị bằng INET6_NTOA',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm; NULL nghĩa là chưa xóa',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_user_uuid` (`user_uuid`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_status_created` (`status`, `created_at`),
  KEY `idx_users_email_verified` (`email_verified_at`),
  KEY `idx_users_deleted` (`deleted_at`),
  CONSTRAINT `chk_users_username_length` CHECK (CHAR_LENGTH(`username`) >= 3),
  CONSTRAINT `chk_users_email_length` CHECK (CHAR_LENGTH(`email`) >= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản người đọc; mật khẩu chỉ lưu hash, xóa mềm bằng status/deleted_at';

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Chủ sở hữu hồ sơ (1-1 với users)',
  `display_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'Tên hiển thị công khai',
  `bio` TEXT NULL DEFAULT NULL COMMENT 'Giới thiệu bản thân',
  `avatar_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh đại diện (không lưu file nhị phân)',
  `cover_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh bìa trang cá nhân',
  `date_of_birth` DATE NULL DEFAULT NULL COMMENT 'Ngày sinh; dùng kiểm soát nội dung theo độ tuổi',
  `gender` ENUM('unspecified','male','female','other') NOT NULL DEFAULT 'unspecified' COMMENT 'Giới tính tự khai',
  `country_code` CHAR(2) NULL DEFAULT NULL COMMENT 'Mã quốc gia ISO 3166-1 alpha-2',
  `locale` VARCHAR(10) NOT NULL DEFAULT 'vi-VN' COMMENT 'Ngôn ngữ/khu vực hiển thị',
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'Múi giờ hiển thị; dữ liệu lưu UTC',
  `website_url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Trang web cá nhân',
  `social_links` JSON NULL DEFAULT NULL COMMENT 'Liên kết mạng xã hội có cấu trúc',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = hồ sơ công khai',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm hồ sơ',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_user_profiles_user` (`user_id`),
  KEY `idx_user_profiles_public` (`is_public`, `created_at`),
  KEY `idx_user_profiles_country` (`country_code`),
  CONSTRAINT `chk_user_profiles_dob` CHECK (`date_of_birth` IS NULL OR `date_of_birth` >= '1900-01-01')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hồ sơ công khai của người đọc, quan hệ 1-1 với users';

CREATE TABLE IF NOT EXISTS `user_settings` (
  `setting_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cấu hình',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng sở hữu cấu hình (1-1)',
  `theme` ENUM('system','light','dark','sepia') NOT NULL DEFAULT 'system' COMMENT 'Giao diện tổng thể',
  `reader_theme` VARCHAR(30) NOT NULL DEFAULT 'sepia' COMMENT 'Tông màu trình đọc',
  `font_size` TINYINT UNSIGNED NOT NULL DEFAULT 16 COMMENT 'Cỡ chữ trình đọc (px)',
  `line_height` DECIMAL(3,2) NOT NULL DEFAULT 1.60 COMMENT 'Giãn dòng trình đọc',
  `language` VARCHAR(10) NOT NULL DEFAULT 'vi' COMMENT 'Mã ngôn ngữ ưa thích',
  `email_notifications` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Nhận thông báo qua email',
  `push_notifications` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Nhận thông báo đẩy',
  `marketing_emails` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Đồng ý nhận email tiếp thị',
  `profile_visibility` ENUM('public','followers','private') NOT NULL DEFAULT 'public' COMMENT 'Mức hiển thị hồ sơ',
  `allow_downloads` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Cho phép tải sách có quyền tải',
  `preferences` JSON NULL DEFAULT NULL COMMENT 'Tùy chọn mở rộng có cấu trúc',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_user_settings_user` (`user_id`),
  KEY `idx_user_settings_language` (`language`),
  CONSTRAINT `chk_user_settings_font_size` CHECK (`font_size` BETWEEN 10 AND 48),
  CONSTRAINT `chk_user_settings_line_height` CHECK (`line_height` BETWEEN 1.00 AND 3.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cấu hình cá nhân hóa trải nghiệm đọc, quan hệ 1-1 với users';

CREATE TABLE IF NOT EXISTS `user_devices` (
  `device_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thiết bị',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Chủ sở hữu thiết bị',
  `device_uuid` CHAR(36) NOT NULL COMMENT 'Mã thiết bị công khai do ứng dụng sinh',
  `fingerprint_hash` VARBINARY(32) NOT NULL COMMENT 'SHA-256 dấu vân tay thiết bị; không lưu dấu vân tay gốc',
  `device_name` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Tên thân thiện do người dùng đặt',
  `platform` ENUM('web','ios','android','desktop','other') NOT NULL DEFAULT 'web' COMMENT 'Nền tảng',
  `browser` VARCHAR(80) NULL DEFAULT NULL COMMENT 'Trình duyệt',
  `os_name` VARCHAR(80) NULL DEFAULT NULL COMMENT 'Hệ điều hành',
  `push_token` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Token nhận thông báo đẩy (nếu có)',
  `is_trusted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = thiết bị tin cậy',
  `last_seen_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Lần hoạt động gần nhất (UTC)',
  `revoked_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm thu hồi thiết bị (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uq_user_devices_uuid` (`device_uuid`),
  UNIQUE KEY `uq_user_devices_fingerprint` (`user_id`, `fingerprint_hash`),
  KEY `idx_user_devices_user_platform` (`user_id`, `platform`),
  KEY `idx_user_devices_last_seen` (`last_seen_at`),
  KEY `idx_user_devices_revoked` (`revoked_at`),
  CONSTRAINT `chk_user_devices_fingerprint` CHECK (OCTET_LENGTH(`fingerprint_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thiết bị người dùng dùng để quản lý phiên và thông báo đẩy';

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phiên đăng nhập',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng của phiên',
  `device_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Thiết bị phát sinh phiên (nếu nhận diện được)',
  `session_token_hash` BINARY(32) NOT NULL COMMENT 'SHA-256 của session token; không lưu token gốc',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP nhị phân của phiên',
  `user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Chuỗi User-Agent',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo phiên (UTC)',
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Lần hoạt động gần nhất (UTC)',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Thời điểm hết hạn tuyệt đối (UTC)',
  `revoked_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm thu hồi phiên (UTC)',
  `revoked_reason` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Lý do thu hồi (logout, rotated, admin_revoke...)',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_user_sessions_token` (`session_token_hash`),
  KEY `idx_user_sessions_user_created` (`user_id`, `created_at`),
  KEY `idx_user_sessions_user_expires` (`user_id`, `expires_at`),
  KEY `idx_user_sessions_device` (`device_id`),
  KEY `idx_user_sessions_expires` (`expires_at`),
  KEY `idx_user_sessions_revoked` (`revoked_at`),
  CONSTRAINT `chk_user_sessions_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_user_sessions_token` CHECK (OCTET_LENGTH(`session_token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phiên đăng nhập của người đọc; token chỉ lưu dạng hash';

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `token_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token xác minh email',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng yêu cầu xác minh',
  `email` VARCHAR(254) NOT NULL COMMENT 'Email đang được xác minh tại thời điểm phát token',
  `token_hash` BINARY(32) NOT NULL COMMENT 'SHA-256 của token gửi qua email; DB không lưu token gốc',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Hạn sử dụng token (UTC)',
  `consumed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm token được dùng (UTC)',
  `requested_ip` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP yêu cầu phát token',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_email_verification_tokens_hash` (`token_hash`),
  KEY `idx_email_verification_tokens_user_exp` (`user_id`, `expires_at`),
  KEY `idx_email_verification_tokens_email_exp` (`email`, `expires_at`),
  CONSTRAINT `chk_email_verification_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_email_verification_tokens_hash` CHECK (OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Token xác minh email dùng một lần, chỉ lưu hash SHA-256';

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token đặt lại mật khẩu',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng yêu cầu đặt lại mật khẩu',
  `token_hash` BINARY(32) NOT NULL COMMENT 'SHA-256 của token; không lưu token gốc',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Hạn sử dụng token (UTC)',
  `consumed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm token được dùng (UTC)',
  `requested_ip` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP yêu cầu',
  `requested_user_agent` VARCHAR(512) NULL DEFAULT NULL COMMENT 'User-Agent khi yêu cầu',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_password_reset_tokens_hash` (`token_hash`),
  KEY `idx_password_reset_tokens_user_exp` (`user_id`, `expires_at`),
  CONSTRAINT `chk_password_reset_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_password_reset_tokens_hash` CHECK (OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Token quên mật khẩu dùng một lần, chỉ lưu hash SHA-256';

CREATE TABLE IF NOT EXISTS `publishers` (
  `publisher_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính nhà xuất bản',
  `name` VARCHAR(200) NOT NULL COMMENT 'Tên nhà xuất bản, duy nhất',
  `slug` VARCHAR(220) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả nhà xuất bản',
  `website_url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Trang web chính thức',
  `logo_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ logo',
  `country_code` CHAR(2) NULL DEFAULT NULL COMMENT 'Mã quốc gia ISO 3166-1 alpha-2',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hoạt động',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm',
  PRIMARY KEY (`publisher_id`),
  UNIQUE KEY `uq_publishers_name` (`name`),
  UNIQUE KEY `uq_publishers_slug` (`slug`),
  KEY `idx_publishers_status` (`status`),
  KEY `idx_publishers_country` (`country_code`),
  KEY `idx_publishers_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhà xuất bản của sách; quan hệ 1-N với books';

CREATE TABLE IF NOT EXISTS `authors` (
  `author_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tác giả',
  `author_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của tác giả (UUID)',
  `name` VARCHAR(200) NOT NULL COMMENT 'Tên tác giả',
  `slug` VARCHAR(220) NOT NULL COMMENT 'Slug URL duy nhất',
  `bio` TEXT NULL DEFAULT NULL COMMENT 'Tiểu sử tác giả',
  `photo_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh tác giả',
  `birth_date` DATE NULL DEFAULT NULL COMMENT 'Ngày sinh',
  `death_date` DATE NULL DEFAULT NULL COMMENT 'Ngày mất (nếu có)',
  `country_code` CHAR(2) NULL DEFAULT NULL COMMENT 'Quốc tịch (ISO alpha-2)',
  `website_url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Trang web tác giả',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hồ sơ tác giả',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm',
  PRIMARY KEY (`author_id`),
  UNIQUE KEY `uq_authors_uuid` (`author_uuid`),
  UNIQUE KEY `uq_authors_slug` (`slug`),
  KEY `idx_authors_name` (`name`),
  KEY `idx_authors_status` (`status`),
  KEY `idx_authors_deleted` (`deleted_at`),
  CONSTRAINT `chk_authors_life_dates` CHECK (`death_date` IS NULL OR `birth_date` IS NULL OR `death_date` >= `birth_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tác giả; quan hệ N-N với books qua book_authors';

CREATE TABLE IF NOT EXISTS `books` (
  `book_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính sách',
  `book_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai (UUID), external ID trao đổi với bookadmin',
  `title` VARCHAR(500) NOT NULL COMMENT 'Tiêu đề sách',
  `subtitle` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Phụ đề',
  `slug` VARCHAR(550) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` LONGTEXT NULL DEFAULT NULL COMMENT 'Mô tả đầy đủ (HTML/markdown đã làm sạch)',
  `excerpt` TEXT NULL DEFAULT NULL COMMENT 'Đoạn trích ngắn',
  `isbn_13` CHAR(13) NULL DEFAULT NULL COMMENT 'ISBN-13, duy nhất khi có',
  `isbn_10` CHAR(10) NULL DEFAULT NULL COMMENT 'ISBN-10, duy nhất khi có',
  `language` VARCHAR(10) NOT NULL DEFAULT 'vi' COMMENT 'Mã ngôn ngữ nội dung',
  `publisher_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Nhà xuất bản',
  `publication_date` DATE NULL DEFAULT NULL COMMENT 'Ngày xuất bản',
  `edition` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Thông tin ấn bản',
  `page_count` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Số trang',
  `word_count` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Số từ',
  `cover_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh bìa',
  `cover_mime_type` VARCHAR(100) NULL DEFAULT NULL COMMENT 'MIME type ảnh bìa',
  `status` ENUM('draft','submitted','under_review','approved','published','rejected','archived') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái xuất bản/kiểm duyệt',
  `visibility` ENUM('public','restricted','private') NOT NULL DEFAULT 'public' COMMENT 'Mức hiển thị',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Sách nổi bật',
  `average_rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00 COMMENT 'Điểm đánh giá trung bình (0-5), cập nhật bằng job tổng hợp',
  `rating_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lượt chấm điểm',
  `review_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số đánh giá đang hoạt động',
  `download_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lượt tải thành công',
  `view_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lượt xem',
  `published_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm xuất bản (UTC)',
  `created_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Người dùng tạo/gửi sách',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm; hạn chế xóa cứng sách đã có lịch sử',
  PRIMARY KEY (`book_id`),
  UNIQUE KEY `uq_books_uuid` (`book_uuid`),
  UNIQUE KEY `uq_books_slug` (`slug`),
  UNIQUE KEY `uq_books_isbn_13` (`isbn_13`),
  UNIQUE KEY `uq_books_isbn_10` (`isbn_10`),
  KEY `idx_books_publisher` (`publisher_id`),
  KEY `idx_books_created_by` (`created_by_user_id`),
  KEY `idx_books_status_published` (`status`, `published_at`),
  KEY `idx_books_language_status` (`language`, `status`),
  KEY `idx_books_featured_status` (`is_featured`, `status`),
  KEY `idx_books_title` (`title`(191)),
  KEY `idx_books_deleted` (`deleted_at`),
  CONSTRAINT `chk_books_page_count` CHECK (`page_count` IS NULL OR `page_count` > 0),
  CONSTRAINT `chk_books_word_count` CHECK (`word_count` IS NULL OR `word_count` >= 0),
  CONSTRAINT `chk_books_average_rating` CHECK (`average_rating` BETWEEN 0.00 AND 5.00),
  CONSTRAINT `chk_books_isbn13_length` CHECK (`isbn_13` IS NULL OR CHAR_LENGTH(`isbn_13`) = 13),
  CONSTRAINT `chk_books_isbn10_length` CHECK (`isbn_10` IS NULL OR CHAR_LENGTH(`isbn_10`) = 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thông tin sách; file PDF/EPUB chỉ lưu metadata trong book_files';

CREATE TABLE IF NOT EXISTS `book_authors` (
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tác giả',
  `author_order` SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Thứ tự hiển thị tác giả trên sách',
  `role` ENUM('author','co_author','editor','translator','illustrator','contributor') NOT NULL DEFAULT 'author' COMMENT 'Vai trò của tác giả với sách',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`, `author_id`),
  KEY `idx_book_authors_author` (`author_id`),
  KEY `idx_book_authors_order` (`book_id`, `author_order`),
  CONSTRAINT `chk_book_authors_order` CHECK (`author_order` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N books-authors, có thứ tự và vai trò tác giả';

CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính danh mục',
  `parent_category_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Danh mục cha (hỗ trợ cây phân cấp)',
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên danh mục',
  `slug` VARCHAR(170) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả danh mục',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = đang hoạt động',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  UNIQUE KEY `uq_categories_parent_name` (`parent_category_id`, `name`),
  KEY `idx_categories_parent` (`parent_category_id`),
  KEY `idx_categories_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục sách phân cấp; quan hệ N-N với books qua book_categories';

CREATE TABLE IF NOT EXISTS `book_categories` (
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách',
  `category_id` BIGINT UNSIGNED NOT NULL COMMENT 'Danh mục',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = danh mục chính của sách',
  `primary_book_id` BIGINT UNSIGNED AS (IF(`is_primary` = 1, `book_id`, NULL)) STORED COMMENT 'Khóa sinh tự động bảo đảm mỗi sách chỉ có một danh mục chính',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`, `category_id`),
  UNIQUE KEY `uq_book_categories_primary` (`primary_book_id`),
  KEY `idx_book_categories_category` (`category_id`),
  KEY `idx_book_categories_primary_flag` (`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N books-categories, tối đa một danh mục chính/sách';

CREATE TABLE IF NOT EXISTS `tags` (
  `tag_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thẻ',
  `name` VARCHAR(80) NOT NULL COMMENT 'Tên thẻ duy nhất',
  `slug` VARCHAR(100) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Mô tả thẻ',
  `usage_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số sách đang gắn thẻ (denormalized có kiểm soát)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uq_tags_name` (`name`),
  UNIQUE KEY `uq_tags_slug` (`slug`),
  KEY `idx_tags_usage` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thẻ mô tả sách; quan hệ N-N với books qua book_tags';

CREATE TABLE IF NOT EXISTS `book_tags` (
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách',
  `tag_id` BIGINT UNSIGNED NOT NULL COMMENT 'Thẻ',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`, `tag_id`),
  KEY `idx_book_tags_tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N books-tags';

CREATE TABLE IF NOT EXISTS `book_files` (
  `file_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tệp sách',
  `file_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của tệp',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách sở hữu tệp',
  `format` ENUM('pdf','epub','mobi','docx','audio','other') NOT NULL DEFAULT 'pdf' COMMENT 'Định dạng tệp',
  `storage_provider` ENUM('local','minio','s3','external') NOT NULL DEFAULT 'minio' COMMENT 'Nhà cung cấp lưu trữ đối tượng',
  `storage_bucket` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Bucket/container',
  `storage_key` VARCHAR(512) NOT NULL COMMENT 'Khóa đối tượng; KHÔNG lưu nội dung tệp trong DB',
  `file_name` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Tên tệp gốc',
  `mime_type` VARCHAR(150) NULL DEFAULT NULL COMMENT 'MIME type',
  `file_size_bytes` BIGINT UNSIGNED NOT NULL COMMENT 'Kích thước tệp (byte)',
  `checksum_sha256` BINARY(32) NOT NULL COMMENT 'SHA-256 để kiểm tra toàn vẹn và chống trùng tệp',
  `page_count` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Số trang (PDF) hoặc số trang ước tính',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = tệp chính của sách',
  `primary_book_id` BIGINT UNSIGNED AS (IF(`is_primary` = 1, `book_id`, NULL)) STORED COMMENT 'Khóa sinh tự động bảo đảm mỗi sách chỉ có một tệp chính',
  `access_level` ENUM('public','licensed','restricted') NOT NULL DEFAULT 'licensed' COMMENT 'Mức truy cập tệp',
  `uploaded_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Người tải tệp lên',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm metadata; dọn object lưu trữ do worker đảm nhiệm',
  PRIMARY KEY (`file_id`),
  UNIQUE KEY `uq_book_files_uuid` (`file_uuid`),
  UNIQUE KEY `uq_book_files_storage` (`storage_provider`, `storage_bucket`, `storage_key`),
  UNIQUE KEY `uq_book_files_primary` (`primary_book_id`),
  KEY `idx_book_files_book_format` (`book_id`, `format`),
  KEY `idx_book_files_checksum` (`checksum_sha256`),
  KEY `idx_book_files_uploaded_by` (`uploaded_by_user_id`),
  KEY `idx_book_files_deleted` (`deleted_at`),
  CONSTRAINT `chk_book_files_size` CHECK (`file_size_bytes` > 0),
  CONSTRAINT `chk_book_files_checksum` CHECK (OCTET_LENGTH(`checksum_sha256`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Metadata tệp PDF/EPUB/MOBI trên object storage; không lưu file lớn trong DB';

CREATE TABLE IF NOT EXISTS `book_chapters` (
  `chapter_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính chương',
  `chapter_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của chương',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách chứa chương',
  `parent_chapter_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Chương cha (mục lục nhiều cấp)',
  `chapter_number` SMALLINT UNSIGNED NOT NULL COMMENT 'Số thứ tự chương trong sách',
  `title` VARCHAR(300) NOT NULL COMMENT 'Tiêu đề chương',
  `content` LONGTEXT NULL DEFAULT NULL COMMENT 'Nội dung văn bản của chương (HTML/markdown đã làm sạch)',
  `word_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số từ',
  `page_start` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Trang bắt đầu trong bản in/PDF',
  `page_end` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Trang kết thúc',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự sắp xếp trong mục lục',
  `status` ENUM('draft','published') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái xuất bản chương',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`chapter_id`),
  UNIQUE KEY `uq_book_chapters_uuid` (`chapter_uuid`),
  UNIQUE KEY `uq_book_chapters_number` (`book_id`, `chapter_number`),
  KEY `idx_book_chapters_parent` (`parent_chapter_id`),
  KEY `idx_book_chapters_sort` (`book_id`, `sort_order`),
  CONSTRAINT `chk_book_chapters_number` CHECK (`chapter_number` >= 1),
  CONSTRAINT `chk_book_chapters_pages` CHECK (`page_start` IS NULL OR `page_end` IS NULL OR `page_end` >= `page_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nội dung chương của sách, hỗ trợ mục lục phân cấp';

CREATE TABLE IF NOT EXISTS `licenses` (
  `license_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính giấy phép',
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã giấy phép ổn định (CC-BY-4.0, ALL-RIGHTS-RESERVED...)',
  `name` VARCHAR(200) NOT NULL COMMENT 'Tên giấy phép',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả điều khoản chính',
  `license_type` ENUM('public_domain','creative_commons','all_rights_reserved','custom','open_access') NOT NULL DEFAULT 'custom' COMMENT 'Nhóm giấy phép',
  `url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'URL văn bản giấy phép',
  `allows_commercial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép sử dụng thương mại',
  `allows_derivatives` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tác phẩm phái sinh',
  `requires_attribution` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Bắt buộc ghi công',
  `allows_download` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tải xuống',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = còn sử dụng',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`license_id`),
  UNIQUE KEY `uq_licenses_code` (`code`),
  KEY `idx_licenses_type_active` (`license_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục giấy phép nội dung, tham chiếu bởi book_rights';

CREATE TABLE IF NOT EXISTS `book_rights` (
  `rights_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi quyền',
  `rights_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của bản ghi quyền',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được cấp quyền',
  `license_id` BIGINT UNSIGNED NOT NULL COMMENT 'Giấy phép áp dụng',
  `rights_holder` VARCHAR(255) NOT NULL COMMENT 'Chủ thể nắm quyền',
  `territory_code` VARCHAR(10) NOT NULL DEFAULT 'WORLD' COMMENT 'Lãnh thổ áp dụng (WORLD hoặc mã quốc gia)',
  `is_exclusive` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = độc quyền',
  `starts_at` DATETIME(3) NOT NULL COMMENT 'Bắt đầu hiệu lực (UTC)',
  `ends_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Kết thúc hiệu lực; NULL = không giới hạn',
  `allows_download` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tải xuống',
  `allows_print` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép in',
  `allows_offline` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép đọc offline',
  `proof_storage_key` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Khóa lưu trữ tài liệu chứng minh quyền',
  `status` ENUM('pending','verified','rejected','expired') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xác minh quyền',
  `verified_by_admin_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `verified_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm xác minh (UTC)',
  `notes` TEXT NULL DEFAULT NULL COMMENT 'Ghi chú về phạm vi quyền',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`rights_id`),
  UNIQUE KEY `uq_book_rights_uuid` (`rights_uuid`),
  KEY `idx_book_rights_book_status` (`book_id`, `status`, `ends_at`),
  KEY `idx_book_rights_license` (`license_id`),
  KEY `idx_book_rights_verified_admin` (`verified_by_admin_uuid`),
  KEY `idx_book_rights_status_starts` (`status`, `starts_at`),
  CONSTRAINT `chk_book_rights_window` CHECK (`ends_at` IS NULL OR `ends_at` > `starts_at`),
  CONSTRAINT `chk_book_rights_holder` CHECK (CHAR_LENGTH(`rights_holder`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Quyền xuất bản/phân phối theo giấy phép và lãnh thổ; verified_by_admin_uuid là tham chiếu logic';

CREATE TABLE IF NOT EXISTS `user_library` (
  `library_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính mục thư viện',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng sở hữu mục thư viện',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách trong thư viện',
  `status` ENUM('want_to_read','reading','finished','paused','dropped') NOT NULL DEFAULT 'want_to_read' COMMENT 'Trạng thái đọc',
  `is_favorite` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = sách yêu thích',
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm thêm vào thư viện (UTC)',
  `last_opened_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Lần mở gần nhất (UTC)',
  `finished_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hoàn thành (UTC)',
  `removed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm khỏi thư viện (UTC)',
  `active_book_id` BIGINT UNSIGNED AS (IF(`removed_at` IS NULL, `book_id`, NULL)) STORED COMMENT 'Khóa sinh tự động: một bản ghi hoạt động cho mỗi cặp (user, book)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`library_id`),
  UNIQUE KEY `uq_user_library_active_book` (`user_id`, `active_book_id`),
  KEY `idx_user_library_book` (`book_id`),
  KEY `idx_user_library_user_status` (`user_id`, `status`, `last_opened_at`),
  KEY `idx_user_library_favorite` (`user_id`, `is_favorite`),
  CONSTRAINT `chk_user_library_finished` CHECK (`finished_at` IS NULL OR `finished_at` >= `added_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thư viện cá nhân; chống trùng bằng khóa sinh active_book_id khi chưa xóa mềm';

CREATE TABLE IF NOT EXISTS `reading_progress` (
  `progress_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tiến độ đọc',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người đọc',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách đang đọc',
  `chapter_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Chương hiện tại',
  `file_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Tệp đang đọc',
  `device_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Thiết bị ghi nhận tiến độ gần nhất',
  `position` JSON NULL DEFAULT NULL COMMENT 'Vị trí đọc chính xác (CFI, scroll offset, page anchor)',
  `percent_complete` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Phần trăm hoàn thành 0.00-100.00',
  `page_number` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Trang hiện tại',
  `total_pages` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Tổng số trang của tệp',
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc xong',
  `completed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm đọc xong (UTC)',
  `last_read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Lần đọc gần nhất (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `uq_reading_progress_user_book` (`user_id`, `book_id`),
  KEY `idx_reading_progress_book` (`book_id`),
  KEY `idx_reading_progress_chapter` (`chapter_id`),
  KEY `idx_reading_progress_file` (`file_id`),
  KEY `idx_reading_progress_device` (`device_id`),
  KEY `idx_reading_progress_recent` (`user_id`, `last_read_at`),
  CONSTRAINT `chk_reading_progress_percent` CHECK (`percent_complete` >= 0 AND `percent_complete` <= 100),
  CONSTRAINT `chk_reading_progress_pages` CHECK (`total_pages` IS NULL OR `page_number` IS NULL OR `page_number` <= `total_pages`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tiến độ đọc đồng bộ đa thiết bị; một bản ghi cho mỗi cặp (user, book)';

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `bookmark_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính dấu trang',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng tạo dấu trang',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được đánh dấu',
  `chapter_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Chương chứa vị trí đánh dấu',
  `page_number` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Số trang tại vị trí đánh dấu',
  `position` JSON NULL DEFAULT NULL COMMENT 'Vị trí chính xác trong tệp (CFI/offset)',
  `label` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Nhãn ngắn của dấu trang',
  `note` VARCHAR(2000) NULL DEFAULT NULL COMMENT 'Ghi chú của người đọc',
  `color` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Màu hiển thị (token UI)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`bookmark_id`),
  KEY `idx_bookmarks_user_book` (`user_id`, `book_id`, `created_at`),
  KEY `idx_bookmarks_book` (`book_id`),
  KEY `idx_bookmarks_chapter` (`chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dấu trang và ghi chú đọc của người dùng';

CREATE TABLE IF NOT EXISTS `reading_history` (
  `history_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lịch sử đọc',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người đọc',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được đọc',
  `chapter_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Chương được đọc trong phiên',
  `session_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Phiên đăng nhập ghi nhận hoạt động',
  `device_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Thiết bị đọc',
  `source` ENUM('web','mobile','api','import') NOT NULL DEFAULT 'web' COMMENT 'Nguồn ghi nhận',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Bắt đầu phiên đọc (UTC)',
  `ended_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Kết thúc phiên đọc (UTC)',
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Thời lượng đọc (giây)',
  `pages_read` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số trang đã đọc trong phiên',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  PRIMARY KEY (`history_id`),
  KEY `idx_reading_history_user_time` (`user_id`, `started_at`),
  KEY `idx_reading_history_book_time` (`book_id`, `started_at`),
  KEY `idx_reading_history_chapter` (`chapter_id`),
  KEY `idx_reading_history_session` (`session_id`),
  KEY `idx_reading_history_device` (`device_id`),
  CONSTRAINT `chk_reading_history_window` CHECK (`ended_at` IS NULL OR `ended_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử phiên đọc phục vụ thống kê và gợi ý; có thể phân vùng theo tháng khi tăng trưởng';

CREATE TABLE IF NOT EXISTS `reading_lists` (
  `list_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính danh sách đọc',
  `list_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của danh sách',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng sở hữu danh sách',
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên danh sách',
  `description` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'Mô tả danh sách',
  `visibility` ENUM('private','unlisted','public') NOT NULL DEFAULT 'private' COMMENT 'Phạm vi hiển thị',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = danh sách mặc định của người dùng',
  `item_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số sách trong danh sách (denormalized)',
  `active_name` VARCHAR(150) AS (IF(`deleted_at` IS NULL, `name`, NULL)) STORED COMMENT 'Khóa sinh tự động: tên danh sách duy nhất khi chưa xóa mềm',
  `default_user_id` BIGINT UNSIGNED AS (IF(`is_default` = 1, `user_id`, NULL)) STORED COMMENT 'Khóa sinh tự động: mỗi người dùng chỉ có một danh sách mặc định',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm danh sách (UTC)',
  PRIMARY KEY (`list_id`),
  UNIQUE KEY `uq_reading_lists_uuid` (`list_uuid`),
  UNIQUE KEY `uq_reading_lists_active_name` (`user_id`, `active_name`),
  UNIQUE KEY `uq_reading_lists_default` (`default_user_id`),
  KEY `idx_reading_lists_user` (`user_id`, `created_at`),
  KEY `idx_reading_lists_visibility` (`visibility`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh sách đọc do người dùng tạo (private/unlisted/public)';

CREATE TABLE IF NOT EXISTS `reading_list_books` (
  `list_id` BIGINT UNSIGNED NOT NULL COMMENT 'Danh sách đọc',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách trong danh sách',
  `position` INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự sách trong danh sách',
  `note` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'Ghi chú riêng cho sách trong danh sách',
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm thêm (UTC)',
  PRIMARY KEY (`list_id`, `book_id`),
  KEY `idx_reading_list_books_book` (`book_id`),
  KEY `idx_reading_list_books_position` (`list_id`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết N-N reading_lists-books, có thứ tự hiển thị';

CREATE TABLE IF NOT EXISTS `downloads` (
  `download_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lượt tải',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người tải',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được tải',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tệp cụ thể được tải',
  `device_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Thiết bị tải',
  `format` ENUM('pdf','epub','mobi','audio','other') NOT NULL DEFAULT 'pdf' COMMENT 'Định dạng tại thời điểm tải',
  `status` ENUM('started','completed','failed','expired') NOT NULL DEFAULT 'started' COMMENT 'Trạng thái lượt tải',
  `bytes_sent` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số byte đã truyền',
  `ip_address` VARBINARY(16) NULL DEFAULT NULL COMMENT 'IP nhị phân của người tải',
  `license_accepted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm chấp nhận điều khoản giấy phép (UTC)',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Bắt đầu tải (UTC)',
  `completed_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Hoàn tất tải (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  PRIMARY KEY (`download_id`),
  KEY `idx_downloads_user_time` (`user_id`, `created_at`),
  KEY `idx_downloads_book` (`book_id`),
  KEY `idx_downloads_file` (`file_id`),
  KEY `idx_downloads_device` (`device_id`),
  KEY `idx_downloads_status` (`status`, `created_at`),
  CONSTRAINT `chk_downloads_window` CHECK (`completed_at` IS NULL OR `completed_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký tải tệp sách, phục vụ hạn mức và kiểm toán bản quyền';

CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính đánh giá',
  `review_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của đánh giá',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người đánh giá',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được đánh giá',
  `rating` DECIMAL(2,1) NOT NULL COMMENT 'Điểm đánh giá 0.5-5.0 (DECIMAL, không dùng FLOAT)',
  `title` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Tiêu đề đánh giá',
  `body` TEXT NULL DEFAULT NULL COMMENT 'Nội dung đánh giá',
  `contains_spoilers` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = có tiết lộ nội dung',
  `is_verified_purchase` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã xác thực quyền đọc sách',
  `status` ENUM('pending','published','hidden','rejected','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái kiểm duyệt',
  `helpful_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lượt hữu ích (denormalized)',
  `report_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số báo cáo vi phạm (denormalized)',
  `moderated_by_admin_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `moderated_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm kiểm duyệt (UTC)',
  `published_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm công khai (UTC)',
  `active_book_id` BIGINT UNSIGNED AS (IF(`status` <> 'deleted' AND `deleted_at` IS NULL, `book_id`, NULL)) STORED COMMENT 'Khóa sinh tự động: một đánh giá còn hiệu lực cho mỗi cặp (user, book)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm đánh giá (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_reviews_uuid` (`review_uuid`),
  UNIQUE KEY `uq_reviews_active_book` (`user_id`, `active_book_id`),
  KEY `idx_reviews_book_status` (`book_id`, `status`, `rating`),
  KEY `idx_reviews_book_created` (`book_id`, `created_at`),
  KEY `idx_reviews_user` (`user_id`, `created_at`),
  KEY `idx_reviews_status` (`status`, `created_at`),
  KEY `idx_reviews_moderated_by` (`moderated_by_admin_uuid`),
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` >= 0.5 AND `rating` <= 5.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Đánh giá sách; ràng buộc một đánh giá hiệu lực/người dùng/sách bằng khóa sinh';

CREATE TABLE IF NOT EXISTS `comments` (
  `comment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bình luận',
  `comment_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của bình luận',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sách được bình luận',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người bình luận',
  `parent_comment_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Bình luận cha (phản hồi)',
  `review_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'Đánh giá được bình luận (nếu có)',
  `body` TEXT NOT NULL COMMENT 'Nội dung bình luận',
  `status` ENUM('pending','published','hidden','rejected','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái kiểm duyệt',
  `thread_depth` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Độ sâu phân cấp (0 = gốc)',
  `reply_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số phản hồi (denormalized)',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lượt thích (denormalized)',
  `moderated_by_admin_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `moderated_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm kiểm duyệt (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Xóa mềm bình luận (UTC)',
  PRIMARY KEY (`comment_id`),
  UNIQUE KEY `uq_comments_uuid` (`comment_uuid`),
  KEY `idx_comments_book_status_time` (`book_id`, `status`, `created_at`),
  KEY `idx_comments_parent` (`parent_comment_id`),
  KEY `idx_comments_review` (`review_id`, `created_at`),
  KEY `idx_comments_user` (`user_id`, `created_at`),
  KEY `idx_comments_moderated_by` (`moderated_by_admin_uuid`),
  CONSTRAINT `chk_comments_body` CHECK (CHAR_LENGTH(`body`) > 0),
  CONSTRAINT `chk_comments_depth` CHECK (`thread_depth` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bình luận và phản hồi theo sách/đánh giá; giới hạn độ sâu phân cấp';

CREATE TABLE IF NOT EXISTS `comment_reactions` (
  `reaction_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lượt tương tác',
  `comment_id` BIGINT UNSIGNED NOT NULL COMMENT 'Bình luận được tương tác',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người tương tác',
  `reaction_type` ENUM('like','dislike','helpful','funny') NOT NULL DEFAULT 'like' COMMENT 'Loại tương tác',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`reaction_id`),
  UNIQUE KEY `uq_comment_reactions_comment_user` (`comment_id`, `user_id`),
  KEY `idx_comment_reactions_user` (`user_id`, `created_at`),
  KEY `idx_comment_reactions_type` (`reaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tương tác của người dùng với bình luận, tối đa một tương tác/người/bình luận';

CREATE TABLE IF NOT EXISTS `user_follows` (
  `follower_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người theo dõi',
  `followed_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người được theo dõi',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm theo dõi (UTC)',
  PRIMARY KEY (`follower_user_id`, `followed_user_id`),
  KEY `idx_user_follows_followed` (`followed_user_id`, `created_at`),
  CONSTRAINT `chk_user_follows_self` CHECK (`follower_user_id` <> `followed_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Quan hệ theo dõi N-N giữa người dùng, chặn tự theo dõi';

CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo',
  `notification_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người nhận thông báo',
  `type` ENUM('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','other') NOT NULL DEFAULT 'system' COMMENT 'Loại thông báo',
  `title` VARCHAR(255) NOT NULL COMMENT 'Tiêu đề',
  `body` TEXT NULL DEFAULT NULL COMMENT 'Nội dung ngắn',
  `action_url` VARCHAR(512) NULL DEFAULT NULL COMMENT 'Đường dẫn hành động trong ứng dụng',
  `related_resource_type` VARCHAR(60) NULL DEFAULT NULL COMMENT 'Loại tài nguyên liên quan',
  `related_resource_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID tài nguyên liên quan',
  `related_resource_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID tài nguyên liên quan',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc',
  `read_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm đọc (UTC)',
  `expires_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm hết hạn hiển thị (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `uq_notifications_uuid` (`notification_uuid`),
  KEY `idx_notifications_user_read` (`user_id`, `is_read`, `created_at`),
  KEY `idx_notifications_user_created` (`user_id`, `created_at`),
  KEY `idx_notifications_type` (`type`, `created_at`),
  KEY `idx_notifications_expires` (`expires_at`),
  CONSTRAINT `chk_notifications_read` CHECK ((`is_read` = 0 AND `read_at` IS NULL) OR (`is_read` = 1 AND `read_at` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thông báo trong ứng dụng cho người dùng; có thể dọn theo expires_at';

CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `preference_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tùy chọn thông báo',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người dùng',
  `notification_type` ENUM('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','marketing') NOT NULL COMMENT 'Loại thông báo',
  `in_app_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Bật thông báo trong ứng dụng',
  `email_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Bật thông báo email',
  `push_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bật thông báo đẩy',
  `digest_frequency` ENUM('instant','daily','weekly','never') NOT NULL DEFAULT 'instant' COMMENT 'Tần suất gửi gộp',
  `quiet_hours_start` TIME NULL DEFAULT NULL COMMENT 'Bắt đầu giờ yên tĩnh (giờ địa phương)',
  `quiet_hours_end` TIME NULL DEFAULT NULL COMMENT 'Kết thúc giờ yên tĩnh',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `uq_notification_preferences_user_type` (`user_id`, `notification_type`),
  KEY `idx_notification_preferences_type` (`notification_type`),
  CONSTRAINT `chk_notification_preferences_quiet` CHECK ((`quiet_hours_start` IS NULL AND `quiet_hours_end` IS NULL) OR (`quiet_hours_start` IS NOT NULL AND `quiet_hours_end` IS NOT NULL AND `quiet_hours_start` <> `quiet_hours_end`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tùy chọn kênh và tần suất nhận thông báo theo từng loại';

CREATE TABLE IF NOT EXISTS `user_reports` (
  `report_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính báo cáo của người dùng',
  `report_uuid` CHAR(36) NOT NULL COMMENT 'Mã công khai; đồng bộ sang bookadmin.content_reports.report_uuid',
  `reporter_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Người gửi báo cáo',
  `target_type` ENUM('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị báo cáo',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID đối tượng bị báo cáo',
  `target_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID đối tượng bị báo cáo',
  `reason_code` VARCHAR(50) NOT NULL COMMENT 'Mã lý do, đồng bộ bookadmin.report_reasons.code',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Mô tả chi tiết',
  `status` ENUM('new','triaged','in_review','resolved','rejected','duplicate') NOT NULL DEFAULT 'new' COMMENT 'Trạng thái xử lý đồng bộ với admin',
  `resolution_note` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'Phản hồi tóm tắt cho người báo cáo',
  `resolved_at` DATETIME(3) NULL DEFAULT NULL COMMENT 'Thời điểm giải quyết (UTC)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm gửi (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_user_reports_uuid` (`report_uuid`),
  KEY `idx_user_reports_reporter_time` (`reporter_user_id`, `created_at`),
  KEY `idx_user_reports_status` (`status`, `created_at`),
  KEY `idx_user_reports_target` (`target_type`, `target_id`),
  KEY `idx_user_reports_reason` (`reason_code`),
  CONSTRAINT `chk_user_reports_target` CHECK (`target_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Báo cáo vi phạm từ người dùng; admin nhận bản sao idempotent qua outbox/inbox';

CREATE TABLE IF NOT EXISTS `integration_outbox` (
  `outbox_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi outbox',
  `event_id` CHAR(36) NOT NULL COMMENT 'UUID sự kiện, dùng chống trùng ở phía nhận',
  `aggregate_type` VARCHAR(60) NOT NULL COMMENT 'Loại aggregate nguồn (user, book, review...)',
  `aggregate_id` VARCHAR(100) NOT NULL COMMENT 'ID aggregate nguồn dạng chuỗi',
  `aggregate_uuid` CHAR(36) NULL DEFAULT NULL COMMENT 'UUID aggregate nếu có',
  `event_type` VARCHAR(100) NOT NULL COMMENT 'Loại sự kiện (user.created, review.published...)',
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
  COMMENT='Transactional outbox của bookuser: phát sự kiện sang bookadmin theo mô hình ít nhất một lần';

CREATE TABLE IF NOT EXISTS `integration_inbox` (
  `inbox_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi inbox',
  `event_id` CHAR(36) NOT NULL COMMENT 'UUID sự kiện nhận được; UNIQUE để chống xử lý trùng',
  `source_schema` ENUM('bookuser','bookadmin','external') NOT NULL DEFAULT 'bookadmin' COMMENT 'Nguồn phát sự kiện',
  `source_event_type` VARCHAR(100) NOT NULL COMMENT 'Loại sự kiện gốc (user.locked, review.hidden...)',
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
  COMMENT='Inbox idempotent của bookuser: nhận sự kiện từ bookadmin, chống trùng theo event_id';

-- Hết phần định nghĩa bảng của schema bookuser.
