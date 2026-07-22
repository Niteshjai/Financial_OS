-- ─────────────────────────────────────────────
-- PLANS AND BILLING
-- ─────────────────────────────────────────────

CREATE TABLE plans (
  id                    VARCHAR(20) PRIMARY KEY,
  name                  VARCHAR(100) NOT NULL,
  slug                  VARCHAR(20) NOT NULL UNIQUE,

  -- Pricing (in paise)
  price_monthly_paise   BIGINT NOT NULL DEFAULT 0,
  price_yearly_paise    BIGINT NOT NULL DEFAULT 0,
  price_display_monthly VARCHAR(20),
  price_display_yearly  VARCHAR(20),
  savings_pct           INTEGER DEFAULT 0,

  -- Razorpay plan IDs
  razorpay_monthly_plan_id VARCHAR(100),
  razorpay_yearly_plan_id  VARCHAR(100),

  -- Plan metadata
  tagline               VARCHAR(200),
  is_popular            BOOLEAN DEFAULT false,
  is_active             BOOLEAN DEFAULT true,
  display_order         INTEGER DEFAULT 0,

  -- Hard limits (NULL = unlimited)
  limit_land_parcels    INTEGER,
  limit_networth_months INTEGER,
  limit_pdf_reports_pm  INTEGER,
  limit_unclaimed_searches_py INTEGER,
  limit_family_members  INTEGER DEFAULT 1,
  limit_will_allocations INTEGER,
  limit_property_valuations_pm INTEGER,
  limit_ai_messages_pm  INTEGER,
  limit_api_calls_pm    INTEGER,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plans
INSERT INTO plans (
  id, name, slug,
  price_monthly_paise, price_yearly_paise,
  price_display_monthly, price_display_yearly,
  savings_pct, tagline, is_popular, display_order,
  limit_land_parcels, limit_networth_months,
  limit_pdf_reports_pm, limit_unclaimed_searches_py,
  limit_family_members, limit_will_allocations,
  limit_property_valuations_pm, limit_ai_messages_pm,
  limit_api_calls_pm
) VALUES

-- FREE
('free', 'Free', 'free',
 0, 0, '₹0', '₹0', 0,
 'Discover what you own',
 false, 1,
 3, 3, 1, 1, 1, 0, 0, 0, 0),

-- PLUS
('plus', 'Plus', 'plus',
 19900, 179900, '₹199/mo', '₹1,799/yr', 25,
 'For serious financial health',
 true, 2,
 NULL, 24, NULL, NULL, 1, 5, 0, 0, 0),

-- PRO
('pro', 'Pro', 'pro',
 49900, 449900, '₹499/mo', '₹4,499/yr', 25,
 'For complete financial control',
 false, 3,
 NULL, NULL, NULL, NULL, 4, NULL, 3, 50, 100),

-- B2B (not self-serve)
('b2b', 'Business', 'b2b',
 0, 0, 'Custom', 'Custom', 0,
 'For law firms, NBFCs and wealth managers',
 false, 4,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- Feature flags per plan (more granular than limits)
CREATE TABLE plan_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         VARCHAR(20) NOT NULL REFERENCES plans(id),
  feature_key     VARCHAR(100) NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(plan_id, feature_key)
);

-- Seed feature flags
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES
-- FREE features
('free', 'asset_dashboard',        true),
('free', 'land_records',           true),
('free', 'nominee_checker',        true),
('free', 'dormant_finder',         true),
('free', 'networth_tracker',       true),
('free', 'email_alerts',           true),
('free', 'unclaimed_search',       true),
('free', 'success_fee_recovery',   true),
('free', 'pdf_report',             true),
('free', 'sms_alerts',             false),
('free', 'push_alerts',            false),
('free', 'insurance_gap',          false),
('free', 'loan_eligibility',       false),
('free', 'digilocker_vault',       false),
('free', 'will_builder',           false),
('free', 'family_vault',           false),
('free', 'nri_cross_border',       false),
('free', 'ai_advisor',             false),
('free', 'credit_score',           false),
('free', 'tax_filing',             false),
('free', 'property_valuation',     false),
('free', 'loan_scoring',           false),
('free', 'api_access',             false),
('free', 'spend_analyser',         false),
('free', 'subscription_detector',  false),

-- PLUS features (everything free + more)
('plus', 'asset_dashboard',        true),
('plus', 'land_records',           true),
('plus', 'nominee_checker',        true),
('plus', 'dormant_finder',         true),
('plus', 'networth_tracker',       true),
('plus', 'email_alerts',           true),
('plus', 'sms_alerts',             true),
('plus', 'push_alerts',            true),
('plus', 'unclaimed_search',       true),
('plus', 'success_fee_recovery',   true),
('plus', 'pdf_report',             true),
('plus', 'insurance_gap',          true),
('plus', 'loan_eligibility',       true),
('plus', 'digilocker_vault',       true),
('plus', 'will_builder',           true),
('plus', 'spend_analyser',         true),
('plus', 'subscription_detector',  true),
('plus', 'family_vault',           false),
('plus', 'nri_cross_border',       false),
('plus', 'ai_advisor',             false),
('plus', 'credit_score',           false),
('plus', 'tax_filing',             false),
('plus', 'property_valuation',     false),
('plus', 'loan_scoring',           false),
('plus', 'api_access',             false),

-- PRO features (everything)
('pro', 'asset_dashboard',         true),
('pro', 'land_records',            true),
('pro', 'nominee_checker',         true),
('pro', 'dormant_finder',          true),
('pro', 'networth_tracker',        true),
('pro', 'email_alerts',            true),
('pro', 'sms_alerts',              true),
('pro', 'push_alerts',             true),
('pro', 'unclaimed_search',        true),
('pro', 'success_fee_recovery',    true),
('pro', 'pdf_report',              true),
('pro', 'insurance_gap',           true),
('pro', 'loan_eligibility',        true),
('pro', 'digilocker_vault',        true),
('pro', 'will_builder',            true),
('pro', 'spend_analyser',          true),
('pro', 'subscription_detector',   true),
('pro', 'family_vault',            true),
('pro', 'nri_cross_border',        true),
('pro', 'ai_advisor',              true),
('pro', 'credit_score',            true),
('pro', 'tax_filing',              true),
('pro', 'property_valuation',      true),
('pro', 'loan_scoring',            true),
('pro', 'api_access',              true),

-- B2B (everything pro + more)
('b2b', 'asset_dashboard',         true),
('b2b', 'land_records',            true),
('b2b', 'nominee_checker',         true),
('b2b', 'dormant_finder',          true),
('b2b', 'networth_tracker',        true),
('b2b', 'all_alerts',              true),
('b2b', 'unclaimed_search',        true),
('b2b', 'success_fee_recovery',    true),
('b2b', 'pdf_report',              true),
('b2b', 'insurance_gap',           true),
('b2b', 'loan_eligibility',        true),
('b2b', 'digilocker_vault',        true),
('b2b', 'will_builder',            true),
('b2b', 'spend_analyser',          true),
('b2b', 'subscription_detector',   true),
('b2b', 'family_vault',            true),
('b2b', 'nri_cross_border',        true),
('b2b', 'ai_advisor',              true),
('b2b', 'credit_score',            true),
('b2b', 'tax_filing',              true),
('b2b', 'property_valuation',      true),
('b2b', 'loan_scoring',            true),
('b2b', 'api_access',              true),
('b2b', 'b2b_api',                 true),
('b2b', 'white_label_sdk',         true),
('b2b', 'multi_client',            true);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE,
  plan_id                   VARCHAR(20) NOT NULL REFERENCES plans(id),
  billing_cycle             VARCHAR(10) NOT NULL DEFAULT 'monthly'
                            CHECK (billing_cycle IN ('monthly','yearly','lifetime')),

  -- Status
  status                    VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN (
                              'active', 'cancelled', 'past_due',
                              'paused', 'trialing', 'expired'
                            )),

  -- Razorpay
  razorpay_subscription_id  VARCHAR(100) UNIQUE,
  razorpay_customer_id      VARCHAR(100),
  razorpay_plan_id          VARCHAR(100),

  -- Dates
  trial_ends_at             TIMESTAMPTZ,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN DEFAULT false,
  expires_at                TIMESTAMPTZ,

  -- Pricing at time of subscription
  price_paise               BIGINT NOT NULL,
  currency                  VARCHAR(5) DEFAULT 'INR',

  -- Promo
  promo_code                VARCHAR(50),
  discount_pct              INTEGER DEFAULT 0,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one active subscription per user
  UNIQUE(user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Payment history
CREATE TABLE subscription_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id         UUID NOT NULL REFERENCES user_subscriptions(id),
  user_id                 UUID NOT NULL REFERENCES users(id),
  razorpay_payment_id     VARCHAR(100) UNIQUE,
  razorpay_invoice_id     VARCHAR(100),
  amount_paise            BIGINT NOT NULL,
  gst_paise               BIGINT NOT NULL DEFAULT 0,
  total_paise             BIGINT NOT NULL,
  status                  VARCHAR(20) CHECK (status IN (
                            'paid', 'failed', 'refunded', 'pending'
                          )),
  payment_method          VARCHAR(50),
  invoice_s3_key          TEXT,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature usage tracking (for limit enforcement)
CREATE TABLE feature_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key     VARCHAR(100) NOT NULL,
  period          DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  usage_count     INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  UNIQUE(user_id, feature_key, period)
);

