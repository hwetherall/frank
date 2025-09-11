-- SQL script to add innovera_contact column to expert tables
-- Run this in your Supabase SQL editor

-- Add innovera_contact column to expert_profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'innovera_contact') THEN
        ALTER TABLE expert_profiles ADD COLUMN innovera_contact TEXT;
    END IF;
END $$;

-- Add innovera_contact column to expert_profiles_vector table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles_vector' AND column_name = 'innovera_contact') THEN
        ALTER TABLE expert_profiles_vector ADD COLUMN innovera_contact TEXT;
    END IF;
END $$;

-- Create index for innovera_contact column in expert_profiles table
CREATE INDEX IF NOT EXISTS idx_expert_profiles_innovera_contact ON expert_profiles(innovera_contact);

-- Create index for innovera_contact column in expert_profiles_vector table
CREATE INDEX IF NOT EXISTS idx_expert_profiles_vector_innovera_contact ON expert_profiles_vector(innovera_contact);

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS search_experts_semantic(vector, double precision, integer, integer);
DROP FUNCTION IF EXISTS search_top_experts_semantic(vector, double precision, integer, integer);
DROP FUNCTION IF EXISTS get_top_experts(integer, integer);
DROP FUNCTION IF EXISTS search_experts_by_industry(text, integer, integer);

-- Update the search_experts_semantic function to include innovera_contact
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
  industry jsonb,
  innovera_contact text
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
    epv.industry,
    epv.innovera_contact
  FROM expert_profiles_vector epv
  WHERE 1 - (epv.embedding <=> query_embedding) > match_threshold
    AND (epv.expert_score >= min_expert_score OR epv.expert_score IS NULL)
  ORDER BY 
    epv.expert_score DESC NULLS LAST,
    epv.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Update the search_top_experts_semantic function to include innovera_contact
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
  industry jsonb,
  innovera_contact text
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
    epv.industry,
    epv.innovera_contact
  FROM expert_profiles_vector epv
  WHERE 1 - (epv.embedding <=> query_embedding) > match_threshold
    AND (epv.expert_score >= min_expert_score OR epv.expert_score IS NULL)
  ORDER BY 
    combined_score DESC,
    epv.expert_score DESC NULLS LAST,
    epv.followers DESC
  LIMIT match_count;
$$;

-- Update the get_top_experts function to include innovera_contact
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
  industry JSONB,
  innovera_contact TEXT
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
    ep.industry,
    ep.innovera_contact
  FROM expert_profiles ep
  WHERE ep.expert_score >= min_score
  ORDER BY 
    ep.expert_score DESC,
    ep.followers DESC,
    ep.posts_count DESC,
    ep.activity_count DESC
  LIMIT limit_count;
$$;

-- Update the search_experts_by_industry function to include innovera_contact
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
  connections integer,
  innovera_contact text
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
    ep.connections,
    ep.innovera_contact
  FROM expert_profiles ep
  WHERE ep.industry ? industry_filter  -- Check if industry array contains the filter
    AND (ep.expert_score >= min_expert_score OR ep.expert_score IS NULL)
  ORDER BY 
    ep.expert_score DESC NULLS LAST,
    ep.followers DESC
  LIMIT limit_count;
$$;

-- Update the experts_enhanced view to include innovera_contact
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
  ep.innovera_contact,
  ep.created_at as expert_created_at,
  epv.id as vector_id,
  epv.searchable_text,
  epv.embedding_model,
  epv.created_at as vector_created_at
FROM expert_profiles ep
LEFT JOIN expert_profiles_vector epv ON ep.id = epv.original_expert_id;

-- Create a new function to search experts by Innovera contact
CREATE OR REPLACE FUNCTION search_experts_by_innovera_contact(
  contact_name text,
  min_expert_score int DEFAULT 1,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  name text,
  "position" text,
  current_company jsonb,
  location text,
  expert_score integer,
  followers integer,
  connections integer,
  innovera_contact text,
  ld_company text,
  ld_position text,
  industry jsonb
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
    ep.innovera_contact,
    ep.ld_company,
    ep.ld_position,
    ep.industry
  FROM expert_profiles ep
  WHERE LOWER(ep.innovera_contact) = LOWER(contact_name)
    AND (ep.expert_score >= min_expert_score OR ep.expert_score IS NULL)
  ORDER BY 
    ep.expert_score DESC NULLS LAST,
    ep.followers DESC
  LIMIT limit_count;
$$;

-- Create a function to get analytics by Innovera contact
CREATE OR REPLACE FUNCTION get_innovera_contact_analytics()
RETURNS TABLE (
  innovera_contact text,
  expert_count bigint,
  avg_expert_score numeric,
  avg_followers numeric,
  top_expert_name text
)
LANGUAGE sql
AS $$
  SELECT 
    ep.innovera_contact,
    COUNT(*) as expert_count,
    AVG(ep.expert_score::numeric) as avg_expert_score,
    AVG(ep.followers::numeric) as avg_followers,
    (
      SELECT name 
      FROM expert_profiles ep2 
      WHERE ep2.innovera_contact = ep.innovera_contact 
      ORDER BY ep2.expert_score DESC NULLS LAST, ep2.followers DESC 
      LIMIT 1
    ) as top_expert_name
  FROM expert_profiles ep
  WHERE ep.innovera_contact IS NOT NULL
  GROUP BY ep.innovera_contact
  ORDER BY expert_count DESC, avg_expert_score DESC NULLS LAST;
$$;
