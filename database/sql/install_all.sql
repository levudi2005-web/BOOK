-- =====================================================================
-- BOOKFORFREEDOM - Cài đặt toàn bộ database (MariaDB 10.11+)
-- ---------------------------------------------------------------------
-- CÁCH DÙNG (bắt buộc chạy từ thư mục chứa file này để SOURCE tương đối):
--     cd database/sql
--     sudo mysql --default-character-set=utf8mb4 < install_all.sql
--
-- Thứ tự thực thi (quan trọng):
--   bookadmin: 001 -> 006 (database, tables, constraints, indexes,
--              views, seed) - tạo trước để bookuser tham chiếu được
--              bookadmin.admin_announcements trong view.
--   bookuser : 001 -> 007
--   bookadmin: 007 (verify sau cùng, đủ cả hai schema)
--
-- Phụ thuộc: bookuser.v_public_announcements (SQL SECURITY INVOKER)
-- đọc bảng bookadmin.admin_announcements => phải tồn tại trước khi
-- tạo view. Đây là phụ thuộc một chiều, không có FK xuyên database.
--
-- Đặc điểm:
--   * Idempotent: chạy lại nhiều lần không gây lỗi, không mất dữ liệu.
--   * KHÔNG chứa DROP DATABASE, KHÔNG tạo tài khoản quản trị mặc định.
--   * Toàn bộ DDL dùng utf8mb4 / utf8mb4_unicode_ci, InnoDB,
--     DATETIME(3) theo UTC.
--   * Sau khi cài đặt, cấp quyền cho tài khoản ứng dụng theo
--     docs/installation.md (bao gồm GRANT SELECT trên
--     bookadmin.admin_announcements cho view bookuser.v_public_announcements).
-- =====================================================================

SET NAMES utf8mb4;
SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------
-- Schema bookadmin (quản trị, kiểm duyệt, tích hợp)
-- ---------------------------------------------------------------------
SOURCE bookadmin/001_create_database.sql;
SOURCE bookadmin/002_create_tables.sql;
SOURCE bookadmin/003_create_constraints.sql;
SOURCE bookadmin/004_create_indexes.sql;
SOURCE bookadmin/005_create_views.sql;
SOURCE bookadmin/006_seed_reference_data.sql;

-- ---------------------------------------------------------------------
-- Schema bookuser (dữ liệu người dùng) - sau bookadmin vì view
-- v_public_announcements tham chiếu bookadmin.admin_announcements
-- ---------------------------------------------------------------------
SOURCE bookuser/001_create_database.sql;
SOURCE bookuser/002_create_tables.sql;
SOURCE bookuser/003_create_constraints.sql;
SOURCE bookuser/004_create_indexes.sql;
SOURCE bookuser/005_create_views.sql;
SOURCE bookuser/006_seed_reference_data.sql;
SOURCE bookuser/007_verify.sql;

-- ---------------------------------------------------------------------
-- Kiểm tra schema bookadmin sau khi đã cài đủ hai schema
-- ---------------------------------------------------------------------
SOURCE bookadmin/007_verify.sql;

SET SQL_MODE = @OLD_SQL_MODE;

-- =====================================================================
-- Hết install_all.sql
-- =====================================================================