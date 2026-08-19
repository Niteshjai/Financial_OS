-- ─────────────────────────────────────────────────────
-- TRANSACTION CLASSIFIER
-- ─────────────────────────────────────────────────────

-- All classified transactions
CREATE TABLE classified_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id)
                          ON DELETE CASCADE,

  -- Source
  source_account_id       UUID REFERENCES canonical_assets(id),
  bank_name               VARCHAR(200),
  account_ref_hash        VARCHAR(64),

  -- Raw transaction data from AA
  transaction_date        DATE NOT NULL,
  value_date              DATE,
  narration               TEXT NOT NULL,  -- raw bank description
  amount_paise            BIGINT NOT NULL,
  transaction_type        VARCHAR(10) NOT NULL CHECK (
                            transaction_type IN ('debit','credit')
                          ),
  reference_number        VARCHAR(200),
  mode                    VARCHAR(30),  -- UPI, NEFT, IMPS, NACH, ATM

  -- Cleaned merchant name
  merchant_name           VARCHAR(300),
  merchant_category_code  VARCHAR(10),

  -- AI Classification
  category                VARCHAR(50) NOT NULL,
  subcategory             VARCHAR(100),
  category_group          VARCHAR(20) NOT NULL CHECK (
                            category_group IN ('expense','revenue','transfer','ignore')
                          ),
  confidence              INTEGER CHECK (confidence BETWEEN 0 AND 100),

  -- Classification method
  classified_by           VARCHAR(20) CHECK (classified_by IN (
                            'rule_engine',  -- fast rule match
                            'claude_ai',    -- Claude classified
                            'user',         -- user corrected
                            'inherited'     -- same merchant as before
                          )),
  classification_reason   TEXT,

  -- User correction
  user_category           VARCHAR(50),   -- if user overrides
  user_corrected_at       TIMESTAMPTZ,
  user_notes              TEXT,

  -- Dedup (same transaction from multiple fetches)
  dedup_hash              VARCHAR(64) UNIQUE,

  -- Flags
  is_emi                  BOOLEAN DEFAULT false,
  is_recurring            BOOLEAN DEFAULT false,
  recurring_interval_days INTEGER,
  is_suspicious           BOOLEAN DEFAULT false,
  is_ignored              BOOLEAN DEFAULT false,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchant → category learning table
-- Once Claude classifies a merchant, future transactions
-- from the same merchant use 'inherited' classification
CREATE TABLE merchant_category_map (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  merchant_name     VARCHAR(300) NOT NULL,
  category          VARCHAR(50) NOT NULL,
  subcategory       VARCHAR(100),
  category_group    VARCHAR(20) NOT NULL,
  confidence        INTEGER DEFAULT 80,
  times_seen        INTEGER DEFAULT 1,
  user_confirmed    BOOLEAN DEFAULT false,
  last_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- NULL user_id = global (applies to all users)
  -- non-NULL = user-specific override
  UNIQUE NULLS NOT DISTINCT (user_id, merchant_name)
);

-- Monthly aggregated spend by category
-- Pre-computed for fast dashboard loads
CREATE TABLE monthly_spend_summary (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id)
                    ON DELETE CASCADE,
  month             DATE NOT NULL,   -- always 1st of month
  category          VARCHAR(50) NOT NULL,
  category_group    VARCHAR(20) NOT NULL,
  total_paise       BIGINT NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  avg_per_tx_paise  BIGINT,
  largest_tx_paise  BIGINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, category)
);

-- User-defined budgets per category
CREATE TABLE category_budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      VARCHAR(50) NOT NULL,
  budget_paise  BIGINT NOT NULL,
  period        VARCHAR(10) DEFAULT 'monthly',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- AI-generated spend insights per user per month
CREATE TABLE spend_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         DATE NOT NULL,
  insight_type  VARCHAR(50) CHECK (insight_type IN (
                  'overspend',
                  'new_subscription',
                  'large_expense',
                  'recurring_detected',
                  'savings_opportunity',
                  'income_dip',
                  'unusual_pattern'
                )),
  title         VARCHAR(300) NOT NULL,
  body          TEXT NOT NULL,
  amount_paise  BIGINT,
  category      VARCHAR(50),
  action_label  VARCHAR(100),
  action_url    VARCHAR(300),
  is_read       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, insight_type, category)
);

-- Global merchant seeds (pre-populated — no API needed)
-- These catch the most common Indian merchants instantly
INSERT INTO merchant_category_map
  (user_id, merchant_name, category, subcategory, category_group, confidence, times_seen, user_confirmed)
