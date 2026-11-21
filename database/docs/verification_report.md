# Báo cáo kiểm tra schema

## 1. Môi trường kiểm thử

| Thành phần | Giá trị |
|---|---|
| MariaDB | 10.11.14-MariaDB (Ubuntu 24.04) |
| Engine | InnoDB |
| Charset/collation | `utf8mb4` / `utf8mb4_unicode_ci` |
| Múi giờ | UTC (`SYSTEM` → UTC) |
| Cách chạy | `sudo mysql --default-character-set=utf8mb4 < file.sql` |
| Docker (kiểm tra bổ sung) | `mariadb:10.11.19`, tự cài qua `infra/docker/mariadb/init.sh` |

## 2. Kết quả tổng hợp

| Schema | Bảng | View | FK | Check PASS | INFO | FAIL |
|---|---:|---:|---:|---:|---:|---:|
| `bookuser` | 35 | 1 | 57 | 18 | 1 | **0** |
| `bookadmin` | 28 | 2 | 31 | 23 | 1 | **0** |
| **Tổng** | **63** | **3** | **88** | **41** | **2** | **0** |

- `INFO` là số liệu tham khảo (số tài khoản khởi tạo = 0), không phải lỗi.
- Không có `FAIL`/`ERROR` khi chạy `install_all.sql` trên môi trường sạch sau `DROP DATABASE`.
- Chạy lại `install_all.sql` lần hai không lỗi → DDL và seed idempotent.
- Container `mariadb:10.11` khởi tạo sạch: 63 bảng, 3 view, 88 FK; `app_bookuser` đọc được view, `app_bookadmin` đọc được RBAC.

Lệnh tái lập:

```bash
cd /var/www/BOOKFORFREEDOM/database/sql
sudo mysql --default-character-set=utf8mb4 < install_all.sql 2>&1 | tee /tmp/install.log
grep -E "FAIL|ERROR" /tmp/install.log || echo "0 FAIL/ERROR"

sudo mysql --default-character-set=utf8mb4 < bookuser/007_verify.sql
sudo mysql --default-character-set=utf8mb4 < bookadmin/007_verify.sql

# Kiểm tra bản Docker
docker compose up -d mariadb
docker compose ps mariadb
docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES;"'
```

## 3. Chi tiết kiểm tra `bookuser`

| # | Hạng mục | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|---|
| 01 | Charset/collation database | `utf8mb4/utf8mb4_unicode_ci` | đúng | PASS |
| 02 | Số bảng | 35 | 35 | PASS |
| 03 | Số view | 1 | 1 | PASS |
| 04 | Số FK | 57 | 57 | PASS |
| 05 | Bảng thiếu PK | 0 | 0 | PASS |
| 06 | Bảng không InnoDB | 0 | 0 | PASS |
| 07 | Bảng không utf8mb4 | 0 | 0 | PASS |
| 08 | Bảng thiếu COMMENT | 0 | 0 | PASS |
| 09 | Cột thiếu COMMENT | 0 | 0 | PASS |
| 10 | FK xuyên database | 0 | 0 | PASS |
| 11 | FK lệch kiểu dữ liệu | 0 | 0 | PASS |
| 12 | Cột FK thiếu index trái cùng | 0 | 0 | PASS |
| 13 | Cột generated STORED | ≥ 6 | 6 | PASS |
| 14 | CHECK constraint | ≥ 1 | 47 | PASS |
| 15 | Bảng outbox + inbox | 2 | 2 | PASS |
| 16 | UNIQUE `event_id` outbox | 1 | 1 | PASS |
| 17 | UNIQUE `event_id` inbox | 1 | 1 | PASS |
| 18 | Seed `licenses` | 8 | 8 | PASS |
| 19 | Tài khoản người dùng khởi tạo | 0 | 0 | INFO |

## 4. Chi tiết kiểm tra `bookadmin`

