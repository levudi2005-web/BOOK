# Tích hợp dữ liệu giữa `bookuser` và `bookadmin`

## 1. Mục tiêu và ràng buộc

- Hai schema có vòng đời và quyền truy cập khác nhau, **không đặt FK xuyên database**.
- Đồng bộ qua **Transactional Outbox / Idempotent Inbox**, giao hàng **ít nhất một lần** (at-least-once).
- Không có khóa phân tán, không đọc trực tiếp bảng nội bộ của schema còn lại (trừ view được kiểm soát).
- Mọi sự kiện mang `event_id` UUID; phía nhận chống trùng bằng `UNIQUE(event_id)`.
- Thứ tự chỉ được bảo đảm **trong cùng một aggregate** nếu worker dùng khóa theo `aggregate_id`.

## 2. Cấu trúc hai bảng

Mỗi schema có cặp bảng giống nhau về hình dạng:

| Thành phần | `integration_outbox` | `integration_inbox` |
|---|---|---|
| Khóa chống trùng | `UNIQUE(event_id)` | `UNIQUE(event_id)` |
| Trạng thái | `pending, processing, processed, failed, dead_letter` | thêm `skipped` |
| Thử lại | `attempt_count`, `max_attempts` (mặc định 10), `next_attempt_at` | như outbox |
| Khóa worker | `locked_by`, `locked_at` | `locked_by`, `locked_at` |
| Dấu thời gian | `occurred_at`, `created_at`, `processed_at` | `received_at`, `next_attempt_at`, `processed_at` |
| Nội dung | `aggregate_type`, `aggregate_id`, `aggregate_uuid`, `event_type`, `payload` JSON, `headers` JSON | `source_schema`, `source_event_type`, cùng payload/headers |

Index phục vụ worker: `(status, next_attempt_at)`; riêng inbox admin có `(status, next_attempt_at, received_at)`.

## 3. Phong bì sự kiện (event envelope)

```json
{
  "event_id": "0f1c2b3a-4d5e-4f60-8a91-2b3c4d5e6f70",
  "event_type": "book.published",
  "aggregate_type": "book",
  "aggregate_id": "1234",
  "aggregate_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "occurred_at": "2026-11-20T18:00:00.000Z",
  "schema_version": 1,
  "producer": "bookuser",
  "correlation_id": "a1b2c3d4-0000-4000-8000-000000000001",
  "payload": {
    "book_id": 1234,
    "book_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "status": "published",
    "visibility": "public",
    "published_at": "2026-11-20T18:00:00.000Z"
  }
}
```

Quy tắc payload:
- Chỉ chứa dữ liệu cần cho phía nhận; **không** chứa mật khẩu, token, số CCCD, địa chỉ đầy đủ.
- `headers` chứa `schema_version`, `producer`, `correlation_id`, `traceparent` (nếu có).
- Trường tra cứu (`user_id`, `book_id`, `status`) nằm ở cột riêng, không chỉ trong JSON.

## 4. Danh mục sự kiện

### 4.1 `bookuser` → `bookadmin`

| `event_type` | Aggregate | Khi phát sinh | Phía admin dùng để |
|---|---|---|---|
| `user.created` | `user` | Đăng ký thành công | Tạo hồ sơ theo dõi, thống kê |
| `user.updated` | `user` | Đổi hồ sơ/email | Đồng bộ bản sao UUID, hồ sơ |
| `user.status_changed` | `user` | Khóa/mở khóa/xóa mềm | Cập nhật tổng hợp, ngừng gửi |
| `user.deleted` | `user` | Xóa tài khoản | Ẩn khỏi vận hành, lưu vết |
| `book.created` | `book` | Tạo bản nháp | Theo dõi nội bộ |
| `book.submitted` | `book` | Gửi duyệt | Tạo/chờ hồ sơ duyệt |
| `book.published` | `book` | Xuất bản | Cập nhật `v_book_summary` |
| `book.unpublished` | `book` | Gỡ xuất bản | Thu hồi hiển thị |
| `book.deleted` | `book` | Xóa mềm | Đóng hồ sơ liên quan |
| `review.created` | `review` | Đánh giá mới | Kiểm duyệt tự động/thủ công |
| `comment.created` | `comment` | Bình luận mới | Kiểm duyệt |
| `report.created` | `report` | Người dùng báo cáo | Tạo `content_reports` (kèm `source_user_report_id`) |
| `rights.requested` | `book_rights` | Gửi hồ sơ quyền | Tạo `book_rights_reviews` |
| `download.completed` | `download` | Tải thành công | Số liệu, phát hiện lạm dụng |

