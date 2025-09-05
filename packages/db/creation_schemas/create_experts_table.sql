-- Create the experts table for Supabase
-- This table stores expert contact information and details

-- First, create the status enum type
CREATE TYPE expert_status AS ENUM ('Validated', 'Contract', 'Pending', 'Conversation');

-- Create the experts table
CREATE TABLE IF NOT EXISTS experts (
  -- Primary key and metadata
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Core expert information
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  company TEXT,
  title TEXT,
  
  -- Location and contact details
  location TEXT,
  time_zone TEXT,
  linkedin_url TEXT,
  
  -- Professional classification
  industry TEXT[] DEFAULT '{}', -- Array of industries
  "function" TEXT, -- "function" is a reserved word, so we quote it
  
  -- Innovera relationship
  innovera_contact TEXT,
  status expert_status DEFAULT 'Pending',
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5), -- Rating from 0.0 to 5.0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_experts_name ON experts(name);
CREATE INDEX IF NOT EXISTS idx_experts_innovera_contact ON experts(innovera_contact);
CREATE INDEX IF NOT EXISTS idx_experts_status ON experts(status);
CREATE INDEX IF NOT EXISTS idx_experts_industry ON experts USING GIN(industry); -- GIN index for array queries
CREATE INDEX IF NOT EXISTS idx_experts_function ON experts("function");

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;