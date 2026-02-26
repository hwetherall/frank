# Frank Rebuild Plan — Unified Pipeline

## Goal

Replace the current two-pipeline mess with a single, clean pipeline:

```
Excel Upload → Clean & Dedup → Enrich (EnrichLayer) → Score (Groq) → Embed (OpenAI) → Semantic Search
```

One table. One pipeline. One source of truth.

---

## Phase 1: Clean Database Schema

**Drop everything. Start fresh.** One SQL file: `sql/schema.sql`

### Single unified table: `contacts`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE contacts (
  id                    SERIAL PRIMARY KEY,

  -- Dedup key
  linkedin_url          TEXT UNIQUE NOT NULL,

  -- Source data (from Excel upload)
  name                  TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  company               TEXT,           -- company from Excel (user-provided)
  title                 TEXT,           -- title from Excel (user-provided)
  innovera_contact      TEXT,           -- who at Innovera owns this relationship

  -- Pipeline status tracking
  status                TEXT NOT NULL DEFAULT 'uploaded'
                        CHECK (status IN (
                          'uploaded',     -- just ingested from Excel
                          'enriching',    -- EnrichLayer call in progress
                          'enriched',     -- enrichment complete
                          'scoring',      -- Groq scoring in progress
                          'scored',       -- scoring complete
                          'embedding',    -- OpenAI embedding in progress
                          'ready',        -- fully processed, searchable
                          'error'         -- something failed
                        )),
  status_error          TEXT,           -- error message if status = 'error'
  status_step           TEXT,           -- which step failed (for retry)

  -- Enriched profile data (from EnrichLayer /api/v2/profile)
  linkedin_id           TEXT,           -- public_identifier (e.g. "williamhgates")
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
  industry              JSONB DEFAULT '[]',   -- cleaned array of industry strings
  current_company       TEXT,                 -- extracted from experiences[0]
  current_position      TEXT,                 -- extracted from experiences[0]

  -- AI Scoring (from Groq openai/gpt-oss-120b)
  expert_score          INTEGER CHECK (expert_score >= 1 AND expert_score <= 5),
  scoring_rationale     TEXT,
  scored_at             TIMESTAMPTZ,

  -- Semantic Search (from OpenAI text-embedding-3-small)
  searchable_text       TEXT,
  embedding             vector(1536),

  -- Metadata
  source_file           TEXT,
  enriched_at           TIMESTAMPTZ,
  embedded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
-- Text search
CREATE INDEX idx_contacts_name ON contacts (name);
CREATE INDEX idx_contacts_company ON contacts (company);
CREATE INDEX idx_contacts_current_company ON contacts (current_company);
CREATE INDEX idx_contacts_location ON contacts (location);
CREATE INDEX idx_contacts_status ON contacts (status);
CREATE INDEX idx_contacts_innovera_contact ON contacts (innovera_contact);

-- JSONB
CREATE INDEX idx_contacts_industry ON contacts USING GIN (industry);
CREATE INDEX idx_contacts_skills ON contacts USING GIN (skills);
CREATE INDEX idx_contacts_experiences ON contacts USING GIN (experiences);

-- Vector (HNSW for better query performance)
CREATE INDEX idx_contacts_embedding ON contacts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Scoring
CREATE INDEX idx_contacts_expert_score ON contacts (expert_score DESC NULLS LAST);

-- Dedup
CREATE UNIQUE INDEX idx_contacts_linkedin_url ON contacts (linkedin_url);
```

### RPC Functions
```sql
-- Semantic search with score weighting
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  min_expert_score int DEFAULT 0
)
RETURNS TABLE (...) AS $$
  SELECT ...,
    1 - (embedding <=> query_embedding) AS similarity,
    (COALESCE(expert_score, 0) * 0.4 + (1 - (embedding <=> query_embedding)) * 0.6) AS combined_score
  FROM contacts
  WHERE embedding IS NOT NULL
    AND status = 'ready'
    AND 1 - (embedding <=> query_embedding) > match_threshold
    AND COALESCE(expert_score, 0) >= min_expert_score
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- Analytics view
CREATE VIEW contact_analytics AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'ready') AS searchable,
  COUNT(*) FILTER (WHERE status = 'error') AS errors,
  COUNT(*) FILTER (WHERE expert_score IS NOT NULL) AS scored,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS embedded,
  AVG(expert_score) FILTER (WHERE expert_score IS NOT NULL) AS avg_score,
  COUNT(DISTINCT current_company) AS unique_companies,
  COUNT(DISTINCT innovera_contact) AS unique_leads
FROM contacts;

