-- ─────────────────────────────────────────────────────
-- ANCESTRAL PROPERTY FINDER
-- ─────────────────────────────────────────────────────

-- Search sessions — one per user search request
CREATE TABLE ancestral_searches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id)
                        ON DELETE CASCADE,

  -- Ancestor details (what user provides)
  ancestor_name         VARCHAR(300) NOT NULL,
  ancestor_name_variants TEXT[] DEFAULT '{}',
  relationship          VARCHAR(50) NOT NULL CHECK (relationship IN (
                          'grandfather', 'grandmother',
                          'great_grandfather', 'great_grandmother',
                          'father', 'mother',
                          'uncle', 'aunt',
                          'other_ancestor'
                        )),
  relationship_label    VARCHAR(100),

  -- Location clues (as much or as little as user knows)
  state                 VARCHAR(100) NOT NULL,
  district              VARCHAR(200),
  taluka                VARCHAR(200),
  village               VARCHAR(200),
  survey_number         VARCHAR(100),   -- if user happens to know it
  approximate_decade    VARCHAR(20),    -- e.g. "1960s", "before 1980"
  additional_clues      TEXT,           -- free text: "near railway station"

  -- Search execution
  status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'searching',
                          'completed', 'failed', 'no_results'
                        )),
  search_method         VARCHAR(20) CHECK (search_method IN (
                          'surepass_api', 'deep_link', 'offline_guide'
                        )),
  states_searched       TEXT[] DEFAULT '{}',
  variants_tried        TEXT[] DEFAULT '{}',
  api_calls_made        INTEGER DEFAULT 0,
  results_count         INTEGER DEFAULT 0,
  confirmed_count       INTEGER DEFAULT 0,

  -- Timing
  initiated_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_ms           INTEGER,

  -- Plan tracking
  plan_at_search        VARCHAR(20),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual results from each search
CREATE TABLE ancestral_search_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id             UUID NOT NULL REFERENCES ancestral_searches(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),

  -- What the API returned
  raw_owner_name        VARCHAR(300),
  survey_number         VARCHAR(100),
  khata_number          VARCHAR(100),
  village               VARCHAR(200),
  taluka                VARCHAR(200),
  district              VARCHAR(200),
  state                 VARCHAR(100),
  land_area_acres       DECIMAL(10,4),
  land_area_sqft        DECIMAL(12,2),
  land_type             VARCHAR(100),
  land_use              VARCHAR(100),

  -- Current owner (may differ from ancestor if transferred)
  current_owner_name    VARCHAR(300),
  current_owner_type    VARCHAR(50) CHECK (current_owner_type IN (
                          'same_person', 'heir', 'sold',
                          'government', 'unknown'
                        )),

  -- Mutation history (transfers/changes)
  mutation_history      JSONB DEFAULT '[]',
  last_mutation_date    DATE,
  last_mutation_type    VARCHAR(100),

  -- Encumbrance / disputes
  has_encumbrance       BOOLEAN DEFAULT false,
  encumbrance_details   TEXT,
  is_disputed           BOOLEAN DEFAULT false,

  -- AI confidence scoring
  confidence_score      INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_label      VARCHAR(20) CHECK (confidence_label IN (
                          'very_likely', 'likely',
                          'possible', 'unlikely'
                        )),
  confidence_reasons    TEXT[] DEFAULT '{}',
  name_match_score      INTEGER,
  location_match_score  INTEGER,
  time_period_score     INTEGER,

  -- Name variant that matched
  matched_variant       VARCHAR(300),
  match_type            VARCHAR(20) CHECK (match_type IN (
                          'exact', 'phonetic', 'partial',
                          'transliteration'
                        )),

  -- User interaction
  user_status           VARCHAR(20) DEFAULT 'pending_review'
                        CHECK (user_status IN (
                          'pending_review',  -- not yet seen
                          'confirmed',       -- user says this is theirs
                          'rejected',        -- user says not theirs
                          'investigating'    -- user is checking
                        )),
  user_notes            TEXT,
  confirmed_at          TIMESTAMPTZ,

  -- Portal links
  portal_url            TEXT,
  deep_link_url         TEXT,

  -- If added to property records
  canonical_asset_id    UUID REFERENCES canonical_assets(id),
  added_to_records      BOOLEAN DEFAULT false,

  -- Raw API response
  raw_api_response      JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offline guidance generated for states without API
CREATE TABLE ancestral_offline_guides (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id             UUID NOT NULL REFERENCES ancestral_searches(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  state                 VARCHAR(100) NOT NULL,
  district              VARCHAR(200),
  tahsildar_office      TEXT,
  office_address        TEXT,
  office_phone          VARCHAR(30),
  office_hours          VARCHAR(100),
  forms_required        TEXT[] DEFAULT '{}',
  steps                 JSONB DEFAULT '[]',
  portal_url            TEXT,
  request_letter_s3_key TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature usage — for plan limit enforcement
-- Reuses feature_usage table from 011_plans_billing.sql
-- feature_key = 'ancestral_search'
-- period = yearly (1 free search per year on Free plan)

-- Indexes
CREATE INDEX idx_ancestral_searches_user
  ON ancestral_searches(user_id, created_at DESC);
CREATE INDEX idx_ancestral_results_search
  ON ancestral_search_results(search_id, confidence_score DESC);
CREATE INDEX idx_ancestral_results_user_confirmed
  ON ancestral_search_results(user_id, user_status)
  WHERE user_status = 'confirmed';

-- RLS
ALTER TABLE ancestral_searches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ancestral_search_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ancestral_offline_guides  ENABLE ROW LEVEL SECURITY;

CREATE POLICY ancestral_searches_rls ON ancestral_searches
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
CREATE POLICY ancestral_results_rls ON ancestral_search_results
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
CREATE POLICY ancestral_guides_rls ON ancestral_offline_guides
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
