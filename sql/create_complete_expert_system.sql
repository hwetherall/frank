-- Complete SQL script to create the expert system with all required tables and columns
-- Run this in your Supabase SQL editor

-- Enable the pgvector extension (you may need to enable this in your Supabase dashboard first)
CREATE EXTENSION IF NOT EXISTS vector;

-- First, ensure the expert_profiles table exists with all columns
CREATE TABLE IF NOT EXISTS expert_profiles (
  id SERIAL PRIMARY KEY,
  
  -- Core Identity
  name TEXT NOT NULL,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT, -- Profile picture URL for platform display
  
  -- Missing scraped data (NEW COLUMNS)
  ld_company TEXT,
  ld_position TEXT,
  industry JSONB, -- Array like ["AI","Technology"]
  
  -- Experience & Background
  experience JSONB,
  educations_details JSONB,
  certifications JSONB,
  
  -- Thought Leadership & Publications
  publications JSONB,
  patents JSONB,
  honors_and_awards JSONB,
  recommendations JSONB,
  
  -- Professional Network & Social Proof
  followers INTEGER,
  connections INTEGER,
  recommendations_count INTEGER,
  
  -- LinkedIn Activity Metrics
  posts_count INTEGER DEFAULT 0, -- Count of LinkedIn posts for activity measure
  activity_count INTEGER DEFAULT 0, -- Count of recent activities for engagement measure
  
  -- Additional Context
  about TEXT,
  volunteer_experience JSONB,
  organizations JSONB,
  projects JSONB,
  languages JSONB,
  
  -- Expert Scoring Results
  expert_score INTEGER CHECK (expert_score >= 1 AND expert_score <= 5),
  scoring_rationale TEXT,
  scored_at TIMESTAMP WITH TIME ZONE,
  scoring_model TEXT DEFAULT 'gpt-oss-120b',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional: Reference to original data source
  source_file TEXT,
  original_linkedin_id TEXT
);

-- Add missing columns to existing expert_profiles table if they don't exist
DO $$ 
BEGIN 
    -- Add ld_company if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'ld_company') THEN
        ALTER TABLE expert_profiles ADD COLUMN ld_company TEXT;
    END IF;
    
    -- Add ld_position if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'ld_position') THEN
        ALTER TABLE expert_profiles ADD COLUMN ld_position TEXT;
    END IF;
    
    -- Add industry if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'industry') THEN
        ALTER TABLE expert_profiles ADD COLUMN industry JSONB;
    END IF;
END $$;

