-- Migration: Initialize Extraction History Schema
-- Purpose: Create core tables and views required by firecrawl-service extraction history
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

-- Requirements
-- Enable pgcrypto for gen_random_uuid (PostgreSQL >= 9.4)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Table: extraction_sessions
-- =========================
CREATE TABLE IF NOT EXISTS extraction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  total_urls INTEGER NOT NULL DEFAULT 0,
  successful_urls INTEGER NOT NULL DEFAULT 0,
  failed_urls INTEGER NOT NULL DEFAULT 0,
  chunk_size INTEGER NOT NULL DEFAULT 25,
  max_retries INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT NULL,
  processing_time_ms INTEGER NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_status ON extraction_sessions(status);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_source_url ON extraction_sessions(source_url);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_created_at ON extraction_sessions(created_at);

-- =====================
-- Table: url_extractions
-- =====================
CREATE TABLE IF NOT EXISTS url_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  chunk_number INTEGER NOT NULL DEFAULT 1,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|success|failed
  http_status_code INTEGER NULL,
  content_size_bytes INTEGER NULL,
  processing_time_ms INTEGER NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  markdown_content TEXT NULL,
  title TEXT NULL,
  description TEXT NULL,
  images_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_url_extractions_session_id ON url_extractions(session_id);
CREATE INDEX IF NOT EXISTS idx_url_extractions_status ON url_extractions(status);
CREATE INDEX IF NOT EXISTS idx_url_extractions_url ON url_extractions(url);
CREATE INDEX IF NOT EXISTS idx_url_extractions_processed_at ON url_extractions(processed_at);

-- ========================
-- Table: extraction_retries
-- ========================
CREATE TABLE IF NOT EXISTS extraction_retries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_extraction_id UUID NOT NULL REFERENCES url_extractions(id) ON DELETE CASCADE,
  retry_session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|success|failed
  previous_error_code TEXT NULL,
  previous_error_message TEXT NULL,
  retry_strategy TEXT NOT NULL DEFAULT 'manual',
  processing_time_ms INTEGER NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_extraction_retries_original ON extraction_retries(original_extraction_id);
CREATE INDEX IF NOT EXISTS idx_extraction_retries_retry_session ON extraction_retries(retry_session_id);
CREATE INDEX IF NOT EXISTS idx_extraction_retries_status ON extraction_retries(status);

-- ======================================
-- View: session_statistics (used by API)
-- ======================================
CREATE OR REPLACE VIEW session_statistics AS
SELECT
  s.id,
  s.user_id,
  s.session_name,
  s.source_url,
  s.total_urls,
  s.successful_urls,
  s.failed_urls,
  s.status,
  s.started_at,
  s.completed_at,
  s.processing_time_ms,
  s.error_message,
  s.created_at,
  s.updated_at,
  ROUND(
    CASE WHEN s.total_urls > 0 THEN (s.successful_urls::FLOAT / s.total_urls * 100)
    ELSE 0 END, 2
  ) AS success_rate_percent
FROM extraction_sessions s;

-- ===================================
-- View: retryable_urls (used by API)
-- ===================================
-- Provides a simple view of failed extractions joined with their session meta.
-- The service applies additional filters (user_id, sessionId, errorCode, min retry interval).
CREATE OR REPLACE VIEW retryable_urls AS
SELECT
  ue.id AS extraction_id,
  ue.url,
  ue.error_code,
  ue.error_message,
  ue.retry_count,
  ue.session_id,
  es.source_url,
  es.session_name,
  0::int AS retry_attempts, -- placeholder if not tracked elsewhere
  ue.created_at,
  ue.processed_at AS last_retry_at,
  es.user_id
FROM url_extractions ue
JOIN extraction_sessions es ON ue.session_id = es.id
WHERE ue.status = 'failed';

-- ======================
-- Triggers (optional)
-- ======================
-- Update updated_at on changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_extraction_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_extraction_sessions_updated_at
    BEFORE UPDATE ON extraction_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- Create helper function set_updated_at if it does not exist
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS trigger AS $f$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $f$ LANGUAGE plpgsql;

  -- Retry creating trigger
  CREATE TRIGGER trg_extraction_sessions_updated_at
  BEFORE UPDATE ON extraction_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_url_extractions_updated_at'
  ) THEN
    CREATE TRIGGER trg_url_extractions_updated_at
    BEFORE UPDATE ON url_extractions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_extraction_retries_updated_at'
  ) THEN
    CREATE TRIGGER trg_extraction_retries_updated_at
    BEFORE UPDATE ON extraction_retries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- ======================
-- Seed (optional, commented)
-- ======================
-- INSERT INTO extraction_sessions (user_id, session_name, source_url, total_urls, status)
-- VALUES (NULL, 'Sample Session', 'https://example.com', 10, 'processing');

-- INSERT INTO url_extractions (session_id, url, status)
-- SELECT s.id, 'https://example.com/page-1', 'failed' FROM extraction_sessions s LIMIT 1;

-- ======================
-- End of migration
-- ======================