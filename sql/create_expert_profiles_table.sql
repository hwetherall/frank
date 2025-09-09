-- SQL script to create the expert profiles table for Expert-Scorer feature
-- Run this in your Supabase SQL editor

-- Drop table if exists (optional - remove this line if you want to keep existing data)
-- DROP TABLE IF EXISTS expert_profiles;

-- Create the expert profiles table
CREATE TABLE IF NOT EXISTS expert_profiles (
  id SERIAL PRIMARY KEY,
  
  -- Core Identity
  name TEXT NOT NULL,
  "position" TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT, -- Profile picture URL for platform display
  
  -- Additional scraped data from CSV columns 2, 3, 4
  ld_company TEXT, -- Name of their current company
  ld_position TEXT, -- Name of their current position  
  industry JSONB, -- Industries array, e.g., ["AI", "Technology"]
  
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

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_expert_profiles_updated_at ON expert_profiles;

CREATE TRIGGER update_expert_profiles_updated_at
  BEFORE UPDATE ON expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expert_profiles_name ON expert_profiles(name);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_position ON expert_profiles("position");
CREATE INDEX IF NOT EXISTS idx_expert_profiles_location ON expert_profiles(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_expert_score ON expert_profiles(expert_score);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_followers ON expert_profiles(followers DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_connections ON expert_profiles(connections DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_scored_at ON expert_profiles(scored_at DESC);

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_expert_profiles_current_company ON expert_profiles USING GIN (current_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_experience ON expert_profiles USING GIN (experience);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_educations ON expert_profiles USING GIN (educations_details);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_industry ON expert_profiles USING GIN (industry);

-- Create indexes for the new text columns
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_company ON expert_profiles(ld_company);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_ld_position ON expert_profiles(ld_position);

-- Enable Row Level Security (optional)
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable update access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expert_profiles;

-- Create policies for full access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON expert_profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expert_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expert_profiles FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expert_profiles FOR DELETE USING (true);

-- Create a view for expert analytics
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

-- Create a function to get top experts by score and activity
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_top_experts(integer, integer);

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
