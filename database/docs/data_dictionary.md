# Từ điển dữ liệu BOOKFORFREEDOM (bookuser & bookadmin)

> Tài liệu sinh tự động từ MariaDB 10.11.14 (information_schema).
> Thời điểm sinh: 2026-11-20 18:24:14 (giờ máy chủ).
> Không sửa trực tiếp: chạy lại `python3 database/scripts/generate_data_dictionary.py`.

## Tổng quan

- `bookuser`: 35 bảng, 439 cột.
- `bookadmin`: 28 bảng, 363 cột.
- Tổng cộng: 63 bảng, 802 cột bảng vật lý (+36 cột view), 88 cột khóa ngoại.

Quy ước kiểu dữ liệu: xem [data_types.md](data_types.md). Quan hệ khóa ngoại: xem [relationships.md](relationships.md).

## Schema `bookuser`

### `authors`

**Mô tả:** Tác giả; quan hệ N-N với books qua book_authors

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `author_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính tác giả |
| 2 | `author_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của tác giả (UUID) |
| 3 | `name` | `varchar(200)` | NO | — | MUL | — | Tên tác giả |
| 4 | `slug` | `varchar(220)` | NO | — | UNI | — | Slug URL duy nhất |
| 5 | `bio` | `text` | YES | `NULL` | — | — | Tiểu sử tác giả |
| 6 | `photo_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ ảnh tác giả |
| 7 | `birth_date` | `date` | YES | `NULL` | — | — | Ngày sinh |
| 8 | `death_date` | `date` | YES | `NULL` | — | — | Ngày mất (nếu có) |
| 9 | `country_code` | `char(2)` | YES | `NULL` | — | — | Quốc tịch (ISO alpha-2) |
| 10 | `website_url` | `varchar(512)` | YES | `NULL` | — | — | Trang web tác giả |
| 11 | `status` | `enum('active','inactive')` | NO | `'active'` | MUL | — | Trạng thái hồ sơ tác giả |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 14 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm |

### `bookmarks`

**Mô tả:** Dấu trang và ghi chú đọc của người dùng

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `bookmark_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính dấu trang |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng tạo dấu trang |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được đánh dấu |
| 4 | `chapter_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Chương chứa vị trí đánh dấu |
| 5 | `page_number` | `int(10) unsigned` | YES | `NULL` | — | — | Số trang tại vị trí đánh dấu |
| 6 | `position` | `longtext` | YES | `NULL` | — | — | Vị trí chính xác trong tệp (CFI/offset) |
| 7 | `label` | `varchar(255)` | YES | `NULL` | — | — | Nhãn ngắn của dấu trang |
| 8 | `note` | `varchar(2000)` | YES | `NULL` | — | — | Ghi chú của người đọc |
| 9 | `color` | `varchar(20)` | YES | `NULL` | — | — | Màu hiển thị (token UI) |
| 10 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 11 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_bookmarks_book`: `book_id` → `books`(`book_id`)
- `fk_bookmarks_chapter`: `chapter_id` → `book_chapters`(`chapter_id`)
- `fk_bookmarks_user`: `user_id` → `users`(`user_id`)

### `books`

**Mô tả:** Thông tin sách; file PDF/EPUB chỉ lưu metadata trong book_files

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `book_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính sách |
| 2 | `book_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai (UUID), external ID trao đổi với bookadmin |
| 3 | `title` | `varchar(500)` | NO | — | MUL | — | Tiêu đề sách |
| 4 | `subtitle` | `varchar(500)` | YES | `NULL` | — | — | Phụ đề |
| 5 | `slug` | `varchar(550)` | NO | — | UNI | — | Slug URL duy nhất |
| 6 | `description` | `longtext` | YES | `NULL` | — | — | Mô tả đầy đủ (HTML/markdown đã làm sạch) |
| 7 | `excerpt` | `text` | YES | `NULL` | — | — | Đoạn trích ngắn |
| 8 | `isbn_13` | `char(13)` | YES | `NULL` | UNI | — | ISBN-13, duy nhất khi có |
| 9 | `isbn_10` | `char(10)` | YES | `NULL` | UNI | — | ISBN-10, duy nhất khi có |
| 10 | `language` | `varchar(10)` | NO | `'vi'` | MUL | — | Mã ngôn ngữ nội dung |
| 11 | `publisher_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Nhà xuất bản |
| 12 | `publication_date` | `date` | YES | `NULL` | — | — | Ngày xuất bản |
| 13 | `edition` | `varchar(50)` | YES | `NULL` | — | — | Thông tin ấn bản |
| 14 | `page_count` | `int(10) unsigned` | YES | `NULL` | — | — | Số trang |
| 15 | `word_count` | `int(10) unsigned` | YES | `NULL` | — | — | Số từ |
| 16 | `cover_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ ảnh bìa |
| 17 | `cover_mime_type` | `varchar(100)` | YES | `NULL` | — | — | MIME type ảnh bìa |
| 18 | `status` | `enum('draft','submitted','under_review','approved','published','rejected','archived')` | NO | `'draft'` | MUL | — | Trạng thái xuất bản/kiểm duyệt |
| 19 | `visibility` | `enum('public','restricted','private')` | NO | `'public'` | MUL | — | Mức hiển thị |
| 20 | `is_featured` | `tinyint(1)` | NO | `0` | MUL | — | Sách nổi bật |
| 21 | `average_rating` | `decimal(3,2)` | NO | `0.00` | — | — | Điểm đánh giá trung bình (0-5), cập nhật bằng job tổng hợp |
| 22 | `rating_count` | `int(10) unsigned` | NO | `0` | — | — | Số lượt chấm điểm |
| 23 | `review_count` | `int(10) unsigned` | NO | `0` | — | — | Số đánh giá đang hoạt động |
| 24 | `download_count` | `int(10) unsigned` | NO | `0` | — | — | Số lượt tải thành công |
| 25 | `view_count` | `bigint(20) unsigned` | NO | `0` | — | — | Số lượt xem |
| 26 | `published_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm xuất bản (UTC) |
| 27 | `created_by_user_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Người dùng tạo/gửi sách |
| 28 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 29 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 30 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm; hạn chế xóa cứng sách đã có lịch sử |

**Khóa ngoại:**

- `fk_books_created_by`: `created_by_user_id` → `users`(`user_id`)
- `fk_books_publisher`: `publisher_id` → `publishers`(`publisher_id`)

### `book_authors`

**Mô tả:** Bảng liên kết N-N books-authors, có thứ tự và vai trò tác giả

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `book_id` | `bigint(20) unsigned` | NO | — | PRI | — | Sách |
| 2 | `author_id` | `bigint(20) unsigned` | NO | — | PRI | — | Tác giả |
| 3 | `author_order` | `smallint(5) unsigned` | NO | `1` | — | — | Thứ tự hiển thị tác giả trên sách |
| 4 | `role` | `enum('author','co_author','editor','translator','illustrator','contributor')` | NO | `'author'` | — | — | Vai trò của tác giả với sách |
| 5 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo liên kết (UTC) |

**Khóa ngoại:**

- `fk_book_authors_author`: `author_id` → `authors`(`author_id`)
- `fk_book_authors_book`: `book_id` → `books`(`book_id`)

### `book_categories`

**Mô tả:** Bảng liên kết N-N books-categories, tối đa một danh mục chính/sách

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `book_id` | `bigint(20) unsigned` | NO | — | PRI | — | Sách |
| 2 | `category_id` | `bigint(20) unsigned` | NO | — | PRI | — | Danh mục |
| 3 | `is_primary` | `tinyint(1)` | NO | `0` | MUL | — | 1 = danh mục chính của sách |
| 4 | `primary_book_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | STORED GENERATED | Khóa sinh tự động bảo đảm mỗi sách chỉ có một danh mục chính |
| 5 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo liên kết (UTC) |

**Khóa ngoại:**

- `fk_book_categories_book`: `book_id` → `books`(`book_id`)
- `fk_book_categories_category`: `category_id` → `categories`(`category_id`)

### `book_chapters`

**Mô tả:** Nội dung chương của sách, hỗ trợ mục lục phân cấp

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `chapter_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính chương |
| 2 | `chapter_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của chương |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách chứa chương |
| 4 | `parent_chapter_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Chương cha (mục lục nhiều cấp) |
| 5 | `chapter_number` | `smallint(5) unsigned` | NO | — | — | — | Số thứ tự chương trong sách |
| 6 | `title` | `varchar(300)` | NO | — | — | — | Tiêu đề chương |
| 7 | `content` | `longtext` | YES | `NULL` | — | — | Nội dung văn bản của chương (HTML/markdown đã làm sạch) |
| 8 | `word_count` | `int(10) unsigned` | NO | `0` | — | — | Số từ |
| 9 | `page_start` | `int(10) unsigned` | YES | `NULL` | — | — | Trang bắt đầu trong bản in/PDF |
| 10 | `page_end` | `int(10) unsigned` | YES | `NULL` | — | — | Trang kết thúc |
| 11 | `sort_order` | `int(11)` | NO | `0` | — | — | Thứ tự sắp xếp trong mục lục |
| 12 | `status` | `enum('draft','published')` | NO | `'draft'` | — | — | Trạng thái xuất bản chương |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 14 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_book_chapters_book`: `book_id` → `books`(`book_id`)
- `fk_book_chapters_parent`: `parent_chapter_id` → `book_chapters`(`chapter_id`)

### `book_files`

**Mô tả:** Metadata tệp PDF/EPUB/MOBI trên object storage; không lưu file lớn trong DB

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `file_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính tệp sách |
| 2 | `file_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của tệp |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách sở hữu tệp |
| 4 | `format` | `enum('pdf','epub','mobi','docx','audio','other')` | NO | `'pdf'` | — | — | Định dạng tệp |
| 5 | `storage_provider` | `enum('local','minio','s3','external')` | NO | `'minio'` | MUL | — | Nhà cung cấp lưu trữ đối tượng |
| 6 | `storage_bucket` | `varchar(100)` | YES | `NULL` | — | — | Bucket/container |
| 7 | `storage_key` | `varchar(512)` | NO | — | — | — | Khóa đối tượng; KHÔNG lưu nội dung tệp trong DB |
| 8 | `file_name` | `varchar(255)` | YES | `NULL` | — | — | Tên tệp gốc |
| 9 | `mime_type` | `varchar(150)` | YES | `NULL` | — | — | MIME type |
| 10 | `file_size_bytes` | `bigint(20) unsigned` | NO | — | — | — | Kích thước tệp (byte) |
| 11 | `checksum_sha256` | `binary(32)` | NO | — | MUL | — | SHA-256 để kiểm tra toàn vẹn và chống trùng tệp |
| 12 | `page_count` | `int(10) unsigned` | YES | `NULL` | — | — | Số trang (PDF) hoặc số trang ước tính |
| 13 | `is_primary` | `tinyint(1)` | NO | `0` | — | — | 1 = tệp chính của sách |
| 14 | `primary_book_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | STORED GENERATED | Khóa sinh tự động bảo đảm mỗi sách chỉ có một tệp chính |
| 15 | `access_level` | `enum('public','licensed','restricted')` | NO | `'licensed'` | — | — | Mức truy cập tệp |
| 16 | `uploaded_by_user_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Người tải tệp lên |
| 17 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 18 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 19 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm metadata; dọn object lưu trữ do worker đảm nhiệm |

**Khóa ngoại:**

- `fk_book_files_book`: `book_id` → `books`(`book_id`)
- `fk_book_files_uploaded_by`: `uploaded_by_user_id` → `users`(`user_id`)

### `book_rights`

**Mô tả:** Quyền xuất bản/phân phối theo giấy phép và lãnh thổ; verified_by_admin_uuid là tham chiếu logic

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `rights_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bản ghi quyền |
| 2 | `rights_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của bản ghi quyền |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được cấp quyền |
| 4 | `license_id` | `bigint(20) unsigned` | NO | — | MUL | — | Giấy phép áp dụng |
| 5 | `rights_holder` | `varchar(255)` | NO | — | — | — | Chủ thể nắm quyền |
| 6 | `territory_code` | `varchar(10)` | NO | `'WORLD'` | — | — | Lãnh thổ áp dụng (WORLD hoặc mã quốc gia) |
| 7 | `is_exclusive` | `tinyint(1)` | NO | `0` | — | — | 1 = độc quyền |
| 8 | `starts_at` | `datetime(3)` | NO | — | — | — | Bắt đầu hiệu lực (UTC) |
| 9 | `ends_at` | `datetime(3)` | YES | `NULL` | — | — | Kết thúc hiệu lực; NULL = không giới hạn |
| 10 | `allows_download` | `tinyint(1)` | NO | `0` | — | — | Cho phép tải xuống |
| 11 | `allows_print` | `tinyint(1)` | NO | `0` | — | — | Cho phép in |
| 12 | `allows_offline` | `tinyint(1)` | NO | `0` | — | — | Cho phép đọc offline |
| 13 | `proof_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ tài liệu chứng minh quyền |
| 14 | `status` | `enum('pending','verified','rejected','expired')` | NO | `'pending'` | MUL | — | Trạng thái xác minh quyền |
| 15 | `verified_by_admin_uuid` | `char(36)` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid |
| 16 | `verified_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm xác minh (UTC) |
| 17 | `notes` | `text` | YES | `NULL` | — | — | Ghi chú về phạm vi quyền |
| 18 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 19 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_book_rights_book`: `book_id` → `books`(`book_id`)
- `fk_book_rights_license`: `license_id` → `licenses`(`license_id`)

