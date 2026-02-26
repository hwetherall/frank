# Expert-Scorer Feature Documentation

## Overview
The Expert-Scorer is a powerful new feature that allows you to upload LinkedIn data CSV files and automatically score professionals as experts for innovation consulting. It uses AI-powered analysis via the Groq API to evaluate each profile on a 1-5 scale.

## Features
- **CSV Upload**: Upload LinkedIn data in the exact structure of `src/data/full-data-BD.csv`
- **Data Processing**: Automatically extracts relevant columns and calculates activity metrics
- **AI Scoring**: Uses Groq's AI models to score experts from 1-5
- **Progress Tracking**: Real-time progress indicators for upload and scoring
- **Database Storage**: Stores processed data and scores in Supabase
- **CSV Export**: Download the complete expert database with scores

## Workflow

### 1. Upload LinkedIn Data
- Navigate to `/expert-scorer` in the application
- Select a CSV file in the same format as `full-data-BD.csv`
- Toggle "Enable Expert Scoring" if you want AI analysis
- Click "Upload & Process"

### 2. Data Processing
The system automatically:
- Parses the CSV file
- Extracts relevant columns (name, position, company, experience, etc.)
- Calculates activity counts (posts, LinkedIn activity)
- Validates data quality
- Uploads to Supabase database

### 3. Expert Scoring (Optional)
If enabled, the AI scoring:
- Analyzes each professional profile
- Considers experience, leadership, thought leadership, social proof
- Assigns scores 1-5 based on expert suitability
- Provides rationale for each score
- Updates the database with scores

### 4. Download Results
- Export the complete expert database as CSV
- Includes all relevant data plus AI scores and rationales

## Database Schema

### expert_profiles table
```sql
CREATE TABLE expert_profiles (
  id SERIAL PRIMARY KEY,
  
  -- Core Identity
  name TEXT NOT NULL,
  position TEXT,
  current_company JSONB,
  location TEXT,
  avatar TEXT,
  
  -- Experience & Background
  experience JSONB,
  educations_details JSONB,
  certifications JSONB,
  
  -- Thought Leadership
  publications JSONB,
  patents JSONB,
  honors_and_awards JSONB,
  recommendations JSONB,
  
  -- Professional Network
  followers INTEGER,
  connections INTEGER,
  recommendations_count INTEGER,
  
  -- LinkedIn Activity Metrics
  posts_count INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  
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
  source_file TEXT,
  original_linkedin_id TEXT
);
```

## Scoring Criteria

### Score 5 - Exceptional Experts (Top Tier)
- Senior leadership roles (C-level, VP, Director, Partner)
- 15+ years of experience with clear progression
- Strong thought leadership (publications, patents, awards)
- Premium education from top institutions
- High social proof (1000+ followers, many recommendations)
- Industry recognition and advisory roles

### Score 4 - Strong Experts (High Value)
- Mid-senior management (Senior Manager, Principal, Lead)
- 8-15 years of solid experience
- Some thought leadership and industry involvement
- Good education and relevant certifications
- Moderate social proof (500+ followers)

### Score 3 - Competent Professionals (Moderate Value)
- Mid-level roles (Manager, Specialist, experienced contributor)
- 4-8 years of experience
- Basic professional development and certifications
- Standard education
- Some social proof (200+ connections)

### Score 2 - Emerging Professionals (Limited Value)
- Junior-mid roles (Associate, Coordinator, Junior Specialist)
- 1-4 years of experience
- Minimal certifications or thought leadership
- Entry-level education
- Low social proof (100+ connections)

### Score 1 - Entry Level/Unsuitable (Low Value)
- Entry-level roles (Intern, Student, Assistant)
- 0-1 years of experience
- No thought leadership or recognition
- Student or basic education
- Minimal social proof (<100 connections)

## Configuration

### Environment Variables
Add to your `.env` file:
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase Setup
1. Run the SQL script `sql/create_expert_profiles_table.sql` in your Supabase SQL editor
2. Enable the pgvector extension if not already enabled
3. Ensure Row Level Security policies are configured appropriately

## Usage Tips

### Data Quality
- Ensure your CSV matches the exact structure of `full-data-BD.csv`
- Profiles with minimal data (no position, no connections) may be filtered out
- The system validates data and provides error reports

### Scoring Performance
- AI scoring processes profiles in batches of 3 to avoid rate limits
- Expect 1-2 seconds per profile for scoring
- Large datasets (1000+ profiles) may take 30+ minutes to score
- Progress tracking shows real-time updates

### Best Practices
- Upload during off-peak hours for large datasets
- Review scoring results and adjust criteria if needed
- Use the download feature to backup your expert database
- Monitor Groq API usage and rate limits

## Troubleshooting

### Common Issues
1. **CSV Format Errors**: Ensure exact column structure match
2. **Groq API Errors**: Check API key and rate limits
3. **Database Errors**: Verify Supabase connection and permissions
4. **Large File Timeouts**: Consider splitting very large files

### Error Messages
- "Groq API key not configured": Add VITE_GROQ_API_KEY to .env
- "Database upload error": Check Supabase connection and table schema
- "Could not parse score from AI response": AI model returned unexpected format

## API Services

### groqExpertScorer.js
- `scoreExpertProfile(profile)` - Score a single profile
- `scoreExpertProfilesBatch(profiles, onProgress, batchSize)` - Batch scoring
- `testGroqConnection()` - Test API connectivity

### expertDataProcessor.js
- `extractExpertProfileData(rawData)` - Extract relevant columns
- `processCSVToExpertProfiles(csvData, sourceFileName)` - Process CSV data
- `validateExpertProfile(profile)` - Validate profile data
- `calculateProfileStatistics(profiles)` - Generate statistics

## Future Enhancements
- Custom scoring criteria configuration
- Integration with additional AI models
- Bulk profile updates and re-scoring
- Advanced filtering and search capabilities
- Export formats beyond CSV (JSON, Excel)
- Scheduled batch processing
- Analytics dashboard for scoring insights