| # | Hạng mục | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|---|
| 01 | Charset/collation database | `utf8mb4/utf8mb4_unicode_ci` | đúng | PASS |
| 02 | Số bảng | 28 | 28 | PASS |
| 03 | Số view | 2 | 2 | PASS |
| 04 | Số FK | 31 | 31 | PASS |
| 05 | Bảng thiếu PK | 0 | 0 | PASS |
| 06 | Bảng không InnoDB | 0 | 0 | PASS |
| 07 | Bảng không utf8mb4 | 0 | 0 | PASS |
| 08 | Bảng thiếu COMMENT | 0 | 0 | PASS |
| 09 | Cột thiếu COMMENT | 0 | 0 | PASS |
| 10 | FK xuyên database | 0 | 0 | PASS |
| 11 | FK lệch kiểu dữ liệu | 0 | 0 | PASS |
| 12 | Cột FK thiếu index trái cùng | 0 | 0 | PASS |
| 13 | Cột generated STORED | ≥ 2 | 2 | PASS |
| 14 | CHECK constraint | ≥ 1 | 46 | PASS |
| 15 | Trigger bảo vệ append-only | 4 | 4 | PASS |
| 16 | Cột hash chuỗi audit | 2 (`prev_hash`, `record_hash`) | 2 | PASS |
| 17 | Vai trò hệ thống | 7 | 7 | PASS |
| 18 | Quyền hệ thống | 76 | 76 | PASS |
| 19 | Gán quyền cho vai trò | ≥ 200 | 212 | PASS |
| 20 | Lý do báo cáo | 12 | 12 | PASS |
| 21 | Tài khoản quản trị khởi tạo | 0 | 0 | INFO |
| 22 | Bảng outbox + inbox | 2 | 2 | PASS |
| 23 | UNIQUE `event_id` outbox | 1 | 1 | PASS |
| 24 | UNIQUE `event_id` inbox | 1 | 1 | PASS |

## 5. Kiểm thử chức năng DML (đã rollback)

Các kiểm thử chạy trong transaction và `ROLLBACK` để không để lại dữ liệu thử.

| # | Kịch bản | Kỳ vọng | Kết quả |
|---|---|---|---|
| 1 | Đọc `bookuser.v_public_announcements` (view đọc bảng `bookadmin`) | Trả về đúng cột, không lỗi quyền (chạy bằng root) | PASS |
| 2 | JOIN FK `books` → `book_chapters` | Trả về chương thuộc sách | PASS |
| 3 | Ghi cột generated `reviews.active_book_id` | Sinh giá trị khi chưa xóa; NULL khi `status='deleted'` hoặc `deleted_at` khác NULL | PASS |
| 4 | `UPDATE bookadmin.admin_audit_logs` | Bị từ chối `SQLSTATE 45000` | PASS |
| 5 | `DELETE bookadmin.admin_audit_logs` | Bị từ chối `SQLSTATE 45000` | PASS |
| 6 | Chèn outbox trùng `event_id` | Lỗi 1062 (UNIQUE) | PASS |
| 7 | Retry sự kiện: `failed` → `pending` → `processed` | Chuyển trạng thái hợp lệ, `processed_at` được đặt | PASS |
| 8 | Chèn inbox trùng `event_id` | Lỗi 1062, không tạo bản ghi nghiệp vụ thứ hai | PASS |

Ví dụ tái lập nhanh (không commit):

```sql
START TRANSACTION;
INSERT INTO bookadmin.admin_audit_logs
  (audit_uuid, admin_id, admin_uuid, admin_username, actor_type, action,
   resource_type, status, prev_hash, record_hash)
VALUES (UUID(), NULL, UUID(), 'system', 'system', 'test.append',
        'test', 'success', UNHEX(REPEAT('0',64)), UNHEX(REPEAT('1',64)));

-- Kỳ vọng: ERROR 1644 (45000)
UPDATE bookadmin.admin_audit_logs SET action='tampered' WHERE action='test.append';
ROLLBACK;
```