### `book_tags`

**Mô tả:** Bảng liên kết N-N books-tags

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `book_id` | `bigint(20) unsigned` | NO | — | PRI | — | Sách |
| 2 | `tag_id` | `bigint(20) unsigned` | NO | — | PRI | — | Thẻ |
| 3 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo liên kết (UTC) |

**Khóa ngoại:**

- `fk_book_tags_book`: `book_id` → `books`(`book_id`)
- `fk_book_tags_tag`: `tag_id` → `tags`(`tag_id`)

### `categories`

**Mô tả:** Danh mục sách phân cấp; quan hệ N-N với books qua book_categories

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `category_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính danh mục |
| 2 | `parent_category_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Danh mục cha (hỗ trợ cây phân cấp) |
| 3 | `name` | `varchar(150)` | NO | — | — | — | Tên danh mục |
| 4 | `slug` | `varchar(170)` | NO | — | UNI | — | Slug URL duy nhất |
| 5 | `description` | `text` | YES | `NULL` | — | — | Mô tả danh mục |
| 6 | `sort_order` | `int(11)` | NO | `0` | — | — | Thứ tự hiển thị |
| 7 | `is_active` | `tinyint(1)` | NO | `1` | MUL | — | 1 = đang hoạt động |
| 8 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 9 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_categories_parent`: `parent_category_id` → `categories`(`category_id`)

### `comments`

**Mô tả:** Bình luận và phản hồi theo sách/đánh giá; giới hạn độ sâu phân cấp

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `comment_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bình luận |
| 2 | `comment_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của bình luận |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được bình luận |
| 4 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người bình luận |
| 5 | `parent_comment_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Bình luận cha (phản hồi) |
| 6 | `review_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Đánh giá được bình luận (nếu có) |
| 7 | `body` | `text` | NO | — | — | — | Nội dung bình luận |
| 8 | `status` | `enum('pending','published','hidden','rejected','deleted')` | NO | `'pending'` | — | — | Trạng thái kiểm duyệt |
| 9 | `thread_depth` | `tinyint(3) unsigned` | NO | `0` | — | — | Độ sâu phân cấp (0 = gốc) |
| 10 | `reply_count` | `int(10) unsigned` | NO | `0` | — | — | Số phản hồi (denormalized) |
| 11 | `like_count` | `int(10) unsigned` | NO | `0` | — | — | Số lượt thích (denormalized) |
| 12 | `moderated_by_admin_uuid` | `char(36)` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid |
| 13 | `moderated_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm kiểm duyệt (UTC) |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 15 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 16 | `deleted_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm bình luận (UTC) |

**Khóa ngoại:**

- `fk_comments_book`: `book_id` → `books`(`book_id`)
- `fk_comments_parent`: `parent_comment_id` → `comments`(`comment_id`)
- `fk_comments_review`: `review_id` → `reviews`(`review_id`)
- `fk_comments_user`: `user_id` → `users`(`user_id`)

### `comment_reactions`

**Mô tả:** Tương tác của người dùng với bình luận, tối đa một tương tác/người/bình luận

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `reaction_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lượt tương tác |
| 2 | `comment_id` | `bigint(20) unsigned` | NO | — | MUL | — | Bình luận được tương tác |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người tương tác |
| 4 | `reaction_type` | `enum('like','dislike','helpful','funny')` | NO | `'like'` | MUL | — | Loại tương tác |
| 5 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 6 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_comment_reactions_comment`: `comment_id` → `comments`(`comment_id`)
- `fk_comment_reactions_user`: `user_id` → `users`(`user_id`)

### `downloads`

**Mô tả:** Nhật ký tải tệp sách, phục vụ hạn mức và kiểm toán bản quyền

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `download_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lượt tải |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người tải |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được tải |
| 4 | `file_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tệp cụ thể được tải |
| 5 | `device_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Thiết bị tải |
| 6 | `format` | `enum('pdf','epub','mobi','audio','other')` | NO | `'pdf'` | — | — | Định dạng tại thời điểm tải |
| 7 | `status` | `enum('started','completed','failed','expired')` | NO | `'started'` | MUL | — | Trạng thái lượt tải |
| 8 | `bytes_sent` | `bigint(20) unsigned` | NO | `0` | — | — | Số byte đã truyền |
| 9 | `ip_address` | `varbinary(16)` | YES | `NULL` | — | — | IP nhị phân của người tải |
| 10 | `license_accepted_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm chấp nhận điều khoản giấy phép (UTC) |
| 11 | `started_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Bắt đầu tải (UTC) |
| 12 | `completed_at` | `datetime(3)` | YES | `NULL` | — | — | Hoàn tất tải (UTC) |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo bản ghi (UTC) |

**Khóa ngoại:**

- `fk_downloads_book`: `book_id` → `books`(`book_id`)
- `fk_downloads_device`: `device_id` → `user_devices`(`device_id`)
- `fk_downloads_file`: `file_id` → `book_files`(`file_id`)
- `fk_downloads_user`: `user_id` → `users`(`user_id`)

### `email_verification_tokens`

**Mô tả:** Token xác minh email dùng một lần, chỉ lưu hash SHA-256

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `token_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính token xác minh email |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng yêu cầu xác minh |
| 3 | `email` | `varchar(254)` | NO | — | MUL | — | Email đang được xác minh tại thời điểm phát token |
| 4 | `token_hash` | `binary(32)` | NO | — | UNI | — | SHA-256 của token gửi qua email; DB không lưu token gốc |
| 5 | `expires_at` | `datetime(3)` | NO | — | — | — | Hạn sử dụng token (UTC) |
| 6 | `consumed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm token được dùng (UTC) |
| 7 | `requested_ip` | `varbinary(16)` | YES | `NULL` | — | — | IP yêu cầu phát token |
| 8 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm phát token (UTC) |

**Khóa ngoại:**

- `fk_email_verification_tokens_user`: `user_id` → `users`(`user_id`)

### `integration_inbox`

**Mô tả:** Inbox idempotent của bookuser: nhận sự kiện từ bookadmin, chống trùng theo event_id

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `inbox_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bản ghi inbox |
| 2 | `event_id` | `char(36)` | NO | — | UNI | — | UUID sự kiện nhận được; UNIQUE để chống xử lý trùng |
| 3 | `source_schema` | `enum('bookuser','bookadmin','external')` | NO | `'bookadmin'` | MUL | — | Nguồn phát sự kiện |
| 4 | `source_event_type` | `varchar(100)` | NO | — | — | — | Loại sự kiện gốc (user.locked, review.hidden...) |
| 5 | `aggregate_type` | `varchar(60)` | NO | — | MUL | — | Loại aggregate liên quan |
| 6 | `aggregate_id` | `varchar(100)` | NO | — | — | — | ID aggregate dạng chuỗi |
| 7 | `aggregate_uuid` | `char(36)` | YES | `NULL` | — | — | UUID aggregate nếu có |
| 8 | `payload` | `longtext` | NO | — | — | — | Nội dung sự kiện nhận được |
| 9 | `headers` | `longtext` | YES | `NULL` | — | — | Metadata vận chuyển (schema version, trace id) |
| 10 | `status` | `enum('pending','processing','processed','failed','skipped','dead_letter')` | NO | `'pending'` | MUL | — | Trạng thái xử lý |
| 11 | `attempt_count` | `tinyint(3) unsigned` | NO | `0` | — | — | Số lần thử xử lý |
| 12 | `max_attempts` | `tinyint(3) unsigned` | NO | `10` | — | — | Số lần thử tối đa |
| 13 | `received_at` | `datetime(3)` | NO | `current_timestamp(3)` | MUL | — | Thời điểm nhận (UTC) |
| 14 | `next_attempt_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thử lại kế tiếp (UTC) |
| 15 | `processed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm xử lý xong (UTC) |
| 16 | `locked_by` | `varchar(100)` | YES | `NULL` | — | — | Worker đang xử lý |
| 17 | `locked_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm khóa xử lý (UTC) |
| 18 | `last_error` | `text` | YES | `NULL` | — | — | Lỗi gần nhất |
| 19 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo bản ghi (UTC) |
| 20 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `integration_outbox`