VALUES
-- SUBSCRIPTIONS
(null,'NETFLIX',         'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'AMAZON PRIME',    'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'HOTSTAR',         'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'DISNEY',          'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'SPOTIFY',         'SUBSCRIPTIONS','Music',     'expense',100,1000,true),
(null,'YOUTUBE PREMIUM', 'SUBSCRIPTIONS','Music',     'expense',100,1000,true),
(null,'APPLE MUSIC',     'SUBSCRIPTIONS','Music',     'expense',100,1000,true),
(null,'MICROSOFT 365',   'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'ADOBE',           'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'OPENAI',          'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'CHATGPT',         'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'GITHUB',          'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'NOTION',          'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'ZOOM',            'SUBSCRIPTIONS','Software',  'expense',100,1000,true),
(null,'GOOGLE ONE',      'SUBSCRIPTIONS','Cloud',     'expense',100,1000,true),
(null,'ICLOUD',          'SUBSCRIPTIONS','Cloud',     'expense',100,1000,true),
(null,'DROPBOX',         'SUBSCRIPTIONS','Cloud',     'expense',100,1000,true),
(null,'SONYLIV',         'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'ZEE5',            'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
(null,'MXPLAYER',        'SUBSCRIPTIONS','OTT',       'expense',100,1000,true),
-- FOOD
(null,'SWIGGY',          'FOOD',         'Delivery',  'expense',100,1000,true),
(null,'ZOMATO',          'FOOD',         'Delivery',  'expense',100,1000,true),
(null,'BIGBASKET',       'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'BLINKIT',         'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'ZEPTO',           'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'DUNZO',           'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'STARBUCKS',       'FOOD',         'Cafe',      'expense',100,1000,true),
(null,'CHAAYOS',         'FOOD',         'Cafe',      'expense',100,1000,true),
(null,'DMART',           'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'MORERETAIL',      'FOOD',         'Groceries', 'expense',100,1000,true),
(null,'RELIANCE FRESH',  'FOOD',         'Groceries', 'expense',100,1000,true),
-- RECHARGE
(null,'AIRTEL',          'RECHARGE',     'Mobile',    'expense',95,1000,true),
(null,'JIO',             'RECHARGE',     'Mobile',    'expense',95,1000,true),
(null,'VODAFONE',        'RECHARGE',     'Mobile',    'expense',95,1000,true),
(null,'BSNL',            'RECHARGE',     'Mobile',    'expense',90,1000,true),
(null,'TATA PLAY',       'RECHARGE',     'DTH',       'expense',100,1000,true),
(null,'DISH TV',         'RECHARGE',     'DTH',       'expense',100,1000,true),
(null,'ACT',             'RECHARGE',     'Broadband', 'expense',95,1000,true),
(null,'HATHWAY',         'RECHARGE',     'Broadband', 'expense',95,1000,true),
-- INSURANCE
(null,'LIC',             'INSURANCE',    'Life',      'expense',95,1000,true),
(null,'HDFC LIFE',       'INSURANCE',    'Life',      'expense',100,1000,true),
(null,'ICICI PRU',       'INSURANCE',    'Life',      'expense',100,1000,true),
(null,'SBI LIFE',        'INSURANCE',    'Life',      'expense',100,1000,true),
(null,'STAR HEALTH',     'INSURANCE',    'Health',    'expense',100,1000,true),
(null,'NIVA BUPA',       'INSURANCE',    'Health',    'expense',100,1000,true),
(null,'CARE HEALTH',     'INSURANCE',    'Health',    'expense',100,1000,true),
(null,'ICICI LOMBARD',   'INSURANCE',    'Vehicle',   'expense',95,1000,true),
(null,'BAJAJ ALLIANZ',   'INSURANCE',    'Vehicle',   'expense',95,1000,true),
-- TRAVEL
(null,'IRCTC',           'TRAVEL',       'Train',     'expense',100,1000,true),
(null,'INDIGO',          'TRAVEL',       'Flight',    'expense',100,1000,true),
(null,'AIR INDIA',       'TRAVEL',       'Flight',    'expense',100,1000,true),
(null,'SPICEJET',        'TRAVEL',       'Flight',    'expense',100,1000,true),
(null,'MAKEMYTRIP',      'TRAVEL',       'Flight',    'expense',95,1000,true),
(null,'UBER',            'TRAVEL',       'Cab',       'expense',100,1000,true),
(null,'OLA',             'TRAVEL',       'Cab',       'expense',100,1000,true),
(null,'RAPIDO',          'TRAVEL',       'Cab',       'expense',100,1000,true),
(null,'OYO',             'TRAVEL',       'Hotel',     'expense',100,1000,true),
-- SHOPPING
(null,'AMAZON',          'SHOPPING',     'Online',    'expense',90,1000,true),
(null,'FLIPKART',        'SHOPPING',     'Online',    'expense',100,1000,true),
(null,'MYNTRA',          'SHOPPING',     'Clothing',  'expense',100,1000,true),
(null,'NYKAA',           'SHOPPING',     'Beauty',    'expense',100,1000,true),
(null,'MEESHO',          'SHOPPING',     'Online',    'expense',100,1000,true),
(null,'CROMA',           'SHOPPING',     'Electronics','expense',100,1000,true),
-- HEALTH
(null,'APOLLO',          'HEALTH',       'Pharmacy',  'expense',90,1000,true),
(null,'MEDPLUS',         'HEALTH',       'Pharmacy',  'expense',100,1000,true),
(null,'1MG',             'HEALTH',       'Pharmacy',  'expense',100,1000,true),
(null,'PHARMEASY',       'HEALTH',       'Pharmacy',  'expense',100,1000,true),
-- ENTERTAINMENT
(null,'BOOKMYSHOW',      'PARTY',        'Events',    'expense',100,1000,true),
(null,'PAYTM INSIDER',   'PARTY',        'Events',    'expense',100,1000,true),
-- EDUCATION
(null,'UDEMY',           'EDUCATION',    'Online',    'expense',100,1000,true),
(null,'COURSERA',        'EDUCATION',    'Online',    'expense',100,1000,true),
(null,'BYJUS',           'EDUCATION',    'Online',    'expense',100,1000,true),
(null,'UNACADEMY',       'EDUCATION',    'Online',    'expense',100,1000,true),
-- INVESTMENTS
(null,'ZERODHA',         'INVESTMENTS',  'Stocks',    'expense',90,1000,true),
(null,'GROWW',           'INVESTMENTS',  'MF/Stocks', 'expense',90,1000,true),
(null,'UPSTOX',          'INVESTMENTS',  'Stocks',    'expense',90,1000,true),
(null,'KUVERA',          'INVESTMENTS',  'MF',        'expense',95,1000,true),
(null,'PAYTM MONEY',     'INVESTMENTS',  'MF',        'expense',90,1000,true),
(null,'COIN ZERODHA',    'INVESTMENTS',  'MF',        'expense',95,1000,true),
(null,'CAMS',            'INVESTMENTS',  'MF SIP',    'expense',95,1000,true),
(null,'NPS',             'INVESTMENTS',  'NPS',       'expense',100,1000,true),
(null,'NSDL',            'INVESTMENTS',  'NPS',       'expense',90,1000,true),
-- FUEL
(null,'HPCL',            'TRAVEL',       'Fuel',      'expense',100,1000,true),
(null,'BPCL',            'TRAVEL',       'Fuel',      'expense',100,1000,true),
(null,'IOCL',            'TRAVEL',       'Fuel',      'expense',100,1000,true),
(null,'INDIANOIL',       'TRAVEL',       'Fuel',      'expense',100,1000,true),
(null,'HP PETROL',       'TRAVEL',       'Fuel',      'expense',100,1000,true)

ON CONFLICT (user_id, merchant_name) DO NOTHING;

-- Indexes
CREATE INDEX idx_classified_tx_user_date
  ON classified_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_classified_tx_category
  ON classified_transactions(user_id, category, transaction_date DESC);
CREATE INDEX idx_classified_tx_dedup
  ON classified_transactions(dedup_hash);
CREATE INDEX idx_merchant_map_name
  ON merchant_category_map(merchant_name, user_id);
CREATE INDEX idx_monthly_summary_user
  ON monthly_spend_summary(user_id, month DESC);
CREATE INDEX idx_insights_user
  ON spend_insights(user_id, month DESC, is_read);
CREATE INDEX idx_budgets_user
  ON category_budgets(user_id) WHERE is_active = true;

-- RLS
ALTER TABLE classified_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_spend_summary   ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_insights          ENABLE ROW LEVEL SECURITY;

CREATE POLICY classified_tx_rls ON classified_transactions
  FOR ALL USING (user_id =
    current_setting('app.current_user_id', true)::UUID);
CREATE POLICY monthly_summary_rls ON monthly_spend_summary
  FOR ALL USING (user_id =
    current_setting('app.current_user_id', true)::UUID);
CREATE POLICY budgets_rls ON category_budgets
  FOR ALL USING (user_id =
    current_setting('app.current_user_id', true)::UUID);
CREATE POLICY insights_rls ON spend_insights
  FOR ALL USING (user_id =
    current_setting('app.current_user_id', true)::UUID);
