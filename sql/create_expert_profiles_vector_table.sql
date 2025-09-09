-- SQL to create the vector-enabled expert profiles table with pgvector
-- Run this in your Supabase SQL editor

-- Enable the pgvector extension (you may need to enable this in your Supabase dashboard first)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector expert profiles table
CREATE TABLE IF NOT EXISTS expert_profiles_vector (
  id SERIAL PRIMARY KEY,
  
  -- Core expert profile data for search display
  name TEXT NOT NULL,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT,
  
  -- Additional scraped data
  ld_company TEXT,
  ld_position TEXT,
  industry JSONB,
  
  -- Key metrics for search ranking
  followers INTEGER DEFAULT 0,
  connections INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  expert_score INTEGER,
  scoring_rationale TEXT,
  
  -- Vector search specific columns
  searchable_text TEXT NOT NULL,  -- The text that was embedded
  embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_dimensions INTEGER DEFAULT 1536,
  
  -- Reference to original expert profile
  original_expert_id INTEGER REFERENCES expert_profiles(id),
  
  -- Metadata columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_expert_profiles_vector_updated_at ON expert_profiles_vector;

CREATE TRIGGER update_expert_profiles_vector_updated_at
  BEFORE UPDATE ON expert_profiles_vector
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_name ON expert_profiles_vector(name);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_company ON expert_profiles_vector(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_position ON expert_profiles_vector(ld_position);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_location ON expert_profiles_vector(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_expert_score ON expert_profiles_vector(expert_score DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_followers ON expert_profiles_vector(followers DESC);

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_current_company ON expert_profiles_vector USING GIN (current_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_industry ON expert_profiles_vector USING GIN (industry);

-- Create the HNSW index for vector similarity search (this is the key for fast semantic search)
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_embedding ON expert_profiles_vector 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (use if HNSW doesn't work)
-- CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_embedding ON expert_profiles_vector 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security (optional)
ALTER TABLE expert_profiles_vector ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable update access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expert_profiles_vector;

-- Create policies for full access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON expert_profiles_vector FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expert_profiles_vector FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expert_profiles_vector FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expert_profiles_vector FOR DELETE USING (true);

-- Create a function for semantic search of experts
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS search_experts_semantic(vector, float, int);

CREATE OR REPLACE FUNCTION search_experts_semantic(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  name text,
  "position" text,
  current_company jsonb,
  location text,
  avatar text,
  ld_company text,
  ld_position text,
  industry jsonb,
  followers integer,
  connections integer,
  posts_count integer,
  activity_count integer,
  expert_score integer,
  scoring_rationale text,
  searchable_text text,
  similarity float
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
    epv.ld_company,
    epv.ld_position,
    epv.industry,
    epv.followers,
    epv.connections,
    epv.posts_count,
    epv.activity_count,
    epv.expert_score,
    epv.scoring_rationale,
    epv.searchable_text,
    1 - (epv.embedding <=> query_embedding) as similarity
  FROM expert_profiles_vector epv
  WHERE 1 - (epv.embedding <=> query_embedding) > similarity_threshold
  ORDER BY epv.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create a function for industry-specific expert search
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS search_experts_by_industry(text, int, int);

CREATE OR REPLACE FUNCTION search_experts_by_industry(
  industry_filter text,
  min_expert_score int DEFAULT 1,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  name text,
  "position" text,
  current_company jsonb,
  location text,
  avatar text,
  ld_company text,
  ld_position text,
  industry jsonb,
  followers integer,
  connections integer,
  expert_score integer,
  scoring_rationale text
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
    epv.ld_company,
    epv.ld_position,
    epv.industry,
    epv.followers,
    epv.connections,
    epv.expert_score,
    epv.scoring_rationale
  FROM expert_profiles_vector epv
  WHERE 
    epv.expert_score >= min_expert_score
    AND (
      epv.industry ? industry_filter OR
      epv.searchable_text ILIKE '%' || industry_filter || '%'
    )
  ORDER BY 
    epv.expert_score DESC NULLS LAST,
    epv.followers DESC
  LIMIT match_count;
$$;

-- Create analytics view for expert vector data
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