**Mô tả:** Transactional outbox của bookuser: phát sự kiện sang bookadmin theo mô hình ít nhất một lần

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `outbox_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bản ghi outbox |
| 2 | `event_id` | `char(36)` | NO | — | UNI | — | UUID sự kiện, dùng chống trùng ở phía nhận |
| 3 | `aggregate_type` | `varchar(60)` | NO | — | MUL | — | Loại aggregate nguồn (user, book, review...) |
| 4 | `aggregate_id` | `varchar(100)` | NO | — | — | — | ID aggregate nguồn dạng chuỗi |
| 5 | `aggregate_uuid` | `char(36)` | YES | `NULL` | — | — | UUID aggregate nếu có |
| 6 | `event_type` | `varchar(100)` | NO | — | MUL | — | Loại sự kiện (user.created, review.published...) |
| 7 | `payload` | `longtext` | NO | — | — | — | Nội dung sự kiện, không chứa dữ liệu nhạy cảm thô |
| 8 | `headers` | `longtext` | YES | `NULL` | — | — | Metadata vận chuyển (schema version, trace id) |
| 9 | `status` | `enum('pending','processing','processed','failed','dead_letter')` | NO | `'pending'` | MUL | — | Trạng thái phát |
| 10 | `attempt_count` | `tinyint(3) unsigned` | NO | `0` | — | — | Số lần thử phát |
| 11 | `max_attempts` | `tinyint(3) unsigned` | NO | `10` | — | — | Số lần thử tối đa trước dead-letter |
| 12 | `next_attempt_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thử lại kế tiếp (UTC) |
| 13 | `locked_by` | `varchar(100)` | YES | `NULL` | — | — | Worker đang xử lý |
| 14 | `locked_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm khóa xử lý (UTC) |
| 15 | `last_error` | `text` | YES | `NULL` | — | — | Lỗi gần nhất |
| 16 | `occurred_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm sự kiện phát sinh (UTC) |
| 17 | `processed_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm phát thành công (UTC) |
| 18 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 19 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `licenses`

**Mô tả:** Danh mục giấy phép nội dung, tham chiếu bởi book_rights

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `license_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính giấy phép |
| 2 | `code` | `varchar(50)` | NO | — | UNI | — | Mã giấy phép ổn định (CC-BY-4.0, ALL-RIGHTS-RESERVED...) |
| 3 | `name` | `varchar(200)` | NO | — | — | — | Tên giấy phép |
| 4 | `description` | `text` | YES | `NULL` | — | — | Mô tả điều khoản chính |
| 5 | `license_type` | `enum('public_domain','creative_commons','all_rights_reserved','custom','open_access')` | NO | `'custom'` | MUL | — | Nhóm giấy phép |
| 6 | `url` | `varchar(512)` | YES | `NULL` | — | — | URL văn bản giấy phép |
| 7 | `allows_commercial` | `tinyint(1)` | NO | `0` | — | — | Cho phép sử dụng thương mại |
| 8 | `allows_derivatives` | `tinyint(1)` | NO | `0` | — | — | Cho phép tác phẩm phái sinh |
| 9 | `requires_attribution` | `tinyint(1)` | NO | `1` | — | — | Bắt buộc ghi công |
| 10 | `allows_download` | `tinyint(1)` | NO | `0` | — | — | Cho phép tải xuống |
| 11 | `is_active` | `tinyint(1)` | NO | `1` | — | — | 1 = còn sử dụng |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `notifications`

**Mô tả:** Thông báo trong ứng dụng cho người dùng; có thể dọn theo expires_at

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `notification_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính thông báo |
| 2 | `notification_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của thông báo |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người nhận thông báo |
| 4 | `type` | `enum('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','other')` | NO | `'system'` | MUL | — | Loại thông báo |
| 5 | `title` | `varchar(255)` | NO | — | — | — | Tiêu đề |
| 6 | `body` | `text` | YES | `NULL` | — | — | Nội dung ngắn |
| 7 | `action_url` | `varchar(512)` | YES | `NULL` | — | — | Đường dẫn hành động trong ứng dụng |
| 8 | `related_resource_type` | `varchar(60)` | YES | `NULL` | — | — | Loại tài nguyên liên quan |
| 9 | `related_resource_id` | `bigint(20) unsigned` | YES | `NULL` | — | — | ID tài nguyên liên quan |
| 10 | `related_resource_uuid` | `char(36)` | YES | `NULL` | — | — | UUID tài nguyên liên quan |
| 11 | `is_read` | `tinyint(1)` | NO | `0` | — | — | 1 = đã đọc |
| 12 | `read_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm đọc (UTC) |
| 13 | `expires_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm hết hạn hiển thị (UTC) |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |

**Khóa ngoại:**

- `fk_notifications_user`: `user_id` → `users`(`user_id`)

### `notification_preferences`

**Mô tả:** Tùy chọn kênh và tần suất nhận thông báo theo từng loại

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `preference_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính tùy chọn thông báo |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng |
| 3 | `notification_type` | `enum('system','follow','review_reply','comment_reply','review_like','book_update','moderation','announcement','marketing')` | NO | — | MUL | — | Loại thông báo |
| 4 | `in_app_enabled` | `tinyint(1)` | NO | `1` | — | — | Bật thông báo trong ứng dụng |
| 5 | `email_enabled` | `tinyint(1)` | NO | `1` | — | — | Bật thông báo email |
| 6 | `push_enabled` | `tinyint(1)` | NO | `0` | — | — | Bật thông báo đẩy |
| 7 | `digest_frequency` | `enum('instant','daily','weekly','never')` | NO | `'instant'` | — | — | Tần suất gửi gộp |
| 8 | `quiet_hours_start` | `time` | YES | `NULL` | — | — | Bắt đầu giờ yên tĩnh (giờ địa phương) |
| 9 | `quiet_hours_end` | `time` | YES | `NULL` | — | — | Kết thúc giờ yên tĩnh |
| 10 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 11 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_notification_preferences_user`: `user_id` → `users`(`user_id`)

### `password_reset_tokens`

**Mô tả:** Token quên mật khẩu dùng một lần, chỉ lưu hash SHA-256

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `token_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính token đặt lại mật khẩu |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng yêu cầu đặt lại mật khẩu |
| 3 | `token_hash` | `binary(32)` | NO | — | UNI | — | SHA-256 của token; không lưu token gốc |
| 4 | `expires_at` | `datetime(3)` | NO | — | — | — | Hạn sử dụng token (UTC) |
| 5 | `consumed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm token được dùng (UTC) |
| 6 | `requested_ip` | `varbinary(16)` | YES | `NULL` | — | — | IP yêu cầu |
| 7 | `requested_user_agent` | `varchar(512)` | YES | `NULL` | — | — | User-Agent khi yêu cầu |
| 8 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm phát token (UTC) |

**Khóa ngoại:**

- `fk_password_reset_tokens_user`: `user_id` → `users`(`user_id`)

### `publishers`

**Mô tả:** Nhà xuất bản của sách; quan hệ 1-N với books

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `publisher_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính nhà xuất bản |
| 2 | `name` | `varchar(200)` | NO | — | UNI | — | Tên nhà xuất bản, duy nhất |
| 3 | `slug` | `varchar(220)` | NO | — | UNI | — | Slug URL duy nhất |
| 4 | `description` | `text` | YES | `NULL` | — | — | Mô tả nhà xuất bản |
| 5 | `website_url` | `varchar(512)` | YES | `NULL` | — | — | Trang web chính thức |
| 6 | `logo_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ logo |
| 7 | `country_code` | `char(2)` | YES | `NULL` | MUL | — | Mã quốc gia ISO 3166-1 alpha-2 |
| 8 | `status` | `enum('active','inactive')` | NO | `'active'` | MUL | — | Trạng thái hoạt động |
| 9 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 10 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 11 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm |

### `reading_history`

**Mô tả:** Lịch sử phiên đọc phục vụ thống kê và gợi ý; có thể phân vùng theo tháng khi tăng trưởng

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `history_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lịch sử đọc |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người đọc |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được đọc |
| 4 | `chapter_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Chương được đọc trong phiên |
| 5 | `session_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Phiên đăng nhập ghi nhận hoạt động |
| 6 | `device_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Thiết bị đọc |
| 7 | `source` | `enum('web','mobile','api','import')` | NO | `'web'` | — | — | Nguồn ghi nhận |
| 8 | `started_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Bắt đầu phiên đọc (UTC) |
| 9 | `ended_at` | `datetime(3)` | YES | `NULL` | — | — | Kết thúc phiên đọc (UTC) |
| 10 | `duration_seconds` | `int(10) unsigned` | NO | `0` | — | — | Thời lượng đọc (giây) |
| 11 | `pages_read` | `int(10) unsigned` | NO | `0` | — | — | Số trang đã đọc trong phiên |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo bản ghi (UTC) |

**Khóa ngoại:**

- `fk_reading_history_book`: `book_id` → `books`(`book_id`)
- `fk_reading_history_chapter`: `chapter_id` → `book_chapters`(`chapter_id`)
- `fk_reading_history_device`: `device_id` → `user_devices`(`device_id`)
- `fk_reading_history_session`: `session_id` → `user_sessions`(`session_id`)
- `fk_reading_history_user`: `user_id` → `users`(`user_id`)

### `reading_lists`

**Mô tả:** Danh sách đọc do người dùng tạo (private/unlisted/public)

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `list_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính danh sách đọc |
| 2 | `list_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của danh sách |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng sở hữu danh sách |
| 4 | `name` | `varchar(150)` | NO | — | — | — | Tên danh sách |
| 5 | `description` | `varchar(1000)` | YES | `NULL` | — | — | Mô tả danh sách |
| 6 | `visibility` | `enum('private','unlisted','public')` | NO | `'private'` | MUL | — | Phạm vi hiển thị |
| 7 | `is_default` | `tinyint(1)` | NO | `0` | — | — | 1 = danh sách mặc định của người dùng |
| 8 | `item_count` | `int(10) unsigned` | NO | `0` | — | — | Số sách trong danh sách (denormalized) |
| 9 | `active_name` | `varchar(150)` | YES | `NULL` | — | STORED GENERATED | Khóa sinh tự động: tên danh sách duy nhất khi chưa xóa mềm |
| 10 | `default_user_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | STORED GENERATED | Khóa sinh tự động: mỗi người dùng chỉ có một danh sách mặc định |
| 11 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 12 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 13 | `deleted_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm danh sách (UTC) |

**Khóa ngoại:**

- `fk_reading_lists_user`: `user_id` → `users`(`user_id`)

### `reading_list_books`

**Mô tả:** Bảng liên kết N-N reading_lists-books, có thứ tự hiển thị

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `list_id` | `bigint(20) unsigned` | NO | — | PRI | — | Danh sách đọc |
| 2 | `book_id` | `bigint(20) unsigned` | NO | — | PRI | — | Sách trong danh sách |
| 3 | `position` | `int(11)` | NO | `0` | — | — | Thứ tự sách trong danh sách |
| 4 | `note` | `varchar(1000)` | YES | `NULL` | — | — | Ghi chú riêng cho sách trong danh sách |
| 5 | `added_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thêm (UTC) |

**Khóa ngoại:**

- `fk_reading_list_books_book`: `book_id` → `books`(`book_id`)
- `fk_reading_list_books_list`: `list_id` → `reading_lists`(`list_id`)

### `reading_progress`