-- Updated_at trigger (keep from existing)
```

### RLS Policies
Same open policies for now (prototype), but documented as needing auth later.

**Deliverable:** One `sql/schema.sql` file. Run it in Supabase SQL editor to set up the DB.

---

## Phase 2: Service Layer Rebuild

### Files to DELETE
- `src/services/expertDataProcessor.js` — replaced by pipeline
- `src/services/expertVectorUploader.js` — no separate vector table
- `src/services/expertEmbeddings.js` — merged into embeddings service
- `src/services/vectorUploader.js` — replaced by pipeline
- `src/services/textEnrichment.js` — replaced by EnrichLayer
- `src/services/supabaseUploader.js` — replaced by contactsService
- `src/services/aiExpertService.js` — AI-generated fake experts (remove)
- `src/services/diagnostics.js` — rewrite for new schema
- `src/data/mockExperts.js` — no more mock data

### Files to KEEP (with modifications)
- `src/services/supabaseClient.js` — keep, simplify connection test
- `src/services/excelParser.js` — keep, add dedup logic
- `src/services/openaiEmbeddings.js` — keep, simplify
- `src/services/groqExpertScorer.js` — keep, update for new schema
- `src/services/smartQueryService.js` — keep as-is (query enhancement)
- `src/services/contactsService.js` — rewrite for unified table

### Files to CREATE

#### `src/services/enrichLayerService.js` — NEW
EnrichLayer API integration via Vite dev proxy.

```
Proxy: /api/enrichlayer → https://enrichlayer.com
```

Functions:
- `enrichProfile(linkedinUrl)` — GET /api/v2/profile with linkedin URL
  - Returns structured profile data
  - Handles rate limits (300/min), retries with backoff
  - Maps EnrichLayer response → our contacts schema
- `getBalance()` — GET /api/v2/credit-balance (monitoring)
- `enrichBatch(contacts, onProgress)` — processes contacts sequentially
  with 200ms delay between calls (stays well within 300/min rate limit)
  - Updates each contact's status as it goes
  - On failure: sets status='error', status_step='enrichment', continues

#### `src/services/pipelineService.js` — NEW
Orchestrates the full pipeline. This is the brain.

```js
// Step 1: Upload & Clean
async function ingestExcel(file, innovera_contact) {
  // Parse Excel with excelParser
  // Normalize: trim whitespace, extract LinkedIn URLs, clean names
  // Dedup: check linkedin_url uniqueness against DB + within batch
  // Insert into contacts table with status='uploaded'
  // Return { inserted, skipped_duplicates, errors }
}

// Step 2: Enrich
async function enrichContacts(onProgress) {
  // Fetch all contacts WHERE status = 'uploaded'
  // For each: call enrichLayerService.enrichProfile()
  // Map response to our schema fields
  // Update contact with enriched data, status='enriched'
  // On error: status='error', status_step='enrichment'
}

// Step 3: Score
async function scoreContacts(onProgress) {
  // Fetch all contacts WHERE status = 'enriched'
  // Batch score with groqExpertScorer (batches of 3, 1s delay)
  // Update each contact with score + rationale, status='scored'
  // On error: status='error', status_step='scoring'
}

// Step 4: Embed
async function embedContacts(onProgress) {
  // Fetch all contacts WHERE status = 'scored'
  // Build searchable_text from enriched fields
  // Generate embeddings with openaiEmbeddings
  // Update contact with embedding + searchable_text, status='ready'
  // On error: status='error', status_step='embedding'
}

// Run full pipeline
async function runFullPipeline(file, innovera_contact, onProgress) {
  await ingestExcel(file, innovera_contact)
  await enrichContacts(onProgress)
  await scoreContacts(onProgress)
  await embedContacts(onProgress)
}

// Retry failed contacts from a specific step
async function retryErrors(step, onProgress) {
  // Fetch contacts WHERE status = 'error' AND status_step = step
  // Re-run that step's logic
}
```

#### `src/services/contactsService.js` — REWRITE
Simplified for one table.

```js
// CRUD
getAllContacts(options)         // paginated, with filters
getContactById(id)             // single record
updateContact(id, updates)     // partial update
deleteContact(id)              // hard delete

// Search
searchContactsSemantic(query, options)  // vector search via RPC
searchContactsText(query)              // ilike fallback

// Stats
getContactStats()              // call contact_analytics view
getPipelineStatus()            // count by status for pipeline progress

