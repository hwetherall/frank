-- Comprehensive fix for Expert Vector Database issues
-- Run this script in your Supabase SQL editor to fix all database-related issues

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing views and functions to avoid conflicts
DROP VIEW IF EXISTS expert_vector_analytics CASCADE;
DROP FUNCTION IF EXISTS search_experts_semantic(vector, float, int, int) CASCADE;

-- Create expert_profiles_vector table if it doesn't exist
CREATE TABLE IF NOT EXISTS expert_profiles_vector (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT,
  ld_company TEXT,
  ld_position TEXT,
  industry JSONB,
  followers INTEGER DEFAULT 0,
  connections INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  expert_score INTEGER,
  scoring_rationale TEXT,
  searchable_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_dimensions INTEGER DEFAULT 1536,
  original_expert_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expert_profiles_vector ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable update access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expert_profiles_vector;

-- Create policies for full access
CREATE POLICY "Enable read access for all users" ON expert_profiles_vector FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expert_profiles_vector FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expert_profiles_vector FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expert_profiles_vector FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_embedding ON expert_profiles_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_expert_score ON expert_profiles_vector(expert_score);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_original_id ON expert_profiles_vector(original_expert_id);

-- Create the expert_vector_analytics view
CREATE OR REPLACE VIEW expert_vector_analytics AS
SELECT 
  COUNT(*) as total_experts,
  COUNT(CASE WHEN expert_score >= 4 THEN 1 END) as high_score_experts,
  COUNT(CASE WHEN expert_score >= 3 THEN 1 END) as good_experts,
  AVG(expert_score::numeric) as avg_expert_score,
  AVG(followers::numeric) as avg_followers,
  AVG(connections::numeric) as avg_connections,
  COUNT(DISTINCT ld_company) as unique_companies,
  COUNT(CASE WHEN industry IS NOT NULL THEN 1 END) as experts_with_industry
FROM expert_profiles_vector
WHERE expert_score IS NOT NULL;

-- Create the search_experts_semantic function with correct signature
CREATE OR REPLACE FUNCTION search_experts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  min_expert_score int DEFAULT 1
)
RETURNS TABLE (
  id bigint,
  name text,
  "position" text,
  current_company jsonb,
  location text,
  avatar text,
  followers integer,
  connections integer,
  posts_count integer,
  activity_count integer,
  expert_score integer,
  scoring_rationale text,
  searchable_text text,
  similarity float,
  ld_company text,
  ld_position text,
  industry jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    epv.id,
    epv.name,
    epv."position",
    epv.current_company,
    epv.location,
    epv.avatar,
    epv.followers,
    epv.connections,
    epv.posts_count,
    epv.activity_count,
    epv.expert_score,
    epv.scoring_rationale,
    epv.searchable_text,
    1 - (epv.embedding <=> query_embedding) AS similarity,
    epv.ld_company,
    epv.ld_position,
    epv.industry
  FROM expert_profiles_vector epv
  WHERE 1 - (epv.embedding <=> query_embedding) > match_threshold
    AND (epv.expert_score >= min_expert_score OR epv.expert_score IS NULL)
  ORDER BY 
    epv.expert_score DESC NULLS LAST,
    epv.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create a function to check if the vector table is properly set up
CREATE OR REPLACE FUNCTION check_expert_vector_setup()
RETURNS TABLE (
  component text,
  status text,
  message text
)
LANGUAGE sql
AS $$
  SELECT 
    'pgvector_extension'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN 'enabled'::text 
         ELSE 'disabled'::text 
    END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN 'pgvector extension is enabled'::text 
         ELSE 'pgvector extension needs to be enabled'::text 
    END
  UNION ALL
  SELECT 
    'expert_profiles_vector_table'::text,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expert_profiles_vector') 
         THEN 'exists'::text 
         ELSE 'missing'::text 
    END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expert_profiles_vector') 
         THEN 'expert_profiles_vector table exists'::text 
         ELSE 'expert_profiles_vector table needs to be created'::text 
    END
  UNION ALL
  SELECT 
    'search_function'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_experts_semantic') 
         THEN 'exists'::text 
         ELSE 'missing'::text 
    END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_experts_semantic') 
         THEN 'search_experts_semantic function exists'::text 
         ELSE 'search_experts_semantic function needs to be created'::text 
    END;
$$;

-- Create a test function to verify everything is working
CREATE OR REPLACE FUNCTION test_expert_vector_system()
RETURNS TABLE (
  test_name text,
  result text,
  details text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test 1: Check if we can query the analytics view
  BEGIN
    PERFORM * FROM expert_vector_analytics LIMIT 1;
    RETURN QUERY SELECT 'analytics_view'::text, 'pass'::text, 'expert_vector_analytics view is accessible'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'analytics_view'::text, 'fail'::text, SQLERRM::text;
  END;

  -- Test 2: Check if we can call the search function
  BEGIN
    PERFORM * FROM search_experts_semantic(
      array_fill(0.0, ARRAY[1536])::vector(1536), 
      0.5, 1, 1
    ) LIMIT 1;
    RETURN QUERY SELECT 'search_function'::text, 'pass'::text, 'search_experts_semantic function is working'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'search_function'::text, 'fail'::text, SQLERRM::text;
  END;

  -- Test 3: Check table structure
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'expert_profiles_vector' 
      AND column_name = 'embedding' 
      AND data_type = 'USER-DEFINED'
    ) THEN
      RETURN QUERY SELECT 'table_structure'::text, 'pass'::text, 'expert_profiles_vector table has correct structure'::text;
    ELSE
      RETURN QUERY SELECT 'table_structure'::text, 'fail'::text, 'expert_profiles_vector table structure is incorrect'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'table_structure'::text, 'fail'::text, SQLERRM::text;
  END;
END;
$$;

-- Display setup status
SELECT * FROM check_expert_vector_setup();

-- Display test results
SELECT * FROM test_expert_vector_system();
