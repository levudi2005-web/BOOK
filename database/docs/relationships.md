# Quan hệ dữ liệu BOOKFORFREEDOM

> Sinh tự động từ MariaDB 10.11.14 (information_schema).
> Thời điểm sinh: 2026-11-20 18:22:53 (giờ máy chủ).
> Tổng số khóa ngoại vật lý: **88**; tổng cột tham gia: **88**.

## Schema `bookuser` — 57 khóa ngoại

| Bảng con | Khóa ngoại | Cột | Bảng cha | ON UPDATE | ON DELETE |
|---|---|---|---|---|---|
| `bookmarks` | `fk_bookmarks_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `bookmarks` | `fk_bookmarks_chapter` | `chapter_id` | `book_chapters` (`chapter_id`) | RESTRICT | SET NULL |
| `bookmarks` | `fk_bookmarks_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `books` | `fk_books_created_by` | `created_by_user_id` | `users` (`user_id`) | RESTRICT | SET NULL |
| `books` | `fk_books_publisher` | `publisher_id` | `publishers` (`publisher_id`) | RESTRICT | SET NULL |
| `book_authors` | `fk_book_authors_author` | `author_id` | `authors` (`author_id`) | RESTRICT | CASCADE |
| `book_authors` | `fk_book_authors_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `book_categories` | `fk_book_categories_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `book_categories` | `fk_book_categories_category` | `category_id` | `categories` (`category_id`) | RESTRICT | RESTRICT |
| `book_chapters` | `fk_book_chapters_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `book_chapters` | `fk_book_chapters_parent` | `parent_chapter_id` | `book_chapters` (`chapter_id`) | RESTRICT | SET NULL |
| `book_files` | `fk_book_files_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `book_files` | `fk_book_files_uploaded_by` | `uploaded_by_user_id` | `users` (`user_id`) | RESTRICT | SET NULL |
| `book_rights` | `fk_book_rights_book` | `book_id` | `books` (`book_id`) | RESTRICT | RESTRICT |
| `book_rights` | `fk_book_rights_license` | `license_id` | `licenses` (`license_id`) | RESTRICT | RESTRICT |
| `book_tags` | `fk_book_tags_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `book_tags` | `fk_book_tags_tag` | `tag_id` | `tags` (`tag_id`) | RESTRICT | CASCADE |
| `categories` | `fk_categories_parent` | `parent_category_id` | `categories` (`category_id`) | RESTRICT | SET NULL |
| `comments` | `fk_comments_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `comments` | `fk_comments_parent` | `parent_comment_id` | `comments` (`comment_id`) | RESTRICT | CASCADE |
| `comments` | `fk_comments_review` | `review_id` | `reviews` (`review_id`) | RESTRICT | SET NULL |
| `comments` | `fk_comments_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `comment_reactions` | `fk_comment_reactions_comment` | `comment_id` | `comments` (`comment_id`) | RESTRICT | CASCADE |
| `comment_reactions` | `fk_comment_reactions_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `downloads` | `fk_downloads_book` | `book_id` | `books` (`book_id`) | RESTRICT | RESTRICT |
| `downloads` | `fk_downloads_device` | `device_id` | `user_devices` (`device_id`) | RESTRICT | SET NULL |
| `downloads` | `fk_downloads_file` | `file_id` | `book_files` (`file_id`) | RESTRICT | RESTRICT |
| `downloads` | `fk_downloads_user` | `user_id` | `users` (`user_id`) | RESTRICT | RESTRICT |
| `email_verification_tokens` | `fk_email_verification_tokens_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `notifications` | `fk_notifications_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `notification_preferences` | `fk_notification_preferences_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `password_reset_tokens` | `fk_password_reset_tokens_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `reading_history` | `fk_reading_history_book` | `book_id` | `books` (`book_id`) | RESTRICT | RESTRICT |
| `reading_history` | `fk_reading_history_chapter` | `chapter_id` | `book_chapters` (`chapter_id`) | RESTRICT | SET NULL |
| `reading_history` | `fk_reading_history_device` | `device_id` | `user_devices` (`device_id`) | RESTRICT | SET NULL |
| `reading_history` | `fk_reading_history_session` | `session_id` | `user_sessions` (`session_id`) | RESTRICT | SET NULL |
| `reading_history` | `fk_reading_history_user` | `user_id` | `users` (`user_id`) | RESTRICT | RESTRICT |
| `reading_lists` | `fk_reading_lists_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `reading_list_books` | `fk_reading_list_books_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `reading_list_books` | `fk_reading_list_books_list` | `list_id` | `reading_lists` (`list_id`) | RESTRICT | CASCADE |
| `reading_progress` | `fk_reading_progress_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `reading_progress` | `fk_reading_progress_chapter` | `chapter_id` | `book_chapters` (`chapter_id`) | RESTRICT | SET NULL |
| `reading_progress` | `fk_reading_progress_device` | `device_id` | `user_devices` (`device_id`) | RESTRICT | SET NULL |
| `reading_progress` | `fk_reading_progress_file` | `file_id` | `book_files` (`file_id`) | RESTRICT | SET NULL |
| `reading_progress` | `fk_reading_progress_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `reviews` | `fk_reviews_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `reviews` | `fk_reviews_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_devices` | `fk_user_devices_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_follows` | `fk_user_follows_followed` | `followed_user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_follows` | `fk_user_follows_follower` | `follower_user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_library` | `fk_user_library_book` | `book_id` | `books` (`book_id`) | RESTRICT | CASCADE |
| `user_library` | `fk_user_library_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_profiles` | `fk_user_profiles_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_reports` | `fk_user_reports_reporter` | `reporter_user_id` | `users` (`user_id`) | RESTRICT | RESTRICT |
| `user_sessions` | `fk_user_sessions_device` | `device_id` | `user_devices` (`device_id`) | RESTRICT | SET NULL |
| `user_sessions` | `fk_user_sessions_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |
| `user_settings` | `fk_user_settings_user` | `user_id` | `users` (`user_id`) | RESTRICT | CASCADE |