**Mô tả:** Tiến độ đọc đồng bộ đa thiết bị; một bản ghi cho mỗi cặp (user, book)

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `progress_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính tiến độ đọc |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người đọc |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách đang đọc |
| 4 | `chapter_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Chương hiện tại |
| 5 | `file_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Tệp đang đọc |
| 6 | `device_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Thiết bị ghi nhận tiến độ gần nhất |
| 7 | `position` | `longtext` | YES | `NULL` | — | — | Vị trí đọc chính xác (CFI, scroll offset, page anchor) |
| 8 | `percent_complete` | `decimal(5,2)` | NO | `0.00` | — | — | Phần trăm hoàn thành 0.00-100.00 |
| 9 | `page_number` | `int(10) unsigned` | YES | `NULL` | — | — | Trang hiện tại |
| 10 | `total_pages` | `int(10) unsigned` | YES | `NULL` | — | — | Tổng số trang của tệp |
| 11 | `is_completed` | `tinyint(1)` | NO | `0` | — | — | 1 = đã đọc xong |
| 12 | `completed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm đọc xong (UTC) |
| 13 | `last_read_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Lần đọc gần nhất (UTC) |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 15 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_reading_progress_book`: `book_id` → `books`(`book_id`)
- `fk_reading_progress_chapter`: `chapter_id` → `book_chapters`(`chapter_id`)
- `fk_reading_progress_device`: `device_id` → `user_devices`(`device_id`)
- `fk_reading_progress_file`: `file_id` → `book_files`(`file_id`)
- `fk_reading_progress_user`: `user_id` → `users`(`user_id`)

### `reviews`

**Mô tả:** Đánh giá sách; ràng buộc một đánh giá hiệu lực/người dùng/sách bằng khóa sinh

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `review_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính đánh giá |
| 2 | `review_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của đánh giá |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người đánh giá |
| 4 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách được đánh giá |
| 5 | `rating` | `decimal(2,1)` | NO | — | — | — | Điểm đánh giá 0.5-5.0 (DECIMAL, không dùng FLOAT) |
| 6 | `title` | `varchar(255)` | YES | `NULL` | — | — | Tiêu đề đánh giá |
| 7 | `body` | `text` | YES | `NULL` | — | — | Nội dung đánh giá |
| 8 | `contains_spoilers` | `tinyint(1)` | NO | `0` | — | — | 1 = có tiết lộ nội dung |
| 9 | `is_verified_purchase` | `tinyint(1)` | NO | `0` | — | — | 1 = đã xác thực quyền đọc sách |
| 10 | `status` | `enum('pending','published','hidden','rejected','deleted')` | NO | `'pending'` | MUL | — | Trạng thái kiểm duyệt |
| 11 | `helpful_count` | `int(10) unsigned` | NO | `0` | — | — | Số lượt hữu ích (denormalized) |
| 12 | `report_count` | `int(10) unsigned` | NO | `0` | — | — | Số báo cáo vi phạm (denormalized) |
| 13 | `moderated_by_admin_uuid` | `char(36)` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookadmin.admin_accounts.admin_uuid |
| 14 | `moderated_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm kiểm duyệt (UTC) |
| 15 | `published_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm công khai (UTC) |
| 16 | `active_book_id` | `bigint(20) unsigned` | YES | `NULL` | — | STORED GENERATED | Khóa sinh tự động: một đánh giá còn hiệu lực cho mỗi cặp (user, book) |
| 17 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 18 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 19 | `deleted_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm đánh giá (UTC) |

**Khóa ngoại:**

- `fk_reviews_book`: `book_id` → `books`(`book_id`)
- `fk_reviews_user`: `user_id` → `users`(`user_id`)

### `tags`

**Mô tả:** Thẻ mô tả sách; quan hệ N-N với books qua book_tags

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `tag_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính thẻ |
| 2 | `name` | `varchar(80)` | NO | — | UNI | — | Tên thẻ duy nhất |
| 3 | `slug` | `varchar(100)` | NO | — | UNI | — | Slug URL duy nhất |
| 4 | `description` | `varchar(500)` | YES | `NULL` | — | — | Mô tả thẻ |
| 5 | `usage_count` | `int(10) unsigned` | NO | `0` | MUL | — | Số sách đang gắn thẻ (denormalized có kiểm soát) |
| 6 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 7 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `users`

**Mô tả:** Tài khoản người đọc; mật khẩu chỉ lưu hash, xóa mềm bằng status/deleted_at

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `user_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính kỹ thuật của tài khoản |
| 2 | `user_uuid` | `char(36)` | NO | — | UNI | — | Mã định danh công khai (UUID v4), external ID dùng khi trao đổi với bookadmin |
| 3 | `username` | `varchar(50)` | NO | — | UNI | — | Tên đăng nhập duy nhất, không phân biệt hoa thường |
| 4 | `email` | `varchar(254)` | NO | — | UNI | — | Email đăng nhập duy nhất, lưu dạng chữ thường |
| 5 | `password_hash` | `varchar(255)` | NO | — | — | — | Hash mật khẩu Argon2id; không bao giờ lưu mật khẩu gốc |
| 6 | `password_algorithm` | `varchar(30)` | NO | `'argon2id'` | — | — | Thuật toán hash, hỗ trợ nâng cấp dần |
| 7 | `status` | `enum('pending','active','suspended','disabled','deleted')` | NO | `'pending'` | MUL | — | Trạng thái vòng đời tài khoản |
| 8 | `email_verified_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm xác minh email (UTC) |
| 9 | `failed_login_count` | `smallint(5) unsigned` | NO | `0` | — | — | Số lần đăng nhập sai liên tiếp |
| 10 | `locked_until` | `datetime(3)` | YES | `NULL` | — | — | Khóa đăng nhập tạm thời đến mốc này (UTC) |
| 11 | `last_login_at` | `datetime(3)` | YES | `NULL` | — | — | Lần đăng nhập thành công gần nhất (UTC) |
| 12 | `last_login_ip` | `varbinary(16)` | YES | `NULL` | — | — | IPv4/IPv6 nhị phân (INET6_ATON); hiển thị bằng INET6_NTOA |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 14 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 15 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm; NULL nghĩa là chưa xóa |

### `user_devices`

**Mô tả:** Thiết bị người dùng dùng để quản lý phiên và thông báo đẩy

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `device_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính thiết bị |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Chủ sở hữu thiết bị |
| 3 | `device_uuid` | `char(36)` | NO | — | UNI | — | Mã thiết bị công khai do ứng dụng sinh |
| 4 | `fingerprint_hash` | `varbinary(32)` | NO | — | — | — | SHA-256 dấu vân tay thiết bị; không lưu dấu vân tay gốc |
| 5 | `device_name` | `varchar(100)` | YES | `NULL` | — | — | Tên thân thiện do người dùng đặt |
| 6 | `platform` | `enum('web','ios','android','desktop','other')` | NO | `'web'` | — | — | Nền tảng |
| 7 | `browser` | `varchar(80)` | YES | `NULL` | — | — | Trình duyệt |
| 8 | `os_name` | `varchar(80)` | YES | `NULL` | — | — | Hệ điều hành |
| 9 | `push_token` | `varchar(255)` | YES | `NULL` | — | — | Token nhận thông báo đẩy (nếu có) |
| 10 | `is_trusted` | `tinyint(1)` | NO | `0` | — | — | 1 = thiết bị tin cậy |
| 11 | `last_seen_at` | `datetime(3)` | YES | `NULL` | MUL | — | Lần hoạt động gần nhất (UTC) |
| 12 | `revoked_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm thu hồi thiết bị (UTC) |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 14 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_devices_user`: `user_id` → `users`(`user_id`)

### `user_follows`

**Mô tả:** Quan hệ theo dõi N-N giữa người dùng, chặn tự theo dõi

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `follower_user_id` | `bigint(20) unsigned` | NO | — | PRI | — | Người theo dõi |
| 2 | `followed_user_id` | `bigint(20) unsigned` | NO | — | PRI | — | Người được theo dõi |
| 3 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm theo dõi (UTC) |

**Khóa ngoại:**

- `fk_user_follows_followed`: `followed_user_id` → `users`(`user_id`)
- `fk_user_follows_follower`: `follower_user_id` → `users`(`user_id`)

### `user_library`

**Mô tả:** Thư viện cá nhân; chống trùng bằng khóa sinh active_book_id khi chưa xóa mềm

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `library_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính mục thư viện |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng sở hữu mục thư viện |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Sách trong thư viện |
| 4 | `status` | `enum('want_to_read','reading','finished','paused','dropped')` | NO | `'want_to_read'` | — | — | Trạng thái đọc |
| 5 | `is_favorite` | `tinyint(1)` | NO | `0` | — | — | 1 = sách yêu thích |
| 6 | `added_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thêm vào thư viện (UTC) |
| 7 | `last_opened_at` | `datetime(3)` | YES | `NULL` | — | — | Lần mở gần nhất (UTC) |
| 8 | `finished_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hoàn thành (UTC) |
| 9 | `removed_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm khỏi thư viện (UTC) |
| 10 | `active_book_id` | `bigint(20) unsigned` | YES | `NULL` | — | STORED GENERATED | Khóa sinh tự động: một bản ghi hoạt động cho mỗi cặp (user, book) |
| 11 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 12 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_library_book`: `book_id` → `books`(`book_id`)
- `fk_user_library_user`: `user_id` → `users`(`user_id`)

### `user_profiles`

**Mô tả:** Hồ sơ công khai của người đọc, quan hệ 1-1 với users

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `profile_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính hồ sơ |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | UNI | — | Chủ sở hữu hồ sơ (1-1 với users) |
| 3 | `display_name` | `varchar(100)` | NO | `''` | — | — | Tên hiển thị công khai |
| 4 | `bio` | `text` | YES | `NULL` | — | — | Giới thiệu bản thân |
| 5 | `avatar_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ ảnh đại diện (không lưu file nhị phân) |
| 6 | `cover_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ ảnh bìa trang cá nhân |
| 7 | `date_of_birth` | `date` | YES | `NULL` | — | — | Ngày sinh; dùng kiểm soát nội dung theo độ tuổi |
| 8 | `gender` | `enum('unspecified','male','female','other')` | NO | `'unspecified'` | — | — | Giới tính tự khai |
| 9 | `country_code` | `char(2)` | YES | `NULL` | MUL | — | Mã quốc gia ISO 3166-1 alpha-2 |
| 10 | `locale` | `varchar(10)` | NO | `'vi-VN'` | — | — | Ngôn ngữ/khu vực hiển thị |
| 11 | `timezone` | `varchar(64)` | NO | `'Asia/Ho_Chi_Minh'` | — | — | Múi giờ hiển thị; dữ liệu lưu UTC |
| 12 | `website_url` | `varchar(512)` | YES | `NULL` | — | — | Trang web cá nhân |
| 13 | `social_links` | `longtext` | YES | `NULL` | — | — | Liên kết mạng xã hội có cấu trúc |
| 14 | `is_public` | `tinyint(1)` | NO | `1` | MUL | — | 1 = hồ sơ công khai |
| 15 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 16 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 17 | `deleted_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm hồ sơ |

**Khóa ngoại:**

- `fk_user_profiles_user`: `user_id` → `users`(`user_id`)

### `user_reports`

**Mô tả:** Báo cáo vi phạm từ người dùng; admin nhận bản sao idempotent qua outbox/inbox

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `report_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính báo cáo của người dùng |
| 2 | `report_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai; đồng bộ sang bookadmin.content_reports.report_uuid |
| 3 | `reporter_user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người gửi báo cáo |
| 4 | `target_type` | `enum('book','review','comment','user','author','other')` | NO | — | MUL | — | Loại đối tượng bị báo cáo |
| 5 | `target_id` | `bigint(20) unsigned` | NO | — | — | — | ID đối tượng bị báo cáo |
| 6 | `target_uuid` | `char(36)` | YES | `NULL` | — | — | UUID đối tượng bị báo cáo |
| 7 | `reason_code` | `varchar(50)` | NO | — | MUL | — | Mã lý do, đồng bộ bookadmin.report_reasons.code |
| 8 | `description` | `text` | YES | `NULL` | — | — | Mô tả chi tiết |
| 9 | `status` | `enum('new','triaged','in_review','resolved','rejected','duplicate')` | NO | `'new'` | MUL | — | Trạng thái xử lý đồng bộ với admin |
| 10 | `resolution_note` | `varchar(1000)` | YES | `NULL` | — | — | Phản hồi tóm tắt cho người báo cáo |
| 11 | `resolved_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm giải quyết (UTC) |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm gửi (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_reports_reporter`: `reporter_user_id` → `users`(`user_id`)

### `user_sessions`

