-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- 1. INSURANCE GAP FINDER
-- ─────────────────────────────────────────────

-- Parsed insurance policies from AA data
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Policy details (sensitive — encrypted)
  policy_number_enc     TEXT,
  insurer_name          VARCHAR(200),
  policy_type           VARCHAR(50) NOT NULL CHECK (policy_type IN (
                          'LIFE', 'TERM', 'HEALTH', 'VEHICLE',
                          'PROPERTY', 'TRAVEL', 'ULIP', 'ENDOWMENT',
                          'PENSION', 'CRITICAL_ILLNESS', 'OTHER'
                        )),
  plan_name             VARCHAR(200),

  -- Coverage (in paise)
  sum_assured_paise     BIGINT,
  premium_paise         BIGINT,
  premium_frequency     VARCHAR(20) CHECK (premium_frequency IN (
                          'MONTHLY','QUARTERLY','HALF_YEARLY','ANNUALLY'
                        )),

  -- Dates
  policy_start_date     DATE,
  policy_end_date       DATE,
  maturity_date         DATE,

  -- Status
  policy_status         VARCHAR(30) CHECK (policy_status IN (
                          'ACTIVE','LAPSED','MATURED','SURRENDERED','CLAIMED'
                        )),

  -- Nominees
  nominee_name_enc      TEXT,
  nominee_relation      VARCHAR(50),

  -- Source
  source                VARCHAR(20) DEFAULT 'aa',
  source_policy_id      VARCHAR(200),
  raw_data_enc          TEXT,

  is_active             BOOLEAN DEFAULT true,
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, source, source_policy_id)
);

