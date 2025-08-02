-- PostgreSQL database initialization for sitemap extraction history
-- This script sets up the complete schema for tracking extraction sessions and URL processing

-- Create database user with appropriate privileges
CREATE USER IF NOT EXISTS firecrawl_user WITH PASSWORD 'firecrawl_password';

-- Create the database (if not exists)
CREATE DATABASE IF NOT EXISTS firecrawl_db OWNER firecrawl_user;

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE firecrawl_db TO firecrawl_user;

-- Connect to the firecrawl database
\c firecrawl_db;

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extraction_sessions table
-- Tracks high-level extraction campaigns initiated by users
CREATE TABLE IF NOT EXISTS extraction_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    session_name VARCHAR(500),
    source_url TEXT NOT NULL,
    total_urls INTEGER NOT NULL DEFAULT 0,
    successful_urls INTEGER NOT NULL DEFAULT 0,
    failed_urls INTEGER NOT NULL DEFAULT 0,
    processing_time_ms BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    chunk_size INTEGER DEFAULT 25,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create url_extractions table  
-- Tracks individual URL processing with detailed status and metadata
CREATE TABLE IF NOT EXISTS url_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    chunk_number INTEGER NOT NULL DEFAULT 1,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),
    http_status_code INTEGER,
    content_size_bytes BIGINT,
    processing_time_ms INTEGER,
    error_code VARCHAR(100),
    error_message TEXT,
    markdown_content TEXT,
    title VARCHAR(1000),
    description TEXT,
    images_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extraction_retries table
-- Tracks retry attempts with detailed failure analysis
CREATE TABLE IF NOT EXISTS extraction_retries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_extraction_id UUID NOT NULL REFERENCES url_extractions(id) ON DELETE CASCADE,
    retry_session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    previous_error_code VARCHAR(100),
    previous_error_message TEXT,
    retry_strategy VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    error_code VARCHAR(100),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_retry_attempt UNIQUE (original_extraction_id, retry_session_id, attempt_number)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_status ON extraction_sessions(status);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_created_at ON extraction_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_sessions_source_url ON extraction_sessions(source_url);

CREATE INDEX IF NOT EXISTS idx_url_extractions_session_id ON url_extractions(session_id);
CREATE INDEX IF NOT EXISTS idx_url_extractions_url ON url_extractions(url);
CREATE INDEX IF NOT EXISTS idx_url_extractions_status ON url_extractions(status);
CREATE INDEX IF NOT EXISTS idx_url_extractions_chunk_number ON url_extractions(chunk_number);
CREATE INDEX IF NOT EXISTS idx_url_extractions_created_at ON url_extractions(created_at);
CREATE INDEX IF NOT EXISTS idx_url_extractions_error_code ON url_extractions(error_code);

CREATE INDEX IF NOT EXISTS idx_extraction_retries_original_id ON extraction_retries(original_extraction_id);
CREATE INDEX IF NOT EXISTS idx_extraction_retries_session_id ON extraction_retries(retry_session_id);
CREATE INDEX IF NOT EXISTS idx_extraction_retries_status ON extraction_retries(status);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_url_extractions_session_status ON url_extractions(session_id, status);
CREATE INDEX IF NOT EXISTS idx_url_extractions_user_status ON url_extractions(session_id, status) WHERE status = 'failed';

-- Create views for commonly used queries
CREATE OR REPLACE VIEW session_statistics AS
SELECT 
    s.id,
    s.user_id,
    s.session_name,
    s.source_url,
    s.status,
    s.total_urls,
    s.successful_urls,
    s.failed_urls,
    s.processing_time_ms,
    s.created_at,
    s.completed_at,
    ROUND(
        CASE 
            WHEN s.total_urls > 0 THEN (s.successful_urls::FLOAT / s.total_urls * 100)
            ELSE 0 
        END, 2
    ) AS success_rate_percent,
    COUNT(r.id) AS total_retries,
    COUNT(CASE WHEN r.status = 'success' THEN 1 END) AS successful_retries
FROM extraction_sessions s
LEFT JOIN extraction_retries r ON s.id = r.retry_session_id
GROUP BY s.id, s.user_id, s.session_name, s.source_url, s.status, 
         s.total_urls, s.successful_urls, s.failed_urls, s.processing_time_ms,
         s.created_at, s.completed_at;

-- Create view for retryable URLs
CREATE OR REPLACE VIEW retryable_urls AS
SELECT 
    ue.id as extraction_id,
    ue.session_id,
    ue.url,
    ue.error_code,
    ue.error_message,
    ue.retry_count,
    ue.last_retry_at,
    ue.created_at,
    s.user_id,
    s.source_url,
    s.session_name,
    COALESCE(r.max_attempts, 0) as retry_attempts
FROM url_extractions ue
JOIN extraction_sessions s ON ue.session_id = s.id
LEFT JOIN (
    SELECT 
        original_extraction_id,
        COUNT(*) as max_attempts
    FROM extraction_retries 
    GROUP BY original_extraction_id
) r ON ue.id = r.original_extraction_id
WHERE ue.status = 'failed' 
AND (ue.retry_count < s.max_retries OR s.max_retries = 0);

-- Create function to update session statistics
CREATE OR REPLACE FUNCTION update_session_statistics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE extraction_sessions 
    SET 
        successful_urls = (
            SELECT COUNT(*) 
            FROM url_extractions 
            WHERE session_id = NEW.session_id AND status = 'success'
        ),
        failed_urls = (
            SELECT COUNT(*) 
            FROM url_extractions 
            WHERE session_id = NEW.session_id AND status = 'failed'
        ),
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session statistics
DROP TRIGGER IF EXISTS trigger_update_session_stats ON url_extractions;
CREATE TRIGGER trigger_update_session_stats
    AFTER INSERT OR UPDATE OF status ON url_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_statistics();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_extraction_sessions_updated_at ON extraction_sessions;
CREATE TRIGGER trigger_extraction_sessions_updated_at
    BEFORE UPDATE ON extraction_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_url_extractions_updated_at ON url_extractions;
CREATE TRIGGER trigger_url_extractions_updated_at
    BEFORE UPDATE ON url_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant privileges to the firecrawl user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO firecrawl_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO firecrawl_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO firecrawl_user;

-- Create sample data for testing (optional)
-- This can be commented out for production
/*
INSERT INTO extraction_sessions (user_id, session_name, source_url, total_urls, status) 
VALUES ('test-user-1', 'Sample Extraction', 'https://example.com', 10, 'completed');
*/