**Mô tả:** Phiên đăng nhập của người đọc; token chỉ lưu dạng hash

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `session_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính phiên đăng nhập |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Người dùng của phiên |
| 3 | `device_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Thiết bị phát sinh phiên (nếu nhận diện được) |
| 4 | `session_token_hash` | `binary(32)` | NO | — | UNI | — | SHA-256 của session token; không lưu token gốc |
| 5 | `ip_address` | `varbinary(16)` | YES | `NULL` | — | — | IP nhị phân của phiên |
| 6 | `user_agent` | `varchar(512)` | YES | `NULL` | — | — | Chuỗi User-Agent |
| 7 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo phiên (UTC) |
| 8 | `last_seen_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Lần hoạt động gần nhất (UTC) |
| 9 | `expires_at` | `datetime(3)` | NO | — | MUL | — | Thời điểm hết hạn tuyệt đối (UTC) |
| 10 | `revoked_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm thu hồi phiên (UTC) |
| 11 | `revoked_reason` | `varchar(100)` | YES | `NULL` | — | — | Lý do thu hồi (logout, rotated, admin_revoke...) |

**Khóa ngoại:**

- `fk_user_sessions_device`: `device_id` → `user_devices`(`device_id`)
- `fk_user_sessions_user`: `user_id` → `users`(`user_id`)

### `user_settings`

**Mô tả:** Cấu hình cá nhân hóa trải nghiệm đọc, quan hệ 1-1 với users

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `setting_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính cấu hình |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | UNI | — | Người dùng sở hữu cấu hình (1-1) |
| 3 | `theme` | `enum('system','light','dark','sepia')` | NO | `'system'` | — | — | Giao diện tổng thể |
| 4 | `reader_theme` | `varchar(30)` | NO | `'sepia'` | — | — | Tông màu trình đọc |
| 5 | `font_size` | `tinyint(3) unsigned` | NO | `16` | — | — | Cỡ chữ trình đọc (px) |
| 6 | `line_height` | `decimal(3,2)` | NO | `1.60` | — | — | Giãn dòng trình đọc |
| 7 | `language` | `varchar(10)` | NO | `'vi'` | MUL | — | Mã ngôn ngữ ưa thích |
| 8 | `email_notifications` | `tinyint(1)` | NO | `1` | — | — | Nhận thông báo qua email |
| 9 | `push_notifications` | `tinyint(1)` | NO | `1` | — | — | Nhận thông báo đẩy |
| 10 | `marketing_emails` | `tinyint(1)` | NO | `0` | — | — | Đồng ý nhận email tiếp thị |
| 11 | `profile_visibility` | `enum('public','followers','private')` | NO | `'public'` | — | — | Mức hiển thị hồ sơ |
| 12 | `allow_downloads` | `tinyint(1)` | NO | `1` | — | — | Cho phép tải sách có quyền tải |
| 13 | `preferences` | `longtext` | YES | `NULL` | — | — | Tùy chọn mở rộng có cấu trúc |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 15 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_settings_user`: `user_id` → `users`(`user_id`)

## Schema `bookadmin`

### `admin_accounts`

**Mô tả:** Tài khoản Super Admin/Admin; tách biệt hoàn toàn với users của bookuser

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `admin_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính tài khoản quản trị |
| 2 | `admin_uuid` | `char(36)` | NO | — | UNI | — | Mã định danh công khai, external ID cho tham chiếu chéo từ bookuser |
| 3 | `username` | `varchar(50)` | NO | — | UNI | — | Tên đăng nhập admin, duy nhất |
| 4 | `email` | `varchar(254)` | NO | — | UNI | — | Email công vụ, duy nhất |
| 5 | `password_hash` | `varchar(255)` | NO | — | — | — | Hash Argon2id; không có mật khẩu mặc định |
| 6 | `password_algorithm` | `varchar(30)` | NO | `'argon2id'` | — | — | Thuật toán hash để nâng cấp dần |
| 7 | `status` | `enum('invited','active','suspended','disabled')` | NO | `'invited'` | MUL | — | Trạng thái tài khoản admin |
| 8 | `must_change_password` | `tinyint(1)` | NO | `1` | — | — | Buộc đổi mật khẩu ở lần đăng nhập đầu |
| 9 | `mfa_required` | `tinyint(1)` | NO | `1` | — | — | Bắt buộc xác thực đa yếu tố |
| 10 | `failed_login_count` | `smallint(5) unsigned` | NO | `0` | — | — | Số lần đăng nhập sai liên tiếp |
| 11 | `locked_until` | `datetime(3)` | YES | `NULL` | — | — | Khóa tạm thời đến mốc này (UTC) |
| 12 | `password_changed_at` | `datetime(3)` | YES | `NULL` | — | — | Lần đổi mật khẩu gần nhất (UTC) |
| 13 | `last_login_at` | `datetime(3)` | YES | `NULL` | MUL | — | Đăng nhập thành công gần nhất (UTC) |
| 14 | `last_login_ip` | `varbinary(16)` | YES | `NULL` | — | — | IP đăng nhập gần nhất dạng nhị phân |
| 15 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 16 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 17 | `deleted_at` | `datetime(3)` | YES | `NULL` | MUL | — | Xóa mềm; ưu tiên disabled thay vì xóa cứng |

### `admin_account_roles`

**Mô tả:** Bảng liên kết N-N giữa admin_accounts và admin_roles

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `admin_id` | `bigint(20) unsigned` | NO | — | PRI | — | Tài khoản admin |
| 2 | `role_id` | `bigint(20) unsigned` | NO | — | PRI | — | Vai trò được gán |
| 3 | `assigned_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin thực hiện gán quyền |
| 4 | `assigned_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm gán (UTC) |
| 5 | `expires_at` | `datetime(3)` | YES | `NULL` | MUL | — | Hết hạn gán quyền (NULL = vĩnh viễn) |

**Khóa ngoại:**

- `fk_admin_account_roles_admin`: `admin_id` → `admin_accounts`(`admin_id`)
- `fk_admin_account_roles_assigned_by`: `assigned_by_admin_id` → `admin_accounts`(`admin_id`)
- `fk_admin_account_roles_role`: `role_id` → `admin_roles`(`role_id`)

### `admin_announcements`

**Mô tả:** Thông báo do admin phát hành; view v_public_announcements lọc theo đối tượng và thời gian

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `announcement_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính thông báo hệ thống |
| 2 | `announcement_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của thông báo |
| 3 | `title` | `varchar(255)` | NO | — | — | — | Tiêu đề thông báo |
| 4 | `body` | `text` | NO | — | — | — | Nội dung thông báo |
| 5 | `audience` | `enum('all','admins','users','specific_roles')` | NO | `'admins'` | MUL | — | Đối tượng nhận |
| 6 | `target_roles` | `longtext` | YES | `NULL` | — | — | Danh sách role nhận khi audience = specific_roles |
| 7 | `severity` | `enum('info','success','warning','error','critical')` | NO | `'info'` | — | — | Mức độ hiển thị |
| 8 | `status` | `enum('draft','scheduled','published','archived')` | NO | `'draft'` | MUL | — | Trạng thái phát hành |
| 9 | `publish_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm phát hành (UTC) |
| 10 | `expires_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hết hiển thị (UTC) |
| 11 | `created_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin tạo |
| 12 | `published_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin phát hành |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 14 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_admin_announcements_created_by`: `created_by_admin_id` → `admin_accounts`(`admin_id`)
- `fk_admin_announcements_published_by`: `published_by_admin_id` → `admin_accounts`(`admin_id`)

### `admin_audit_logs`

**Mô tả:** Audit log append-only; trigger chặn UPDATE/DELETE, ứng dụng chỉ được INSERT/SELECT

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `audit_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính nhật ký kiểm toán |
| 2 | `audit_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của bản ghi kiểm toán |
| 3 | `admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin thực hiện; NULL nếu tài khoản đã bị xóa cứng |
| 4 | `admin_uuid` | `char(36)` | NO | — | — | — | Bản sao UUID admin tại thời điểm thao tác |
| 5 | `admin_username` | `varchar(50)` | NO | — | — | — | Bản sao username admin tại thời điểm thao tác |
| 6 | `actor_type` | `enum('admin','system','api_client')` | NO | `'admin'` | — | — | Loại chủ thể thực hiện |
| 7 | `action` | `varchar(100)` | NO | — | MUL | — | Mã hành động (books.update, users.lock...) |
| 8 | `resource_type` | `varchar(60)` | YES | `NULL` | MUL | — | Loại tài nguyên bị tác động |
| 9 | `resource_id` | `varchar(100)` | YES | `NULL` | — | — | ID tài nguyên dạng chuỗi (BIGINT hoặc UUID) |
| 10 | `http_method` | `varchar(10)` | YES | `NULL` | — | — | Phương thức HTTP |
| 11 | `request_path` | `varchar(512)` | YES | `NULL` | — | — | Đường dẫn API |
| 12 | `ip_address` | `varbinary(16)` | YES | `NULL` | — | — | IP nhị phân của chủ thể |
| 13 | `user_agent` | `varchar(512)` | YES | `NULL` | — | — | User-Agent |
| 14 | `before_data` | `longtext` | YES | `NULL` | — | — | Ảnh chụp dữ liệu trước khi sửa (đã che dữ liệu nhạy cảm) |
| 15 | `after_data` | `longtext` | YES | `NULL` | — | — | Ảnh chụp dữ liệu sau khi sửa |
| 16 | `diff` | `longtext` | YES | `NULL` | — | — | Các trường thay đổi |
| 17 | `metadata` | `longtext` | YES | `NULL` | — | — | Ngữ cảnh bổ sung (request id, trace id...) |
| 18 | `status` | `enum('success','failure')` | NO | `'success'` | — | — | Kết quả thao tác |
| 19 | `error_message` | `text` | YES | `NULL` | — | — | Lỗi nếu thao tác thất bại |
| 20 | `correlation_id` | `char(36)` | YES | `NULL` | MUL | — | Mã tương quan xuyên request/event |
| 21 | `prev_hash` | `binary(32)` | YES | `NULL` | — | — | Hash bản ghi trước trong chuỗi (do ứng dụng tính) |
| 22 | `record_hash` | `binary(32)` | YES | `NULL` | — | — | Hash bản ghi hiện tại (do ứng dụng tính) |
| 23 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | MUL | — | Thời điểm ghi nhật ký (UTC) |

**Khóa ngoại:**

- `fk_admin_audit_logs_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_login_attempts`

**Mô tả:** Nhật ký đăng nhập admin (append-only), phục vụ phát hiện bất thường

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `attempt_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lần đăng nhập |
| 2 | `admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin nếu nhận diện được tài khoản |
| 3 | `username_attempted` | `varchar(254)` | NO | — | MUL | — | Username/email đã nhập, kể cả không tồn tại |
| 4 | `success` | `tinyint(1)` | NO | `0` | MUL | — | 1 = đăng nhập thành công |
| 5 | `failure_reason` | `varchar(100)` | YES | `NULL` | — | — | Lý do thất bại (bad_password, locked, mfa_failed...) |
| 6 | `ip_address` | `varbinary(16)` | YES | `NULL` | MUL | — | IP nhị phân |
| 7 | `user_agent` | `varchar(512)` | YES | `NULL` | — | — | User-Agent |
| 8 | `attempted_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thử đăng nhập (UTC) |

**Khóa ngoại:**

- `fk_admin_login_attempts_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_mfa_methods`

