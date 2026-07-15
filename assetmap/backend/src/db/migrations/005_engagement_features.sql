-- ─────────────────────────────────────────
-- 0. RENAME EXISTING TABLE & ADD FCM TOKEN
-- ─────────────────────────────────────────
ALTER TABLE asset_snapshots RENAME TO asset_snapshots_aa;
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(300);

-- ─────────────────────────────────────────
-- 1. ASSET SNAPSHOTS — daily AA data copy
-- ─────────────────────────────────────────
CREATE TABLE asset_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Aggregated values (in paise)
  total_balance_paise BIGINT NOT NULL DEFAULT 0,
  bank_balance_paise  BIGINT NOT NULL DEFAULT 0,
  mf_value_paise      BIGINT NOT NULL DEFAULT 0,
  equity_value_paise  BIGINT NOT NULL DEFAULT 0,
  nps_value_paise     BIGINT NOT NULL DEFAULT 0,
  insurance_value_paise BIGINT NOT NULL DEFAULT 0,
  land_value_paise    BIGINT NOT NULL DEFAULT 0,

  -- Account counts
  total_accounts      INTEGER NOT NULL DEFAULT 0,
  bank_accounts       INTEGER NOT NULL DEFAULT 0,
  investment_accounts INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

-- Monthly rolled-up snapshots for long-term chart
CREATE TABLE networth_monthly (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month               DATE NOT NULL,  -- always 1st of month
  total_paise         BIGINT NOT NULL DEFAULT 0,
  bank_paise          BIGINT NOT NULL DEFAULT 0,
  investments_paise   BIGINT NOT NULL DEFAULT 0,
  land_paise          BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, month)
);

-- ─────────────────────────────────────────
-- 2. ALERTS
-- ─────────────────────────────────────────
CREATE TABLE user_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  alert_type          VARCHAR(50) NOT NULL CHECK (alert_type IN (
                        'balance_drop', 'balance_rise',
                        'new_account_linked', 'account_unlinked',
                        'land_ownership_change', 'dormant_account_found',
                        'nominee_missing', 'large_transaction',
                        'aadhaar_new_link', 'consent_expiring'
                      )),
  severity            VARCHAR(20) NOT NULL CHECK (severity IN
                        ('info','warning','critical')),
  title               VARCHAR(200) NOT NULL,
  body                TEXT NOT NULL,
  metadata            JSONB DEFAULT '{}',

  -- Delivery
  is_read             BOOLEAN DEFAULT false,
  read_at             TIMESTAMPTZ,
  sms_sent            BOOLEAN DEFAULT false,
  sms_sent_at         TIMESTAMPTZ,
  push_sent           BOOLEAN DEFAULT false,
  push_sent_at        TIMESTAMPTZ,
  email_sent          BOOLEAN DEFAULT false,
  email_sent_at       TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert preferences per user
CREATE TABLE alert_preferences (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Channels
  sms_enabled         BOOLEAN DEFAULT true,
  push_enabled        BOOLEAN DEFAULT true,
  email_enabled       BOOLEAN DEFAULT false,

  -- Thresholds
  balance_drop_pct    INTEGER DEFAULT 20,  -- alert if drops > 20%
  balance_drop_min_paise BIGINT DEFAULT 500000,  -- min ₹5,000 drop

  -- Alert types enabled
  alert_balance_drop  BOOLEAN DEFAULT true,
  alert_new_account   BOOLEAN DEFAULT true,
  alert_land_change   BOOLEAN DEFAULT true,
  alert_dormant       BOOLEAN DEFAULT true,
  alert_nominee       BOOLEAN DEFAULT true,
  alert_large_txn     BOOLEAN DEFAULT true,
  large_txn_threshold_paise BIGINT DEFAULT 10000000,  -- ₹1L

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. NOMINEE TRACKING
-- ─────────────────────────────────────────
CREATE TABLE nominee_status (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_ref         VARCHAR(200) NOT NULL,
  institution_name    VARCHAR(200),
  fi_type             VARCHAR(50),
  has_nominee         BOOLEAN,
  nominee_name_enc    TEXT,
  last_checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, account_ref)
);

-- ─────────────────────────────────────────
-- 4. DORMANT ACCOUNTS
-- ─────────────────────────────────────────
CREATE TABLE dormant_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_ref         VARCHAR(200) NOT NULL,
  institution_name    VARCHAR(200),
  fi_type             VARCHAR(50),
  balance_paise       BIGINT DEFAULT 0,
  last_transaction_date DATE,
  months_inactive     INTEGER,
  is_acknowledged     BOOLEAN DEFAULT false,
  acknowledged_at     TIMESTAMPTZ,
  iepf_risk           BOOLEAN DEFAULT false,
  iepf_transfer_date  DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, account_ref)
);

-- Indexes
CREATE INDEX idx_asset_snapshots_user_date
  ON asset_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_networth_monthly_user
  ON networth_monthly(user_id, month DESC);
CREATE INDEX idx_user_alerts_user_unread
  ON user_alerts(user_id, is_read, created_at DESC);
CREATE INDEX idx_user_alerts_type
  ON user_alerts(user_id, alert_type, created_at DESC);
CREATE INDEX idx_nominee_status_user
  ON nominee_status(user_id);
CREATE INDEX idx_dormant_accounts_user
  ON dormant_accounts(user_id);

-- RLS
ALTER TABLE asset_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE networth_monthly   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominee_status     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormant_accounts   ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_isolation ON asset_snapshots
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
CREATE POLICY networth_isolation ON networth_monthly
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
CREATE POLICY alerts_isolation ON user_alerts
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
CREATE POLICY nominee_isolation ON nominee_status
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
CREATE POLICY dormant_isolation ON dormant_accounts
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
