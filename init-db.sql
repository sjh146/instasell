-- PostgreSQL Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create database if it doesn't exist (this is handled by POSTGRES_DB environment variable)
-- The database 'instagram_db' will be created automatically by PostgreSQL

-- Create user if it doesn't exist (this is handled by POSTGRES_USER environment variable)
-- The user 'instagram_user' will be created automatically by PostgreSQL

-- Grant privileges (this is handled by PostgreSQL automatically)
-- The user will have full access to the database

-- Additional initialization can be added here if needed
-- For example, creating initial tables, inserting seed data, etc.

-- Example: Create a test table (optional)
-- CREATE TABLE IF NOT EXISTS test_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(100),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Example: Insert test data (optional)
-- INSERT INTO test_table (name) VALUES ('Test Entry');

-- Log successful initialization
SELECT 'Database initialization completed successfully' as status;