**Mô tả:** Phương thức MFA của admin; secret/khóa luôn được mã hóa, không lưu plaintext

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `mfa_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính phương thức MFA |
| 2 | `admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tài khoản admin sở hữu phương thức |
| 3 | `method` | `enum('totp','webauthn','email','recovery_codes')` | NO | — | — | — | Loại xác thực đa yếu tố |
| 4 | `label` | `varchar(100)` | NO | `'primary'` | — | — | Nhãn phân biệt nhiều phương thức cùng loại |
| 5 | `secret_encrypted` | `varbinary(1024)` | YES | `NULL` | — | — | Secret TOTP đã mã hóa bằng khóa KMS/ứng dụng |
| 6 | `credential_id` | `varbinary(255)` | YES | `NULL` | — | — | Credential ID WebAuthn |
| 7 | `credential_public_key` | `varbinary(1024)` | YES | `NULL` | — | — | Public key WebAuthn |
| 8 | `recovery_code_hashes` | `longtext` | YES | `NULL` | — | — | Mảng hash của mã khôi phục dùng một lần |
| 9 | `sign_count` | `bigint(20) unsigned` | NO | `0` | — | — | Bộ đếm chống replay của WebAuthn |
| 10 | `is_primary` | `tinyint(1)` | NO | `0` | — | — | 1 = phương thức chính |
| 11 | `confirmed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm xác nhận thiết lập xong |
| 12 | `last_used_at` | `datetime(3)` | YES | `NULL` | — | — | Lần sử dụng gần nhất (UTC) |
| 13 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 14 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_admin_mfa_methods_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_notifications`

**Mô tả:** Thông báo trong ứng dụng quản trị; đánh dấu đã đọc kèm thời điểm

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `notification_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính thông báo admin |
| 2 | `notification_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của thông báo |
| 3 | `recipient_admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Admin nhận thông báo |
| 4 | `type` | `enum('report_created','case_assigned','case_escalated','verification_pending','rights_review_pending','system_alert','security_alert','announcement','other')` | NO | `'other'` | MUL | — | Loại thông báo |
| 5 | `severity` | `enum('info','success','warning','error','critical')` | NO | `'info'` | — | — | Mức độ hiển thị |
| 6 | `title` | `varchar(255)` | NO | — | — | — | Tiêu đề |
| 7 | `body` | `text` | YES | `NULL` | — | — | Nội dung |
| 8 | `action_url` | `varchar(512)` | YES | `NULL` | — | — | Đường dẫn xử lý trong trang quản trị |
| 9 | `related_resource_type` | `varchar(60)` | YES | `NULL` | MUL | — | Loại tài nguyên liên quan |
| 10 | `related_resource_id` | `varchar(100)` | YES | `NULL` | — | — | ID tài nguyên liên quan |
| 11 | `is_read` | `tinyint(1)` | NO | `0` | — | — | 1 = đã đọc |
| 12 | `read_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm đọc (UTC) |
| 13 | `expires_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm hết hạn hiển thị (UTC) |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |

**Khóa ngoại:**

- `fk_admin_notifications_recipient`: `recipient_admin_id` → `admin_accounts`(`admin_id`)

### `admin_password_reset_tokens`

**Mô tả:** Token đặt lại mật khẩu admin, chỉ lưu hash SHA-256

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `token_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính token đặt lại mật khẩu admin |
| 2 | `admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tài khoản admin yêu cầu đặt lại |
| 3 | `token_hash` | `binary(32)` | NO | — | UNI | — | SHA-256 token; không lưu token gốc |
| 4 | `expires_at` | `datetime(3)` | NO | — | — | — | Hạn sử dụng (UTC) |
| 5 | `consumed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm sử dụng (UTC) |
| 6 | `requested_ip` | `varbinary(16)` | YES | `NULL` | — | — | IP yêu cầu |
| 7 | `requested_user_agent` | `varchar(512)` | YES | `NULL` | — | — | User-Agent khi yêu cầu |
| 8 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm phát token (UTC) |

**Khóa ngoại:**

- `fk_admin_password_reset_tokens_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_permissions`

**Mô tả:** Danh mục quyền chi tiết theo resource và action

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `permission_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính quyền |
| 2 | `code` | `varchar(100)` | NO | — | UNI | — | Mã quyền dạng resource.action (ví dụ books.approve) |
| 3 | `resource` | `varchar(60)` | NO | — | MUL | — | Tài nguyên được kiểm soát |
| 4 | `action` | `varchar(40)` | NO | — | — | — | Hành động trên tài nguyên |
| 5 | `description` | `varchar(500)` | YES | `NULL` | — | — | Mô tả quyền |
| 6 | `is_system` | `tinyint(1)` | NO | `1` | — | — | 1 = quyền hệ thống do seed quản lý |
| 7 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 8 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `admin_profiles`

**Mô tả:** Hồ sơ nội bộ của tài khoản quản trị, 1-1 với admin_accounts

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `profile_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính hồ sơ admin |
| 2 | `admin_id` | `bigint(20) unsigned` | NO | — | UNI | — | Tài khoản admin sở hữu hồ sơ (1-1) |
| 3 | `full_name` | `varchar(150)` | NO | — | — | — | Họ tên đầy đủ |
| 4 | `display_name` | `varchar(100)` | YES | `NULL` | — | — | Tên hiển thị trong giao diện quản trị |
| 5 | `phone` | `varchar(30)` | YES | `NULL` | — | — | Số điện thoại liên hệ nội bộ |
| 6 | `job_title` | `varchar(100)` | YES | `NULL` | — | — | Chức danh |
| 7 | `department` | `varchar(100)` | YES | `NULL` | MUL | — | Bộ phận |
| 8 | `avatar_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ ảnh đại diện |
| 9 | `locale` | `varchar(10)` | NO | `'vi-VN'` | — | — | Ngôn ngữ giao diện quản trị |
| 10 | `timezone` | `varchar(64)` | NO | `'Asia/Ho_Chi_Minh'` | — | — | Múi giờ hiển thị; dữ liệu lưu UTC |
| 11 | `bio` | `text` | YES | `NULL` | — | — | Ghi chú giới thiệu nội bộ |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_admin_profiles_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_roles`

**Mô tả:** Vai trò RBAC: Super Admin, Administrator, Content Manager, Moderator, Analyst

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `role_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính vai trò |
| 2 | `code` | `varchar(50)` | NO | — | UNI | — | Mã vai trò ổn định, dùng trong kiểm tra phân quyền |
| 3 | `name` | `varchar(100)` | NO | — | UNI | — | Tên vai trò hiển thị |
| 4 | `description` | `varchar(500)` | YES | `NULL` | — | — | Mô tả phạm vi quyền |
| 5 | `hierarchy_level` | `tinyint(3) unsigned` | NO | `100` | MUL | — | Số nhỏ hơn = cấp cao hơn (SUPER_ADMIN = 1) |
| 6 | `is_system` | `tinyint(1)` | NO | `0` | — | — | 1 = vai trò hệ thống, không cho xóa |
| 7 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 8 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `admin_role_permissions`

**Mô tả:** Bảng liên kết N-N giữa admin_roles và admin_permissions

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `role_id` | `bigint(20) unsigned` | NO | — | PRI | — | Vai trò |
| 2 | `permission_id` | `bigint(20) unsigned` | NO | — | PRI | — | Quyền được cấp |
| 3 | `granted_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin thực hiện cấp quyền |
| 4 | `granted_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm cấp (UTC) |

**Khóa ngoại:**

- `fk_admin_role_permissions_granted_by`: `granted_by_admin_id` → `admin_accounts`(`admin_id`)
- `fk_admin_role_permissions_permission`: `permission_id` → `admin_permissions`(`permission_id`)
- `fk_admin_role_permissions_role`: `role_id` → `admin_roles`(`role_id`)

### `admin_sessions`

**Mô tả:** Phiên đăng nhập khu vực quản trị, yêu cầu MFA trước khi cấp quyền

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `session_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính phiên admin |
| 2 | `admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tài khoản admin của phiên |
| 3 | `session_token_hash` | `binary(32)` | NO | — | UNI | — | SHA-256 session token; không lưu token gốc |
| 4 | `mfa_verified` | `tinyint(1)` | NO | `0` | — | — | 1 = đã hoàn tất MFA trong phiên |
| 5 | `ip_address` | `varbinary(16)` | YES | `NULL` | — | — | IP nhị phân của phiên |
| 6 | `user_agent` | `varchar(512)` | YES | `NULL` | — | — | Chuỗi User-Agent |
| 7 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo phiên (UTC) |
| 8 | `last_seen_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Lần hoạt động gần nhất (UTC) |
| 9 | `expires_at` | `datetime(3)` | NO | — | MUL | — | Hết hạn tuyệt đối (UTC) |
| 10 | `revoked_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm thu hồi (UTC) |
| 11 | `revoked_reason` | `varchar(100)` | YES | `NULL` | — | — | Lý do thu hồi phiên |

**Khóa ngoại:**

- `fk_admin_sessions_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `admin_user_notes`

**Mô tả:** Ghi chú nội bộ về người dùng; user_id là tham chiếu logic sang bookuser

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `note_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính ghi chú nội bộ |
| 2 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tham chiếu LOGIC tới bookuser.users.user_id (không FK chéo DB) |
| 3 | `user_uuid` | `char(36)` | YES | `NULL` | — | — | Bản sao external ID để tra cứu khi bookuser không sẵn sàng |
| 4 | `author_admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Admin tạo ghi chú |
| 5 | `note_type` | `enum('general','support','risk','verification','moderation')` | NO | `'general'` | MUL | — | Phân loại ghi chú |
| 6 | `content` | `text` | NO | — | — | — | Nội dung ghi chú nội bộ |
| 7 | `is_pinned` | `tinyint(1)` | NO | `0` | MUL | — | Ghim ghi chú quan trọng |
| 8 | `visibility` | `enum('all_admins','super_admin_only')` | NO | `'all_admins'` | — | — | Phạm vi nhìn thấy |
| 9 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 10 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |
| 11 | `deleted_at` | `datetime(3)` | YES | `NULL` | — | — | Xóa mềm ghi chú |

**Khóa ngoại:**

- `fk_admin_user_notes_author`: `author_admin_id` → `admin_accounts`(`admin_id`)

### `book_rights_reviews`

**Mô tả:** Xét duyệt nguồn gốc/giấy phép sách; book_id, rights_id là tham chiếu logic sang bookuser

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `review_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính xét duyệt quyền sách |
| 2 | `review_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của hồ sơ xét duyệt quyền |
| 3 | `book_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tham chiếu LOGIC tới bookuser.books.book_id |
| 4 | `book_uuid` | `char(36)` | YES | `NULL` | — | — | Bản sao external ID sách |
| 5 | `rights_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookuser.book_rights.rights_id |
| 6 | `status` | `enum('pending','in_review','approved','rejected','expired','revoked')` | NO | `'pending'` | MUL | — | Trạng thái xét duyệt |
| 7 | `source_type` | `enum('self_published','licensed','public_domain','creative_commons','unknown')` | NO | `'unknown'` | MUL | — | Nguồn gốc quyền |
| 8 | `license_code` | `varchar(50)` | YES | `NULL` | — | — | Mã giấy phép tại thời điểm xét duyệt |
| 9 | `findings` | `text` | YES | `NULL` | — | — | Kết luận/ghi nhận của người xét duyệt |
| 10 | `evidence_storage_key` | `varchar(512)` | YES | `NULL` | — | — | Khóa lưu trữ tài liệu bằng chứng |
| 11 | `reviewer_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin xét duyệt |
| 12 | `submitted_by_user_id` | `bigint(20) unsigned` | YES | `NULL` | — | — | Tham chiếu LOGIC tới bookuser.users.user_id |
| 13 | `submitted_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm nộp (UTC) |
| 14 | `reviewed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hoàn tất xét duyệt (UTC) |
| 15 | `expires_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hết hiệu lực của quyền (UTC) |
| 16 | `open_book_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | STORED GENERATED | Khóa sinh tự động: mỗi sách chỉ có một hồ sơ xét duyệt đang mở |
| 17 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 18 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_book_rights_reviews_reviewer`: `reviewer_admin_id` → `admin_accounts`(`admin_id`)

