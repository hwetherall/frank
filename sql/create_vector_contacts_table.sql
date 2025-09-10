-- SQL to create the vector-enabled contacts table with pgvector
-- Run this in your Supabase SQL editor

-- Enable the pgvector extension (you may need to enable this in your Supabase dashboard first)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector contacts table
CREATE TABLE IF NOT EXISTS contacts_vector (
  id SERIAL PRIMARY KEY,
  
  -- Original contact data
  name TEXT,
  company TEXT,
  title TEXT,
  industry JSONB,  -- For storing JSON arrays like ["Academia", "AI & Robotics"]
  linkedin TEXT,   -- For LinkedIn URLs
  innovera_contact TEXT,
  
  -- Vector search specific columns
  searchable_text TEXT NOT NULL,  -- The text that was embedded
  embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_dimensions INTEGER DEFAULT 1536,
  
  -- Reference to original contact (optional)
  original_contact_id INTEGER REFERENCES contacts_table(id),
  
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

CREATE TRIGGER update_contacts_vector_updated_at
  BEFORE UPDATE ON contacts_vector
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_vector_name ON contacts_vector(name);
CREATE INDEX IF NOT EXISTS idx_contacts_vector_company ON contacts_vector(company);
CREATE INDEX IF NOT EXISTS idx_contacts_vector_industry ON contacts_vector USING GIN (industry);

-- Create vector similarity index for fast semantic search
-- This is crucial for performance with large datasets
CREATE INDEX IF NOT EXISTS idx_contacts_vector_embedding ON contacts_vector 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Alternative: You can also create an HNSW index (generally faster but uses more memory)
-- CREATE INDEX IF NOT EXISTS idx_contacts_vector_embedding_hnsw ON contacts_vector 
-- USING hnsw (embedding vector_cosine_ops) 
-- WITH (m = 16, ef_construction = 64);

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  company text,
  title text,
  industry jsonb,
  linkedin text,
  innovera_contact text,
  searchable_text text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT 
    contacts_vector.id,
    contacts_vector.name,
    contacts_vector.company,
    contacts_vector.title,
    contacts_vector.industry,
    contacts_vector.linkedin,
    contacts_vector.innovera_contact,
    contacts_vector.searchable_text,
    1 - (contacts_vector.embedding <=> query_embedding) AS similarity
  FROM contacts_vector
  WHERE 1 - (contacts_vector.embedding <=> query_embedding) > match_threshold
  ORDER BY contacts_vector.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Enable Row Level Security (optional)
ALTER TABLE contacts_vector ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON contacts_vector FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON contacts_vector FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON contacts_vector FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON contacts_vector FOR DELETE USING (true);

-- Create a view that combines regular and vector search results
CREATE OR REPLACE VIEW contacts_enhanced AS
SELECT 
  c.id as contact_id,
  c.name,
  c.company,
  c.title,
  c.industry,
  c.linkedin,
  c.innovera_contact,
  c.created_at as contact_created_at,
  cv.id as vector_id,
  cv.searchable_text,
  cv.embedding_model,
  cv.created_at as vector_created_at
FROM contacts_table c
LEFT JOIN contacts_vector cv ON c.id = cv.original_contact_id;