### 4.2 `bookadmin` → `bookuser`

| `event_type` | Aggregate | Khi phát sinh | Phía người dùng dùng để |
|---|---|---|---|
| `user.restriction.applied` | `user` | Admin áp hạn chế | Khóa đăng nhập/tải/bình luận |
| `user.restriction.lifted` | `user` | Gỡ hạn chế | Mở lại quyền |
| `user.verification.approved` | `user` | Duyệt xác minh | Gắn huy hiệu, mở tính năng |
| `user.verification.rejected` | `user` | Từ chối xác minh | Thông báo lý do |
| `content.moderation.decided` | `review`/`comment` | Kết luận kiểm duyệt | Ẩn/xóa nội dung, thông báo |
| `book.rights.approved` | `book_rights` | Duyệt quyền | Cho phép phân phối |
| `book.rights.rejected` | `book_rights` | Từ chối quyền | Chặn xuất bản |
| `announcement.published` | `announcement` | Phát hành thông báo | Hết hạn cache, hiển thị |
| `admin.security_alert` | `admin` | Sự kiện bảo mật nghiêm trọng | Vô hiệu phiên liên quan |

## 5. Giao thức phía phát (Outbox)

### 5.1 Ghi sự kiện cùng transaction nghiệp vụ

```sql
START TRANSACTION;
-- 1) Thay đổi nghiệp vụ
UPDATE bookuser.books
SET status = 'published', published_at = NOW(3)
WHERE book_id = 1234 AND status = 'approved';

-- 2) Ghi outbox trong CÙNG transaction (không gọi HTTP ở bước này)
INSERT INTO bookuser.integration_outbox
  (event_id, aggregate_type, aggregate_id, aggregate_uuid, event_type, payload, headers, occurred_at)
VALUES
  (UUID(), 'book', '1234', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'book.published',
   JSON_OBJECT('book_id',1234,'status','published','published_at',DATE_FORMAT(NOW(3),'%Y-%m-%dT%H:%i:%s.%fZ')),
   JSON_OBJECT('schema_version',1,'producer','bookuser'), NOW(3));
COMMIT;  -- hoặc ROLLBACK: sự kiện không bao giờ mất/lệch với dữ liệu
```

### 5.2 Worker nhận việc (khóa mềm, an toàn đa tiến trình)

```sql
START TRANSACTION;
SELECT outbox_id, event_id, event_type, payload
FROM bookuser.integration_outbox
WHERE status IN ('pending','failed')
  AND next_attempt_at <= NOW(3)
ORDER BY outbox_id
LIMIT 20
FOR UPDATE SKIP LOCKED;

UPDATE bookuser.integration_outbox
SET status='processing', locked_by=?, locked_at=NOW(3), attempt_count=attempt_count+1
WHERE outbox_id IN (...);
COMMIT;
```

Sau khi gửi:
- Thành công: `status='processed', processed_at=NOW(3), locked_by=NULL, last_error=NULL`.
- Lỗi tạm thời: `status='failed'`, `next_attempt_at = NOW(3) + INTERVAL LEAST(3600, POW(2, attempt_count)*5) SECOND`.
- Hết `max_attempts`: `status='dead_letter'`, giữ `last_error` để điều tra.
- Worker chết giữa chừng: job dọn `status='processing' AND locked_at < NOW(3) - INTERVAL 10 MINUTE` đưa về `failed`.

## 6. Giao thức phía nhận (Inbox)

