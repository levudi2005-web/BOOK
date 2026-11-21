# AUTHOR_STUDIO.md

> Trạng thái Author Studio: **IMPLEMENTED + TESTED** (backend + giao diện cơ bản `/write`).

## Đã triển khai

- Backend: `StudioService` + `StudioController` (`/studio/books`, `/studio/books/:uuid/chapters`, publish, versions).
- Ownership guard (chỉ chủ sở hữu `created_by_user_id`).
- Migration `011_author_studio.sql`: `book_versions` (snapshot) + `office_documents`.
- Frontend `/write`: danh sách + tạo bản thảo + xuất bản.

## Còn thiếu

- Editor chương đầy đủ (Tiptap), Cover Designer (Fabric.js), templates, import/export DOCX/EPUB/PDF/TXT/MD (cần worker).
- Blocker: chưa cài Tiptap/Fabric/Mammoth/docx; chưa có worker chuyển đổi (ưu tiên sau khi ổn định auth + storage).