-- Insurance gap analysis results
CREATE TABLE IF NOT EXISTS insurance_gap_analysis (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE,
  analysed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User profile inputs
  annual_income_paise       BIGINT,
  age                       INTEGER,
  dependents_count          INTEGER DEFAULT 0,
  outstanding_loans_paise   BIGINT DEFAULT 0,
  monthly_expenses_paise    BIGINT,

  -- Coverage calculated
  total_life_cover_paise    BIGINT DEFAULT 0,
  total_health_cover_paise  BIGINT DEFAULT 0,
  total_term_cover_paise    BIGINT DEFAULT 0,
  has_term_plan             BOOLEAN DEFAULT false,
  has_health_cover          BOOLEAN DEFAULT false,
  has_critical_illness      BOOLEAN DEFAULT false,

  -- Recommended coverage (standard formula: 10-15x annual income)
  recommended_life_paise    BIGINT,
  recommended_health_paise  BIGINT,
  recommended_term_paise    BIGINT,

  -- Gaps (in paise, negative = underinsured)
  life_gap_paise            BIGINT DEFAULT 0,
  health_gap_paise          BIGINT DEFAULT 0,
  term_gap_paise            BIGINT DEFAULT 0,

  -- Gap severity
  gap_severity              VARCHAR(20) CHECK (gap_severity IN (
                              'critical','high','medium','low','none'
                            )),
  gap_score                 INTEGER CHECK (gap_score BETWEEN 0 AND 100),

  -- Affiliate tracking
  affiliate_shown           BOOLEAN DEFAULT false,
  affiliate_clicked         BOOLEAN DEFAULT false,
  affiliate_partner         VARCHAR(100),
  affiliate_click_at        TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. UNCLAIMED ASSETS SEARCH
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS unclaimed_search_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pan_enc           TEXT NOT NULL,
  aadhaar_hash      VARCHAR(100),
  name_enc          TEXT NOT NULL,
  payment_id        VARCHAR(200),
  amount_paid_paise INTEGER DEFAULT 9900,  -- ₹99 in paise
  payment_status    VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
                      'pending','completed','failed','refunded'
                    )),
  search_status     VARCHAR(20) DEFAULT 'pending' CHECK (search_status IN (
                      'pending','running','completed','failed'
                    )),
  searched_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unclaimed_assets_found (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id         UUID NOT NULL REFERENCES unclaimed_search_requests(id)
                    ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  source            VARCHAR(30) NOT NULL CHECK (source IN (
                      'iepf','epfo','irdai_insurance',
                      'rbi_unclaimed','npci'
                    )),
  asset_type        VARCHAR(50),

  -- Details
  company_name      VARCHAR(300),
  folio_number_enc  TEXT,
  amount_paise      BIGINT,
  claim_ref         VARCHAR(200),

  -- Claim instructions
  claim_url         TEXT,
  claim_process     TEXT,
  documents_needed  JSONB DEFAULT '[]',

  -- Status
  is_claimed        BOOLEAN DEFAULT false,
  claimed_at        TIMESTAMPTZ,
  raw_response_enc  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. DIGITAL WILL BUILDER
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id)
                        ON DELETE CASCADE,

  -- Testator details (encrypted)
  testator_name_enc     TEXT NOT NULL,
  testator_dob_enc      TEXT,
  testator_address_enc  TEXT,
  testator_pan_enc      TEXT,
  testator_aadhaar_hash VARCHAR(100),

  -- Will metadata
  will_version          INTEGER DEFAULT 1,
  status                VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
                          'draft','completed','signed','superseded'
                        )),
  title                 VARCHAR(200) DEFAULT 'My Will',

  -- Executor
  executor_name_enc     TEXT,
  executor_relation     VARCHAR(50),
  executor_mobile_enc   TEXT,
  alt_executor_name_enc TEXT,

  -- Documents
  pdf_s3_key            TEXT,
  pdf_generated_at      TIMESTAMPTZ,
  esign_ref             VARCHAR(200),
  esign_status          VARCHAR(20) DEFAULT 'not_signed' CHECK (esign_status IN (
                          'not_signed','pending','signed','rejected'
                        )),
  esign_completed_at    TIMESTAMPTZ,

  -- Subscription
  subscription_id       VARCHAR(200),
  subscription_plan     VARCHAR(20) CHECK (subscription_plan IN (
                          'basic','premium'
                        )),
  subscription_valid_until DATE,

  -- Witnesses (required for valid will under Indian Succession Act)
  witness1_name_enc     TEXT,
  witness1_address_enc  TEXT,
  witness2_name_enc     TEXT,
  witness2_address_enc  TEXT,

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one active will per user at a time
  UNIQUE(user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Will asset allocations — links will to discovered assets
CREATE TABLE IF NOT EXISTS will_allocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id               UUID NOT NULL REFERENCES wills(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),

  -- What is being allocated
  asset_type            VARCHAR(30) NOT NULL CHECK (asset_type IN (
                          'bank_account','mutual_fund','equity',
                          'insurance_policy','land_record','nps',
                          'vehicle','jewelry','other'
                        )),
  asset_ref_id          UUID,         -- FK to relevant table
  asset_description     TEXT,         -- Human-readable description
  estimated_value_paise BIGINT,

  -- Beneficiary
  beneficiary_name_enc  TEXT NOT NULL,
  beneficiary_relation  VARCHAR(50) NOT NULL,
  beneficiary_mobile_enc TEXT,
  beneficiary_aadhaar_hash VARCHAR(100),
  allocation_pct        DECIMAL(5,2) DEFAULT 100.00,  -- % of this asset

  -- Conditions
  condition_text        TEXT,         -- e.g. "Only after age 25"
  is_contingent         BOOLEAN DEFAULT false,
  contingent_beneficiary_name_enc TEXT,

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Will beneficiaries master list
CREATE TABLE IF NOT EXISTS will_beneficiaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id           UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  name_enc          TEXT NOT NULL,
  relation          VARCHAR(50) NOT NULL,
  dob_enc           TEXT,
  mobile_enc        TEXT,
  email_enc         TEXT,
  address_enc       TEXT,
  aadhaar_hash      VARCHAR(100),
  pan_enc           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. LOAN ELIGIBILITY
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loan_assessments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE,
  assessed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Inputs (from AA + land data)
  monthly_income_paise      BIGINT,
  monthly_obligations_paise BIGINT,
  total_assets_paise        BIGINT,
  total_land_value_paise    BIGINT,
  existing_loans_paise      BIGINT DEFAULT 0,
  credit_score_approx       INTEGER,

  -- Eligibility estimates (in paise)
  home_loan_max_paise       BIGINT,
  lap_max_paise             BIGINT,     -- Loan against property
  personal_loan_max_paise   BIGINT,

  -- Derived metrics
  foir                      DECIMAL(5,2), -- Fixed Obligation to Income Ratio
  ltv_ratio                 DECIMAL(5,2), -- Loan to Value ratio

  -- Lenders shown
  lenders_shown             JSONB DEFAULT '[]',

  -- Lead tracking
  lead_submitted            BOOLEAN DEFAULT false,
  lead_submitted_at         TIMESTAMPTZ,
  lead_partner              VARCHAR(100),
  lead_product              VARCHAR(50),
  commission_paise          INTEGER,
  commission_paid           BOOLEAN DEFAULT false,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NBFC partner lenders catalog
CREATE TABLE IF NOT EXISTS loan_lenders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  logo_url          TEXT,
  lender_type       VARCHAR(30) CHECK (lender_type IN (
                      'bank','nbfc','hfc','mfi'
                    )),
  loan_types        TEXT[] DEFAULT '{}',
  min_loan_paise    BIGINT,
  max_loan_paise    BIGINT,
  min_rate_pct      DECIMAL(5,2),
  max_rate_pct      DECIMAL(5,2),
  min_tenure_months INTEGER,
  max_tenure_months INTEGER,
  min_income_paise  BIGINT,
  min_cibil_score   INTEGER DEFAULT 650,
  processing_fee_pct DECIMAL(5,2) DEFAULT 0,
  affiliate_url     TEXT,
  commission_paise  INTEGER,  -- per approved lead
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE insurance_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_gap_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE unclaimed_search_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unclaimed_assets_found    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wills                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE will_allocations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE will_beneficiaries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_assessments          ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY insurance_policies_rls ON insurance_policies
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY insurance_gap_rls ON insurance_gap_analysis
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY unclaimed_search_rls ON unclaimed_search_requests
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY unclaimed_found_rls ON unclaimed_assets_found
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY wills_rls ON wills
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY will_allocations_rls ON will_allocations
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY will_beneficiaries_rls ON will_beneficiaries
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY loan_assessments_rls ON loan_assessments
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
EXCEPTION WHEN duplicate_object THEN null; END $$;
