-- SQL script to add missing columns to expert tables
-- Run this in your Supabase SQL editor to add the missing scraped data columns

-- Add missing columns to expert_profiles table
ALTER TABLE expert_profiles 
ADD COLUMN IF NOT EXISTS ld_company TEXT,
ADD COLUMN IF NOT EXISTS ld_position TEXT,
ADD COLUMN IF NOT EXISTS industry JSONB;

-- Add missing columns to expert_profiles_vector table
ALTER TABLE expert_profiles_vector 
ADD COLUMN IF NOT EXISTS ld_company TEXT,
ADD COLUMN IF NOT EXISTS ld_position TEXT,
ADD COLUMN IF NOT EXISTS industry JSONB;

-- Create indexes for the new columns for better search performance
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_company ON expert_profiles(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_position ON expert_profiles(ld_position);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_industry ON expert_profiles USING GIN (industry);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_company ON expert_profiles_vector(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_ld_position ON expert_profiles_vector(ld_position);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_industry ON expert_profiles_vector USING GIN (industry);

-- Update the search functions to include the new columns
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

-- Update the top experts search function
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

-- Update the get_top_experts function
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

-- Update the experts_enhanced view to include new columns
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

-- Create a function to search experts by industry
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

-- Create a function to get industry analytics
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
