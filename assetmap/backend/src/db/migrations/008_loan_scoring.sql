-- ─────────────────────────────────────────────────
-- LOAN SCORING TABLES
-- ─────────────────────────────────────────────────

CREATE TABLE loan_scorecards (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE,

  -- Loan request details
  loan_product              VARCHAR(30) NOT NULL CHECK (loan_product IN (
                              'home_loan', 'lap', 'personal_loan',
                              'business_loan', 'gold_loan',
                              'education_loan', 'vehicle_loan'
                            )),
  requested_amount_paise    BIGINT NOT NULL,
  requested_tenure_months   INTEGER NOT NULL,
  purpose                   TEXT,

  -- Composite score (0–1000)
  composite_score           INTEGER NOT NULL
                            CHECK (composite_score BETWEEN 0 AND 1000),

  -- Decision
  decision                  VARCHAR(20) NOT NULL CHECK (decision IN (
                              'APPROVE', 'CONDITIONAL', 'REJECT'
                            )),
  decision_reasons          TEXT[] NOT NULL DEFAULT '{}',
  conditions                TEXT[] DEFAULT '{}',
  max_eligible_paise        BIGINT,
  recommended_tenure_months INTEGER,
  recommended_rate_min_pct  DECIMAL(5,2),
  recommended_rate_max_pct  DECIMAL(5,2),

  -- Dimension scores (each 0–100)
  score_asset_strength      INTEGER CHECK (score_asset_strength BETWEEN 0 AND 100),
  score_income_stability    INTEGER CHECK (score_income_stability BETWEEN 0 AND 100),
  score_liability_burden    INTEGER CHECK (score_liability_burden BETWEEN 0 AND 100),
  score_liquidity           INTEGER CHECK (score_liquidity BETWEEN 0 AND 100),
  score_land_collateral     INTEGER CHECK (score_land_collateral BETWEEN 0 AND 100),
  score_behavioral          INTEGER CHECK (score_behavioral BETWEEN 0 AND 100),
  score_nominee_compliance  INTEGER CHECK (score_nominee_compliance BETWEEN 0 AND 100),
  score_fraud_risk          INTEGER CHECK (score_fraud_risk BETWEEN 0 AND 100),

  -- Dimension weights used (must sum to 1.0)
  weight_asset_strength     DECIMAL(4,3) NOT NULL DEFAULT 0.200,
  weight_income_stability   DECIMAL(4,3) NOT NULL DEFAULT 0.220,
  weight_liability_burden   DECIMAL(4,3) NOT NULL DEFAULT 0.180,
  weight_liquidity          DECIMAL(4,3) NOT NULL DEFAULT 0.120,
  weight_land_collateral    DECIMAL(4,3) NOT NULL DEFAULT 0.120,
  weight_behavioral         DECIMAL(4,3) NOT NULL DEFAULT 0.080,
  weight_nominee_compliance DECIMAL(4,3) NOT NULL DEFAULT 0.040,
  weight_fraud_risk         DECIMAL(4,3) NOT NULL DEFAULT 0.040,

  -- Input snapshot (what data was used)
  total_assets_paise        BIGINT,
  total_liabilities_paise   BIGINT,
  net_worth_paise           BIGINT,
  monthly_income_paise      BIGINT,
  monthly_obligations_paise BIGINT,
  liquid_assets_paise       BIGINT,
  land_value_paise          BIGINT,
  clear_title_land_paise    BIGINT,

  -- AI explanation
  ai_summary                TEXT,
  ai_strengths              TEXT[] DEFAULT '{}',
  ai_weaknesses             TEXT[] DEFAULT '{}',
  ai_risk_flags             TEXT[] DEFAULT '{}',
  ai_lender_notes           TEXT,

  -- Lender API tracking
  shared_with_lenders       TEXT[] DEFAULT '{}',
  lender_decisions          JSONB DEFAULT '{}',
  is_expired                BOOLEAN DEFAULT false,
  expires_at                TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',

  -- Version tracking (score model version)
  score_model_version       VARCHAR(10) DEFAULT 'v1.0',

  -- Audit
  generated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Score history for trend analysis
CREATE TABLE loan_score_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scorecard_id    UUID REFERENCES loan_scorecards(id),
  composite_score INTEGER NOT NULL,
  decision        VARCHAR(20) NOT NULL,
  loan_product    VARCHAR(30),
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lender API access log
CREATE TABLE lender_score_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id    UUID NOT NULL REFERENCES loan_scorecards(id),
  lender_id       UUID REFERENCES loan_lenders(id),
  lender_name     VARCHAR(200),
  api_key_hash    VARCHAR(64),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decision_made   VARCHAR(20),
  decision_at     TIMESTAMPTZ,
  notes           TEXT
);

-- Hard rejection rules (auto-reject without scoring)
CREATE TABLE hard_rejection_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name       VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  condition_sql   TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed hard rejection rules
INSERT INTO hard_rejection_rules (rule_name, description, rejection_reason, condition_sql) VALUES
('no_active_consent',
 'User has no active AA consent',
 'No financial data available — please link your accounts first.',
 'total_assets_paise = 0 AND monthly_income_paise = 0'),

('negative_net_worth',
 'Total liabilities exceed total assets',
 'Your liabilities currently exceed your total assets.',
 'net_worth_paise < -100000000'),

('extreme_foir',
 'Fixed obligations exceed 80% of income',
 'Your existing loan EMIs already consume over 80% of income.',
 'monthly_obligations_paise > monthly_income_paise * 0.80'),

('anomaly_flag_active',
 'Active fraud anomaly detected on account',
 'We detected unusual activity on your accounts. Please contact support.',
 'fraud_risk_score < 20'),

('zero_income_detected',
 'No income detected in transaction history',
 'We could not detect any income credits in your account history.',
 'monthly_income_paise = 0');

-- Indexes
CREATE INDEX idx_loan_scorecards_user
  ON loan_scorecards(user_id, generated_at DESC);
CREATE INDEX idx_loan_scorecards_decision
  ON loan_scorecards(decision, composite_score DESC);
CREATE INDEX idx_loan_score_history_user
  ON loan_score_history(user_id, scored_at DESC);
CREATE INDEX idx_lender_score_requests_scorecard
  ON lender_score_requests(scorecard_id, requested_at DESC);

-- RLS
ALTER TABLE loan_scorecards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_score_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_score_requests   ENABLE ROW LEVEL SECURITY;

CREATE POLICY scorecards_rls ON loan_scorecards
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
CREATE POLICY score_history_rls ON loan_score_history
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