### `content_reports`

**Mô tả:** Báo cáo nội dung vi phạm; các ID bookuser là tham chiếu logic, kiểm tra ở service

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `report_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính báo cáo nội dung phía admin |
| 2 | `report_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của báo cáo |
| 3 | `source_user_report_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | — | Tham chiếu LOGIC tới bookuser.user_reports.report_id; unique để chống nhận trùng |
| 4 | `reporter_user_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookuser.users.user_id |
| 5 | `reporter_user_uuid` | `char(36)` | YES | `NULL` | — | — | Bản sao external ID người báo cáo |
| 6 | `target_type` | `enum('book','review','comment','user','author','other')` | NO | — | MUL | — | Loại đối tượng bị báo cáo |
| 7 | `target_id` | `bigint(20) unsigned` | NO | — | — | — | ID đối tượng trong bookuser (kiểm tra hợp lệ ở tầng dịch vụ) |
| 8 | `target_uuid` | `char(36)` | YES | `NULL` | — | — | UUID đối tượng để đối soát chéo |
| 9 | `reason_id` | `bigint(20) unsigned` | NO | — | MUL | — | Lý do báo cáo |
| 10 | `description` | `text` | YES | `NULL` | — | — | Mô tả chi tiết từ người báo cáo |
| 11 | `status` | `enum('new','triaged','in_review','resolved','rejected','duplicate')` | NO | `'new'` | MUL | — | Trạng thái xử lý |
| 12 | `priority` | `enum('low','normal','high','urgent')` | NO | `'normal'` | — | — | Mức ưu tiên |
| 13 | `assigned_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin được phân công |
| 14 | `resolution_summary` | `varchar(1000)` | YES | `NULL` | — | — | Tóm tắt kết quả xử lý |
| 15 | `resolved_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm giải quyết (UTC) |
| 16 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tiếp nhận (UTC) |
| 17 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_content_reports_assigned`: `assigned_admin_id` → `admin_accounts`(`admin_id`)
- `fk_content_reports_reason`: `reason_id` → `report_reasons`(`reason_id`)

### `feature_flags`

**Mô tả:** Cờ tính năng theo môi trường, hỗ trợ rollout theo phần trăm và quy tắc

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `flag_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính cờ tính năng |
| 2 | `flag_key` | `varchar(100)` | NO | — | MUL | — | Khóa cờ tính năng |
| 3 | `environment` | `enum('all','development','staging','production')` | NO | `'all'` | — | — | Môi trường áp dụng |
| 4 | `name` | `varchar(150)` | NO | — | — | — | Tên hiển thị |
| 5 | `description` | `varchar(500)` | YES | `NULL` | — | — | Mô tả tính năng |
| 6 | `is_enabled` | `tinyint(1)` | NO | `0` | MUL | — | 1 = bật tính năng |
| 7 | `rollout_percentage` | `decimal(5,2)` | NO | `0.00` | — | — | Tỷ lệ người dùng được bật (0-100) |
| 8 | `targeting_rules` | `longtext` | YES | `NULL` | — | — | Quy tắc nhắm mục tiêu (user id, role, thuộc tính) |
| 9 | `updated_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin cập nhật gần nhất |
| 10 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 11 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_feature_flags_updated_by`: `updated_by_admin_id` → `admin_accounts`(`admin_id`)

### `integration_inbox`

**Mô tả:** Inbox idempotent của bookadmin: nhận sự kiện từ bookuser, chống trùng theo event_id

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `inbox_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bản ghi inbox |
| 2 | `event_id` | `char(36)` | NO | — | UNI | — | UUID sự kiện nhận được; UNIQUE để chống xử lý trùng |
| 3 | `source_schema` | `enum('bookuser','bookadmin','external')` | NO | `'bookuser'` | MUL | — | Nguồn phát sự kiện |
| 4 | `source_event_type` | `varchar(100)` | NO | — | — | — | Loại sự kiện gốc (user.updated, book.unpublished...) |
| 5 | `aggregate_type` | `varchar(60)` | NO | — | MUL | — | Loại aggregate liên quan |
| 6 | `aggregate_id` | `varchar(100)` | NO | — | — | — | ID aggregate dạng chuỗi |
| 7 | `aggregate_uuid` | `char(36)` | YES | `NULL` | — | — | UUID aggregate nếu có |
| 8 | `payload` | `longtext` | NO | — | — | — | Nội dung sự kiện nhận được |
| 9 | `headers` | `longtext` | YES | `NULL` | — | — | Metadata vận chuyển (schema version, trace id) |
| 10 | `status` | `enum('pending','processing','processed','failed','skipped','dead_letter')` | NO | `'pending'` | MUL | — | Trạng thái xử lý |
| 11 | `attempt_count` | `tinyint(3) unsigned` | NO | `0` | — | — | Số lần thử xử lý |
| 12 | `max_attempts` | `tinyint(3) unsigned` | NO | `10` | — | — | Số lần thử tối đa |
| 13 | `received_at` | `datetime(3)` | NO | `current_timestamp(3)` | MUL | — | Thời điểm nhận (UTC) |
| 14 | `next_attempt_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thử lại kế tiếp (UTC) |
| 15 | `processed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm xử lý xong (UTC) |
| 16 | `locked_by` | `varchar(100)` | YES | `NULL` | — | — | Worker đang xử lý |
| 17 | `locked_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm khóa xử lý (UTC) |
| 18 | `last_error` | `text` | YES | `NULL` | — | — | Lỗi gần nhất |
| 19 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo bản ghi (UTC) |
| 20 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `integration_outbox`

**Mô tả:** Transactional outbox của bookadmin: ghi cùng transaction nghiệp vụ, worker phát sang bookuser

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `outbox_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính bản ghi outbox |
| 2 | `event_id` | `char(36)` | NO | — | UNI | — | UUID sự kiện, dùng chống trùng ở phía nhận |
| 3 | `aggregate_type` | `varchar(60)` | NO | — | MUL | — | Loại aggregate nguồn (user, book, review...) |
| 4 | `aggregate_id` | `varchar(100)` | NO | — | — | — | ID aggregate nguồn dạng chuỗi |
| 5 | `aggregate_uuid` | `char(36)` | YES | `NULL` | — | — | UUID aggregate nếu có |
| 6 | `event_type` | `varchar(100)` | NO | — | MUL | — | Loại sự kiện (user.locked, book.published...) |
| 7 | `payload` | `longtext` | NO | — | — | — | Nội dung sự kiện, không chứa dữ liệu nhạy cảm thô |
| 8 | `headers` | `longtext` | YES | `NULL` | — | — | Metadata vận chuyển (schema version, trace id) |
| 9 | `status` | `enum('pending','processing','processed','failed','dead_letter')` | NO | `'pending'` | MUL | — | Trạng thái phát |
| 10 | `attempt_count` | `tinyint(3) unsigned` | NO | `0` | — | — | Số lần thử phát |
| 11 | `max_attempts` | `tinyint(3) unsigned` | NO | `10` | — | — | Số lần thử tối đa trước dead-letter |
| 12 | `next_attempt_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm thử lại kế tiếp (UTC) |
| 13 | `locked_by` | `varchar(100)` | YES | `NULL` | — | — | Worker đang xử lý |
| 14 | `locked_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm khóa xử lý (UTC) |
| 15 | `last_error` | `text` | YES | `NULL` | — | — | Lỗi gần nhất |
| 16 | `occurred_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm sự kiện phát sinh (UTC) |
| 17 | `processed_at` | `datetime(3)` | YES | `NULL` | MUL | — | Thời điểm phát thành công (UTC) |
| 18 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 19 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `maintenance_windows`

**Mô tả:** Lịch bảo trì hệ thống, dùng để bật chế độ chỉ đọc và thông báo

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `window_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính cửa sổ bảo trì |
| 2 | `window_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của cửa sổ bảo trì |
| 3 | `title` | `varchar(200)` | NO | — | — | — | Tiêu đề cửa sổ bảo trì |
| 4 | `description` | `text` | YES | `NULL` | — | — | Mô tả phạm vi và lý do |
| 5 | `scope` | `enum('all','api','web','admin','worker','database')` | NO | `'all'` | MUL | — | Thành phần bị ảnh hưởng |
| 6 | `status` | `enum('scheduled','in_progress','completed','cancelled')` | NO | `'scheduled'` | MUL | — | Trạng thái |
| 7 | `starts_at` | `datetime(3)` | NO | — | MUL | — | Bắt đầu (UTC) |
| 8 | `ends_at` | `datetime(3)` | NO | — | — | — | Kết thúc dự kiến (UTC) |
| 9 | `is_read_only` | `tinyint(1)` | NO | `1` | — | — | 1 = chỉ đọc trong thời gian bảo trì |
| 10 | `allow_admin_access` | `tinyint(1)` | NO | `1` | — | — | 1 = vẫn cho phép admin truy cập |
| 11 | `created_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin tạo cửa sổ bảo trì |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_maintenance_windows_created_by`: `created_by_admin_id` → `admin_accounts`(`admin_id`)

### `moderation_actions`

**Mô tả:** Nhật ký hành động kiểm duyệt, lưu trạng thái trước/sau để truy vết

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `action_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính hành động kiểm duyệt |
| 2 | `action_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của hành động |
| 3 | `case_id` | `bigint(20) unsigned` | NO | — | MUL | — | Hồ sơ kiểm duyệt |
| 4 | `action_type` | `enum('warn','hide_content','restore_content','remove_content','restrict_user','unrestrict_user','request_changes','approve','reject','note','escalate')` | NO | — | MUL | — | Loại hành động |
| 5 | `target_type` | `enum('book','review','comment','user','author','other')` | NO | — | MUL | — | Loại đối tượng tác động |
| 6 | `target_id` | `bigint(20) unsigned` | NO | — | — | — | ID đối tượng trong bookuser |
| 7 | `admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Admin thực hiện |
| 8 | `reason` | `text` | NO | — | — | — | Lý do, bắt buộc để truy vết |
| 9 | `notes` | `text` | YES | `NULL` | — | — | Ghi chú nội bộ |
| 10 | `previous_state` | `longtext` | YES | `NULL` | — | — | Ảnh chụp trạng thái trước khi thay đổi |
| 11 | `new_state` | `longtext` | YES | `NULL` | — | — | Ảnh chụp trạng thái sau khi thay đổi |
| 12 | `effective_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm có hiệu lực (UTC) |
| 13 | `expires_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hết hiệu lực (UTC) |
| 14 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm ghi nhận (UTC) |

**Khóa ngoại:**

- `fk_moderation_actions_admin`: `admin_id` → `admin_accounts`(`admin_id`)
- `fk_moderation_actions_case`: `case_id` → `moderation_cases`(`case_id`)

### `moderation_cases`

**Mô tả:** Hồ sơ kiểm duyệt nội dung; kết nối báo cáo, phân công và quyết định xử lý

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `case_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính hồ sơ kiểm duyệt |
| 2 | `case_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của hồ sơ |
| 3 | `case_number` | `varchar(30)` | NO | — | UNI | — | Mã hồ sơ thân thiện (ví dụ MC-2026-000123) |
| 4 | `report_id` | `bigint(20) unsigned` | YES | `NULL` | UNI | — | Báo cáo nguồn; unique để một báo cáo chỉ mở một hồ sơ |
| 5 | `target_type` | `enum('book','review','comment','user','author','other')` | NO | — | MUL | — | Loại đối tượng bị kiểm duyệt |
| 6 | `target_id` | `bigint(20) unsigned` | NO | — | — | — | ID đối tượng trong bookuser (kiểm tra ở service) |
| 7 | `target_uuid` | `char(36)` | YES | `NULL` | — | — | UUID đối tượng để đối soát |
| 8 | `status` | `enum('open','investigating','pending_action','resolved','closed','escalated')` | NO | `'open'` | MUL | — | Trạng thái hồ sơ |
| 9 | `priority` | `enum('low','normal','high','urgent')` | NO | `'normal'` | — | — | Mức ưu tiên |
| 10 | `assigned_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin đang xử lý |
| 11 | `opened_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin mở hồ sơ |
| 12 | `summary` | `text` | YES | `NULL` | — | — | Tóm tắt nội dung vụ việc |
| 13 | `due_at` | `datetime(3)` | YES | `NULL` | — | — | Hạn xử lý (UTC) |
| 14 | `opened_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm mở hồ sơ (UTC) |
| 15 | `closed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm đóng hồ sơ (UTC) |
| 16 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 17 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_moderation_cases_assigned`: `assigned_admin_id` → `admin_accounts`(`admin_id`)
- `fk_moderation_cases_opened_by`: `opened_by_admin_id` → `admin_accounts`(`admin_id`)
- `fk_moderation_cases_report`: `report_id` → `content_reports`(`report_id`)

