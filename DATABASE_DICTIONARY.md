# DATABASE_DICTIONARY.md

> Từ điển dữ liệu tóm tắt. Danh sách đầy đủ cột/kiểu nằm trong `database/docs/`.

## bookuser (35 bảng)

- Danh tính: `users`, `user_profiles`, `user_settings`, `user_sessions`, `user_devices`, `password_reset_tokens`, `email_verification_tokens`.
- Sách: `books`, `book_chapters`, `book_files`, `book_rights`, `book_tags`, `book_authors`, `book_categories`.
- Danh mục/tác giả: `categories`, `authors`, `publishers`, `tags`, `licenses`.
- Thư viện/đọc: `user_library`, `reading_progress`, `bookmarks`, `reading_history`, `reading_lists`, `reading_list_books`, `downloads`.
- Cộng đồng: `reviews`, `comments`, `comment_reactions`, `user_reports`, `user_follows`, `notifications`, `notification_preferences`.
- Tích hợp: `integration_outbox`, `integration_inbox`.
- Bảo mật token: `user_security_tokens` (migration 008), `user_recovery_credentials` (migration 009).
- View: `v_public_announcements`.

## bookadmin (28 bảng)

- Danh tính/RBAC: `admin_accounts`, `admin_profiles`, `admin_roles`, `admin_permissions`, `admin_account_roles`, `admin_role_permissions`, `admin_sessions`, `admin_mfa_methods`, `admin_login_attempts`, `admin_password_reset_tokens`.
- Quản trị người dùng: `admin_user_notes`, `user_restrictions`, `user_verification_reviews`.
- Kiểm duyệt/bản quyền: `moderation_cases`, `moderation_actions`, `content_reports`, `report_reasons`, `book_rights_reviews`.
- Vận hành: `admin_announcements`, `admin_notifications`, `feature_flags`, `system_settings`, `maintenance_windows`, `system_metrics_daily`.
- Audit/bảo mật: `admin_audit_logs`, `security_events`.
- Tích hợp: `integration_outbox`, `integration_inbox`.
- Bảo mật token: `admin_security_tokens` (migration 008), `admin_recovery_credentials` (migration 009).
- Views: `v_user_summary`, `v_book_summary`.

## Bảng cần bổ sung (chưa tồn tại)

- `bookuser`: `book_series`, `book_series_items`, `book_chapter_versions`, `book_designs`, `book_templates`, `book_assets`, `book_import_jobs`, `book_export_jobs`, và toàn bộ `storage_*`.
- `bookadmin`: `system_alerts`, `storage_alerts`, `storage_audit_logs`, `background_job_logs`, `docker_health_events`.

> Các bảng này là danh sách đối chiếu; chỉ tạo migration bổ sung có kiểm soát khi triển khai chức năng tương ứng.