```sql
START TRANSACTION;
INSERT INTO bookuser.integration_outbox
  (event_id, aggregate_type, aggregate_id, event_type, payload)
VALUES ('11111111-1111-4111-8111-111111111111','test','1','test.event', JSON_OBJECT('x',1));
-- Chèn lần hai cùng event_id: kỳ vọng 1062
INSERT INTO bookuser.integration_outbox
  (event_id, aggregate_type, aggregate_id, event_type, payload)
VALUES ('11111111-1111-4111-8111-111111111111','test','1','test.event', JSON_OBJECT('x',1));
ROLLBACK;
```

## 6. Kiểm thử bảo mật và ràng buộc

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Append-only audit | 4 trigger chặn UPDATE/DELETE | PASS |
| Chuỗi hash audit | Có `prev_hash`, `record_hash`, kiểu `BINARY(32)` | PASS |
| Token chỉ lưu hash | `token_hash BINARY(32)` + CHECK độ dài | PASS (kiểm tra cấu trúc) |
| Không mật khẩu mặc định | Seed không tạo `admin_accounts`/`users` | PASS |
| RBAC đủ quyền | 76 permission, 7 vai trò, 212 gán | PASS |
| Không FK xuyên DB | 0 FK giữa hai schema | PASS |
| Unique tự nhiên | UUID, email, username, slug, event_id | PASS (kiểm tra index) |
| CHECK logic thời gian | 47 + 46 CHECK constraint | PASS (tồn tại) |

Các kiểm thử **chưa** thực hiện trong phạm vi này:
- Xác thực Argon2id thực tế (do ứng dụng thực hiện, DB chỉ lưu hash).
- Luồng MFA/WebAuthn end-to-end.
- Rate limit, Idempotency-Key (tầng API/Redis).
- Kiểm thử xâm nhập, quét lỗ hổng.
- Đo tải và tối ưu `EXPLAIN` cho mọi truy vấn.

## 7. Sai lệch và giới hạn đã biết

1. **Hạ tầng đã chuyển sang MariaDB**: `docker-compose.yml` dùng `mariadb:10.11`, tự cài hai schema và tạo user ứng dụng khi volume mới; `.env.example` dùng `mysql://...` và cổng `3307`. Lớp truy cập DB trong API mới là khung (`packages/db` chưa có repository/ORM), nên ứng dụng chưa đọc/ghi dữ liệu thật.
2. **Không có FK xuyên database** (đúng thiết kế). Tính toàn vẹn `user_id`/`book_id` giữa hai schema do ứng dụng/worker bảo đảm và đối soát định kỳ.
3. **PowerDesigner chưa được chạy thực tế** trong môi trường này (không có license/cài đặt). `powerdesigner_guide.md` mô tả quy trình và các điểm cần kiểm tra; file `database/ddl/*_schema.sql` đã sẵn sàng để reverse.
4. **Trigger không nằm trong file export PowerDesigner**; nguồn chuẩn là `002_create_tables.sql` và `003_create_constraints.sql`.
5. **Kiểm thử hiện là SQL thủ công**, chưa tự động hóa trong CI. Khi tích hợp ứng dụng nên chuyển thành test container (Testcontainers MariaDB).
6. **Chưa có kiểm thử hiệu năng**; các index được thiết kế theo truy vấn dự kiến nhưng cần xác nhận bằng `EXPLAIN` trên dữ liệu thật.
7. **Seed không tạo tài khoản admin**; cần quy trình tạo thủ công có kiểm soát (xem `installation.md`).
8. **View `v_public_announcements`** cần `GRANT SELECT` trên `bookadmin.admin_announcements` cho tài khoản gọi (SQL SECURITY INVOKER).

## 8. Checklist tái lập

- [ ] `install_all.sql` chạy sạch, exit code 0.
- [ ] Chạy lại lần hai vẫn sạch.
- [ ] `007_verify.sql` của hai schema: 0 FAIL.
- [ ] 63 bảng, 3 view, 88 FK.
- [ ] 41 PASS, 2 INFO, 0 FAIL.
- [ ] 8 kiểm thử DML rollback đạt.
- [ ] Tài liệu/ERD sinh lại từ schema hiện tại.
- [ ] `database/ddl/*_schema.sql` export lại và khớp số bảng/FK.

---

Hết verification_report.md
