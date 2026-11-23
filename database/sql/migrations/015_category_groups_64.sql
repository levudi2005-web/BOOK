-- =====================================================================
-- BOOKFORFREEDOM - Migration 015: 8 nhóm + 64 thể loại sách
-- ---------------------------------------------------------------------
-- Idempotent: dùng slug UNIQUE + ON DUPLICATE KEY UPDATE.
-- Tái dùng 10 danh mục cũ (van-hoc, khoa-hoc, ...) thay vì tạo trùng.
-- Không xoá dữ liệu, không đổi category_id đang được sách tham chiếu.
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
USE `bookuser`;

ALTER TABLE `categories`
  ADD COLUMN IF NOT EXISTS `icon` VARCHAR(50) NULL AFTER `description`;

-- ---------------------------------------------------------------------
-- 8 nhóm lớn (parent_category_id = NULL)
-- ---------------------------------------------------------------------
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(NULL, 'Kiến thức và học thuật', 'kien-thuc-hoc-thuat', 'Kiến thức nền tảng về văn học, khoa học, lịch sử, triết học, nghệ thuật, kinh tế, tâm lý, giáo dục, chính trị và pháp luật.', 10, 1, 'graduation-cap'),
(NULL, 'Phát triển bản thân và sự nghiệp', 'phat-trien-ban-than-su-nghiep', 'Sách phát triển bản thân, kỹ năng mềm, sự nghiệp, lãnh đạo, khởi nghiệp, tài chính và đời sống nội tâm.', 20, 1, 'trending-up'),
(NULL, 'Gia đình và các mối quan hệ', 'gia-dinh-moi-quan-he', 'Sách về gia đình, hôn nhân, nuôi dạy con, tình yêu, các mối quan hệ và sức khỏe sinh sản.', 30, 1, 'users'),
(NULL, 'Sức khỏe và lối sống', 'suc-khoe-loi-song', 'Sách chăm sóc sức khỏe, dinh dưỡng, thể thao, làm đẹp và phong cách sống lành mạnh.', 40, 1, 'heart-pulse'),
(NULL, 'Giải trí và truyện hư cấu', 'giai-tri-huu-cau', 'Truyện và sách giải trí: thiếu nhi, truyện tranh, trinh thám, kinh dị, kỳ ảo, khoa học viễn tưởng, lãng mạn, phiêu lưu và hài hước.', 50, 1, 'sparkles'),
(NULL, 'Công nghệ và chuyên ngành', 'cong-nghe-chuyen-nganh', 'Sách công nghệ, kỹ thuật, kiến trúc, ngôn ngữ, du lịch và địa lý.', 60, 1, 'cpu'),
(NULL, 'Văn hóa và khám phá', 'van-hoa-kham-pha', 'Sách văn hóa, tôn giáo, môi trường, ẩm thực, tiểu sử, bách khoa, khảo cổ và nông nghiệp.', 70, 1, 'globe'),
(NULL, 'Sách giáo dục và tài liệu chuyên biệt', 'giao-duc-tai-lieu', 'Sách giáo khoa, tham khảo, luyện thi, nghiên cứu, tản văn, kịch, thơ và sách thiếu niên.', 80, 1, 'book-marked')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`),
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`),
  `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 1: Kiến thức và học thuật
-- ---------------------------------------------------------------------
SET @g1 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'kien-thuc-hoc-thuat' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g1, 'Văn học', 'van-hoc', 'Tiểu thuyết, truyện ngắn, thơ và các tác phẩm văn học.', 101, 1, 'book-open'),
(@g1, 'Khoa học', 'khoa-hoc', 'Khám phá tự nhiên, vật lý, hóa học, sinh học và tri thức khoa học.', 102, 1, 'flask'),
(@g1, 'Lịch sử', 'lich-su', 'Sự kiện, nhân vật và tiến trình lịch sử Việt Nam và thế giới.', 103, 1, 'landmark'),
(@g1, 'Triết học', 'triet-hoc', 'Tư tưởng, logic, đạo đức và các trường phái triết học.', 104, 1, 'brain'),
(@g1, 'Nghệ thuật', 'nghe-thuat', 'Hội họa, âm nhạc, điện ảnh, thiết kế và sáng tạo.', 105, 1, 'palette'),
(@g1, 'Kinh tế', 'kinh-te', 'Kinh tế học, kinh doanh, thị trường và chính sách.', 106, 1, 'chart'),
(@g1, 'Tâm lý học', 'tam-ly', 'Hành vi, cảm xúc, nhận thức và sức khỏe tâm lý.', 107, 1, 'heart'),
(@g1, 'Giáo dục', 'giao-duc', 'Phương pháp dạy và học, quản lý giáo dục và phát triển tri thức.', 108, 1, 'school'),
(@g1, 'Chính trị', 'chinh-tri', 'Chính trị, quản trị nhà nước và quan hệ quốc tế.', 109, 1, 'flag'),
(@g1, 'Pháp luật', 'phap-luat', 'Pháp luật, quyền công dân và thực tiễn pháp lý.', 110, 1, 'scale')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 2: Phát triển bản thân và sự nghiệp
-- ---------------------------------------------------------------------
SET @g2 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'phat-trien-ban-than-su-nghiep' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g2, 'Kỹ năng sống', 'ky-nang-song', 'Kỹ năng tự lập, ứng xử và thích nghi trong đời sống.', 201, 1, 'compass'),
(@g2, 'Kỹ năng giao tiếp', 'ky-nang-giao-tiep', 'Giao tiếp, thuyết trình, đàm phán và xây dựng quan hệ.', 202, 1, 'message'),
(@g2, 'Tư duy và sáng tạo', 'tu-duy-va-sang-tao', 'Tư duy phản biện, giải quyết vấn đề và sáng tạo.', 203, 1, 'lightbulb'),
(@g2, 'Lãnh đạo và quản trị', 'lanh-dao-va-quan-tri', 'Lãnh đạo, quản lý đội ngũ và điều hành tổ chức.', 204, 1, 'crown'),
(@g2, 'Khởi nghiệp', 'khoi-nghiep', 'Ý tưởng kinh doanh, xây dựng sản phẩm và phát triển doanh nghiệp.', 205, 1, 'rocket'),
(@g2, 'Tài chính cá nhân', 'tai-chinh-ca-nhan', 'Quản lý tiền, tiết kiệm, đầu tư và lập kế hoạch tài chính.', 206, 1, 'wallet'),
(@g2, 'Kỹ năng nghề nghiệp', 'ky-nang-nghe-nghiep', 'Phát triển nghề nghiệp, CV, phỏng vấn và năng lực chuyên môn.', 207, 1, 'briefcase'),
(@g2, 'Năng suất và quản lý thời gian', 'nang-suat-va-quan-ly-thoi-gian', 'Tối ưu thời gian, thói quen và hiệu suất làm việc.', 208, 1, 'clock'),
(@g2, 'Động lực và truyền cảm hứng', 'dong-luc-va-truyen-cam-hung', 'Động lực sống, mục tiêu và những câu chuyện truyền cảm hứng.', 209, 1, 'flame'),
(@g2, 'Tâm linh và phát triển nội tâm', 'tam-linh-va-phat-trien-noi-tam', 'Thiền, chánh niệm, tâm linh và hành trình hiểu mình.', 210, 1, 'lotus')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 3: Gia đình và các mối quan hệ
-- ---------------------------------------------------------------------
SET @g3 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'gia-dinh-moi-quan-he' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g3, 'Gia đình', 'gia-dinh', 'Đời sống gia đình, gắn kết và chăm sóc các thành viên.', 301, 1, 'home'),
(@g3, 'Hôn nhân', 'hon-nhan', 'Chuẩn bị, duy trì và xây dựng hôn nhân bền vững.', 302, 1, 'rings'),
(@g3, 'Nuôi dạy con', 'nuoi-day-con', 'Phương pháp nuôi dạy con theo từng độ tuổi.', 303, 1, 'baby'),
(@g3, 'Làm cha mẹ', 'lam-cha-me', 'Vai trò, tâm lý và kỹ năng đồng hành cùng con.', 304, 1, 'parents'),
(@g3, 'Tình yêu', 'tinh-yeu', 'Tình yêu, hẹn hò và các mối quan hệ lãng mạn.', 305, 1, 'heart'),
(@g3, 'Tâm lý gia đình', 'tam-ly-gia-dinh', 'Tâm lý trong gia đình, xung đột và chữa lành.', 306, 1, 'heart-hand'),
(@g3, 'Mang thai và sinh sản', 'mang-thai-va-sinh-san', 'Thai kỳ, sinh sản và chăm sóc sức khỏe phụ nữ.', 307, 1, 'stethoscope'),
(@g3, 'Quan hệ xã hội', 'quan-he-xa-hoi', 'Kết nối, giao tiếp và ứng xử trong xã hội.', 308, 1, 'network')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 4: Sức khỏe và lối sống
-- ---------------------------------------------------------------------
SET @g4 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'suc-khoe-loi-song' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g4, 'Sức khỏe', 'suc-khoe', 'Chăm sóc sức khỏe thể chất và phòng bệnh.', 401, 1, 'activity'),
(@g4, 'Dinh dưỡng', 'dinh-duong', 'Dinh dưỡng, thực phẩm và chế độ ăn lành mạnh.', 402, 1, 'apple'),
(@g4, 'Thể thao', 'the-thao', 'Luyện tập, thể thao và nâng cao thể lực.', 403, 1, 'dumbbell'),
(@g4, 'Làm đẹp và chăm sóc cá nhân', 'lam-dep-va-cham-soc-ca-nhan', 'Chăm sóc da, tóc, thẩm mỹ và phong cách cá nhân.', 404, 1, 'sparkle'),
(@g4, 'Đời sống', 'doi-song', 'Kỹ năng và câu chuyện trong đời sống thường ngày.', 405, 1, 'coffee'),
(@g4, 'Phong cách sống', 'phong-cach-song', 'Lối sống, thẩm mỹ và lựa chọn sống tối giản hoặc tinh tế.', 406, 1, 'home')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 5: Giải trí và truyện hư cấu
-- ---------------------------------------------------------------------
SET @g5 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'giai-tri-huu-cau' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g5, 'Thiếu nhi', 'thieu-nhi', 'Sách dành cho thiếu nhi và các câu chuyện tuổi thơ.', 501, 1, 'child'),
(@g5, 'Truyện tranh', 'truyen-tranh', 'Truyện tranh, manga, comic và graphic novel.', 502, 1, 'image'),
(@g5, 'Truyện trinh thám', 'truyen-trinh-tham', 'Điều tra, bí ẩn và truyện trinh thám.', 503, 1, 'search'),
(@g5, 'Kinh dị', 'kinh-di', 'Truyện kinh dị, rùng rợn và huyền bí.', 504, 1, 'ghost'),
(@g5, 'Kỳ ảo', 'ky-ao', 'Thế giới kỳ ảo, phép thuật và truyện giả tưởng.', 505, 1, 'wand'),
(@g5, 'Khoa học viễn tưởng', 'khoa-hoc-vien-tuong', 'Tương lai, vũ trụ, công nghệ và khoa học viễn tưởng.', 506, 1, 'rocket'),
(@g5, 'Lãng mạn', 'lang-man', 'Truyện tình cảm và lãng mạn.', 507, 1, 'heart'),
(@g5, 'Phiêu lưu', 'phieu-luu', 'Hành trình, khám phá và truyện phiêu lưu.', 508, 1, 'map'),
(@g5, 'Hài hước', 'hai-huoc', 'Truyện hài, hài hước và giải trí nhẹ nhàng.', 509, 1, 'smile')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 6: Công nghệ và chuyên ngành
-- ---------------------------------------------------------------------
SET @g6 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'cong-nghe-chuyen-nganh' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g6, 'Công nghệ', 'cong-nghe', 'Công nghệ thông tin, AI, phần mềm và thiết bị.', 601, 1, 'cpu'),
(@g6, 'Kỹ thuật', 'ky-thuat', 'Kỹ thuật, cơ khí, điện tử và ứng dụng thực tiễn.', 602, 1, 'wrench'),
(@g6, 'Kiến trúc và xây dựng', 'kien-truc-va-xay-dung', 'Kiến trúc, quy hoạch, xây dựng và vật liệu.', 603, 1, 'building'),
(@g6, 'Ngôn ngữ và ngoại ngữ', 'ngon-ngu-va-ngoai-ngu', 'Học ngôn ngữ, từ vựng, ngữ pháp và giao tiếp quốc tế.', 604, 1, 'language'),
(@g6, 'Du lịch và địa lý', 'du-lich-va-dia-ly', 'Du lịch, điểm đến, bản đồ và địa lý.', 605, 1, 'map-pin')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 7: Văn hóa và khám phá
-- ---------------------------------------------------------------------
SET @g7 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'van-hoa-kham-pha' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g7, 'Tôn giáo', 'ton-giao', 'Tôn giáo, tín ngưỡng và nghiên cứu tôn giáo.', 701, 1, 'church'),
(@g7, 'Thiên nhiên và môi trường', 'thien-nhien-va-moi-truong', 'Thiên nhiên, sinh thái, khí hậu và bảo vệ môi trường.', 702, 1, 'leaf'),
(@g7, 'Ẩm thực và nấu ăn', 'am-thuc-va-nau-an', 'Công thức, ẩm thực và văn hóa nấu ăn.', 703, 1, 'utensils'),
(@g7, 'Tiểu sử và hồi ký', 'tieu-su-va-hoi-ky', 'Tiểu sử, hồi ký và câu chuyện cuộc đời.', 704, 1, 'user'),
(@g7, 'Từ điển và bách khoa', 'tu-dien-va-bach-khoa', 'Từ điển, bách khoa và tra cứu tri thức.', 705, 1, 'library'),
(@g7, 'Văn hóa và phong tục', 'van-hoa-va-phong-tuc', 'Văn hóa, phong tục và đời sống cộng đồng.', 706, 1, 'globe'),
(@g7, 'Khảo cổ học', 'khao-co-hoc', 'Khảo cổ, di sản và nghiên cứu quá khứ.', 707, 1, 'landmark'),
(@g7, 'Nông nghiệp', 'nong-nghiep', 'Nông nghiệp, cây trồng, vật nuôi và phát triển nông thôn.', 708, 1, 'sprout')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Nhóm 8: Sách giáo dục và tài liệu chuyên biệt
-- ---------------------------------------------------------------------
SET @g8 = (SELECT `category_id` FROM `categories` WHERE `slug` = 'giao-duc-tai-lieu' LIMIT 1);
INSERT INTO `categories` (`parent_category_id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`icon`) VALUES
(@g8, 'Sách giáo khoa', 'sach-giao-khoa', 'Sách giáo khoa và tài liệu học tập theo chương trình.', 801, 1, 'book'),
(@g8, 'Sách tham khảo', 'sach-tham-khao', 'Sách tham khảo, hướng dẫn và tài liệu bổ trợ.', 802, 1, 'book-open'),
(@g8, 'Sách luyện thi', 'sach-luyen-thi', 'Luyện thi, đề thi và kỹ năng làm bài.', 803, 1, 'pencil'),
(@g8, 'Tài liệu nghiên cứu', 'tai-lieu-nghien-cuu', 'Tài liệu học thuật, nghiên cứu và phương pháp.', 804, 1, 'flask'),
(@g8, 'Tản văn và tùy bút', 'tan-van-va-tuy-but', 'Tản văn, tùy bút và ghi chép cá nhân.', 805, 1, 'feather'),
(@g8, 'Kịch và sân khấu', 'kich-va-san-khau', 'Kịch bản, sân khấu và nghệ thuật biểu diễn.', 806, 1, 'theater'),
(@g8, 'Thơ ca', 'tho-ca', 'Thơ, trường ca và các tác phẩm thi ca.', 807, 1, 'quote'),
(@g8, 'Sách thiếu niên', 'sach-thieu-nien', 'Sách dành cho lứa tuổi thiếu niên và thanh thiếu niên.', 808, 1, 'user')
ON DUPLICATE KEY UPDATE
  `parent_category_id` = VALUES(`parent_category_id`), `name` = VALUES(`name`),
  `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`),
  `is_active` = 1, `icon` = VALUES(`icon`);

-- ---------------------------------------------------------------------
-- Ghi log migration (idempotent)
-- ---------------------------------------------------------------------
INSERT INTO `bff_migration_log` (`migration_name`, `postcondition_json`, `status`)
VALUES (
  '015_category_groups_64',
  JSON_OBJECT(
    'groups', (SELECT COUNT(*) FROM `categories` WHERE `parent_category_id` IS NULL AND `slug` IN (
      'kien-thuc-hoc-thuat','phat-trien-ban-than-su-nghiep','gia-dinh-moi-quan-he','suc-khoe-loi-song',
      'giai-tri-huu-cau','cong-nghe-chuyen-nganh','van-hoa-kham-pha','giao-duc-tai-lieu'
    )),
    'leaf_categories', (SELECT COUNT(*) FROM `categories` WHERE `parent_category_id` IS NOT NULL),
    'total_categories', (SELECT COUNT(*) FROM `categories`)
  ),
  'applied'
) ON DUPLICATE KEY UPDATE
  `postcondition_json` = VALUES(`postcondition_json`),
  `status` = 'applied';



