
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

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `bookuser` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `bookuser`;
DROP TABLE IF EXISTS `authors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `authors` (
  `author_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tác giả',
  `author_uuid` char(36) NOT NULL COMMENT 'Mã công khai của tác giả (UUID)',
  `name` varchar(200) NOT NULL COMMENT 'Tên tác giả',
  `slug` varchar(220) NOT NULL COMMENT 'Slug URL duy nhất',
  `bio` text DEFAULT NULL COMMENT 'Tiểu sử tác giả',
  `photo_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh tác giả',
  `birth_date` date DEFAULT NULL COMMENT 'Ngày sinh',
  `death_date` date DEFAULT NULL COMMENT 'Ngày mất (nếu có)',
  `country_code` char(2) DEFAULT NULL COMMENT 'Quốc tịch (ISO alpha-2)',
  `website_url` varchar(512) DEFAULT NULL COMMENT 'Trang web tác giả',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hồ sơ tác giả',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm',
  PRIMARY KEY (`author_id`),
  UNIQUE KEY `uq_authors_uuid` (`author_uuid`),
  UNIQUE KEY `uq_authors_slug` (`slug`),
  KEY `idx_authors_name` (`name`),
  KEY `idx_authors_status` (`status`),
  KEY `idx_authors_deleted` (`deleted_at`),
  FULLTEXT KEY `ft_authors_name` (`name`,`bio`),
  CONSTRAINT `chk_authors_life_dates` CHECK (`death_date` is null or `birth_date` is null or `death_date` >= `birth_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tác giả; quan hệ N-N với books qua book_authors';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_authors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_authors` (
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách',
  `author_id` bigint(20) unsigned NOT NULL COMMENT 'Tác giả',
  `author_order` smallint(5) unsigned NOT NULL DEFAULT 1 COMMENT 'Thứ tự hiển thị tác giả trên sách',
  `role` enum('author','co_author','editor','translator','illustrator','contributor') NOT NULL DEFAULT 'author' COMMENT 'Vai trò của tác giả với sách',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`,`author_id`),
  KEY `idx_book_authors_author` (`author_id`),
  KEY `idx_book_authors_order` (`book_id`,`author_order`),
  CONSTRAINT `fk_book_authors_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`author_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_authors_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_book_authors_order` CHECK (`author_order` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N books-authors, có thứ tự và vai trò tác giả';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_categories` (
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách',
  `category_id` bigint(20) unsigned NOT NULL COMMENT 'Danh mục',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = danh mục chính của sách',
  `primary_book_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`is_primary` = 1,`book_id`,NULL)) STORED COMMENT 'Khóa sinh tự động bảo đảm mỗi sách chỉ có một danh mục chính',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`,`category_id`),
  UNIQUE KEY `uq_book_categories_primary` (`primary_book_id`),
  KEY `idx_book_categories_category` (`category_id`),
  KEY `idx_book_categories_primary_flag` (`is_primary`),
  CONSTRAINT `fk_book_categories_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N books-categories, tối đa một danh mục chính/sách';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_chapters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_chapters` (
  `chapter_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính chương',
  `chapter_uuid` char(36) NOT NULL COMMENT 'Mã công khai của chương',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách chứa chương',
  `parent_chapter_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Chương cha (mục lục nhiều cấp)',
  `chapter_number` smallint(5) unsigned NOT NULL COMMENT 'Số thứ tự chương trong sách',
  `title` varchar(300) NOT NULL COMMENT 'Tiêu đề chương',
  `content` longtext DEFAULT NULL COMMENT 'Nội dung văn bản của chương (HTML/markdown đã làm sạch)',
  `word_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số từ',
  `page_start` int(10) unsigned DEFAULT NULL COMMENT 'Trang bắt đầu trong bản in/PDF',
  `page_end` int(10) unsigned DEFAULT NULL COMMENT 'Trang kết thúc',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Thứ tự sắp xếp trong mục lục',
  `status` enum('draft','published') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái xuất bản chương',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`chapter_id`),
  UNIQUE KEY `uq_book_chapters_uuid` (`chapter_uuid`),
  UNIQUE KEY `uq_book_chapters_number` (`book_id`,`chapter_number`),
  KEY `idx_book_chapters_parent` (`parent_chapter_id`),
  KEY `idx_book_chapters_sort` (`book_id`,`sort_order`),
  CONSTRAINT `fk_book_chapters_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_chapters_parent` FOREIGN KEY (`parent_chapter_id`) REFERENCES `book_chapters` (`chapter_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_book_chapters_number` CHECK (`chapter_number` >= 1),
  CONSTRAINT `chk_book_chapters_pages` CHECK (`page_start` is null or `page_end` is null or `page_end` >= `page_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nội dung chương của sách, hỗ trợ mục lục phân cấp';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_files` (
  `file_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tệp sách',
  `file_uuid` char(36) NOT NULL COMMENT 'Mã công khai của tệp',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách sở hữu tệp',
  `format` enum('pdf','epub','mobi','docx','audio','other') NOT NULL DEFAULT 'pdf' COMMENT 'Định dạng tệp',
  `storage_provider` enum('local','minio','s3','external') NOT NULL DEFAULT 'minio' COMMENT 'Nhà cung cấp lưu trữ đối tượng',
  `storage_bucket` varchar(100) DEFAULT NULL COMMENT 'Bucket/container',
  `storage_key` varchar(512) NOT NULL COMMENT 'Khóa đối tượng; KHÔNG lưu nội dung tệp trong DB',
  `file_name` varchar(255) DEFAULT NULL COMMENT 'Tên tệp gốc',
  `mime_type` varchar(150) DEFAULT NULL COMMENT 'MIME type',
  `file_size_bytes` bigint(20) unsigned NOT NULL COMMENT 'Kích thước tệp (byte)',
  `checksum_sha256` binary(32) NOT NULL COMMENT 'SHA-256 để kiểm tra toàn vẹn và chống trùng tệp',
  `page_count` int(10) unsigned DEFAULT NULL COMMENT 'Số trang (PDF) hoặc số trang ước tính',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = tệp chính của sách',
  `primary_book_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`is_primary` = 1,`book_id`,NULL)) STORED COMMENT 'Khóa sinh tự động bảo đảm mỗi sách chỉ có một tệp chính',
  `access_level` enum('public','licensed','restricted') NOT NULL DEFAULT 'licensed' COMMENT 'Mức truy cập tệp',
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Người tải tệp lên',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm metadata; dọn object lưu trữ do worker đảm nhiệm',
  PRIMARY KEY (`file_id`),
  UNIQUE KEY `uq_book_files_uuid` (`file_uuid`),
  UNIQUE KEY `uq_book_files_storage` (`storage_provider`,`storage_bucket`,`storage_key`),
  UNIQUE KEY `uq_book_files_primary` (`primary_book_id`),
  KEY `idx_book_files_book_format` (`book_id`,`format`),
  KEY `idx_book_files_checksum` (`checksum_sha256`),
  KEY `idx_book_files_uploaded_by` (`uploaded_by_user_id`),
  KEY `idx_book_files_deleted` (`deleted_at`),
  CONSTRAINT `fk_book_files_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_files_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_book_files_size` CHECK (`file_size_bytes` > 0),
  CONSTRAINT `chk_book_files_checksum` CHECK (octet_length(`checksum_sha256`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Metadata tệp PDF/EPUB/MOBI trên object storage; không lưu file lớn trong DB';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_rights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_rights` (
  `rights_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi quyền',
  `rights_uuid` char(36) NOT NULL COMMENT 'Mã công khai của bản ghi quyền',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được cấp quyền',
  `license_id` bigint(20) unsigned NOT NULL COMMENT 'Giấy phép áp dụng',
  `rights_holder` varchar(255) NOT NULL COMMENT 'Chủ thể nắm quyền',
  `territory_code` varchar(10) NOT NULL DEFAULT 'WORLD' COMMENT 'Lãnh thổ áp dụng (WORLD hoặc mã quốc gia)',
  `is_exclusive` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = độc quyền',
  `starts_at` datetime(3) NOT NULL COMMENT 'Bắt đầu hiệu lực (UTC)',
  `ends_at` datetime(3) DEFAULT NULL COMMENT 'Kết thúc hiệu lực; NULL = không giới hạn',
  `allows_download` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tải xuống',
  `allows_print` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép in',
  `allows_offline` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép đọc offline',
  `proof_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ tài liệu chứng minh quyền',
  `status` enum('pending','verified','rejected','expired') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái xác minh quyền',
  `verified_by_admin_uuid` char(36) DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `verified_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm xác minh (UTC)',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú về phạm vi quyền',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`rights_id`),
  UNIQUE KEY `uq_book_rights_uuid` (`rights_uuid`),
  KEY `idx_book_rights_book_status` (`book_id`,`status`,`ends_at`),
  KEY `idx_book_rights_license` (`license_id`),
  KEY `idx_book_rights_verified_admin` (`verified_by_admin_uuid`),
  KEY `idx_book_rights_status_starts` (`status`,`starts_at`),
  CONSTRAINT `fk_book_rights_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
  CONSTRAINT `fk_book_rights_license` FOREIGN KEY (`license_id`) REFERENCES `licenses` (`license_id`),
  CONSTRAINT `chk_book_rights_window` CHECK (`ends_at` is null or `ends_at` > `starts_at`),
  CONSTRAINT `chk_book_rights_holder` CHECK (char_length(`rights_holder`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quyền xuất bản/phân phối theo giấy phép và lãnh thổ; verified_by_admin_uuid là tham chiếu logic';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `book_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_tags` (
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách',
  `tag_id` bigint(20) unsigned NOT NULL COMMENT 'Thẻ',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo liên kết (UTC)',
  PRIMARY KEY (`book_id`,`tag_id`),
  KEY `idx_book_tags_tag` (`tag_id`),
  CONSTRAINT `fk_book_tags_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N books-tags';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookmarks` (
  `bookmark_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính dấu trang',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng tạo dấu trang',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được đánh dấu',
  `chapter_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Chương chứa vị trí đánh dấu',
  `page_number` int(10) unsigned DEFAULT NULL COMMENT 'Số trang tại vị trí đánh dấu',
  `position` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Vị trí chính xác trong tệp (CFI/offset)' CHECK (json_valid(`position`)),
  `label` varchar(255) DEFAULT NULL COMMENT 'Nhãn ngắn của dấu trang',
  `note` varchar(2000) DEFAULT NULL COMMENT 'Ghi chú của người đọc',
  `color` varchar(20) DEFAULT NULL COMMENT 'Màu hiển thị (token UI)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`bookmark_id`),
  KEY `idx_bookmarks_user_book` (`user_id`,`book_id`,`created_at`),
  KEY `idx_bookmarks_book` (`book_id`),
  KEY `idx_bookmarks_chapter` (`chapter_id`),
  CONSTRAINT `fk_bookmarks_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookmarks_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters` (`chapter_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dấu trang và ghi chú đọc của người dùng';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `books` (
  `book_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính sách',
  `book_uuid` char(36) NOT NULL COMMENT 'Mã công khai (UUID), external ID trao đổi với bookadmin',
  `title` varchar(500) NOT NULL COMMENT 'Tiêu đề sách',
  `subtitle` varchar(500) DEFAULT NULL COMMENT 'Phụ đề',
  `slug` varchar(550) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` longtext DEFAULT NULL COMMENT 'Mô tả đầy đủ (HTML/markdown đã làm sạch)',
  `excerpt` text DEFAULT NULL COMMENT 'Đoạn trích ngắn',
  `isbn_13` char(13) DEFAULT NULL COMMENT 'ISBN-13, duy nhất khi có',
  `isbn_10` char(10) DEFAULT NULL COMMENT 'ISBN-10, duy nhất khi có',
  `language` varchar(10) NOT NULL DEFAULT 'vi' COMMENT 'Mã ngôn ngữ nội dung',
  `publisher_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Nhà xuất bản',
  `publication_date` date DEFAULT NULL COMMENT 'Ngày xuất bản',
  `edition` varchar(50) DEFAULT NULL COMMENT 'Thông tin ấn bản',
  `page_count` int(10) unsigned DEFAULT NULL COMMENT 'Số trang',
  `word_count` int(10) unsigned DEFAULT NULL COMMENT 'Số từ',
  `cover_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh bìa',
  `cover_mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type ảnh bìa',
  `status` enum('draft','submitted','under_review','approved','published','rejected','archived') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái xuất bản/kiểm duyệt',
  `visibility` enum('public','restricted','private') NOT NULL DEFAULT 'public' COMMENT 'Mức hiển thị',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Sách nổi bật',
  `average_rating` decimal(3,2) NOT NULL DEFAULT 0.00 COMMENT 'Điểm đánh giá trung bình (0-5), cập nhật bằng job tổng hợp',
  `rating_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lượt chấm điểm',
  `review_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số đánh giá đang hoạt động',
  `download_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lượt tải thành công',
  `view_count` bigint(20) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lượt xem',
  `published_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm xuất bản (UTC)',
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Người dùng tạo/gửi sách',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm; hạn chế xóa cứng sách đã có lịch sử',
  PRIMARY KEY (`book_id`),
  UNIQUE KEY `uq_books_uuid` (`book_uuid`),
  UNIQUE KEY `uq_books_slug` (`slug`),
  UNIQUE KEY `uq_books_isbn_13` (`isbn_13`),
  UNIQUE KEY `uq_books_isbn_10` (`isbn_10`),
  KEY `idx_books_publisher` (`publisher_id`),
  KEY `idx_books_created_by` (`created_by_user_id`),
  KEY `idx_books_status_published` (`status`,`published_at`),
  KEY `idx_books_language_status` (`language`,`status`),
  KEY `idx_books_featured_status` (`is_featured`,`status`),
  KEY `idx_books_title` (`title`(191)),
  KEY `idx_books_deleted` (`deleted_at`),
  KEY `idx_books_visibility_status_published` (`visibility`,`status`,`published_at`),
  FULLTEXT KEY `ft_books_title_description` (`title`,`description`),
  CONSTRAINT `fk_books_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_books_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `publishers` (`publisher_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_books_page_count` CHECK (`page_count` is null or `page_count` > 0),
  CONSTRAINT `chk_books_word_count` CHECK (`word_count` is null or `word_count` >= 0),
  CONSTRAINT `chk_books_average_rating` CHECK (`average_rating` between 0.00 and 5.00),
  CONSTRAINT `chk_books_isbn13_length` CHECK (`isbn_13` is null or char_length(`isbn_13`) = 13),
  CONSTRAINT `chk_books_isbn10_length` CHECK (`isbn_10` is null or char_length(`isbn_10`) = 10)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông tin sách; file PDF/EPUB chỉ lưu metadata trong book_files';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính danh mục',
  `parent_category_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Danh mục cha (hỗ trợ cây phân cấp)',
  `name` varchar(150) NOT NULL COMMENT 'Tên danh mục',
  `slug` varchar(170) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` text DEFAULT NULL COMMENT 'Mô tả danh mục',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = đang hoạt động',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  UNIQUE KEY `uq_categories_parent_name` (`parent_category_id`,`name`),
  KEY `idx_categories_parent` (`parent_category_id`),
  KEY `idx_categories_active_sort` (`is_active`,`sort_order`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục sách phân cấp; quan hệ N-N với books qua book_categories';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comment_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_reactions` (
  `reaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lượt tương tác',
  `comment_id` bigint(20) unsigned NOT NULL COMMENT 'Bình luận được tương tác',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người tương tác',
  `reaction_type` enum('like','dislike','helpful','funny') NOT NULL DEFAULT 'like' COMMENT 'Loại tương tác',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`reaction_id`),
  UNIQUE KEY `uq_comment_reactions_comment_user` (`comment_id`,`user_id`),
  KEY `idx_comment_reactions_user` (`user_id`,`created_at`),
  KEY `idx_comment_reactions_type` (`reaction_type`),
  CONSTRAINT `fk_comment_reactions_comment` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tương tác của người dùng với bình luận, tối đa một tương tác/người/bình luận';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `comment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bình luận',
  `comment_uuid` char(36) NOT NULL COMMENT 'Mã công khai của bình luận',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được bình luận',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người bình luận',
  `parent_comment_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Bình luận cha (phản hồi)',
  `review_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Đánh giá được bình luận (nếu có)',
  `body` text NOT NULL COMMENT 'Nội dung bình luận',
  `status` enum('pending','published','hidden','rejected','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái kiểm duyệt',
  `thread_depth` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'Độ sâu phân cấp (0 = gốc)',
  `reply_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số phản hồi (denormalized)',
  `like_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lượt thích (denormalized)',
  `moderated_by_admin_uuid` char(36) DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `moderated_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm kiểm duyệt (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm bình luận (UTC)',
  PRIMARY KEY (`comment_id`),
  UNIQUE KEY `uq_comments_uuid` (`comment_uuid`),
  KEY `idx_comments_book_status_time` (`book_id`,`status`,`created_at`),
  KEY `idx_comments_parent` (`parent_comment_id`),
  KEY `idx_comments_review` (`review_id`,`created_at`),
  KEY `idx_comments_user` (`user_id`,`created_at`),
  KEY `idx_comments_moderated_by` (`moderated_by_admin_uuid`),
  CONSTRAINT `fk_comments_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`review_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_comments_body` CHECK (char_length(`body`) > 0),
  CONSTRAINT `chk_comments_depth` CHECK (`thread_depth` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bình luận và phản hồi theo sách/đánh giá; giới hạn độ sâu phân cấp';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `downloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `downloads` (
  `download_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lượt tải',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người tải',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được tải',
  `file_id` bigint(20) unsigned NOT NULL COMMENT 'Tệp cụ thể được tải',
  `device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Thiết bị tải',
  `format` enum('pdf','epub','mobi','audio','other') NOT NULL DEFAULT 'pdf' COMMENT 'Định dạng tại thời điểm tải',
  `status` enum('started','completed','failed','expired') NOT NULL DEFAULT 'started' COMMENT 'Trạng thái lượt tải',
  `bytes_sent` bigint(20) unsigned NOT NULL DEFAULT 0 COMMENT 'Số byte đã truyền',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'IP nhị phân của người tải',
  `license_accepted_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm chấp nhận điều khoản giấy phép (UTC)',
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Bắt đầu tải (UTC)',
  `completed_at` datetime(3) DEFAULT NULL COMMENT 'Hoàn tất tải (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  PRIMARY KEY (`download_id`),
  KEY `idx_downloads_user_time` (`user_id`,`created_at`),
  KEY `idx_downloads_book` (`book_id`),
  KEY `idx_downloads_file` (`file_id`),
  KEY `idx_downloads_device` (`device_id`),
  KEY `idx_downloads_status` (`status`,`created_at`),
  KEY `idx_downloads_user_book_time` (`user_id`,`book_id`,`created_at`),
  CONSTRAINT `fk_downloads_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
  CONSTRAINT `fk_downloads_device` FOREIGN KEY (`device_id`) REFERENCES `user_devices` (`device_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_downloads_file` FOREIGN KEY (`file_id`) REFERENCES `book_files` (`file_id`),
  CONSTRAINT `fk_downloads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_downloads_window` CHECK (`completed_at` is null or `completed_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký tải tệp sách, phục vụ hạn mức và kiểm toán bản quyền';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `email_verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification_tokens` (
  `token_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token xác minh email',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng yêu cầu xác minh',
  `email` varchar(254) NOT NULL COMMENT 'Email đang được xác minh tại thời điểm phát token',
  `token_hash` binary(32) NOT NULL COMMENT 'SHA-256 của token gửi qua email; DB không lưu token gốc',
  `expires_at` datetime(3) NOT NULL COMMENT 'Hạn sử dụng token (UTC)',
  `consumed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm token được dùng (UTC)',
  `requested_ip` varbinary(16) DEFAULT NULL COMMENT 'IP yêu cầu phát token',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_email_verification_tokens_hash` (`token_hash`),
  KEY `idx_email_verification_tokens_user_exp` (`user_id`,`expires_at`),
  KEY `idx_email_verification_tokens_email_exp` (`email`,`expires_at`),
  CONSTRAINT `fk_email_verification_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_email_verification_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_email_verification_tokens_hash` CHECK (octet_length(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token xác minh email dùng một lần, chỉ lưu hash SHA-256';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `integration_inbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_inbox` (
  `inbox_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính bản ghi inbox',
  `event_id` char(36) NOT NULL COMMENT 'UUID sự kiện nhận được; UNIQUE để chống xử lý trùng',
  `source_schema` enum('bookuser','bookadmin','external') NOT NULL DEFAULT 'bookadmin' COMMENT 'Nguồn phát sự kiện',
  `source_event_type` varchar(100) NOT NULL COMMENT 'Loại sự kiện gốc (user.locked, review.hidden...)',
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
  CONSTRAINT `chk_integration_inbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inbox idempotent của bookuser: nhận sự kiện từ bookadmin, chống trùng theo event_id';
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
  `event_type` varchar(100) NOT NULL COMMENT 'Loại sự kiện (user.created, review.published...)',
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
  CONSTRAINT `chk_integration_outbox_max_attempts` CHECK (`max_attempts` >= 1)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transactional outbox của bookuser: phát sự kiện sang bookadmin theo mô hình ít nhất một lần';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `licenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `licenses` (
  `license_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính giấy phép',
  `code` varchar(50) NOT NULL COMMENT 'Mã giấy phép ổn định (CC-BY-4.0, ALL-RIGHTS-RESERVED...)',
  `name` varchar(200) NOT NULL COMMENT 'Tên giấy phép',
  `description` text DEFAULT NULL COMMENT 'Mô tả điều khoản chính',
  `license_type` enum('public_domain','creative_commons','all_rights_reserved','custom','open_access') NOT NULL DEFAULT 'custom' COMMENT 'Nhóm giấy phép',
  `url` varchar(512) DEFAULT NULL COMMENT 'URL văn bản giấy phép',
  `allows_commercial` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép sử dụng thương mại',
  `allows_derivatives` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tác phẩm phái sinh',
  `requires_attribution` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Bắt buộc ghi công',
  `allows_download` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tải xuống',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = còn sử dụng',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`license_id`),
  UNIQUE KEY `uq_licenses_code` (`code`),
  KEY `idx_licenses_type_active` (`license_type`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục giấy phép nội dung, tham chiếu bởi book_rights';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `preference_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tùy chọn thông báo',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng',
  `notification_type` enum('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','marketing') NOT NULL COMMENT 'Loại thông báo',
  `in_app_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Bật thông báo trong ứng dụng',
  `email_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Bật thông báo email',
  `push_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Bật thông báo đẩy',
  `digest_frequency` enum('instant','daily','weekly','never') NOT NULL DEFAULT 'instant' COMMENT 'Tần suất gửi gộp',
  `quiet_hours_start` time DEFAULT NULL COMMENT 'Bắt đầu giờ yên tĩnh (giờ địa phương)',
  `quiet_hours_end` time DEFAULT NULL COMMENT 'Kết thúc giờ yên tĩnh',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `uq_notification_preferences_user_type` (`user_id`,`notification_type`),
  KEY `idx_notification_preferences_type` (`notification_type`),
  CONSTRAINT `fk_notification_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_notification_preferences_quiet` CHECK (`quiet_hours_start` is null and `quiet_hours_end` is null or `quiet_hours_start` is not null and `quiet_hours_end` is not null and `quiet_hours_start` <> `quiet_hours_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tùy chọn kênh và tần suất nhận thông báo theo từng loại';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thông báo',
  `notification_uuid` char(36) NOT NULL COMMENT 'Mã công khai của thông báo',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người nhận thông báo',
  `type` enum('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','other') NOT NULL DEFAULT 'system' COMMENT 'Loại thông báo',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `body` text DEFAULT NULL COMMENT 'Nội dung ngắn',
  `action_url` varchar(512) DEFAULT NULL COMMENT 'Đường dẫn hành động trong ứng dụng',
  `related_resource_type` varchar(60) DEFAULT NULL COMMENT 'Loại tài nguyên liên quan',
  `related_resource_id` bigint(20) unsigned DEFAULT NULL COMMENT 'ID tài nguyên liên quan',
  `related_resource_uuid` char(36) DEFAULT NULL COMMENT 'UUID tài nguyên liên quan',
  `is_read` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc',
  `read_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm đọc (UTC)',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hết hạn hiển thị (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `uq_notifications_uuid` (`notification_uuid`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  KEY `idx_notifications_user_created` (`user_id`,`created_at`),
  KEY `idx_notifications_type` (`type`,`created_at`),
  KEY `idx_notifications_expires` (`expires_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_notifications_read` CHECK (`is_read` = 0 and `read_at` is null or `is_read` = 1 and `read_at` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo trong ứng dụng cho người dùng; có thể dọn theo expires_at';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `token_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính token đặt lại mật khẩu',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng yêu cầu đặt lại mật khẩu',
  `token_hash` binary(32) NOT NULL COMMENT 'SHA-256 của token; không lưu token gốc',
  `expires_at` datetime(3) NOT NULL COMMENT 'Hạn sử dụng token (UTC)',
  `consumed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm token được dùng (UTC)',
  `requested_ip` varbinary(16) DEFAULT NULL COMMENT 'IP yêu cầu',
  `requested_user_agent` varchar(512) DEFAULT NULL COMMENT 'User-Agent khi yêu cầu',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm phát token (UTC)',
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_password_reset_tokens_hash` (`token_hash`),
  KEY `idx_password_reset_tokens_user_exp` (`user_id`,`expires_at`),
  CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_password_reset_tokens_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_password_reset_tokens_hash` CHECK (octet_length(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token quên mật khẩu dùng một lần, chỉ lưu hash SHA-256';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `publishers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `publishers` (
  `publisher_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính nhà xuất bản',
  `name` varchar(200) NOT NULL COMMENT 'Tên nhà xuất bản, duy nhất',
  `slug` varchar(220) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` text DEFAULT NULL COMMENT 'Mô tả nhà xuất bản',
  `website_url` varchar(512) DEFAULT NULL COMMENT 'Trang web chính thức',
  `logo_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ logo',
  `country_code` char(2) DEFAULT NULL COMMENT 'Mã quốc gia ISO 3166-1 alpha-2',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Trạng thái hoạt động',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm',
  PRIMARY KEY (`publisher_id`),
  UNIQUE KEY `uq_publishers_name` (`name`),
  UNIQUE KEY `uq_publishers_slug` (`slug`),
  KEY `idx_publishers_status` (`status`),
  KEY `idx_publishers_country` (`country_code`),
  KEY `idx_publishers_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhà xuất bản của sách; quan hệ 1-N với books';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reading_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reading_history` (
  `history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính lịch sử đọc',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người đọc',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được đọc',
  `chapter_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Chương được đọc trong phiên',
  `session_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Phiên đăng nhập ghi nhận hoạt động',
  `device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Thiết bị đọc',
  `source` enum('web','mobile','api','import') NOT NULL DEFAULT 'web' COMMENT 'Nguồn ghi nhận',
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Bắt đầu phiên đọc (UTC)',
  `ended_at` datetime(3) DEFAULT NULL COMMENT 'Kết thúc phiên đọc (UTC)',
  `duration_seconds` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Thời lượng đọc (giây)',
  `pages_read` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số trang đã đọc trong phiên',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo bản ghi (UTC)',
  PRIMARY KEY (`history_id`),
  KEY `idx_reading_history_user_time` (`user_id`,`started_at`),
  KEY `idx_reading_history_book_time` (`book_id`,`started_at`),
  KEY `idx_reading_history_chapter` (`chapter_id`),
  KEY `idx_reading_history_session` (`session_id`),
  KEY `idx_reading_history_device` (`device_id`),
  CONSTRAINT `fk_reading_history_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
  CONSTRAINT `fk_reading_history_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters` (`chapter_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_history_device` FOREIGN KEY (`device_id`) REFERENCES `user_devices` (`device_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_history_session` FOREIGN KEY (`session_id`) REFERENCES `user_sessions` (`session_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_reading_history_window` CHECK (`ended_at` is null or `ended_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử phiên đọc phục vụ thống kê và gợi ý; có thể phân vùng theo tháng khi tăng trưởng';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reading_list_books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reading_list_books` (
  `list_id` bigint(20) unsigned NOT NULL COMMENT 'Danh sách đọc',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách trong danh sách',
  `position` int(11) NOT NULL DEFAULT 0 COMMENT 'Thứ tự sách trong danh sách',
  `note` varchar(1000) DEFAULT NULL COMMENT 'Ghi chú riêng cho sách trong danh sách',
  `added_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm thêm (UTC)',
  PRIMARY KEY (`list_id`,`book_id`),
  KEY `idx_reading_list_books_book` (`book_id`),
  KEY `idx_reading_list_books_position` (`list_id`,`position`),
  CONSTRAINT `fk_reading_list_books_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reading_list_books_list` FOREIGN KEY (`list_id`) REFERENCES `reading_lists` (`list_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng liên kết N-N reading_lists-books, có thứ tự hiển thị';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reading_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reading_lists` (
  `list_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính danh sách đọc',
  `list_uuid` char(36) NOT NULL COMMENT 'Mã công khai của danh sách',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng sở hữu danh sách',
  `name` varchar(150) NOT NULL COMMENT 'Tên danh sách',
  `description` varchar(1000) DEFAULT NULL COMMENT 'Mô tả danh sách',
  `visibility` enum('private','unlisted','public') NOT NULL DEFAULT 'private' COMMENT 'Phạm vi hiển thị',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = danh sách mặc định của người dùng',
  `item_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số sách trong danh sách (denormalized)',
  `active_name` varchar(150) GENERATED ALWAYS AS (if(`deleted_at` is null,`name`,NULL)) STORED COMMENT 'Khóa sinh tự động: tên danh sách duy nhất khi chưa xóa mềm',
  `default_user_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`is_default` = 1,`user_id`,NULL)) STORED COMMENT 'Khóa sinh tự động: mỗi người dùng chỉ có một danh sách mặc định',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm danh sách (UTC)',
  PRIMARY KEY (`list_id`),
  UNIQUE KEY `uq_reading_lists_uuid` (`list_uuid`),
  UNIQUE KEY `uq_reading_lists_active_name` (`user_id`,`active_name`),
  UNIQUE KEY `uq_reading_lists_default` (`default_user_id`),
  KEY `idx_reading_lists_user` (`user_id`,`created_at`),
  KEY `idx_reading_lists_visibility` (`visibility`,`deleted_at`),
  CONSTRAINT `fk_reading_lists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh sách đọc do người dùng tạo (private/unlisted/public)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reading_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reading_progress` (
  `progress_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tiến độ đọc',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người đọc',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách đang đọc',
  `chapter_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Chương hiện tại',
  `file_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Tệp đang đọc',
  `device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Thiết bị ghi nhận tiến độ gần nhất',
  `position` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Vị trí đọc chính xác (CFI, scroll offset, page anchor)' CHECK (json_valid(`position`)),
  `percent_complete` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Phần trăm hoàn thành 0.00-100.00',
  `page_number` int(10) unsigned DEFAULT NULL COMMENT 'Trang hiện tại',
  `total_pages` int(10) unsigned DEFAULT NULL COMMENT 'Tổng số trang của tệp',
  `is_completed` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đã đọc xong',
  `completed_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm đọc xong (UTC)',
  `last_read_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Lần đọc gần nhất (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `uq_reading_progress_user_book` (`user_id`,`book_id`),
  KEY `idx_reading_progress_book` (`book_id`),
  KEY `idx_reading_progress_chapter` (`chapter_id`),
  KEY `idx_reading_progress_file` (`file_id`),
  KEY `idx_reading_progress_device` (`device_id`),
  KEY `idx_reading_progress_recent` (`user_id`,`last_read_at`),
  CONSTRAINT `fk_reading_progress_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reading_progress_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters` (`chapter_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_progress_device` FOREIGN KEY (`device_id`) REFERENCES `user_devices` (`device_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_progress_file` FOREIGN KEY (`file_id`) REFERENCES `book_files` (`file_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reading_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reading_progress_percent` CHECK (`percent_complete` >= 0 and `percent_complete` <= 100),
  CONSTRAINT `chk_reading_progress_pages` CHECK (`total_pages` is null or `page_number` is null or `page_number` <= `total_pages`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tiến độ đọc đồng bộ đa thiết bị; một bản ghi cho mỗi cặp (user, book)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính đánh giá',
  `review_uuid` char(36) NOT NULL COMMENT 'Mã công khai của đánh giá',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người đánh giá',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách được đánh giá',
  `rating` decimal(2,1) NOT NULL COMMENT 'Điểm đánh giá 0.5-5.0 (DECIMAL, không dùng FLOAT)',
  `title` varchar(255) DEFAULT NULL COMMENT 'Tiêu đề đánh giá',
  `body` text DEFAULT NULL COMMENT 'Nội dung đánh giá',
  `contains_spoilers` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = có tiết lộ nội dung',
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = đã xác thực quyền đọc sách',
  `status` enum('pending','published','hidden','rejected','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái kiểm duyệt',
  `helpful_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lượt hữu ích (denormalized)',
  `report_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số báo cáo vi phạm (denormalized)',
  `moderated_by_admin_uuid` char(36) DEFAULT NULL COMMENT 'Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid',
  `moderated_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm kiểm duyệt (UTC)',
  `published_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm công khai (UTC)',
  `active_book_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`status` <> 'deleted' and `deleted_at` is null,`book_id`,NULL)) STORED COMMENT 'Khóa sinh tự động: một đánh giá còn hiệu lực cho mỗi cặp (user, book)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm đánh giá (UTC)',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_reviews_uuid` (`review_uuid`),
  UNIQUE KEY `uq_reviews_active_book` (`user_id`,`active_book_id`),
  KEY `idx_reviews_book_status` (`book_id`,`status`,`rating`),
  KEY `idx_reviews_book_created` (`book_id`,`created_at`),
  KEY `idx_reviews_user` (`user_id`,`created_at`),
  KEY `idx_reviews_status` (`status`,`created_at`),
  KEY `idx_reviews_moderated_by` (`moderated_by_admin_uuid`),
  CONSTRAINT `fk_reviews_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` >= 0.5 and `rating` <= 5.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đánh giá sách; ràng buộc một đánh giá hiệu lực/người dùng/sách bằng khóa sinh';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `tag_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thẻ',
  `name` varchar(80) NOT NULL COMMENT 'Tên thẻ duy nhất',
  `slug` varchar(100) NOT NULL COMMENT 'Slug URL duy nhất',
  `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả thẻ',
  `usage_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Số sách đang gắn thẻ (denormalized có kiểm soát)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uq_tags_name` (`name`),
  UNIQUE KEY `uq_tags_slug` (`slug`),
  KEY `idx_tags_usage` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thẻ mô tả sách; quan hệ N-N với books qua book_tags';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_devices` (
  `device_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính thiết bị',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Chủ sở hữu thiết bị',
  `device_uuid` char(36) NOT NULL COMMENT 'Mã thiết bị công khai do ứng dụng sinh',
  `fingerprint_hash` varbinary(32) NOT NULL COMMENT 'SHA-256 dấu vân tay thiết bị; không lưu dấu vân tay gốc',
  `device_name` varchar(100) DEFAULT NULL COMMENT 'Tên thân thiện do người dùng đặt',
  `platform` enum('web','ios','android','desktop','other') NOT NULL DEFAULT 'web' COMMENT 'Nền tảng',
  `browser` varchar(80) DEFAULT NULL COMMENT 'Trình duyệt',
  `os_name` varchar(80) DEFAULT NULL COMMENT 'Hệ điều hành',
  `push_token` varchar(255) DEFAULT NULL COMMENT 'Token nhận thông báo đẩy (nếu có)',
  `is_trusted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = thiết bị tin cậy',
  `last_seen_at` datetime(3) DEFAULT NULL COMMENT 'Lần hoạt động gần nhất (UTC)',
  `revoked_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm thu hồi thiết bị (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uq_user_devices_uuid` (`device_uuid`),
  UNIQUE KEY `uq_user_devices_fingerprint` (`user_id`,`fingerprint_hash`),
  KEY `idx_user_devices_user_platform` (`user_id`,`platform`),
  KEY `idx_user_devices_last_seen` (`last_seen_at`),
  KEY `idx_user_devices_revoked` (`revoked_at`),
  CONSTRAINT `fk_user_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_devices_fingerprint` CHECK (octet_length(`fingerprint_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thiết bị người dùng dùng để quản lý phiên và thông báo đẩy';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `follower_user_id` bigint(20) unsigned NOT NULL COMMENT 'Người theo dõi',
  `followed_user_id` bigint(20) unsigned NOT NULL COMMENT 'Người được theo dõi',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm theo dõi (UTC)',
  PRIMARY KEY (`follower_user_id`,`followed_user_id`),
  KEY `idx_user_follows_followed` (`followed_user_id`,`created_at`),
  CONSTRAINT `fk_user_follows_followed` FOREIGN KEY (`followed_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_follows_follower` FOREIGN KEY (`follower_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_follows_self` CHECK (`follower_user_id` <> `followed_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quan hệ theo dõi N-N giữa người dùng, chặn tự theo dõi';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_library` (
  `library_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính mục thư viện',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng sở hữu mục thư viện',
  `book_id` bigint(20) unsigned NOT NULL COMMENT 'Sách trong thư viện',
  `status` enum('want_to_read','reading','finished','paused','dropped') NOT NULL DEFAULT 'want_to_read' COMMENT 'Trạng thái đọc',
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = sách yêu thích',
  `added_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm thêm vào thư viện (UTC)',
  `last_opened_at` datetime(3) DEFAULT NULL COMMENT 'Lần mở gần nhất (UTC)',
  `finished_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm hoàn thành (UTC)',
  `removed_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm khỏi thư viện (UTC)',
  `active_book_id` bigint(20) unsigned GENERATED ALWAYS AS (if(`removed_at` is null,`book_id`,NULL)) STORED COMMENT 'Khóa sinh tự động: một bản ghi hoạt động cho mỗi cặp (user, book)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`library_id`),
  UNIQUE KEY `uq_user_library_active_book` (`user_id`,`active_book_id`),
  KEY `idx_user_library_book` (`book_id`),
  KEY `idx_user_library_user_status` (`user_id`,`status`,`last_opened_at`),
  KEY `idx_user_library_favorite` (`user_id`,`is_favorite`),
  CONSTRAINT `fk_user_library_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_library_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_library_finished` CHECK (`finished_at` is null or `finished_at` >= `added_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thư viện cá nhân; chống trùng bằng khóa sinh active_book_id khi chưa xóa mềm';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính hồ sơ',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Chủ sở hữu hồ sơ (1-1 với users)',
  `display_name` varchar(100) NOT NULL DEFAULT '' COMMENT 'Tên hiển thị công khai',
  `bio` text DEFAULT NULL COMMENT 'Giới thiệu bản thân',
  `avatar_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh đại diện (không lưu file nhị phân)',
  `cover_storage_key` varchar(512) DEFAULT NULL COMMENT 'Khóa lưu trữ ảnh bìa trang cá nhân',
  `date_of_birth` date DEFAULT NULL COMMENT 'Ngày sinh; dùng kiểm soát nội dung theo độ tuổi',
  `gender` enum('unspecified','male','female','other') NOT NULL DEFAULT 'unspecified' COMMENT 'Giới tính tự khai',
  `country_code` char(2) DEFAULT NULL COMMENT 'Mã quốc gia ISO 3166-1 alpha-2',
  `locale` varchar(10) NOT NULL DEFAULT 'vi-VN' COMMENT 'Ngôn ngữ/khu vực hiển thị',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'Múi giờ hiển thị; dữ liệu lưu UTC',
  `website_url` varchar(512) DEFAULT NULL COMMENT 'Trang web cá nhân',
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Liên kết mạng xã hội có cấu trúc' CHECK (json_valid(`social_links`)),
  `is_public` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = hồ sơ công khai',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm hồ sơ',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_user_profiles_user` (`user_id`),
  KEY `idx_user_profiles_public` (`is_public`,`created_at`),
  KEY `idx_user_profiles_country` (`country_code`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_profiles_dob` CHECK (`date_of_birth` is null or `date_of_birth` >= '1900-01-01')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ công khai của người đọc, quan hệ 1-1 với users';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_reports` (
  `report_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính báo cáo của người dùng',
  `report_uuid` char(36) NOT NULL COMMENT 'Mã công khai; đồng bộ sang bookadmin.content_reports.report_uuid',
  `reporter_user_id` bigint(20) unsigned NOT NULL COMMENT 'Người gửi báo cáo',
  `target_type` enum('book','review','comment','user','author','other') NOT NULL COMMENT 'Loại đối tượng bị báo cáo',
  `target_id` bigint(20) unsigned NOT NULL COMMENT 'ID đối tượng bị báo cáo',
  `target_uuid` char(36) DEFAULT NULL COMMENT 'UUID đối tượng bị báo cáo',
  `reason_code` varchar(50) NOT NULL COMMENT 'Mã lý do, đồng bộ bookadmin.report_reasons.code',
  `description` text DEFAULT NULL COMMENT 'Mô tả chi tiết',
  `status` enum('new','triaged','in_review','resolved','rejected','duplicate') NOT NULL DEFAULT 'new' COMMENT 'Trạng thái xử lý đồng bộ với admin',
  `resolution_note` varchar(1000) DEFAULT NULL COMMENT 'Phản hồi tóm tắt cho người báo cáo',
  `resolved_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm giải quyết (UTC)',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm gửi (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_user_reports_uuid` (`report_uuid`),
  KEY `idx_user_reports_reporter_time` (`reporter_user_id`,`created_at`),
  KEY `idx_user_reports_status` (`status`,`created_at`),
  KEY `idx_user_reports_target` (`target_type`,`target_id`),
  KEY `idx_user_reports_reason` (`reason_code`),
  CONSTRAINT `fk_user_reports_reporter` FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_user_reports_target` CHECK (`target_id` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Báo cáo vi phạm từ người dùng; admin nhận bản sao idempotent qua outbox/inbox';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `session_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phiên đăng nhập',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng của phiên',
  `device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Thiết bị phát sinh phiên (nếu nhận diện được)',
  `session_token_hash` binary(32) NOT NULL COMMENT 'SHA-256 của session token; không lưu token gốc',
  `ip_address` varbinary(16) DEFAULT NULL COMMENT 'IP nhị phân của phiên',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'Chuỗi User-Agent',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo phiên (UTC)',
  `last_seen_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Lần hoạt động gần nhất (UTC)',
  `expires_at` datetime(3) NOT NULL COMMENT 'Thời điểm hết hạn tuyệt đối (UTC)',
  `revoked_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm thu hồi phiên (UTC)',
  `revoked_reason` varchar(100) DEFAULT NULL COMMENT 'Lý do thu hồi (logout, rotated, admin_revoke...)',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_user_sessions_token` (`session_token_hash`),
  KEY `idx_user_sessions_user_created` (`user_id`,`created_at`),
  KEY `idx_user_sessions_user_expires` (`user_id`,`expires_at`),
  KEY `idx_user_sessions_device` (`device_id`),
  KEY `idx_user_sessions_expires` (`expires_at`),
  KEY `idx_user_sessions_revoked` (`revoked_at`),
  KEY `idx_user_sessions_active` (`user_id`,`revoked_at`,`expires_at`),
  CONSTRAINT `fk_user_sessions_device` FOREIGN KEY (`device_id`) REFERENCES `user_devices` (`device_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_sessions_expiry` CHECK (`expires_at` > `created_at`),
  CONSTRAINT `chk_user_sessions_token` CHECK (octet_length(`session_token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiên đăng nhập của người đọc; token chỉ lưu dạng hash';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính cấu hình',
  `user_id` bigint(20) unsigned NOT NULL COMMENT 'Người dùng sở hữu cấu hình (1-1)',
  `theme` enum('system','light','dark','sepia') NOT NULL DEFAULT 'system' COMMENT 'Giao diện tổng thể',
  `reader_theme` varchar(30) NOT NULL DEFAULT 'sepia' COMMENT 'Tông màu trình đọc',
  `font_size` tinyint(3) unsigned NOT NULL DEFAULT 16 COMMENT 'Cỡ chữ trình đọc (px)',
  `line_height` decimal(3,2) NOT NULL DEFAULT 1.60 COMMENT 'Giãn dòng trình đọc',
  `language` varchar(10) NOT NULL DEFAULT 'vi' COMMENT 'Mã ngôn ngữ ưa thích',
  `email_notifications` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Nhận thông báo qua email',
  `push_notifications` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Nhận thông báo đẩy',
  `marketing_emails` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Đồng ý nhận email tiếp thị',
  `profile_visibility` enum('public','followers','private') NOT NULL DEFAULT 'public' COMMENT 'Mức hiển thị hồ sơ',
  `allow_downloads` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Cho phép tải sách có quyền tải',
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Tùy chọn mở rộng có cấu trúc' CHECK (json_valid(`preferences`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_user_settings_user` (`user_id`),
  KEY `idx_user_settings_language` (`language`),
  CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_settings_font_size` CHECK (`font_size` between 10 and 48),
  CONSTRAINT `chk_user_settings_line_height` CHECK (`line_height` between 1.00 and 3.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cấu hình cá nhân hóa trải nghiệm đọc, quan hệ 1-1 với users';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính kỹ thuật của tài khoản',
  `user_uuid` char(36) NOT NULL COMMENT 'Mã định danh công khai (UUID v4), external ID dùng khi trao đổi với bookadmin',
  `username` varchar(50) NOT NULL COMMENT 'Tên đăng nhập duy nhất, không phân biệt hoa thường',
  `email` varchar(254) NOT NULL COMMENT 'Email đăng nhập duy nhất, lưu dạng chữ thường',
  `password_hash` varchar(255) NOT NULL COMMENT 'Hash mật khẩu Argon2id; không bao giờ lưu mật khẩu gốc',
  `password_algorithm` varchar(30) NOT NULL DEFAULT 'argon2id' COMMENT 'Thuật toán hash, hỗ trợ nâng cấp dần',
  `status` enum('pending','active','suspended','disabled','deleted') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái vòng đời tài khoản',
  `email_verified_at` datetime(3) DEFAULT NULL COMMENT 'Thời điểm xác minh email (UTC)',
  `failed_login_count` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Số lần đăng nhập sai liên tiếp',
  `locked_until` datetime(3) DEFAULT NULL COMMENT 'Khóa đăng nhập tạm thời đến mốc này (UTC)',
  `last_login_at` datetime(3) DEFAULT NULL COMMENT 'Lần đăng nhập thành công gần nhất (UTC)',
  `last_login_ip` varbinary(16) DEFAULT NULL COMMENT 'IPv4/IPv6 nhị phân (INET6_ATON); hiển thị bằng INET6_NTOA',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Thời điểm tạo (UTC)',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3) COMMENT 'Thời điểm cập nhật (UTC)',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT 'Xóa mềm; NULL nghĩa là chưa xóa',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_user_uuid` (`user_uuid`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_status_created` (`status`,`created_at`),
  KEY `idx_users_email_verified` (`email_verified_at`),
  KEY `idx_users_deleted` (`deleted_at`),
  CONSTRAINT `chk_users_username_length` CHECK (char_length(`username`) >= 3),
  CONSTRAINT `chk_users_email_length` CHECK (char_length(`email`) >= 5)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản người đọc; mật khẩu chỉ lưu hash, xóa mềm bằng status/deleted_at';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_public_announcements`;
/*!50001 DROP VIEW IF EXISTS `v_public_announcements`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_public_announcements` AS SELECT
 1 AS `announcement_uuid`,
  1 AS `title`,
  1 AS `body`,
  1 AS `severity`,
  1 AS `publish_at`,
  1 AS `expires_at`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

USE `bookuser`;
/*!50001 DROP VIEW IF EXISTS `v_public_announcements`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `v_public_announcements` AS select `a`.`announcement_uuid` AS `announcement_uuid`,`a`.`title` AS `title`,`a`.`body` AS `body`,`a`.`severity` AS `severity`,`a`.`publish_at` AS `publish_at`,`a`.`expires_at` AS `expires_at`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `bookadmin`.`admin_announcements` `a` where `a`.`status` = 'published' and `a`.`audience` in ('all','users') and (`a`.`publish_at` is null or `a`.`publish_at` <= current_timestamp(3)) and (`a`.`expires_at` is null or `a`.`expires_at` > current_timestamp(3)) */;
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

