-- ─────────────────────────────────────────────────
-- CANONICAL ASSETS 
-- Migration 015
-- ─────────────────────────────────────────────────

-- Canonical Assets — Deduplicated, single source of truth for assets
CREATE TABLE IF NOT EXISTS canonical_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Asset classification
  asset_class           VARCHAR(50) NOT NULL CHECK (asset_class IN (
                          'BANK_ACCOUNT',
                          'FIXED_DEPOSIT',
                          'MUTUAL_FUND',
                          'EQUITY',
                          'NPS',
                          'INSURANCE_LIFE',
                          'INSURANCE_HEALTH',
                          'EPF',
                          'PPF',
                          'REAL_ESTATE',
                          'OTHER'
                        )),
  institution_name      VARCHAR(200) NOT NULL,
  
  -- Reference (encrypted)
  account_ref_enc       TEXT, -- e.g. encrypted bank account number
  folio_number_enc      TEXT, -- e.g. encrypted mutual fund folio
  
  -- Nominee status
  has_nominee           BOOLEAN DEFAULT false,
  nominee_name_enc      TEXT,
  
  -- Values
  current_value_paise   BIGINT DEFAULT 0,
  
  -- Digilocker / Source
  digilocker_uri        TEXT,
  source                VARCHAR(50) DEFAULT 'AA',
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canonical_assets_user_id ON canonical_assets(user_id);
CREATE INDEX idx_canonical_assets_asset_class ON canonical_assets(asset_class);