// Helpers
getContactsByStatus(status)    // for pipeline steps
```

---

## Phase 3: Frontend Rebuild

### Route Consolidation

**Current (9 routes) → New (5 routes):**

| Route | Component | Purpose |
|---|---|---|
| `/` | `FindExpert` | Semantic search (keep, fix broken parts) |
| `/pipeline` | `Pipeline` | Upload → Enrich → Score → Embed wizard |
| `/database` | `ViewDatabase` | Browse/filter contacts table |
| `/contact/:id` | `ContactProfile` | View individual contact |
| `/settings` | `Settings` | API keys, diagnostics, DB health |

**DELETE these routes/components:**
- `/upload` (ExcelUploader) — merged into Pipeline
- `/vector` (VectorUploader) — merged into Pipeline
- `/expert-scorer` (ExpertScorer) — merged into Pipeline
- `/expert-vector` (ExpertVectorUploader) — merged into Pipeline
- `/api-status` (APIKeyValidator) — merged into Settings
- `/update/:id` (UpdateExpert) — broken, rebuild as edit mode in ContactProfile

### `Pipeline.jsx` — NEW (the big one)

A step-by-step wizard with 4 phases. Each phase shows:
- Status indicator (pending/running/complete/error)
- Progress bar + count
- Error list with retry button

```
┌─────────────────────────────────────────────────┐
│  Pipeline: Upload & Process Contacts            │
├─────────────────────────────────────────────────┤
│                                                 │
│  [1. Upload ✓] → [2. Enrich ⟳] → [3. Score] → [4. Embed]  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Step 2: Enriching with EnrichLayer        │  │
│  │ ████████████░░░░░░░░ 45/100 (45%)         │  │
│  │                                           │  │
│  │ Currently: John Smith (linkedin.com/in/…) │  │
│  │ Credits remaining: 2,341                  │  │
│  │                                           │  │
│  │ 2 errors (will retry at end)              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Run Full Pipeline]  [Retry Errors]  [Cancel]  │
└─────────────────────────────────────────────────┘
```

Phase 1 (Upload):
- File drag-and-drop (keep existing UX)
- Innovera contact name field (who is uploading)
- Preview table showing parsed rows
- Dedup indicator: "12 new contacts, 3 duplicates skipped"
- Upload button inserts to DB

Phase 2 (Enrich):
- Shows contacts in 'uploaded' status
- "Enrich with EnrichLayer" button
- Progress with current profile name + credit balance
- Per-row status indicators

Phase 3 (Score):
- Shows contacts in 'enriched' status
- "Score with AI" button
- Progress with current profile + batch info

Phase 4 (Embed):
- Shows contacts in 'scored' status
- "Generate Embeddings" button
- Progress bar
- "Search Ready!" confirmation when done

Each step can be run independently (not just as a full pipeline). If you already uploaded and enriched last week, you can come back and just run scoring + embedding.

### `FindExpert.jsx` — FIX

- Remove references to deleted functions (`addAIGeneratedExperts`, `searchAllExperts`)
- Remove AI-generated expert fallback (no more fake profiles)
- Query the unified `contacts` table only
- Keep the query enhancement via smartQueryService
- Keep the semantic search toggle
- Simplify the results display

### `ViewDatabase.jsx` — UPDATE

- Query unified `contacts` table
- Add status column to table (color-coded pipeline status)
- Server-side pagination instead of loading 10K rows
- Industry filter uses the cleaned JSONB array
- Add "Send to Pipeline" bulk action for re-processing

### `ContactProfile.jsx` — REWRITE (from ExpertProfile)

- Rename from ExpertProfile to ContactProfile
- Fetch from unified `contacts` table
- Show enriched LinkedIn data in structured sections
- Show expert score + rationale
- Remove ephemeral notes (or persist to DB later)
- Add edit mode (inline editing, save to Supabase)

### `Settings.jsx` — NEW (from APIKeyValidator)

- API key status checks (OpenAI, Groq, EnrichLayer)
- EnrichLayer credit balance display
- Database health check (table exists, row counts, index status)
- Pipeline status overview (counts by status)
- "Reset Database" button (with confirmation)

---

## Phase 4: Config Changes

### `vite.config.js` — Add EnrichLayer proxy
```js
proxy: {
  '/api/groq': { ... },  // keep existing
  '/api/enrichlayer': {
    target: 'https://enrichlayer.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/enrichlayer/, ''),
  }
}
```

### `.env.example` — Update
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_ENRICHLAYER_API_KEY=your_enrichlayer_api_key
```

Remove `OPENROUTER_API_KEY` (unused).

---

## Implementation Order

Work in this sequence so we always have something runnable:

1. **Schema** — Write `sql/schema.sql`, run in Supabase
2. **supabaseClient.js** — Simplify connection test
3. **contactsService.js** — Rewrite for unified table
4. **enrichLayerService.js** — New EnrichLayer integration
5. **pipelineService.js** — Orchestration layer
6. **Update groqExpertScorer.js** — Adapt for new schema
7. **Update openaiEmbeddings.js** — Simplify for new schema
8. **vite.config.js** — Add EnrichLayer proxy
9. **Pipeline.jsx** — Build the pipeline wizard UI
10. **Update FindExpert.jsx** — Fix broken parts, use unified table
11. **Update ViewDatabase.jsx** — Use unified table, add pagination
12. **ContactProfile.jsx** — Rewrite for unified schema
13. **Settings.jsx** — New diagnostics page
14. **Navigation.jsx + App.jsx** — Update routes
15. **Delete old files** — Clean up everything we replaced
16. **Update .env.example** — New env var list

---

## What We're NOT Doing (Yet)

- Backend server (still SPA + Supabase — fine for prototyping)
- Authentication / proper RLS (open access for now)
- Tests (can add later)
- CI/CD / deployment
- Mobile-responsive nav
- Notes system (removed for now)
