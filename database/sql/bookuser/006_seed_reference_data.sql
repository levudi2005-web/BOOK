-- =====================================================================
-- BOOKFORFREEDOM - Schema bookuser
-- 006_seed_reference_data.sql : Dữ liệu tham chiếu (giấy phép)
-- ---------------------------------------------------------------------
-- Chỉ dữ liệu hệ thống, không chứa dữ liệu người dùng.
-- Mã code khớp với bookadmin.book_rights_reviews.license_code.
-- Idempotent: INSERT ... ON DUPLICATE KEY UPDATE theo uq_licenses_code.
-- =====================================================================

USE `bookuser`;
SET NAMES utf8mb4;

INSERT INTO `licenses`
  (`code`, `name`, `description`, `license_type`, `url`,
   `allows_commercial`, `allows_derivatives`, `requires_attribution`, `allows_download`, `is_active`)
VALUES
  ('PUBLIC_DOMAIN', 'Phạm vi công cộng', 'Tác phẩm hết thời hạn bảo hộ hoặc được hiến tặng cho cộng đồng', 'public_domain', 'https://creativecommons.org/publicdomain/mark/1.0/', 1, 1, 0, 1, 1),
  ('CC0', 'CC0 1.0', 'Từ bỏ quyền tối đa, không yêu cầu ghi công', 'creative_commons', 'https://creativecommons.org/publicdomain/zero/1.0/', 1, 1, 0, 1, 1),
  ('CC_BY', 'CC BY 4.0', 'Ghi công tác giả, cho phép sử dụng thương mại và phái sinh', 'creative_commons', 'https://creativecommons.org/licenses/by/4.0/', 1, 1, 1, 1, 1),
  ('CC_BY_SA', 'CC BY-SA 4.0', 'Ghi công, chia sẻ tương tự, cho phép thương mại', 'creative_commons', 'https://creativecommons.org/licenses/by-sa/4.0/', 1, 1, 1, 1, 1),
  ('CC_BY_NC', 'CC BY-NC 4.0', 'Ghi công, không sử dụng thương mại', 'creative_commons', 'https://creativecommons.org/licenses/by-nc/4.0/', 0, 1, 1, 1, 1),
  ('CC_BY_NC_SA', 'CC BY-NC-SA 4.0', 'Ghi công, phi thương mại, chia sẻ tương tự', 'creative_commons', 'https://creativecommons.org/licenses/by-nc-sa/4.0/', 0, 1, 1, 1, 1),
  ('ALL_RIGHTS_RESERVED', 'Bản quyền đầy đủ', 'Chỉ phân phối theo thỏa thuận riêng với chủ quyền', 'all_rights_reserved', NULL, 0, 0, 1, 0, 1),
  ('OPEN_ACCESS', 'Truy cập mở', 'Truy cập và tải miễn phí theo chính sách nhà xuất bản', 'open_access', NULL, 1, 0, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `license_type` = VALUES(`license_type`),
  `url` = VALUES(`url`),
  `allows_commercial` = VALUES(`allows_commercial`),
  `allows_derivatives` = VALUES(`allows_derivatives`),
  `requires_attribution` = VALUES(`requires_attribution`),
  `allows_download` = VALUES(`allows_download`),
  `is_active` = VALUES(`is_active`);

SELECT 'licenses' AS `ref_table`, COUNT(*) AS `row_count` FROM `licenses`;

-- =====================================================================
-- Hết 006_seed_reference_data.sql (bookuser)
-- =====================================================================