# Hợp đồng API với tầng dữ liệu

Tài liệu này ánh xạ endpoint REST (NestJS) tới bảng, quyền và quy tắc dữ liệu. Không thay thế đặc tả OpenAPI; dùng làm ràng buộc giữa API và schema.

## 1. Quy ước chung

### 1.1 Định dạng
- Base URL: `/api/v1`; JSON UTF-8; thời gian ISO-8601 UTC (`2026-11-20T18:00:00.000Z`).
- Định danh công khai dùng `*_uuid`; không nhận `BIGINT` từ client ở endpoint công khai.
- `Content-Type: application/json`; tối đa 1 MB (riêng upload file dùng presigned URL, không qua API JSON).

### 1.2 Phân trang, sắp xếp, lọc
```
GET /api/v1/books?limit=20&cursor=eyJpZCI6MTIzfQ&sort=-published_at&status=published
```
- `limit` mặc định 20, tối đa 100.
- Cursor base64url của bộ `(sort_key, id)`; không dùng `OFFSET` lớn.
- `sort` chỉ chấp nhận whitelist theo endpoint; tiền tố `-` là giảm dần.
- Bộ lọc phải có index tương ứng (`status`, `visibility`, `published_at`, `created_at`).

### 1.3 Bao kết quả
```json
{
  "data": {},
  "meta": { "request_id": "a1b2c3d4-...", "pagination": { "next_cursor": null, "has_more": false } }
}
```