## Schema `bookadmin` — 31 khóa ngoại

| Bảng con | Khóa ngoại | Cột | Bảng cha | ON UPDATE | ON DELETE |
|---|---|---|---|---|---|
| `admin_account_roles` | `fk_admin_account_roles_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_account_roles` | `fk_admin_account_roles_assigned_by` | `assigned_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_account_roles` | `fk_admin_account_roles_role` | `role_id` | `admin_roles` (`role_id`) | RESTRICT | RESTRICT |
| `admin_announcements` | `fk_admin_announcements_created_by` | `created_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_announcements` | `fk_admin_announcements_published_by` | `published_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_audit_logs` | `fk_admin_audit_logs_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_login_attempts` | `fk_admin_login_attempts_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_mfa_methods` | `fk_admin_mfa_methods_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_notifications` | `fk_admin_notifications_recipient` | `recipient_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_password_reset_tokens` | `fk_admin_password_reset_tokens_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_profiles` | `fk_admin_profiles_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_role_permissions` | `fk_admin_role_permissions_granted_by` | `granted_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `admin_role_permissions` | `fk_admin_role_permissions_permission` | `permission_id` | `admin_permissions` (`permission_id`) | RESTRICT | CASCADE |
| `admin_role_permissions` | `fk_admin_role_permissions_role` | `role_id` | `admin_roles` (`role_id`) | RESTRICT | CASCADE |
| `admin_sessions` | `fk_admin_sessions_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | CASCADE |
| `admin_user_notes` | `fk_admin_user_notes_author` | `author_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | RESTRICT |
| `book_rights_reviews` | `fk_book_rights_reviews_reviewer` | `reviewer_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `content_reports` | `fk_content_reports_assigned` | `assigned_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `content_reports` | `fk_content_reports_reason` | `reason_id` | `report_reasons` (`reason_id`) | RESTRICT | RESTRICT |
| `feature_flags` | `fk_feature_flags_updated_by` | `updated_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `maintenance_windows` | `fk_maintenance_windows_created_by` | `created_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `moderation_actions` | `fk_moderation_actions_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | RESTRICT |
| `moderation_actions` | `fk_moderation_actions_case` | `case_id` | `moderation_cases` (`case_id`) | RESTRICT | RESTRICT |
| `moderation_cases` | `fk_moderation_cases_assigned` | `assigned_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `moderation_cases` | `fk_moderation_cases_opened_by` | `opened_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `moderation_cases` | `fk_moderation_cases_report` | `report_id` | `content_reports` (`report_id`) | RESTRICT | RESTRICT |
| `security_events` | `fk_security_events_admin` | `admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `system_settings` | `fk_system_settings_updated_by` | `updated_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `user_restrictions` | `fk_user_restrictions_issued_by` | `issued_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | RESTRICT |
| `user_restrictions` | `fk_user_restrictions_lifted_by` | `lifted_by_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |
| `user_verification_reviews` | `fk_user_verification_reviews_reviewer` | `reviewer_admin_id` | `admin_accounts` (`admin_id`) | RESTRICT | SET NULL |

