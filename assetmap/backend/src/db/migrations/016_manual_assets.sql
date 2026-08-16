-- ─────────────────────────────────────────────────────
-- MANUAL ASSET ENTRY
-- Migration 016
-- ─────────────────────────────────────────────────────

-- Main manual assets table
CREATE TABLE IF NOT EXISTS manual_assets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id)
                          ON DELETE CASCADE,

  -- Classification
  asset_category          VARCHAR(30) NOT NULL CHECK (asset_category IN (
                            'GOLD_PHYSICAL',
                            'VEHICLE',
                            'RESIDENTIAL_PROPERTY',
                            'COMMERCIAL_PROPERTY',
                            'AGRICULTURAL_LAND',
                            'ART_COLLECTIBLE',
                            'OTHER_PHYSICAL',
                            'CRYPTO',
                            'FOREIGN_ASSET',
                            'UNLISTED_EQUITY',
                            'CHIT_FUND',
                            'MONEY_LENT',
                            'CASH',
                            'OTHER_FINANCIAL',
                            'BUSINESS_OWNERSHIP',
                            'INTELLECTUAL_PROPERTY',
                            'OTHER_BUSINESS'
                          )),

  -- Core fields
  asset_name              VARCHAR(300) NOT NULL,
  description             TEXT,

  -- Value (in paise)
  current_value_paise     BIGINT NOT NULL,
  purchase_value_paise    BIGINT,
  purchase_date           DATE,
  currency                VARCHAR(5) DEFAULT 'INR',

  -- For foreign currency assets
  foreign_currency        VARCHAR(5),
  foreign_amount          DECIMAL(20,4),
  exchange_rate_used      DECIMAL(10,4),

  -- Category-specific fields (stored as JSONB for flexibility)
  extra_fields            JSONB NOT NULL DEFAULT '{}',

  -- Document
  document_s3_key         TEXT,
  document_name           VARCHAR(300),

  -- Valuation tracking
  valuation_method        VARCHAR(30) DEFAULT 'self_assessed'
                          CHECK (valuation_method IN (
                            'self_assessed',
                            'professional',
                            'market_price',
                            'purchase_cost',
                            'book_value',
                            'insured_value'
                          )),
  valuation_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  next_valuation_date     DATE DEFAULT CURRENT_DATE + 90,
  valuation_reminder_sent BOOLEAN DEFAULT false,

  -- Sharing and visibility
  include_in_networth     BOOLEAN DEFAULT true,
  is_encumbered           BOOLEAN DEFAULT false,
  encumbrance_amount_paise BIGINT,

  -- For loan scoring
  is_collateral_eligible  BOOLEAN DEFAULT false,
  collateral_ltv_pct      INTEGER,

  -- Status
  is_active               BOOLEAN DEFAULT true,
  is_verified             BOOLEAN DEFAULT false,
  verified_by             VARCHAR(100),
  verified_at             TIMESTAMPTZ,

  -- AI enrichment
  ai_risk_level           VARCHAR(20),
  ai_liquidity_score      INTEGER,
  ai_category_label       VARCHAR(200),
  ai_summary              TEXT,
  ai_suggestions          TEXT[] DEFAULT '{}',
  ai_enriched_at          TIMESTAMPTZ,

  -- Metadata
  notes                   TEXT,
  tags                    TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Value history — every time user updates the value
CREATE TABLE IF NOT EXISTS manual_asset_value_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                UUID NOT NULL REFERENCES manual_assets(id)
                          ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id),
  previous_value_paise    BIGINT NOT NULL,
  new_value_paise         BIGINT NOT NULL,
  change_paise            BIGINT NOT NULL,
  change_pct              DECIMAL(8,4),
  reason                  TEXT,
  valuation_method        VARCHAR(30),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: track value changes automatically
CREATE OR REPLACE FUNCTION track_manual_asset_value_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_value_paise != NEW.current_value_paise THEN
    INSERT INTO manual_asset_value_history (
      asset_id, user_id,
      previous_value_paise, new_value_paise,
      change_paise, change_pct,
      valuation_method
    ) VALUES (
      NEW.id, NEW.user_id,
      OLD.current_value_paise,
      NEW.current_value_paise,
      NEW.current_value_paise - OLD.current_value_paise,
      CASE WHEN OLD.current_value_paise > 0
        THEN ROUND(
          (NEW.current_value_paise - OLD.current_value_paise)::DECIMAL
          / OLD.current_value_paise * 100, 4
        )
        ELSE 0
      END,
      NEW.valuation_method
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_asset_value_change_trigger ON manual_assets;
CREATE TRIGGER manual_asset_value_change_trigger
  AFTER UPDATE ON manual_assets
  FOR EACH ROW
  EXECUTE FUNCTION track_manual_asset_value_change();

-- Auto-update updated_at (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_manual_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_assets_updated_at ON manual_assets;
CREATE TRIGGER manual_assets_updated_at
  BEFORE UPDATE ON manual_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_assets_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manual_assets_user
  ON manual_assets(user_id, asset_category)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_manual_assets_valuation_due
  ON manual_assets(next_valuation_date, user_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_manual_value_history_asset
  ON manual_asset_value_history(asset_id, updated_at DESC);
