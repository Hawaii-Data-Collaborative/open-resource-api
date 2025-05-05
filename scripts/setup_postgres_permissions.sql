-- PostgreSQL Permissions Setup Script
-- This script sets up all necessary permissions for the appuser to:
-- 1. Connect to the database
-- 2. Perform CRUD operations on tables
-- 3. Create backups using pg_dump
-- 4. Restore from backups using psql

-- First, check if the user exists (optional)
-- SELECT 1 FROM pg_roles WHERE rolname='appuser';

-- Grant basic database permissions
GRANT CONNECT ON DATABASE auw TO appuser;
GRANT USAGE ON SCHEMA public TO appuser;

-- Grant permissions on existing tables and sequences
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser;

-- Set up default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO appuser;

-- Grant permissions needed for pg_dump
GRANT USAGE ON SCHEMA pg_catalog TO appuser;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO appuser;

GRANT CREATE ON SCHEMA public TO appuser; 