## Liên kết logic xuyên schema (không có FK vật lý)

MariaDB không hỗ trợ FK xuyên database một cách an toàn khi backup/restore độc lập,
nên mọi liên kết dưới đây được kiểm soát ở tầng dịch vụ và đối soát định kỳ.

| Nguồn | Đích | Khóa logic | Chiều | Ghi chú |
|---|---|---|---|---|
| `bookuser.users` | `bookadmin.admin_user_notes / user_restrictions / user_verification_reviews` | user_id + user_uuid | bookadmin → bookuser | UUID là bản sao để tra cứu khi bookuser không sẵn sàng |
| `bookuser.books` | `bookadmin.book_rights_reviews` | book_id + book_uuid | bookadmin → bookuser | Hồ sơ xét duyệt quyền phân phối |
| `bookuser.book_rights` | `bookadmin.book_rights_reviews` | rights_uuid / book_uuid | hai chiều | Trạng thái duyệt đồng bộ qua sự kiện rights.* |
| `bookuser.user_reports` | `bookadmin.content_reports` | report_uuid + source_user_report_id | bookuser → bookadmin | source_user_report_id UNIQUE chống nhận trùng |
| `bookuser.reviews / comments` | `bookadmin.content_reports` | target_type + target_id + target_uuid | bookuser → bookadmin | target_type ∈ (book, review, comment, user) |
| `bookuser.reviews / comments` | `bookadmin.moderation_actions` | moderated_by_admin_uuid | bookadmin → bookuser | Lưu UUID admin đã kiểm duyệt |
| `bookuser.book_rights` | `bookadmin.admin_accounts` | verified_by_admin_uuid | bookadmin → bookuser | Admin thẩm định quyền |
| `bookuser.integration_outbox` | `bookadmin.integration_inbox` | event_id (UUID) | bookuser → bookadmin | Ít nhất một lần; UNIQUE event_id hai phía |
| `bookadmin.integration_outbox` | `bookuser.integration_inbox` | event_id (UUID) | bookadmin → bookuser | Sự kiện admin → người dùng |
| `bookadmin.user_restrictions` | `bookadmin.integration_inbox` | source_event_id | nội bộ bookadmin | Idempotency khi tiêu thụ sự kiện |
| `bookuser.v_public_announcements` | `bookadmin.admin_announcements` | announcement_uuid | view → bảng | SQL SECURITY INVOKER; cần GRANT SELECT |

## Quy tắc toàn vẹn

1. Mọi FK vật lý dùng cùng kiểu và cùng collation với khóa cha (đã kiểm tra tự động, xem `verification_report.md`).
2. Bảng con dùng `ON DELETE CASCADE` khi bản ghi con không có ý nghĩa độc lập (token, session, liên kết N-N).
3. Dùng `ON DELETE SET NULL` cho tham chiếu mềm (admin tạo thông báo, người tạo sách) để bảo toàn lịch sử.
4. Dùng `ON DELETE RESTRICT` cho dữ liệu nghiệp vụ cốt lõi (sách, người dùng, đơn vay) — ưu tiên xóa mềm.
5. Liên kết xuyên schema chỉ dùng UUID/ID sao chép; job đối soát định kỳ phát hiện bản ghi mồ côi.

---

Hết relationships.md