-- Promo codes
CREATE TABLE promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) NOT NULL UNIQUE,
  description     VARCHAR(200),
  discount_pct    INTEGER NOT NULL CHECK (discount_pct BETWEEN 1 AND 100),
  applicable_plans TEXT[] DEFAULT '{}',
  max_uses        INTEGER,
  uses_count      INTEGER DEFAULT 0,
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user
  ON user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_razorpay
  ON user_subscriptions(razorpay_subscription_id);
CREATE INDEX idx_subscription_payments_user
  ON subscription_payments(user_id, paid_at DESC);
CREATE INDEX idx_feature_usage_user
  ON feature_usage(user_id, feature_key, period);

-- RLS
ALTER TABLE user_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage         ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_rls ON user_subscriptions
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
CREATE POLICY payments_rls ON subscription_payments
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);
CREATE POLICY usage_rls ON feature_usage
  FOR ALL USING (user_id =
    current_setting('app.current_user_id')::UUID);

-- Helper view: current plan per user
CREATE VIEW user_current_plan AS
SELECT
  u.id AS user_id,
  COALESCE(s.plan_id, 'free') AS plan_id,
  COALESCE(s.status, 'active') AS subscription_status,
  COALESCE(s.billing_cycle, 'monthly') AS billing_cycle,
  s.current_period_end,
  s.cancel_at_period_end,
  p.name AS plan_name,
  p.price_monthly_paise,
  p.limit_land_parcels,
  p.limit_networth_months,
  p.limit_pdf_reports_pm,
  p.limit_unclaimed_searches_py,
  p.limit_family_members,
  p.limit_will_allocations,
  p.limit_property_valuations_pm,
  p.limit_ai_messages_pm,
  p.limit_api_calls_pm
FROM users u
LEFT JOIN user_subscriptions s ON s.user_id = u.id
  AND s.status IN ('active','trialing')
LEFT JOIN plans p ON p.id = COALESCE(s.plan_id, 'free')
WHERE p.id IS NOT NULL;
