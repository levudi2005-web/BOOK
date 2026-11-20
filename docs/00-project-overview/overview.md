# BOOKFORFREEDOM

BOOKFORFREEDOM là nền tảng viết, thiết kế bìa, dàn trang, xuất bản và đọc sách.
Tên dự án trước đây là BOOKVERSE; BOOKFORFREEDOM là tên sử dụng trong scaffold này.

## Thành phần

- `apps/web`: Next.js, TypeScript, Tailwind; auth, dashboard, writing-studio, cover-studio, layout-studio, print-studio, tool-library, reader, community, profile và admin.
- `apps/api`: NestJS; auth, users-roles, books, book-nodes, versions, author-tools, covers, assets-licenses, layouts, exports, publishing, moderation, storage-quota, backup, search và audit-log.
- `apps/worker`: Node.js, TypeScript, BullMQ; pdf-export, print-export, epub-export, docx-convert, image-processing, font-processing và backup-jobs.
- `packages/`: document-model, layout-engine, spine-calculator, db, permissions, shared-types, ui và config.
- `resources/`, `infra/`, `docs/`, `tests/`, `scripts/`: tài nguyên, vận hành, tài liệu và kiểm thử.

Scaffold chỉ cung cấp cấu trúc và endpoint `/health`; chưa có nghiệp vụ, schema chi tiết hoặc giao diện sản phẩm.