-- Create the expert profiles vector table
CREATE TABLE IF NOT EXISTS expert_profiles_vector (
  id SERIAL PRIMARY KEY,
  
  -- Core expert data (from expert_profiles table)
  name TEXT NOT NULL,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT,
  
  -- Missing scraped data (NEW COLUMNS)
  ld_company TEXT,
  ld_position TEXT,
  industry JSONB,
  
  -- Professional metrics
  followers INTEGER DEFAULT 0,
  connections INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  
  -- Expert scoring
  expert_score INTEGER CHECK (expert_score >= 1 AND expert_score <= 5),
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

-- Create an updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for both tables
DROP TRIGGER IF EXISTS update_expert_profiles_updated_at ON expert_profiles;
CREATE TRIGGER update_expert_profiles_updated_at
  BEFORE UPDATE ON expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expert_profiles_vector_updated_at ON expert_profiles_vector;
CREATE TRIGGER update_expert_profiles_vector_updated_at
  BEFORE UPDATE ON expert_profiles_vector
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for expert_profiles table
CREATE INDEX IF NOT EXISTS idx_expert_profiles_name ON expert_profiles(name);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_position ON expert_profiles("position");
CREATE INDEX IF NOT EXISTS idx_expert_profiles_location ON expert_profiles(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_expert_score ON expert_profiles(expert_score);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_followers ON expert_profiles(followers DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_connections ON expert_profiles(connections DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_scored_at ON expert_profiles(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_company ON expert_profiles(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_position ON expert_profiles(ld_position);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_industry ON expert_profiles USING GIN (industry);

-- Create indexes for JSONB columns in expert_profiles
CREATE INDEX IF NOT EXISTS idx_expert_profiles_current_company ON expert_profiles USING GIN (current_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_experience ON expert_profiles USING GIN (experience);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_educations ON expert_profiles USING GIN (educations_details);

-- Create indexes for expert_profiles_vector table
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_name ON expert_profiles_vector(name);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_position ON expert_profiles_vector("position");
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_location ON expert_profiles_vector(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_expert_score ON expert_profiles_vector(expert_score);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_followers ON expert_profiles_vector(followers DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_connections ON expert_profiles_vector(connections DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_company ON expert_profiles_vector(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_position ON expert_profiles_vector(ld_position);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_industry ON expert_profiles_vector USING GIN (industry);

-- Create indexes for JSONB columns in expert_profiles_vector
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_current_company ON expert_profiles_vector USING GIN (current_company);

-- Create vector similarity index for fast semantic search
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_embedding ON expert_profiles_vector 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Enable Row Level Security for both tables
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_profiles_vector ENABLE ROW LEVEL SECURITY;

-- Create policies for expert_profiles table
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable update access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expert_profiles;

CREATE POLICY "Enable read access for all users" ON expert_profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expert_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expert_profiles FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expert_profiles FOR DELETE USING (true);

-- Create policies for expert_profiles_vector table
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable update access for all users" ON expert_profiles_vector;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expert_profiles_vector;

CREATE POLICY "Enable read access for all users" ON expert_profiles_vector FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expert_profiles_vector FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expert_profiles_vector FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expert_profiles_vector FOR DELETE USING (true);

-- Create expert semantic search function
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

-- Create top experts search function with combined scoring
CREATE OR REPLACE FUNCTION search_top_experts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  min_expert_score int DEFAULT 3
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
  expert_score integer,
  searchable_text text,
  similarity float,
  combined_score float,
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
    epv.expert_score,
    epv.searchable_text,
    1 - (epv.embedding <=> query_embedding) AS similarity,
    -- Combined score: expert_score (1-5) * 0.6 + similarity (0-1) * 0.4
    COALESCE(epv.expert_score, 1) * 0.6 + (1 - (epv.embedding <=> query_embedding)) * 0.4 AS combined_score,
    epv.ld_company,
    epv.ld_position,
    epv.industry
  FROM expert_profiles_vector epv
  WHERE 1 - (epv.embedding <=> query_embedding) > match_threshold
    AND (epv.expert_score >= min_expert_score OR epv.expert_score IS NULL)
  ORDER BY 
    combined_score DESC,
    epv.expert_score DESC NULLS LAST,
    epv.followers DESC
  LIMIT match_count;
$$;

-- Drop existing functions that might have different signatures
DROP FUNCTION IF EXISTS get_top_experts(integer, integer);
DROP FUNCTION IF EXISTS search_experts_semantic(vector, float, int, int);
DROP FUNCTION IF EXISTS search_top_experts_semantic(vector, float, int, int);
DROP FUNCTION IF EXISTS search_experts_by_industry(text, int, int);
DROP FUNCTION IF EXISTS get_industry_analytics();
DROP FUNCTION IF EXISTS get_expert_analytics();

-- Create get top experts function
CREATE OR REPLACE FUNCTION get_top_experts(
  min_score INTEGER DEFAULT 4,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  expert_score INTEGER,
  followers INTEGER,
  connections INTEGER,
  posts_count INTEGER,
  activity_count INTEGER,
  avatar TEXT,
  ld_company TEXT,
  ld_position TEXT,
  industry JSONB
)
LANGUAGE sql
AS $$
  SELECT 
    ep.id,
    ep.name,
    ep."position",
    ep.current_company,
    ep.location,
    ep.expert_score,
    ep.followers,
    ep.connections,
    ep.posts_count,
    ep.activity_count,
    ep.avatar,
    ep.ld_company,
    ep.ld_position,
    ep.industry
  FROM expert_profiles ep
  WHERE ep.expert_score >= min_score
  ORDER BY 
    ep.expert_score DESC,
    ep.followers DESC,
    ep.posts_count DESC,
    ep.activity_count DESC
  LIMIT limit_count;
$$;

-- Create industry search function
CREATE OR REPLACE FUNCTION search_experts_by_industry(
  industry_filter text,
  min_expert_score int DEFAULT 1,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  name text,
  "position" text,
  ld_company text,
  ld_position text,
  industry jsonb,
  expert_score integer,
  followers integer,
  connections integer
)
LANGUAGE sql
AS $$
  SELECT 
    ep.id,
    ep.name,
    ep."position",
    ep.ld_company,
    ep.ld_position,
    ep.industry,
    ep.expert_score,
    ep.followers,
    ep.connections
  FROM expert_profiles ep
  WHERE ep.industry ? industry_filter  -- Check if industry array contains the filter
    AND (ep.expert_score >= min_expert_score OR ep.expert_score IS NULL)
  ORDER BY 
    ep.expert_score DESC NULLS LAST,
    ep.followers DESC
  LIMIT limit_count;
$$;

-- Create industry analytics function
CREATE OR REPLACE FUNCTION get_industry_analytics()
RETURNS TABLE (
  industry_name text,
  expert_count bigint,
  avg_expert_score numeric,
  avg_followers numeric,
  top_expert_name text
)
LANGUAGE sql
AS $$
  WITH industry_expanded AS (
    SELECT 
      ep.id,
      ep.name,
      ep.expert_score,
      ep.followers,
      jsonb_array_elements_text(ep.industry) as industry_name
    FROM expert_profiles ep
    WHERE ep.industry IS NOT NULL
  )
  SELECT 
    ie.industry_name,
    COUNT(*) as expert_count,
    AVG(ie.expert_score::numeric) as avg_expert_score,
    AVG(ie.followers::numeric) as avg_followers,
    (
      SELECT name 
      FROM industry_expanded ie2 
      WHERE ie2.industry_name = ie.industry_name 
      ORDER BY ie2.expert_score DESC NULLS LAST, ie2.followers DESC 
      LIMIT 1
    ) as top_expert_name
  FROM industry_expanded ie
  GROUP BY ie.industry_name
  ORDER BY expert_count DESC, avg_expert_score DESC NULLS LAST;
$$;

-- Create expert analytics function
CREATE OR REPLACE FUNCTION get_expert_analytics()
RETURNS TABLE (
  expert_score integer,
  count bigint,
  avg_followers numeric,
  avg_connections numeric,
  avg_posts numeric,
  avg_activity numeric
)
LANGUAGE sql
AS $$
  SELECT 
    epv.expert_score,
    COUNT(*) as count,
    AVG(epv.followers::numeric) as avg_followers,
    AVG(epv.connections::numeric) as avg_connections,
    AVG(epv.posts_count::numeric) as avg_posts,
    AVG(epv.activity_count::numeric) as avg_activity
  FROM expert_profiles_vector epv
  WHERE epv.expert_score IS NOT NULL
  GROUP BY epv.expert_score
  ORDER BY epv.expert_score DESC;
$$;

-- Create enhanced view combining both tables
CREATE OR REPLACE VIEW experts_enhanced AS
SELECT 
  ep.id as expert_id,
  ep.name,
  ep."position",
  ep.current_company,
  ep.location,
  ep.avatar,
  ep.experience,
  ep.educations_details,
  ep.certifications,
  ep.publications,
  ep.patents,
  ep.honors_and_awards,
  ep.followers,
  ep.connections,
  ep.posts_count,
  ep.activity_count,
  ep.expert_score,
  ep.scoring_rationale,
  ep.scored_at,
  ep.ld_company,
  ep.ld_position,
  ep.industry,
  ep.created_at as expert_created_at,
  epv.id as vector_id,
  epv.searchable_text,
  epv.embedding_model,
  epv.created_at as vector_created_at
FROM expert_profiles ep
LEFT JOIN expert_profiles_vector epv ON ep.id = epv.original_expert_id;

-- Create analytics view for expert score distribution
CREATE OR REPLACE VIEW expert_analytics AS
SELECT 
  expert_score,
  COUNT(*) as count,
  AVG(followers::numeric) as avg_followers,
  AVG(connections::numeric) as avg_connections,
  AVG(posts_count::numeric) as avg_posts,
  AVG(activity_count::numeric) as avg_activity
FROM expert_profiles 
WHERE expert_score IS NOT NULL
GROUP BY expert_score
ORDER BY expert_score DESC;
