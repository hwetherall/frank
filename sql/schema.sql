-- ============================================================
-- Frank Expert Discovery — Unified Schema
-- Run this in the Supabase SQL Editor to set up the database.
-- This replaces ALL previous migration scripts.
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop old objects (clean slate)
DROP VIEW IF EXISTS experts_enhanced CASCADE;
DROP VIEW IF EXISTS expert_analytics CASCADE;
DROP VIEW IF EXISTS expert_vector_analytics CASCADE;
DROP VIEW IF EXISTS contacts_enhanced CASCADE;
DROP VIEW IF EXISTS contact_analytics CASCADE;

DROP FUNCTION IF EXISTS search_contacts_semantic(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS search_contacts_semantic(vector, float, int, int) CASCADE;
DROP FUNCTION IF EXISTS search_experts_semantic(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS search_experts_semantic(vector, float, int, int) CASCADE;
DROP FUNCTION IF EXISTS search_top_experts_semantic(vector, float, int, int) CASCADE;
DROP FUNCTION IF EXISTS get_top_experts(int, int) CASCADE;
DROP FUNCTION IF EXISTS search_experts_by_industry(text, int, int) CASCADE;
DROP FUNCTION IF EXISTS search_experts_by_innovera_contact(text, int, int) CASCADE;
DROP FUNCTION IF EXISTS get_industry_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_expert_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_innovera_contact_analytics() CASCADE;
DROP FUNCTION IF EXISTS check_expert_vector_setup() CASCADE;
DROP FUNCTION IF EXISTS test_expert_vector_system() CASCADE;
DROP FUNCTION IF EXISTS test_vector_search() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS expert_profiles_vector CASCADE;
DROP TABLE IF EXISTS expert_profiles CASCADE;
DROP TABLE IF EXISTS contacts_vector CASCADE;
DROP TABLE IF EXISTS contacts_table CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- ============================================================
-- 3. Create the unified contacts table
-- ============================================================
CREATE TABLE contacts (
  id                    SERIAL PRIMARY KEY,

  -- Dedup key: LinkedIn URL is the unique identifier
  linkedin_url          TEXT UNIQUE NOT NULL,

  -- Source data (from Excel upload)
  name                  TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  company               TEXT,
  title                 TEXT,
  innovera_contact      TEXT,

  -- Pipeline status tracking
  status                TEXT NOT NULL DEFAULT 'uploaded'
                        CHECK (status IN (
                          'uploaded',
                          'enriching',
                          'enriched',
                          'scoring',
                          'scored',
                          'embedding',
                          'ready',
                          'error'
                        )),
  status_error          TEXT,
  status_step           TEXT,

  -- Enriched profile data (from EnrichLayer)
  linkedin_id           TEXT,
  first_name            TEXT,
  last_name             TEXT,
  headline              TEXT,
  summary               TEXT,
  location              TEXT,
  country               TEXT,
  country_full          TEXT,
  city                  TEXT,
  state                 TEXT,
  profile_pic_url       TEXT,

  -- Professional data (JSONB arrays from EnrichLayer)
  experiences           JSONB DEFAULT '[]',
  education             JSONB DEFAULT '[]',
  certifications        JSONB DEFAULT '[]',
  skills                JSONB DEFAULT '[]',
  languages             JSONB DEFAULT '[]',
  volunteer_work        JSONB DEFAULT '[]',
  publications          JSONB DEFAULT '[]',
  patents               JSONB DEFAULT '[]',
  honors_awards         JSONB DEFAULT '[]',
  organizations         JSONB DEFAULT '[]',
  projects              JSONB DEFAULT '[]',
  articles              JSONB DEFAULT '[]',

  -- Network metrics (from EnrichLayer)
  follower_count        INTEGER DEFAULT 0,
  connection_count      INTEGER DEFAULT 0,

  -- Derived fields
  industry              JSONB DEFAULT '[]',
  current_company       TEXT,
  current_position      TEXT,

  -- AI Scoring (Groq openai/gpt-oss-120b)
  expert_score          INTEGER CHECK (expert_score IS NULL OR (expert_score >= 1 AND expert_score <= 5)),
  scoring_rationale     TEXT,
  scored_at             TIMESTAMPTZ,

  -- Semantic search (OpenAI text-embedding-3-small)
  searchable_text       TEXT,
  embedding             vector(1536),

  -- Metadata
  source_file           TEXT,
  enriched_at           TIMESTAMPTZ,
  embedded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Indexes
-- ============================================================

-- Text search
CREATE INDEX idx_contacts_name ON contacts (name);
CREATE INDEX idx_contacts_company ON contacts (company);
CREATE INDEX idx_contacts_current_company ON contacts (current_company);
CREATE INDEX idx_contacts_location ON contacts (location);
CREATE INDEX idx_contacts_status ON contacts (status);
CREATE INDEX idx_contacts_innovera_contact ON contacts (innovera_contact);
CREATE INDEX idx_contacts_expert_score ON contacts (expert_score DESC NULLS LAST);

-- JSONB (GIN for containment queries)
CREATE INDEX idx_contacts_industry ON contacts USING GIN (industry);
CREATE INDEX idx_contacts_skills ON contacts USING GIN (skills);

-- Vector search (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_contacts_embedding ON contacts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Semantic search function
-- ============================================================
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  min_expert_score int DEFAULT 0
)
RETURNS TABLE (
  id int,
  name text,
  headline text,
  summary text,
  company text,
  current_company text,
  current_position text,
  location text,
  city text,
  country_full text,
  profile_pic_url text,
  linkedin_url text,
  linkedin_id text,
  email text,
  phone text,
  industry jsonb,
  skills jsonb,
  experiences jsonb,
  education jsonb,
  certifications jsonb,
  publications jsonb,
  patents jsonb,
  honors_awards jsonb,
  follower_count int,
  connection_count int,
  expert_score int,
  scoring_rationale text,
  innovera_contact text,
  searchable_text text,
  similarity float,
  combined_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.headline,
    c.summary,
    c.company,
    c.current_company,
    c.current_position,
    c.location,
    c.city,
    c.country_full,
    c.profile_pic_url,
    c.linkedin_url,
    c.linkedin_id,
    c.email,
    c.phone,
    c.industry,
    c.skills,
    c.experiences,
    c.education,
    c.certifications,
    c.publications,
    c.patents,
    c.honors_awards,
    c.follower_count,
    c.connection_count,
    c.expert_score,
    c.scoring_rationale,
    c.innovera_contact,
    c.searchable_text,
    (1 - (c.embedding <=> query_embedding))::float AS similarity,
    (COALESCE(c.expert_score, 0)::float * 0.4 + (1 - (c.embedding <=> query_embedding)) * 0.6)::float AS combined_score
  FROM contacts c
  WHERE c.embedding IS NOT NULL
    AND c.status = 'ready'
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    AND COALESCE(c.expert_score, 0) >= min_expert_score
  ORDER BY
    (COALESCE(c.expert_score, 0)::float * 0.4 + (1 - (c.embedding <=> query_embedding)) * 0.6) DESC
  LIMIT match_count;
$$;

-- ============================================================
-- 7. Analytics view
-- ============================================================
CREATE OR REPLACE VIEW contact_analytics AS
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'ready')::int AS searchable,
  COUNT(*) FILTER (WHERE status = 'uploaded')::int AS pending_enrichment,
  COUNT(*) FILTER (WHERE status = 'enriched')::int AS pending_scoring,
  COUNT(*) FILTER (WHERE status = 'scored')::int AS pending_embedding,
  COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
  COUNT(*) FILTER (WHERE expert_score IS NOT NULL)::int AS scored,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded,
  ROUND(AVG(expert_score) FILTER (WHERE expert_score IS NOT NULL), 2) AS avg_score,
  COUNT(DISTINCT current_company) FILTER (WHERE current_company IS NOT NULL)::int AS unique_companies,
  COUNT(DISTINCT innovera_contact) FILTER (WHERE innovera_contact IS NOT NULL)::int AS unique_leads
FROM contacts;

-- ============================================================
-- 8. Pipeline status helper
-- ============================================================
CREATE OR REPLACE FUNCTION get_pipeline_status()
RETURNS TABLE (
  status text,
  count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT status, COUNT(*)
  FROM contacts
  GROUP BY status
  ORDER BY
    CASE status
      WHEN 'uploaded' THEN 1
      WHEN 'enriching' THEN 2
      WHEN 'enriched' THEN 3
      WHEN 'scoring' THEN 4
      WHEN 'scored' THEN 5
      WHEN 'embedding' THEN 6
      WHEN 'ready' THEN 7
      WHEN 'error' THEN 8
    END;
$$;

-- ============================================================
-- 9. Industry analytics
-- ============================================================
CREATE OR REPLACE FUNCTION get_industry_analytics()
RETURNS TABLE (
  industry_name text,
  contact_count bigint,
  avg_expert_score numeric,
  avg_followers numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ind.value::text AS industry_name,
    COUNT(*) AS contact_count,
    ROUND(AVG(c.expert_score) FILTER (WHERE c.expert_score IS NOT NULL), 2) AS avg_expert_score,
    ROUND(AVG(c.follower_count), 0) AS avg_followers
  FROM contacts c,
    jsonb_array_elements_text(c.industry) AS ind(value)
  WHERE c.industry IS NOT NULL AND jsonb_array_length(c.industry) > 0
  GROUP BY ind.value
  ORDER BY contact_count DESC;
$$;

-- ============================================================
-- 10. RLS policies (open for prototype)
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read" ON contacts FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON contacts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON contacts FOR DELETE USING (true);

-- ============================================================
-- Done! Your unified schema is ready.
-- ============================================================
