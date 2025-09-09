-- SQL script to drop the experts_enhanced table
-- Run this in your Supabase SQL editor

-- Drop the table if it exists
DROP TABLE IF EXISTS experts_enhanced CASCADE;

-- This will also drop any associated:
-- - Indexes
-- - Triggers  
-- - Foreign key constraints
-- - Views that depend on this table
-- - Functions that reference this table

-- Confirm deletion
SELECT 'experts_enhanced table has been dropped successfully' as status;
