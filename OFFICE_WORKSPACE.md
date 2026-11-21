# OFFICE_WORKSPACE.md

> Thiết kế BOOKFORFREEDOM OFFICE WORKSPACE (`/office`). **Writer: IMPLEMENTED.**

## Đã triển khai

- Writer `/office/writer` — soạn thảo văn bản (contentEditable + toolbar bold/italic/underline/heading/list) + autosave.
- Backend `documents` API: `GET/POST/PUT/DELETE /documents`, lưu JSON có cấu trúc vào bảng `office_documents` (MariaDB).
- Test: tạo → cập nhật → đọc tài liệu (integration test).

## Chưa triển khai (BLOCKED bởi RAM)

- Calc `/office/calc`, Impress `/office/impress`, Draw `/office/draw` — cần office server nặng (Collabora/ONLYOFFICE); chưa benchmark RAM/CPU nên chưa cài.
- Tiptap/Mammoth/docx/Fabric/PDF.js — chưa cài (đánh giá license + RAM sau khi ổn định backend).

## Nguyên tắc

- Tài liệu chính thức **lưu trong MariaDB** (SQL Storage), không lưu filesystem/volume.

