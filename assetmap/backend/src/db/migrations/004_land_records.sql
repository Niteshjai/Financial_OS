-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS land_sync_log CASCADE;
DROP TABLE IF EXISTS land_encumbrances CASCADE;
DROP TABLE IF EXISTS land_mutations CASCADE;
DROP TABLE IF EXISTS land_records CASCADE;

-- Main land records table
CREATE TABLE land_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity fields (encrypted)
  survey_number_enc     TEXT,
  plot_number_enc       TEXT,
  khasra_number_enc     TEXT,
  owner_name_enc        TEXT,

  -- Location fields (not encrypted — needed for grouping/search)
  village               VARCHAR(100),
  taluka                VARCHAR(100),
  district              VARCHAR(100),
  state                 VARCHAR(100) NOT NULL,
  state_code            VARCHAR(5) NOT NULL,
  pin_code              VARCHAR(10),

  -- Land details
  area_value            DECIMAL(12,4),
  area_unit             VARCHAR(20) DEFAULT 'acres',
  land_type             VARCHAR(50),
  land_use              VARCHAR(50),

  -- Ownership
  ownership_type        VARCHAR(30) CHECK (ownership_type IN
                        ('self','inherited','joint','disputed','unknown')),
  co_owners_count       INTEGER DEFAULT 0,

  -- Title and legal status
  title_status          VARCHAR(30) CHECK (title_status IN
                        ('clear','dispute','mutation_pending',
                         'encumbered','unknown')),
  mutation_status       VARCHAR(30) CHECK (mutation_status IN
                        ('completed','pending','not_required')),
  encumbrance_status    VARCHAR(30),
  dispute_details_enc   TEXT,

  -- Registration
  registration_date     DATE,
  registration_number_enc TEXT,
  sub_registrar_office  VARCHAR(200),

  -- Coordinates
  latitude              DECIMAL(10,8),
  longitude             DECIMAL(11,8),
  ulpin                 VARCHAR(20),

  -- Valuation
  estimated_value_paise BIGINT,
  circle_rate_paise     BIGINT,
  valuation_date        DATE,
  valuation_source      VARCHAR(50),

  -- Document availability
  digilocker_doc_available  BOOLEAN DEFAULT false,
  digilocker_doc_uri        TEXT,
  doc_last_fetched_at       TIMESTAMPTZ,

  -- Data source and sync
  source                VARCHAR(30) CHECK (source IN
                        ('surepass','dilrmp','manual','ngdrs',
                         'state_portal','igr')) NOT NULL,
  source_record_id      VARCHAR(200),
  raw_response_enc      TEXT,
  is_verified           BOOLEAN DEFAULT false,
  verified_at           TIMESTAMPTZ,
  verified_by           VARCHAR(50),

  -- Metadata
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_frequency_days   INTEGER DEFAULT 30,
  next_sync_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  is_stale              BOOLEAN DEFAULT false,
  is_active             BOOLEAN DEFAULT true,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mutation history table — tracks ownership changes over time
CREATE TABLE land_mutations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_record_id        UUID NOT NULL REFERENCES land_records(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  mutation_number       VARCHAR(100),
  mutation_type         VARCHAR(50),
  mutation_date         DATE,
  from_owner_enc        TEXT,
  to_owner_enc          TEXT,
  area_transferred      DECIMAL(12,4),
  remarks               TEXT,
  raw_response_enc      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encumbrance records — mortgages, liens, charges on the land
CREATE TABLE land_encumbrances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_record_id        UUID NOT NULL REFERENCES land_records(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  encumbrance_type      VARCHAR(50),
  creditor_name_enc     TEXT,
  amount_paise          BIGINT,
  start_date            DATE,
  end_date              DATE,
  is_active             BOOLEAN DEFAULT true,
  raw_response_enc      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync log — every time we hit Surepass or state portal
CREATE TABLE land_sync_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  land_record_id        UUID REFERENCES land_records(id),
  source                VARCHAR(30) NOT NULL,
  trigger               VARCHAR(30) CHECK (trigger IN
                        ('user_request','scheduled','manual',
                         'estate_case','initial_fetch')),
  status                VARCHAR(20) CHECK (status IN
                        ('success','failed','partial','no_change')),
  records_found         INTEGER DEFAULT 0,
  records_updated       INTEGER DEFAULT 0,
  records_created       INTEGER DEFAULT 0,
  error_message         TEXT,
  api_response_time_ms  INTEGER,
  cost_paise            INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_land_records_user_id       ON land_records(user_id);
CREATE INDEX idx_land_records_state_code    ON land_records(state_code);
CREATE INDEX idx_land_records_next_sync     ON land_records(next_sync_at)
             WHERE is_active = true;
CREATE INDEX idx_land_records_ulpin         ON land_records(ulpin)
             WHERE ulpin IS NOT NULL;
CREATE INDEX idx_land_records_created       ON land_records(created_at DESC);
CREATE INDEX idx_land_mutations_record_id   ON land_mutations(land_record_id);
CREATE INDEX idx_land_encumbrances_record   ON land_encumbrances(land_record_id);
CREATE INDEX idx_land_sync_log_user_id      ON land_sync_log(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_land_records_updated_at
  BEFORE UPDATE ON land_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE land_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_mutations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_encumbrances   ENABLE ROW LEVEL SECURITY;

CREATE POLICY land_records_user_isolation ON land_records
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY land_mutations_user_isolation ON land_mutations
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY land_encumbrances_user_isolation ON land_encumbrances
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
