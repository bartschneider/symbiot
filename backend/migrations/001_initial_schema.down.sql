-- Rollback script for initial schema

-- Drop triggers first
DROP TRIGGER IF EXISTS update_datasets_updated_at ON datasets;
DROP TRIGGER IF EXISTS update_chart_data_points_updated_at ON chart_data_points;
DROP TRIGGER IF EXISTS update_text_analyses_updated_at ON text_analyses;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS keywords;
DROP TABLE IF EXISTS text_analyses;
DROP TABLE IF EXISTS chart_data_points;
DROP TABLE IF EXISTS datasets;