-- Migration 002 Rollback: Remove Firecrawl Tables from Backend Database
-- Created: 2025-01-03
-- Description: Removes firecrawl extraction tables and related objects from the main backend database

-- Drop views first (depend on tables)
DROP VIEW IF EXISTS retryable_urls;
DROP VIEW IF EXISTS session_statistics;

-- Drop function
DROP FUNCTION IF EXISTS generate_url_hash(TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS update_url_extractions_updated_at ON url_extractions;
DROP TRIGGER IF EXISTS update_extraction_sessions_updated_at ON extraction_sessions;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS extraction_retries;
DROP TABLE IF EXISTS url_extractions;
DROP TABLE IF EXISTS extraction_sessions;

-- Drop custom types
DROP TYPE IF EXISTS extraction_url_status;
DROP TYPE IF EXISTS extraction_status;