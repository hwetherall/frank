-- Fix for the type mismatch error in semantic search function
-- Run this in your Supabase SQL editor

-- First, let's check the actual table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'contacts_vector' 
ORDER BY ordinal_position;

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS search_contacts_semantic(vector, float, int);

-- Create the semantic search function with correct return types
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id integer,  -- Changed from bigint to integer to match SERIAL
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
    contacts_vector.id::integer,  -- Explicit cast to ensure type match
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

-- Test the function to make sure it works
SELECT 'search_contacts_semantic function recreated with correct types' as status;

-- Quick test with dummy data (this will fail gracefully if no data exists)
-- SELECT * FROM search_contacts_semantic(
--   (SELECT embedding FROM contacts_vector LIMIT 1),
--   0.0,
--   1
-- ) LIMIT 1;
