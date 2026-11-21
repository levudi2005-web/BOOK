# Bảo mật dữ liệu — BOOKFORFREEDOM

## 1. Mô hình mối đe dọa tóm tắt

| Mối đe dọa | Kiểm soát chính |
|---|---|
| Chiếm tài khoản người dùng | Argon2id, khóa tạm thời, phiên có thể thu hồi, phát hiện IP/thiết bị lạ |
| Leo thang đặc quyền admin | RBAC theo permission, tách schema, MFA, audit append-only |
| Sửa/xóa dấu vết kiểm toán | Trigger chặn UPDATE/DELETE trên `admin_audit_logs` và `security_events`; `admin_audit_logs` có chuỗi hash `prev_hash`/`record_hash` |
| Đọc trộm token | Chỉ lưu SHA-256 `BINARY(32)`, token gốc chỉ tồn tại ở client/email |
| SQL injection | Prepared statement bắt buộc; DB không cấp quyền DDL cho tài khoản app |
| Rò rỉ dữ liệu qua backup | Mã hóa at-rest, phân quyền file, che PII trong log |
| Phát lại sự kiện tích hợp | `UNIQUE(event_id)` ở inbox, xử lý idempotent |
| Lạm dụng báo cáo/kiểm duyệt | Rate limit, phân quyền theo hành động, audit mọi quyết định |

## 2. Xác thực người dùng

- Hash mật khẩu: **Argon2id** (`password_algorithm='argon2id'`), tham số khuyến nghị m=64 MiB, t=3, p=4; hash lưu `VARCHAR(255)`.
- Không có mật khẩu mặc định trong seed; mọi tài khoản phải được tạo qua quy trình có kiểm soát.
- Chính sách: tối thiểu 12 ký tự, kiểm tra danh sách mật khẩu phổ biến, không cắt ngắn quá 128 ký tự.
- Sai mật khẩu: tăng `failed_login_count`; ngưỡng 5 lần → `locked_until` (khuyến nghị 15 phút, lũy tiến).
- Đổi/đặt lại mật khẩu: cập nhật `password_changed_at`, thu hồi **toàn bộ** `user_sessions` hiện có.
- Token xác minh email / đặt lại mật khẩu:
  - Sinh 32 byte ngẫu nhiên, gửi base64url qua email.
  - DB chỉ lưu `token_hash = SHA-256(token)` trong `BINARY(32)`, có CHECK `OCTET_LENGTH(token_hash)=32`.
  - `expires_at` ngắn (15 phút reset, 24 giờ xác minh), `consumed_at` dùng một lần.
- Session token: hash SHA-256 trong `user_sessions.session_token_hash`; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, xoay vòng khi refresh.
- Thiết bị: `fingerprint_hash` là SHA-256, không lưu fingerprint thô; `is_trusted` chỉ đặt sau xác thực lại.

## 3. Xác thực quản trị

- Tách hoàn toàn `bookadmin.admin_accounts` khỏi `bookuser.users`; không dùng chung mật khẩu/phiên.
- `admin_accounts.mfa_required=1` bắt buộc với `SUPER_ADMIN`, `ADMIN`, `AUDITOR`.
- Phương thức MFA (`admin_mfa_methods.method`):
  - `totp`: secret mã hóa (`secret_encrypted VARBINARY(1024)`), không plaintext.
  - `webauthn`: `credential_id`, `credential_public_key`, `sign_count` chống replay.
  - `recovery_codes`: chỉ lưu hash dùng một lần trong `recovery_code_hashes`.
- `must_change_password=1` cho tài khoản mời; `password_changed_at` theo dõi tuổi mật khẩu.
- `admin_login_attempts` ghi mọi lần thử (append-only); `security_events` ghi sự kiện rủi ro.
- Vô hiệu hóa admin: đặt `status='disabled'`, thu hồi `admin_sessions`, ghi `security_events`.

## 4. Phân quyền RBAC

Mô hình: **Admin → vai trò → quyền**, kiểm tra theo `permission.code` dạng `resource.action`.

