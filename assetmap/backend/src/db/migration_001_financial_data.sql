-- ═══════════════════════════════════════════════════════════════
-- Migration 001 — Comprehensive Financial Data Tables
-- Stores all data pulled from AA consent: accounts, transactions,
-- investment holdings, and insurance policies.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. financial_accounts — Core account details from AA
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_accounts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id              UUID REFERENCES consents(id),
  fi_type                 fi_type NOT NULL,
  institution_name        VARCHAR(255) NOT NULL,
  account_ref_encrypted   TEXT,                         -- Masked account number (AES-256-GCM)
  account_type            VARCHAR(50),                  -- Savings, Current, FD, Demat, etc.
  holder_name_encrypted   TEXT,                         -- Account holder name (encrypted)
  ifsc_code               VARCHAR(20),                  -- IFSC for bank accounts
  branch                  VARCHAR(255),                 -- Branch name
  nominee_encrypted       TEXT,                         -- Nominee details (encrypted)
  balance_encrypted       TEXT NOT NULL,                -- Current balance (encrypted)
  currency                VARCHAR(3) NOT NULL DEFAULT 'INR',
  status                  VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / INACTIVE / FROZEN
  opened_at               DATE,                         -- Account opening date
  maturity_date           DATE,                         -- For FDs, insurance policies
  fetched_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_json_encrypted      TEXT,                         -- Full AA response (encrypted)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fin_accounts_user_id ON financial_accounts(user_id);
CREATE INDEX idx_fin_accounts_consent_id ON financial_accounts(consent_id);
CREATE INDEX idx_fin_accounts_fi_type ON financial_accounts(fi_type);
CREATE INDEX idx_fin_accounts_institution ON financial_accounts(institution_name);
CREATE INDEX idx_fin_accounts_fetched_at ON financial_accounts(fetched_at);

-- ───────────────────────────────────────────────────────────────
-- 2. transactions — Transaction history from AA data sessions
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  txn_id          VARCHAR(255),                       -- Transaction reference from FIP
  date            TIMESTAMPTZ NOT NULL,               -- Transaction timestamp
  narration       TEXT,                               -- Transaction description/narration
  type            VARCHAR(10) NOT NULL,               -- DEBIT / CREDIT
  amount          NUMERIC(15, 2) NOT NULL,            -- Transaction amount
  balance_after   NUMERIC(15, 2),                     -- Running balance after txn
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  category        VARCHAR(50),                        -- Auto-categorised (optional)
  reference       VARCHAR(255),                       -- UTR / UPI reference number
  mode            VARCHAR(30),                        -- UPI, NEFT, RTGS, IMPS, ATM, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);

-- ───────────────────────────────────────────────────────────────
-- 3. investment_holdings — Equity & Mutual Fund positions
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS investment_holdings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol          VARCHAR(30),                        -- Stock ticker / ISIN
  scheme_name     VARCHAR(500),                       -- MF scheme name
  units           NUMERIC(15, 4),                     -- Number of units / shares
  nav             NUMERIC(15, 4),                     -- NAV / last traded price
  cost_basis      NUMERIC(15, 2),                     -- Average purchase price
  current_value   NUMERIC(15, 2),                     -- Current market value
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  holding_type    VARCHAR(20),                        -- EQUITY / MF / ETF / BOND
  folio_number    VARCHAR(50),                        -- MF folio number
  demat           VARCHAR(10),                        -- CDSL / NSDL
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_account_id ON investment_holdings(account_id);
CREATE INDEX idx_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_holdings_holding_type ON investment_holdings(holding_type);
CREATE INDEX idx_holdings_symbol ON investment_holdings(symbol);

-- ───────────────────────────────────────────────────────────────
-- 4. insurance_policies — Insurance policy details
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insurance_policies (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id                UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_number_encrypted   TEXT,                       -- Encrypted policy number
  policy_type               VARCHAR(50),                -- Term, Endowment, ULIP, Health
  insurer                   VARCHAR(255),               -- Insurance company name
  sum_assured               NUMERIC(15, 2),             -- Cover amount
  premium_amount            NUMERIC(15, 2),             -- Per-period premium
  premium_frequency         VARCHAR(20),                -- MONTHLY / QUARTERLY / ANNUAL
  start_date                DATE,                       -- Policy start
  maturity_date             DATE,                       -- Policy maturity / end
  nominee_encrypted         TEXT,                       -- Nominee name (encrypted)
  status                    VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / LAPSED / SURRENDERED
  fetched_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_account_id ON insurance_policies(account_id);
CREATE INDEX idx_policies_user_id ON insurance_policies(user_id);
CREATE INDEX idx_policies_status ON insurance_policies(status);
CREATE INDEX idx_policies_policy_type ON insurance_policies(policy_type);
