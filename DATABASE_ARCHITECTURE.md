# DATABASE_ARCHITECTURE.md

> Kiến trúc 2 database trên cùng MariaDB. Cập nhật 2026-11-20.

## Tổng quan

- `bookuser`: dữ liệu người dùng, tác giả, sách, chương, lưu trữ cá nhân, cộng đồng.
- `bookadmin`: quản trị, phân quyền, kiểm duyệt, nhật ký, cảnh báo, vận hành.
- **Không FK vật lý xuyên database.** Liên kết logic qua `*_uuid`, `user_id`, `event_id`.

## Số liệu hiện tại

| Schema | Bảng | View | Dữ liệu |
|---|---|---|---|
| bookuser | 35 | 1 (`v_public_announcements`) | 0 dòng |
| bookadmin | 28 | 2 (`v_user_summary`, `v_book_summary`) | 0 dòng |

## Giao tiếp hai chiều (outbox/inbox)

Mỗi schema có `integration_outbox` + `integration_inbox` (UNIQUE event_id).

- Cơ chế thực tế đang dùng: **at-least-once + idempotency** (không tuyên bố exactly-once).
- Nghiệp vụ + outbox ghi **cùng transaction** ở DB nguồn.
- Consumer chèn inbox trước, xử lý idempotent, đánh dấu `processed` cùng transaction.
- Retry lũy tiến → `dead_letter`.

## Sự kiện dự kiến

User → Admin: `user.created`, `book.submitted`, `content.reported`, `storage.quota.warning`.
Admin → User: `book.approved`, `book.rejected`, `user.restricted`, `chapter.approved`, `notification.created`, `announcement.published`.

## Lưu ý vận hành

- `bookuser.v_public_announcements` là `SQL SECURITY INVOKER`, đọc `bookadmin.admin_announcements`; `app_bookuser` cần `SELECT` trên bảng nguồn.
- Chưa tạo user `svc_integration` (dành cho worker tích hợp).
