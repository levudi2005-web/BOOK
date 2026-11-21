# FEATURE_MATRIX.md — BOOKFORFREEDOM

> Ma trận trang/chức năng/API/database/trạng thái. Cập nhật 2026-11-20.

| Trang | Chức năng | API | Database | Trạng thái |
|---|---|---|---|---|
| Home `/` | Hero, search, sách nổi bật, danh mục | `GET /api/books`, `GET /api/categories` | bookuser | PARTIAL (đã nối API; dữ liệu rỗng) |
| Discover `/discover` | Lọc danh mục, sắp xếp, phân trang, grid/list | `GET /api/books`, `GET /api/categories` | bookuser | PARTIAL (đã nối API) |
| Categories `/categories` | Danh sách danh mục | `GET /api/categories` | bookuser | PARTIAL (đã nối API) |
| Book detail `/books/[slug]` | Thông tin sách, tác giả, danh mục | `GET /api/books/:slug` | bookuser | PARTIAL (đã nối API) |
| Reader `/read/[bookId]` | Đọc, bookmark, tiến độ, theme, font | (chưa có) | bookuser | NOT IMPLEMENTED (UI shell có) |
| Library `/library` | Sách đã lưu/đang đọc/hoàn thành | (chưa có) | bookuser | NOT IMPLEMENTED (UI shell) |
| Community `/community` | Bình luận, đánh giá, theo dõi | (chưa có) | bookuser | NOT IMPLEMENTED (UI shell) |
| Auth `/auth/*` | Đăng ký (không email), login/logout, reset/change password bằng Recovery Key, rotate key | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/reset-password`, `POST /api/auth/change-password`, `POST /api/auth/security-key/rotate` | bookuser (`users`, `user_sessions`, `user_recovery_credentials`) | PARTIAL (login/session/Recovery Key hoạt động; refresh token/JWT/RBAC chưa có) |
| Profile `/profile` | Hồ sơ, thống kê, tác phẩm | (chưa có) | bookuser | NOT IMPLEMENTED (UI shell) |
| Author Studio `/write` | Sáng tác, chương, bìa, thiết kế | (chưa có) | bookuser | NOT IMPLEMENTED |
| SQL Storage | Upload chunk, quota 400 MiB | (chưa có) | bookuser | NOT IMPLEMENTED |
| Storage Alerts | Cảnh báo quota 70/85/95/100% | (chưa có) | bookuser + bookadmin | NOT IMPLEMENTED |
| Admin `/admin` | Overview, users, books, moderation… | (chưa có) | bookadmin | PARTIAL (UI shell) |
| Docker Monitor | Trạng thái container/DB | (chưa có) | bookadmin | NOT IMPLEMENTED |