### `report_reasons`

**Mô tả:** Danh mục lý do báo cáo nội dung, dùng chung cho API và UI

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `reason_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lý do báo cáo |
| 2 | `code` | `varchar(50)` | NO | — | UNI | — | Mã lý do ổn định, đồng bộ với bookuser.user_reports.reason_code |
| 3 | `label` | `varchar(150)` | NO | — | — | — | Nhãn hiển thị |
| 4 | `description` | `varchar(500)` | YES | `NULL` | — | — | Giải thích chi tiết |
| 5 | `applies_to` | `enum('book','review','comment','user','author','any')` | NO | `'any'` | MUL | — | Loại đối tượng áp dụng |
| 6 | `severity` | `enum('low','medium','high','critical')` | NO | `'medium'` | — | — | Mức độ nghiêm trọng mặc định |
| 7 | `is_active` | `tinyint(1)` | NO | `1` | MUL | — | 1 = còn sử dụng |
| 8 | `sort_order` | `int(11)` | NO | `0` | — | — | Thứ tự hiển thị |
| 9 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 10 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

### `security_events`

**Mô tả:** Sự kiện bảo mật phục vụ phát hiện bất thường; user_id là tham chiếu logic

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `event_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính sự kiện bảo mật |
| 2 | `event_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của sự kiện |
| 3 | `event_type` | `enum('login_success','login_failure','logout','password_changed','password_reset_requested','mfa_enabled','mfa_disabled','mfa_challenge_failed','account_locked','account_unlocked','permission_changed','role_changed','session_revoked','suspicious_activity','api_key_created','api_key_revoked')` | NO | — | MUL | — | Loại sự kiện bảo mật |
| 4 | `severity` | `enum('info','low','medium','high','critical')` | NO | `'info'` | MUL | — | Mức độ nghiêm trọng |
| 5 | `actor_type` | `enum('admin','user','system','anonymous')` | NO | `'system'` | — | — | Loại chủ thể |
| 6 | `admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin liên quan |
| 7 | `user_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Tham chiếu LOGIC tới bookuser.users.user_id |
| 8 | `subject_identifier` | `varchar(150)` | YES | `NULL` | — | — | Email/username đã thử (đã chuẩn hóa) |
| 9 | `ip_address` | `varbinary(16)` | YES | `NULL` | MUL | — | Địa chỉ IP nhị phân |
| 10 | `user_agent` | `varchar(512)` | YES | `NULL` | — | — | User-Agent |
| 11 | `outcome` | `enum('success','failure','blocked')` | NO | `'success'` | — | — | Kết quả |
| 12 | `details` | `longtext` | YES | `NULL` | — | — | Chi tiết bổ sung đã lọc dữ liệu nhạy cảm |
| 13 | `risk_score` | `tinyint(3) unsigned` | YES | `NULL` | — | — | Điểm rủi ro 0-100 |
| 14 | `correlation_id` | `char(36)` | YES | `NULL` | MUL | — | Mã tương quan với audit log |
| 15 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm xảy ra (UTC) |

**Khóa ngoại:**

- `fk_security_events_admin`: `admin_id` → `admin_accounts`(`admin_id`)

### `system_metrics_daily`

**Mô tả:** Chỉ số tổng hợp theo ngày; dimension_key bảo đảm tính duy nhất khi dimension là JSON

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `metric_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính chỉ số ngày |
| 2 | `metric_date` | `date` | NO | — | MUL | — | Ngày ghi nhận (UTC) |
| 3 | `metric_key` | `varchar(80)` | NO | — | MUL | — | Mã chỉ số (users.new, books.published...) |
| 4 | `dimension_key` | `varchar(100)` | NO | `''` | — | — | Khóa tổ hợp chiều phân tích (ví dụ language=vi) |
| 5 | `metric_value` | `decimal(18,4)` | NO | `0.0000` | — | — | Giá trị chỉ số |
| 6 | `unit` | `varchar(20)` | NO | `'count'` | — | — | Đơn vị (count, percent, seconds, bytes) |
| 7 | `dimension` | `longtext` | YES | `NULL` | — | — | Chi tiết chiều phân tích dạng JSON |
| 8 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tổng hợp (UTC) |

### `system_settings`

**Mô tả:** Cấu hình hệ thống có kiểu dữ liệu và phạm vi công khai rõ ràng

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `setting_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính cấu hình hệ thống |
| 2 | `setting_key` | `varchar(100)` | NO | — | UNI | — | Khóa cấu hình duy nhất (dot.notation) |
| 3 | `value_json` | `longtext` | YES | `NULL` | — | — | Giá trị cấu hình dạng JSON |
| 4 | `value_type` | `enum('string','integer','decimal','boolean','json')` | NO | `'string'` | — | — | Kiểu dữ liệu logic của giá trị |
| 5 | `category` | `varchar(50)` | NO | `'general'` | MUL | — | Nhóm cấu hình |
| 6 | `label` | `varchar(150)` | NO | — | — | — | Nhãn hiển thị |
| 7 | `description` | `varchar(500)` | YES | `NULL` | — | — | Mô tả ý nghĩa cấu hình |
| 8 | `is_public` | `tinyint(1)` | NO | `0` | MUL | — | 1 = được phép trả ra API công khai |
| 9 | `is_editable` | `tinyint(1)` | NO | `1` | — | — | 1 = cho phép sửa qua giao diện quản trị |
| 10 | `updated_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin cập nhật gần nhất |
| 11 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 12 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_system_settings_updated_by`: `updated_by_admin_id` → `admin_accounts`(`admin_id`)

### `user_restrictions`

**Mô tả:** Hạn chế/khóa/đình chỉ người dùng; user_id tham chiếu logic sang bookuser

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `restriction_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính lệnh hạn chế |
| 2 | `restriction_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của lệnh hạn chế |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tham chiếu LOGIC tới bookuser.users.user_id |
| 4 | `user_uuid` | `char(36)` | YES | `NULL` | — | — | Bản sao external ID người dùng |
| 5 | `restriction_type` | `enum('account_lock','account_suspension','feature_restriction','download_block','comment_block','upload_block')` | NO | — | — | — | Loại hạn chế |
| 6 | `feature_code` | `varchar(60)` | YES | `NULL` | — | — | Mã tính năng khi restriction_type = feature_restriction |
| 7 | `reason` | `text` | NO | — | — | — | Lý do hạn chế, bắt buộc để truy vết |
| 8 | `status` | `enum('active','expired','lifted')` | NO | `'active'` | MUL | — | Trạng thái hiệu lực |
| 9 | `issued_by_admin_id` | `bigint(20) unsigned` | NO | — | MUL | — | Admin ban hành |
| 10 | `lifted_by_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin gỡ bỏ hạn chế |
| 11 | `starts_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Bắt đầu hiệu lực (UTC) |
| 12 | `ends_at` | `datetime(3)` | YES | `NULL` | — | — | Kết thúc hiệu lực; NULL = vô thời hạn |
| 13 | `lifted_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm gỡ bỏ (UTC) |
| 14 | `lift_reason` | `text` | YES | `NULL` | — | — | Lý do gỡ bỏ |
| 15 | `source_event_id` | `char(36)` | YES | `NULL` | MUL | — | event_id đã tạo lệnh này (idempotency với Inbox) |
| 16 | `active_lock_key` | `bigint(20) unsigned` | YES | `NULL` | UNI | STORED GENERATED | Khóa sinh tự động: tối đa một lệnh khóa tài khoản đang hiệu lực/người dùng |
| 17 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 18 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_restrictions_issued_by`: `issued_by_admin_id` → `admin_accounts`(`admin_id`)
- `fk_user_restrictions_lifted_by`: `lifted_by_admin_id` → `admin_accounts`(`admin_id`)

### `user_verification_reviews`

**Mô tả:** Hồ sơ xác minh người dùng (email/CMND/tác giả/NXB); user_id tham chiếu logic

**Engine:** InnoDB · **Collation:** utf8mb4_unicode_ci

| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |
|---:|---|---|:--:|---|---|---|---|
| 1 | `review_id` | `bigint(20) unsigned` | NO | — | PRI | auto_increment | Khóa chính hồ sơ xét duyệt |
| 2 | `review_uuid` | `char(36)` | NO | — | UNI | — | Mã công khai của hồ sơ xét duyệt |
| 3 | `user_id` | `bigint(20) unsigned` | NO | — | MUL | — | Tham chiếu LOGIC tới bookuser.users.user_id |
| 4 | `user_uuid` | `char(36)` | YES | `NULL` | — | — | Bản sao external ID người dùng |
| 5 | `verification_type` | `enum('email','identity','author','publisher')` | NO | `'identity'` | MUL | — | Loại xác minh |
| 6 | `status` | `enum('pending','in_review','approved','rejected','needs_more_info')` | NO | `'pending'` | MUL | — | Trạng thái xử lý |
| 7 | `submitted_documents` | `longtext` | YES | `NULL` | — | — | Danh sách storage_key tài liệu, không chứa dữ liệu nhị phân |
| 8 | `reviewer_admin_id` | `bigint(20) unsigned` | YES | `NULL` | MUL | — | Admin xử lý |
| 9 | `decision_reason` | `text` | YES | `NULL` | — | — | Lý do quyết định |
| 10 | `submitted_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm nộp (UTC) |
| 11 | `reviewed_at` | `datetime(3)` | YES | `NULL` | — | — | Thời điểm hoàn tất xét duyệt (UTC) |
| 12 | `created_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | — | Thời điểm tạo (UTC) |
| 13 | `updated_at` | `datetime(3)` | NO | `current_timestamp(3)` | — | on update current_timestamp(3) | Thời điểm cập nhật (UTC) |

**Khóa ngoại:**

- `fk_user_verification_reviews_reviewer`: `reviewer_admin_id` → `admin_accounts`(`admin_id`)

## Truy vấn kiểm tra nhanh

```sql
-- Liệt kê bảng và số cột
SELECT table_schema, table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema IN ('bookuser','bookadmin')
GROUP BY table_schema, table_name ORDER BY table_schema, table_name;
```

---

Hết data_dictionary.md