| Vai trò | Mục đích | Giới hạn chính |
|---|---|---|
| `SUPER_ADMIN` | Toàn quyền | Không dùng cho vận hành hằng ngày; bắt buộc MFA |
| `ADMIN` | Quản trị vận hành | Có `admin_account.create`, `setting.update`, `user.delete`; **không** có `role.manage`/`permission.manage` (chỉ `SUPER_ADMIN`); khuyến nghị siết quyền tạo admin khi vận hành |
| `CONTENT_MODERATOR` | Kiểm duyệt nội dung | Chỉ sách/đánh giá/bình luận/báo cáo/hạn chế |
| `RIGHTS_REVIEWER` | Thẩm định bản quyền | Chỉ hồ sơ quyền và đọc sách |
| `SUPPORT_AGENT` | Hỗ trợ người dùng | Xác minh, ghi chú, hạn chế cơ bản; không xóa |
| `ANALYST` | Phân tích | Chỉ đọc số liệu/báo cáo; không thao tác |
| `AUDITOR` | Kiểm toán | Chỉ đọc/export audit, security, integration |

Nguyên tắc:
- Kiểm tra quyền ở server cho **mọi** endpoint, không dựa vào ẩn menu UI.
- Không cho tự gán vai trò cao hơn mình; thay đổi vai trò cần `SUPER_ADMIN` và audit.
- Quyền `is_system=1` không xóa; vai trò hệ thống không đổi `code`.
- Cache quyền ngắn hạn (≤ 60 giây) và invalidate khi `admin_role_permissions` thay đổi.

## 5. Audit log chống sửa

`bookadmin.admin_audit_logs` là **append-only**:
- 4 trigger: `BEFORE UPDATE`, `BEFORE DELETE` (và biến thể) ném `SQLSTATE 45000` → mọi nỗ lực sửa đều thất bại.
- Mỗi bản ghi có `prev_hash` (hash bản ghi trước) và `record_hash = SHA-256(canonical_json || prev_hash)`.
- Canonical JSON: khóa sắp xếp, UTF-8, không khoảng trắng thừa; thời gian ISO-8601 có milliseconds.
- Ứng dụng tạo bản ghi trong cùng transaction với thao tác; job kiểm tra chuỗi định kỳ:

```sql
SELECT a.audit_id
FROM bookadmin.admin_audit_logs a
LEFT JOIN bookadmin.admin_audit_logs p ON p.audit_id = a.audit_id - 1
WHERE a.audit_id > 1
  AND (a.prev_hash IS NULL OR p.record_hash IS NULL OR a.prev_hash <> p.record_hash)
LIMIT 50;
```

- Bản ghi audit chứa `admin_uuid`, `admin_username` dạng bản sao, `action`, `resource_type`, `resource_id` (chuỗi), `http_method`, `request_path`, `ip_address VARBINARY(16)`, `user_agent`, `status`, `correlation_id`.
- Không ghi mật khẩu, token, secret, số CCCD đầy đủ vào `before_data`/`after_data`/`diff`.

## 6. Mã hóa và dữ liệu nhạy cảm

| Lớp | Cách làm |
|---|---|
| Truyền tải | TLS 1.2+ bắt buộc; HSTS; không kết nối DB qua Internet công cộng |
| At-rest | Mã hóa ổ đĩa/volume; backup mã hóa; khóa KMS tách khỏi DB |
| MFA secret | `secret_encrypted` mã hóa envelope bằng khóa ứng dụng/KMS |
| Token | Chỉ hash SHA-256; so sánh constant-time |
| IP | `VARBINARY(16)` (IPv4 4 byte, IPv6 16 byte), không lưu dạng chuỗi |
| PII hồ sơ | Trường tự do hạn chế; hiển thị theo nhu cầu; export cần quyền riêng |
| Log ứng dụng | Che email/SĐT/IP; không log payload đầy đủ |

Chính sách lưu trữ đề xuất:
- `security_events`: 12 tháng (hoặc theo quy định).
- `admin_audit_logs`: tối thiểu 24 tháng, không xóa cứng; archive sang kho lạnh có ký.
- `user_sessions` hết hạn: xóa sau 90 ngày kể từ `expires_at`.
- `integration_outbox/inbox` đã xử lý: 90 ngày.
- Token đã dùng/hết hạn: xóa sau 30 ngày.

