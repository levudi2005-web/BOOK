# Database Package

Điểm đặt sau này cho schema CSDL, migration và seed; chưa khai báo bảng chi tiết.
CSDL mục tiêu là **MariaDB 10.11** với hai schema `bookuser` và `bookadmin`; DDL và tài liệu nằm trong `database/`.
Kết nối dùng hai user riêng (`BOOKUSER_DB_*`, `BOOKADMIN_DB_*`), không dùng FK xuyên database.
Dự kiến Giai đoạn 0; phụ thuộc `@bff/permissions` và `@bff/shared-types`.
