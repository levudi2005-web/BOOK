-- Backfill legacy publication_scope values.
-- Additive and rerunnable; no row deletion or schema rollback via DROP.
USE bookuser;

CREATE TABLE IF NOT EXISTS bff_migration_log (
  migration_name VARCHAR(191) PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  precondition_json JSON NULL,
  postcondition_json JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'applied'
);

SET @public_legacy_before = (
  SELECT COUNT(*) FROM books
  WHERE deleted_at IS NULL
    AND status = 'published'
    AND visibility = 'public'
    AND (publication_scope IS NULL OR publication_scope = 'draft')
);
SET @private_legacy_before = (
  SELECT COUNT(*) FROM books
  WHERE deleted_at IS NULL
    AND status = 'published'
    AND visibility = 'private'
    AND (publication_scope IS NULL OR publication_scope = 'draft')
);

UPDATE books
SET publication_scope = 'community'
WHERE deleted_at IS NULL
  AND status = 'published'
  AND visibility = 'public'
  AND (publication_scope IS NULL OR publication_scope = 'draft');

UPDATE books
SET publication_scope = 'private'
WHERE deleted_at IS NULL
  AND status = 'published'
  AND visibility = 'private'
  AND (publication_scope IS NULL OR publication_scope = 'draft');

INSERT INTO bff_migration_log (
  migration_name,
  precondition_json,
  postcondition_json,
  status
) VALUES (
  '014_publication_scope_backfill',
  JSON_OBJECT(
    'public_legacy_count', @public_legacy_before,
    'private_legacy_count', @private_legacy_before
  ),
  JSON_OBJECT(
    'community_count', (
      SELECT COUNT(*) FROM books
      WHERE deleted_at IS NULL AND publication_scope = 'community'
    ),
    'private_published_count', (
      SELECT COUNT(*) FROM books
      WHERE deleted_at IS NULL AND status = 'published'
        AND visibility = 'private' AND publication_scope = 'private'
    )
  ),
  'applied'
) ON DUPLICATE KEY UPDATE
  postcondition_json = VALUES(postcondition_json),
  status = 'applied';