```sql
START TRANSACTION;
-- 1) Chèn idempotent; duplicate event_id => 1062, coi như đã xử lý
INSERT INTO bookadmin.integration_inbox
  (event_id, source_schema, source_event_type, aggregate_type, aggregate_id, aggregate_uuid, payload, headers)
VALUES (?, 'bookuser', ?, ?, ?, ?, ?, ?);

-- 2) Nếu insert thành công: xử lý nghiệp vụ + đánh dấu processed trong CÙNG transaction
UPDATE bookadmin.content_reports SET status='triaged' WHERE report_uuid=?;
UPDATE bookadmin.integration_inbox
SET status='processed', processed_at=NOW(3)
WHERE event_id=?;
COMMIT;
```

Quy tắc:
- **Không** dùng `INSERT ... ON DUPLICATE KEY UPDATE` cho inbox: cần phân biệt “mới” và “trùng” để tránh xử lý hai lần.
- Nếu nghiệp vụ lỗi: `status='failed'`, tăng `attempt_count`, đặt `next_attempt_at`; không rollback bản ghi inbox đã nhận.
- `source_schema` chỉ nhận `bookuser`, `bookadmin`, `external` (CHECK enum).
- `source_event_type` giữ nguyên tên gốc để truy vết.
- Sự kiện không áp dụng (ví dụ phiên bản schema mới): `status='skipped'` kèm lý do.

### 6.1 Xử lý trùng và thứ tự

| Tình huống | Hành vi |
|---|---|
| Nhận trùng `event_id` | Bỏ qua, ACK thành công (đã xử lý trước đó) |
| Hai sự kiện cùng aggregate đến lệch thứ tự | Dùng `occurred_at`/`schema_version`; nếu cũ hơn trạng thái hiện tại thì `skipped` |
| Worker gửi thành công nhưng ACK thất bại | Phía gửi retry → phía nhận thấy trùng → bỏ qua |
| Payload sai schema | `failed` + `last_error`, không retry vô hạn → `dead_letter` |

## 7. Đối soát và vận hành

```sql
-- Outbox tồn đọng quá 15 phút
SELECT status, COUNT(*) AS n, MIN(created_at) AS oldest
FROM bookuser.integration_outbox
WHERE status IN ('pending','failed','processing')
GROUP BY status;

-- Dead letter cần xử lý
SELECT outbox_id, event_id, event_type, attempt_count, last_error, updated_at
FROM bookadmin.integration_outbox
WHERE status='dead_letter'
ORDER BY updated_at DESC;

-- Gửi lại thủ công một sự kiện
UPDATE bookadmin.integration_outbox
SET status='pending', next_attempt_at=NOW(3), locked_by=NULL, locked_at=NULL
WHERE event_id=? AND status='dead_letter';

-- Đối soát báo cáo: bookuser.user_reports đã có bản sao trong admin chưa?
SELECT r.report_id, r.report_uuid, r.created_at
FROM bookuser.user_reports r
LEFT JOIN bookadmin.content_reports c ON c.source_user_report_id = r.report_id
WHERE r.created_at >= NOW(3) - INTERVAL 1 DAY
  AND c.report_id IS NULL;

-- Đối soát người dùng bị hạn chế nhưng không còn tồn tại ở bookuser
SELECT ur.restriction_id, ur.user_id, ur.user_uuid
FROM bookadmin.user_restrictions ur
LEFT JOIN bookuser.users u ON u.user_id = ur.user_id
WHERE u.user_id IS NULL;

-- Lưu trữ outbox đã xử lý (job hàng ngày, giữ tối thiểu 30 ngày)
DELETE FROM bookuser.integration_outbox
WHERE status='processed' AND processed_at < NOW(3) - INTERVAL 90 DAY
LIMIT 10000;
```

## 8. Bảo mật tích hợp

- Tài khoản DB của worker chỉ có `SELECT, UPDATE` trên outbox/inbox và quyền tối thiểu trên bảng nghiệp vụ.
- Payload không chứa bí mật; nếu cần tham chiếu, dùng ID rồi phía nhận tự đọc.
- Ký/đối chiếu `correlation_id` giữa log ứng dụng và `admin_audit_logs.correlation_id`.
- Giới hạn kích thước payload (khuyến nghị ≤ 64 KB) và kiểm tra `JSON_VALID` ở DB.
- Không cho phép người dùng cuối đọc bảng outbox/inbox.

---

Hết cross_database_integration.md
