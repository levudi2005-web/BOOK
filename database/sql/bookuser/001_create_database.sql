-- =====================================================================
-- BOOKFORFREEDOM - bookuser - 001: Database bootstrap
-- DBMS      : MariaDB 10.11.x
-- Engine    : InnoDB
-- Charset   : utf8mb4 / utf8mb4_unicode_ci
-- Timezone  : UTC (all DATETIME values are stored in UTC)
-- Idempotent: YES (CREATE DATABASE IF NOT EXISTS, never DROP DATABASE)
-- =====================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `bookuser`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Normalise settings if the database pre-existed with different defaults.
ALTER DATABASE `bookuser`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bookuser`;

-- Verify
SELECT
  SCHEMA_NAME                AS database_name,
  DEFAULT_CHARACTER_SET_NAME AS charset,
  DEFAULT_COLLATION_NAME     AS collation
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'bookuser';
