# LIBRARIES_AND_LICENSES.md

> Danh mục thư viện (đã cài vs đề xuất) + license. Cập nhật 2026-11-20.

## Đã cài và đang dùng

| Package | Version | Công dụng | License | Vị trí |
|---|---|---|---|---|
| next | 15.5.29 | Web framework | MIT | apps/web |
| react / react-dom | 19 | UI | MIT | apps/web |
| tailwindcss | 3.4 | CSS utility | MIT | apps/web |
| @nestjs/* | 11 | Backend framework | MIT | apps/api |
| mysql2 | 3.11.5 | MariaDB driver (prepared statements) | MIT | apps/api |
| bullmq | 5.41.9 | Queue (chưa dùng logic) | MIT | apps/worker |

## Đề xuất (chưa cài)

| Package | Công dụng | License | Lưu ý |
|---|---|---|---|
| @tiptap/react, starter-kit, extension-* | Rich text editor | MIT (core) | không dùng Pro/Cloud |
| mammoth | DOCX import | BSD-2-Clause | cần sanitize HTML |
| docx | DOCX export | MIT | |
| pdfjs-dist | PDF viewer | Apache-2.0 | |
| epub.js / readium | EPUB reader | BSD/Readium license | cần đánh giá version |
| fabric | Cover designer | MIT | |
| argon2 (tùy chọn) | password hashing | MIT | hiện dùng scrypt để tránh native build |
| nodemailer | SMTP email | MIT | chỉ khi SMTP được cấu hình |
| DOMPurify | sanitize HTML | Apache-2.0/MPL-2.0 | |

## Office Server (optional)

| Giải pháp | License | Trạng thái |
|---|---|---|
| Collabora Online CODE | MPL-2.0 | beta/dev, không khuyến nghị production |
| ONLYOFFICE Docs Community | AGPL-3.0 | cần tuân thủ AGPL, giữ thương hiệu, cung cấp mã nguồn |

## Quy tắc

- Pin version theo lockfile.
- Không cài Tiptap Pro không có license; không cài Collabora + ONLYOFFICE cùng lúc nếu không cần.
- Kiểm tra security advisory trước khi cài.