## 7. Tài khoản DB và đặc quyền tối thiểu

Khuyến nghị tạo tài khoản riêng, không dùng `root` cho ứng dụng:

```sql
-- Ứng dụng người dùng: chỉ DML trên bookuser, không DDL
CREATE USER IF NOT EXISTS 'app_bookuser'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookuser.* TO 'app_bookuser'@'10.0.%';

-- Ứng dụng quản trị: DML trên bookadmin
CREATE USER IF NOT EXISTS 'app_bookadmin'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE ON bookadmin.* TO 'app_bookadmin'@'10.0.%';

-- Worker tích hợp: đọc/ghi outbox, ghi inbox, đọc bảng nghiệp vụ liên quan
CREATE USER IF NOT EXISTS 'svc_integration'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT, UPDATE ON bookuser.integration_outbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookadmin.integration_inbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookadmin.integration_outbox TO 'svc_integration'@'10.0.%';
GRANT SELECT, INSERT, UPDATE ON bookuser.integration_inbox TO 'svc_integration'@'10.0.%';

-- View công khai cần quyền đọc bảng nguồn (SQL SECURITY INVOKER)
GRANT SELECT ON bookadmin.admin_announcements TO 'app_bookuser'@'10.0.%';

-- Chỉ auditor được đọc audit; không cấp UPDATE/DELETE (trigger cũng chặn)
CREATE USER IF NOT EXISTS 'ro_auditor'@'10.0.%' IDENTIFIED BY '<strong-secret>';
GRANT SELECT ON bookadmin.admin_audit_logs TO 'ro_auditor'@'10.0.%';
GRANT SELECT ON bookadmin.security_events TO 'ro_auditor'@'10.0.%';
```

Lưu ý:
- Không cấp `FILE`, `PROCESS`, `SUPER`, `GRANT OPTION` cho tài khoản ứng dụng.
- Nếu dùng view `bookuser.v_public_announcements` với `SQL SECURITY INVOKER`, tài khoản gọi phải có `SELECT` trên `bookadmin.admin_announcements`.
- Tài khoản migration tách biệt, chỉ dùng khi triển khai, có mật khẩu riêng và bị khóa sau khi chạy.

## 8. Sao lưu, phục hồi, kiểm thử

- `mariabackup` full hằng ngày + binlog; lưu off-site, mã hóa, kiểm tra restore hằng tháng.
- Khôi phục phải giữ toàn vẹn chuỗi audit; nếu restore lệch, ghi nhận sự kiện `suspicious_activity`.
- Kiểm thử bảo mật tối thiểu:
  1. Sai mật khẩu 5 lần → khóa tài khoản.
  2. Token reset dùng lại → bị từ chối (`consumed_at`).
  3. Session bị thu hồi → request tiếp theo 401.
  4. Admin thiếu permission → 403 (kể cả khi biết URL).
  5. `UPDATE/DELETE admin_audit_logs` → lỗi 45000.
  6. Inbox nhận trùng `event_id` → không tạo bản ghi nghiệp vụ thứ hai.
  7. User thường không đọc được bảng admin/outbox.

## 9. Checklist trước khi lên production

- [ ] Không còn mật khẩu mặc định; `must_change_password` cho tài khoản mời.
- [ ] MFA bật cho toàn bộ vai trò đặc quyền.
- [ ] TLS, backup mã hóa, restore đã diễn tập.
- [ ] Tài khoản DB đúng đặc quyền tối thiểu; `root` chỉ dùng socket nội bộ.
- [ ] Trigger append-only tồn tại (kiểm tra `information_schema.triggers`).
- [ ] `event_id` UNIQUE ở cả outbox và inbox.
- [ ] Rate limit và `Idempotency-Key` hoạt động.
- [ ] Log không chứa PII/token; audit có `correlation_id`.
- [ ] Kịch bản ứng cứu sự cố (thu hồi phiên, khóa admin, replay DLQ) đã tập dượt.

---

Hết security.md
