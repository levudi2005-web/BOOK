-- Publication metadata and private/community scope for Author Studio.
-- Additive migration for isolated test/staging databases.
USE bookuser;

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(255) NULL AFTER subtitle,
  ADD COLUMN IF NOT EXISTS publisher_name VARCHAR(255) NULL AFTER author_name,
  ADD COLUMN IF NOT EXISTS publication_year SMALLINT UNSIGNED NULL AFTER publisher_name,
  ADD COLUMN IF NOT EXISTS publication_scope ENUM('draft','private','community') NOT NULL DEFAULT 'draft' AFTER publication_year;
