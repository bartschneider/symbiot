-- Initial database schema for Synthora Backend

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on dataset name and type for faster queries
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name);
CREATE INDEX IF NOT EXISTS idx_datasets_type ON datasets(type);
CREATE INDEX IF NOT EXISTS idx_datasets_public ON datasets(is_public);

-- Create chart_data_points table
CREATE TABLE IF NOT EXISTS chart_data_points (
    id SERIAL PRIMARY KEY,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    label VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chart data points
CREATE INDEX IF NOT EXISTS idx_chart_data_points_dataset_id ON chart_data_points(dataset_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_points_x ON chart_data_points(x);
CREATE INDEX IF NOT EXISTS idx_chart_data_points_timestamp ON chart_data_points(timestamp);

-- Create text_analyses table
CREATE TABLE IF NOT EXISTS text_analyses (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    sentiment_score DOUBLE PRECISION DEFAULT 0,
    sentiment_label VARCHAR(20) DEFAULT 'neutral',
    sentiment_confidence DOUBLE PRECISION DEFAULT 0,
    readability_score DOUBLE PRECISION DEFAULT 0,
    readability_level VARCHAR(50) DEFAULT 'Standard',
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for text analyses
CREATE INDEX IF NOT EXISTS idx_text_analyses_language ON text_analyses(language);
CREATE INDEX IF NOT EXISTS idx_text_analyses_sentiment_label ON text_analyses(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_text_analyses_public ON text_analyses(is_public);
CREATE INDEX IF NOT EXISTS idx_text_analyses_created_at ON text_analyses(created_at);

-- Create keywords table
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES text_analyses(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    relevance DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for keywords
CREATE INDEX IF NOT EXISTS idx_keywords_analysis_id ON keywords(analysis_id);
CREATE INDEX IF NOT EXISTS idx_keywords_word ON keywords(word);
CREATE INDEX IF NOT EXISTS idx_keywords_frequency ON keywords(frequency DESC);

-- Create entities table
CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES text_analyses(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    start_pos INTEGER DEFAULT 0,
    end_pos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for entities
CREATE INDEX IF NOT EXISTS idx_entities_analysis_id ON entities(analysis_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_text ON entities(text);
CREATE INDEX IF NOT EXISTS idx_entities_confidence ON entities(confidence DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_data_points_updated_at BEFORE UPDATE ON chart_data_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_analyses_updated_at BEFORE UPDATE ON text_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO datasets (name, description, type, source, is_public) VALUES
    ('Sample Stock Data', 'Synthetic stock price data for demonstration', 'stock', 'generated', true),
    ('Analytics Dashboard', 'Website analytics sample data', 'analytics', 'generated', true),
    ('Performance Metrics', 'Application performance sample data', 'performance', 'generated', true);

-- Insert sample chart data points
INSERT INTO chart_data_points (x, y, label, dataset_id) VALUES
    (0, 100.0, 'Day 1', 1),
    (1, 102.5, 'Day 2', 1),
    (2, 98.7, 'Day 3', 1),
    (3, 105.2, 'Day 4', 1),
    (4, 103.8, 'Day 5', 1),
    (0, 1250, 'Week 1', 2),
    (1, 1890, 'Week 2', 2),
    (2, 2100, 'Week 3', 2),
    (3, 1750, 'Week 4', 2),
    (0, 245, 'Load Time', 3),
    (1, 180, 'First Paint', 3),
    (2, 320, 'Interactive', 3);

-- Insert sample text analysis
INSERT INTO text_analyses (text, sentiment_score, sentiment_label, sentiment_confidence, readability_score, readability_level, is_public) VALUES
    ('This is a fantastic product that works amazingly well. I highly recommend it to everyone!', 0.8, 'positive', 0.9, 75.5, 'Fairly Easy', true),
    ('The documentation could be better. Some features are confusing and hard to use.', -0.3, 'negative', 0.6, 65.2, 'Standard', true),
    ('The system provides basic functionality for data management and includes standard features.', 0.0, 'neutral', 0.7, 45.8, 'Difficult', true);

-- Insert sample keywords
INSERT INTO keywords (analysis_id, word, frequency, relevance) VALUES
    (1, 'fantastic', 1, 0.05),
    (1, 'product', 1, 0.05),
    (1, 'recommend', 1, 0.05),
    (2, 'documentation', 1, 0.06),
    (2, 'features', 1, 0.06),
    (2, 'confusing', 1, 0.06),
    (3, 'system', 1, 0.07),
    (3, 'functionality', 1, 0.07),
    (3, 'management', 1, 0.07);

-- Insert sample entities
INSERT INTO entities (analysis_id, text, type, confidence) VALUES
    (1, 'product', 'other', 0.8),
    (2, 'documentation', 'other', 0.9),
    (3, 'system', 'other', 0.85);