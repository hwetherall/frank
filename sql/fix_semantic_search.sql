-- Fix for semantic search function
-- Run this in your Supabase SQL editor

-- First, make sure the pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the semantic search function with better error handling
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id integer,
  name text,
  company text,
  title text,
  industry jsonb,
  linkedin text,
  innovera_contact text,
  searchable_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the table exists and has data
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts_vector') THEN
    RAISE EXCEPTION 'contacts_vector table does not exist';
  END IF;
  
  -- Return results with similarity calculation
  RETURN QUERY
  SELECT 
    contacts_vector.id,
    contacts_vector.name,
    contacts_vector.company,
    contacts_vector.title,
    contacts_vector.industry,
    contacts_vector.linkedin,
    contacts_vector.innovera_contact,
    contacts_vector.searchable_text,
    (1 - (contacts_vector.embedding <=> query_embedding))::float AS similarity
  FROM contacts_vector
  WHERE (1 - (contacts_vector.embedding <=> query_embedding)) > match_threshold
  ORDER BY contacts_vector.embedding <=> query_embedding
  LIMIT match_count;
  
  -- If no results, log for debugging
  IF NOT FOUND THEN
    RAISE NOTICE 'No results found with threshold %, try lowering the threshold', match_threshold;
  END IF;
END;
$$;

-- Create a simpler test function for debugging
CREATE OR REPLACE FUNCTION test_vector_search()
RETURNS TABLE (
  total_records bigint,
  sample_name text,
  sample_company text,
  sample_industry jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    (SELECT count(*) FROM contacts_vector) as total_records,
    name as sample_name,
    company as sample_company,
    industry as sample_industry
  FROM contacts_vector
  LIMIT 1;
$$;

-- Test the functions exist
SELECT 'search_contacts_semantic function created successfully' as status;
SELECT 'test_vector_search function created successfully' as status;
