-- Migration 001: Create Extraction History Tables
-- Created: 2024-01-01
-- Description: Creates tables for tracking sitemap extraction history and retry functionality

-- Drop existing tables if they exist (development only)
DROP TABLE IF EXISTS extraction_retries;
DROP TABLE IF EXISTS url_extractions;
DROP TABLE IF EXISTS extraction_sessions;
DROP TYPE IF EXISTS extraction_status;
DROP TYPE IF EXISTS extraction_url_status;

-- Create custom types for status tracking
CREATE TYPE extraction_status AS ENUM ('in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE extraction_url_status AS ENUM ('pending', 'processing', 'success', 'failed', 'retrying', 'skipped');

-- Create extraction_sessions table
-- Master table tracking extraction campaigns
CREATE TABLE extraction_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    source_url TEXT NOT NULL,
    session_name VARCHAR(255),
    total_urls INTEGER NOT NULL DEFAULT 0,
    successful_urls INTEGER NOT NULL DEFAULT 0,
    failed_urls INTEGER NOT NULL DEFAULT 0,
    status extraction_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create url_extractions table
-- Individual URL extraction records
CREATE TABLE url_extractions (
    extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES extraction_sessions(session_id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL,
    chunk_number INTEGER NOT NULL,
    position_in_chunk INTEGER NOT NULL,
    status extraction_url_status NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Success data
    links_found INTEGER,
    processing_time_ms INTEGER,
    http_status INTEGER,
    final_url TEXT,
    
    -- Error data
    error_type VARCHAR(100),
    error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create extraction_retries table
-- Detailed retry history
CREATE TABLE extraction_retries (
    retry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES url_extractions(extraction_id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status extraction_url_status NOT NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    processing_time_ms INTEGER,
    http_status INTEGER,
    retry_strategy VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX idx_extraction_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_extraction_sessions_status ON extraction_sessions(status);
CREATE INDEX idx_extraction_sessions_created_at ON extraction_sessions(created_at DESC);

CREATE INDEX idx_url_extractions_session_id ON url_extractions(session_id);
CREATE INDEX idx_url_extractions_url_hash ON url_extractions(url_hash);
CREATE INDEX idx_url_extractions_status ON url_extractions(status);
CREATE INDEX idx_url_extractions_chunk ON url_extractions(session_id, chunk_number);
CREATE INDEX idx_url_extractions_failed ON url_extractions(status, last_error_at) WHERE status = 'failed';

CREATE INDEX idx_extraction_retries_extraction_id ON extraction_retries(extraction_id);
CREATE INDEX idx_extraction_retries_created_at ON extraction_retries(created_at DESC);

-- Composite indexes for analytics
CREATE INDEX idx_url_extractions_analytics ON url_extractions(status, created_at) WHERE status IN ('success', 'failed');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_extraction_sessions_updated_at 
    BEFORE UPDATE ON extraction_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_url_extractions_updated_at 
    BEFORE UPDATE ON url_extractions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create constraints
ALTER TABLE url_extractions ADD CONSTRAINT chk_chunk_number CHECK (chunk_number > 0);
ALTER TABLE url_extractions ADD CONSTRAINT chk_position_in_chunk CHECK (position_in_chunk >= 0 AND position_in_chunk < 25);
ALTER TABLE url_extractions ADD CONSTRAINT chk_attempt_count CHECK (attempt_count >= 0);
ALTER TABLE extraction_retries ADD CONSTRAINT chk_attempt_number CHECK (attempt_number > 0);

-- Create function to generate URL hash
CREATE OR REPLACE FUNCTION generate_url_hash(input_url TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(input_url, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for session statistics
CREATE VIEW session_statistics AS
SELECT 
    s.session_id,
    s.user_id,
    s.source_url,
    s.session_name,
    s.status as session_status,
    s.started_at,
    s.completed_at,
    s.total_urls,
    s.successful_urls,
    s.failed_urls,
    CASE 
        WHEN s.total_urls > 0 THEN ROUND((s.successful_urls::DECIMAL / s.total_urls::DECIMAL) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    EXTRACT(EPOCH FROM (COALESCE(s.completed_at, NOW()) - s.started_at)) as duration_seconds,
    COUNT(DISTINCT ue.chunk_number) as chunks_processed,
    COUNT(r.retry_id) as total_retries
FROM extraction_sessions s
LEFT JOIN url_extractions ue ON s.session_id = ue.session_id
LEFT JOIN extraction_retries r ON ue.extraction_id = r.extraction_id
GROUP BY s.session_id, s.user_id, s.source_url, s.session_name, s.status, 
         s.started_at, s.completed_at, s.total_urls, s.successful_urls, s.failed_urls;

-- Create view for failed URLs that can be retried
CREATE VIEW retryable_urls AS
SELECT 
    ue.extraction_id,
    ue.session_id,
    ue.url,
    ue.chunk_number,
    ue.position_in_chunk,
    ue.attempt_count,
    ue.max_retries,
    ue.error_type,
    ue.error_message,
    ue.last_error_at,
    s.user_id,
    s.source_url,
    (ue.max_retries - ue.attempt_count) as remaining_retries
FROM url_extractions ue
JOIN extraction_sessions s ON ue.session_id = s.session_id
WHERE ue.status = 'failed' 
  AND ue.attempt_count < ue.max_retries
  AND s.status != 'cancelled'
ORDER BY ue.last_error_at ASC;