### 1.4 Lỗi
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [{ "field": "email", "rule": "format" }],
    "request_id": "a1b2c3d4-..."
  }
}
```
| HTTP | `code` tiêu biểu | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Sai kiểu, thiếu trường, JSON không hợp lệ |
| 401 | `UNAUTHENTICATED` | Thiếu/hết hạn phiên |
| 403 | `FORBIDDEN` | Thiếu permission hoặc bị hạn chế |
| 404 | `NOT_FOUND` | Không tồn tại hoặc không được phép thấy |
| 409 | `CONFLICT` | Vi phạm UNIQUE, trạng thái không cho phép |
| 422 | `BUSINESS_RULE` | Vi phạm quy tắc nghiệp vụ (CHECK) |
| 429 | `RATE_LIMITED` | Vượt giới hạn |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước; không lộ SQL |

### 1.5 Xác thực và idempotency
- Người dùng: cookie phiên `HttpOnly; Secure; SameSite=Lax` hoặc Bearer access token ngắn hạn + refresh token luân chuyển.
- Admin: phiên riêng (`admin_sessions`), bắt buộc MFA cho vai trò `SUPER_ADMIN`/`ADMIN`.
- `Idempotency-Key` (UUID) bắt buộc cho POST tạo báo cáo, tạo hồ sơ quyền và các hành động admin; API lưu khóa trong Redis TTL 24h kèm response.
- Mọi response có `X-Request-Id`; giá trị này ghi vào `admin_audit_logs.correlation_id` khi thao tác admin.

### 1.6 Giới hạn
- Auth: 5 lần/phút/IP; đăng ký 3 lần/giờ/IP.
- Báo cáo: 20 lần/ngày/người dùng.
- Admin: 600 request/phút/admin; export tối đa 1 job đồng thời.

## 2. API người dùng (`bookuser`)

| Method & path | Bảng chính | Quy tắc dữ liệu |
|---|---|---|
| `POST /auth/register` | `users`, `user_profiles`, `user_settings`, `notification_preferences` | Tạo trong 1 transaction; `status='pending'`; gửi token xác minh (chỉ lưu hash) |
| `POST /auth/login` | `users`, `user_sessions`, `admin_audit_logs` (nếu admin) | Kiểm tra `locked_until`, `status`; tạo phiên; cập nhật `last_login_at/ip` |
| `POST /auth/refresh` | `user_sessions` | Refresh token luân chuyển; token cũ bị thu hồi |
| `POST /auth/logout` | `user_sessions` | Đặt `revoked_at`; không xóa cứng |
| `POST /auth/forgot-password` | `password_reset_tokens` | Luôn trả 202 (chống dò email); token hash + `expires_at` |
| `POST /auth/reset-password` | `password_reset_tokens`, `users` | Token dùng một lần; đổi hash; thu hồi mọi phiên |
| `POST /auth/verify-email` | `email_verification_tokens`, `users` | `email_verified_at`, `status='active'` |
| `GET/PATCH /me` | `users`, `user_profiles` | Chỉ chủ thể; không trả `password_hash` |
| `GET /me/sessions` | `user_sessions` | Ẩn token hash, IP đầy đủ |
| `DELETE /me/sessions/:uuid` | `user_sessions` | Thu hồi phiên |
| `GET /me/devices` | `user_devices` | Chỉ thiết bị của chủ thể |
| `GET /books` | `books`, `book_categories`, `book_tags` | Chỉ `status='published'`, `visibility='public'`, `deleted_at IS NULL` |
| `GET /books/:slug` | `books`, `authors`, `book_chapters` | Tăng `view_count` theo cách không chặn request |
| `GET /books/:slug/chapters` | `book_chapters` | Không trả chương bị khóa |
| `GET /books/:slug/reviews` | `reviews` | Chỉ `status='published'` |
| `POST /books/:slug/reviews` | `reviews` | Một đánh giá/người/sách (UNIQUE `active_book_id,user_id`); `is_verified` nếu đã tải |
| `POST /books/:slug/comments` | `comments` | Kiểm tra hạn chế (`user_restrictions` qua API nội bộ) |
| `POST /reports` | `user_reports` + `integration_outbox` | Ghi cùng transaction; `report_uuid` đồng bộ; `reason_code` khớp `report_reasons.code` |
| `GET /me/library` | `user_library`, `reading_progress` | Chỉ bản ghi chưa gỡ (`removed_at IS NULL`) |
| `PUT /me/library/:book_uuid` | `user_library` | Partial unique `active_book_id` chống trùng |
| `PUT /me/progress/:book_uuid` | `reading_progress` | Upsert theo `(user_id, book_id)`; `position` trong khoảng hợp lệ |
| `GET/POST /me/reading-lists` | `reading_lists`, `reading_list_books` | Partial unique tên khi chưa xóa |
| `GET /notifications` | `notifications` | Chỉ của chủ thể; đánh dấu `read_at` |
| `GET /announcements` | `bookuser.v_public_announcements` | View lọc `published`, audience `all/users`, trong thời gian hiệu lực |

## 3. API quản trị (`bookadmin`)

Mọi endpoint dưới đây yêu cầu phiên admin + permission tương ứng. Hành động ghi phải tạo `admin_audit_logs` trong cùng transaction.

| Method & path | Bảng chính | Permission |
|---|---|---|
| `POST /admin/auth/login` | `admin_accounts`, `admin_sessions`, `admin_login_attempts` | — (công khai, rate limit chặt) |
| `POST /admin/auth/mfa/verify` | `admin_mfa_methods`, `admin_sessions` | — |
| `GET /admin/users` | `admin_user_notes`, `user_restrictions`, `user_verification_reviews` | `user.read` |
| `GET /admin/users/:uuid` | `admin.v_user_summary` | `user.read` |
| `PATCH /admin/users/:uuid` | `admin_user_notes` | `user.update` |
| `DELETE /admin/users/:uuid` | `admin_user_notes`, outbox | `user.delete` |
| `GET /admin/users/export` | view tổng hợp | `user.export` |
| `POST /admin/users/:uuid/restrictions` | `user_restrictions` + outbox | `restriction.create` |
| `POST /admin/restrictions/:uuid/lift` | `user_restrictions` + outbox | `restriction.lift` |
| `GET /admin/verifications` | `user_verification_reviews` | `user_verification.read` |
| `POST /admin/verifications/:uuid/decide` | `user_verification_reviews` + outbox | `user_verification.review` |
| `GET /admin/books` | `book_rights_reviews`, `admin.v_book_summary` | `book.read` |
| `POST /admin/books/:uuid/approve` | `book_rights_reviews` + outbox | `book.approve` |
| `POST /admin/books/:uuid/reject` | `book_rights_reviews` + outbox | `book.reject` |
| `POST /admin/books/:uuid/publish` | `book_rights_reviews` + outbox | `book.publish` |
| `GET /admin/rights` | `book_rights_reviews` | `rights.read` |
| `POST /admin/rights/:uuid/approve` | `book_rights_reviews` + outbox | `rights.approve` |
| `POST /admin/rights/:uuid/reject` | `book_rights_reviews` + outbox | `rights.reject` |
| `GET /admin/reports` | `content_reports`, `report_reasons` | `report.read` |
| `PATCH /admin/reports/:uuid` | `content_reports` | `report.update` |
| `POST /admin/reports/:uuid/assign` | `content_reports.assigned_admin_id` | `report.assign` |
| `POST /admin/reports/:uuid/resolve` | `content_reports`, `moderation_actions` | `report.resolve` |
| `GET/POST /admin/cases` | `moderation_cases` | `moderation_case.read/create` |
| `POST /admin/cases/:uuid/close` | `moderation_cases`, `moderation_actions` | `moderation_case.close` |
| `GET/POST /admin/announcements` | `admin_announcements` | `announcement.read/create` |
| `POST /admin/announcements/:uuid/publish` | `admin_announcements` + outbox | `announcement.publish` |
| `GET/PATCH /admin/settings` | `system_settings` | `setting.read/update` |
| `GET/PATCH /admin/flags` | `feature_flags` | `feature_flag.read/update` |
| `GET /admin/roles` | `admin_roles`, `admin_permissions` | `role.read` |
| `POST /admin/roles/:code/permissions` | `admin_role_permissions` | `role.manage` |
| `GET /admin/admins` | `admin_accounts`, `admin_profiles` | `admin_account.read` |
| `POST /admin/admins` | `admin_accounts`, `admin_account_roles` | `admin_account.create` |
| `POST /admin/admins/:uuid/disable` | `admin_accounts`, `admin_sessions` | `admin_account.disable` |
| `GET /admin/audit-logs` | `admin_audit_logs` | `audit_log.read` |
| `GET /admin/audit-logs/export` | `admin_audit_logs` | `audit_log.export` |
| `GET /admin/security-events` | `security_events` | `security_event.read` |
| `GET /admin/integration/outbox` | `integration_outbox` | `integration.read` |
| `POST /admin/integration/outbox/:event_id/retry` | `integration_outbox` | `integration.retry` |
| `GET /admin/metrics` | `system_metrics_daily` | `metric.read` |

### 3.1 Quy tắc ghi audit
- `action` theo mẫu `<resource>.<verb>` (ví dụ `books.publish`), khớp permission đã dùng.
- `before_data`/`after_data` là JSON đã che PII; `diff` chỉ các trường thay đổi.
- `admin_uuid`, `admin_username` là bản sao tại thời điểm thao tác (không JOIN khi đọc).
- `prev_hash` = `record_hash` của bản ghi trước; `record_hash` = SHA-256 canonical JSON + `prev_hash`.
- Trigger chặn `UPDATE`/`DELETE`; muốn sửa phải ghi bản ghi bù mới.

### 3.2 Hành động nhạy cảm
| Hành động | Kiểm soát bổ sung |
|---|---|
| Gán/thu hồi vai trò | Yêu cầu `role.manage` (seed **chỉ** cấp `SUPER_ADMIN`); không cho tự nâng quyền; audit bắt buộc |
| Vô hiệu admin | Thu hồi toàn bộ `admin_sessions`, tạo `security_events` |
| Xóa/ẩn nội dung | Tạo `moderation_actions`, thông báo cho chủ nội dung qua outbox |
| Đổi cấu hình bảo mật | Yêu cầu MFA lại trong 15 phút; ghi `before_data`/`after_data` |
| Export dữ liệu | Ghi audit `audit_log.export`, giới hạn tần suất, file có TTL |

## 4. Sự kiện phát ra từ API

| Endpoint | Sự kiện outbox | Ghi chú |
|---|---|---|
| `POST /reports` | `report.created` | `aggregate_uuid` = `report_uuid` |
| `POST /admin/users/:uuid/restrictions` | `user.restriction.applied` | `aggregate_uuid` = `user_uuid` |
| `POST /admin/restrictions/:uuid/lift` | `user.restriction.lifted` | |
| `POST /admin/books/:uuid/publish` | `book.published` / `book.rights.approved` | Tùy nghiệp vụ |
| `POST /admin/announcements/:uuid/publish` | `announcement.published` | |
| `POST /admin/reports/:uuid/resolve` | `content.moderation.decided` | Kèm `moderation_action_uuid` |

Quy tắc: sự kiện ghi trong **cùng transaction** với thay đổi nghiệp vụ; API trả 2xx chỉ sau khi commit.

## 5. Bất biến dữ liệu API phải giữ

1. Không trả `password_hash`, `token_hash`, `secret_encrypted`, `public_key` thô.
2. Không nhận `status` tùy ý từ client; chuyển trạng thái qua hành động có kiểm soát.
3. Không xóa cứng người dùng/sách/đánh giá; dùng `deleted_at`/`status`.
4. `user_uuid`/`book_uuid` là khóa đối ngoại; khi đổi ID kỹ thuật không đổi UUID.
5. Mọi danh sách công khai phải lọc `visibility` và trạng thái xuất bản ở tầng SQL, không chỉ UI.
6. Giới hạn số bản ghi ghi trong một request (bulk ≤ 100).
7. Khi vi phạm UNIQUE, trả 409 kèm `field` — không nuốt lỗi rồi tạo bản ghi trùng.

---

Hết api_contract.md
