-- ═══════════════════════════════════════════════════════════════
-- AssetMap — PostgreSQL Schema
-- Aadhaar-linked asset discovery and visualisation platform
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────────────────────────────
-- ENUM Types
-- ───────────────────────────────────────────────────────────────

CREATE TYPE consent_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING');

CREATE TYPE fi_type AS ENUM (
  'DEPOSIT',
  'EQUITY',
  'MUTUAL_FUND',
  'INSURANCE_POLICIES',
  'NPS',
  'GSTN'
);

CREATE TYPE estate_status AS ENUM ('PENDING', 'VERIFIED', 'COMPLETE', 'REJECTED');

CREATE TYPE land_source AS ENUM ('SUREPASS', 'MANUAL');

CREATE TYPE audit_action AS ENUM (
  'AADHAAR_INITIATED',
  'AADHAAR_VERIFIED',
  'LOGIN',
  'LOGOUT',
  'TOKEN_REFRESHED',
  'CONSENT_CREATED',
  'CONSENT_APPROVED',
  'CONSENT_REVOKED',
  'CONSENT_EXPIRED',
  'DATA_FETCHED',
  'DATA_REFRESHED',
  'LAND_SEARCH',
  'REPORT_GENERATED',
  'REPORT_DOWNLOADED',
  'ESTATE_FILED',
  'ESTATE_VERIFIED',
  'ESTATE_ASSETS_VIEWED',
  'AUDIT_LOG_VIEWED',
  'USER_DATA_DELETED'
);

-- ───────────────────────────────────────────────────────────────
-- TABLES
-- ───────────────────────────────────────────────────────────────

-- Users table — PII fields are AES-256-GCM encrypted at application level
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aadhaar_hash            VARCHAR(128) UNIQUE,          -- SHA-256(aadhaar + salt), never raw
  mobile_hash             VARCHAR(128) UNIQUE,          -- SHA-256(phone + salt), for lookup
  email_hash              VARCHAR(128) UNIQUE,          -- SHA-256(email + salt), for lookup
  name_encrypted          TEXT,                          -- AES-256-GCM encrypted
  dob_encrypted           TEXT,                          -- AES-256-GCM encrypted
  mobile_encrypted        TEXT,                          -- AES-256-GCM encrypted
  email_encrypted         TEXT,                          -- AES-256-GCM encrypted
  pan_encrypted           TEXT,                          -- AES-256-GCM encrypted
  fathers_name_encrypted  TEXT,                          -- AES-256-GCM encrypted
  nationality             VARCHAR(50) DEFAULT 'Indian',  -- Nationality from KYC
  country_code            VARCHAR(10),                   -- e.g. '+91'
  registered_at           TIMESTAMPTZ,                   -- When user completed registration
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at           TIMESTAMPTZ
);

CREATE INDEX idx_users_aadhaar_hash ON users(aadhaar_hash);
CREATE INDEX idx_users_mobile_hash ON users(mobile_hash);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Consents table — Account Aggregator consent records
CREATE TABLE consents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  aa_handle         VARCHAR(255),
  consent_id        VARCHAR(255) UNIQUE,           -- From AA provider (Setu)
  fi_types          fi_type[] NOT NULL,
  purpose           TEXT NOT NULL,
  date_range_start  DATE NOT NULL,
  date_range_end    DATE NOT NULL,
  status            consent_status NOT NULL DEFAULT 'PENDING',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ
);

CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_consents_consent_id ON consents(consent_id);
CREATE INDEX idx_consents_status ON consents(status);

-- Asset Snapshots — Financial data fetched via AA
CREATE TABLE asset_snapshots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id            UUID REFERENCES consents(id),
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fi_type               fi_type NOT NULL,
  institution_name      VARCHAR(255) NOT NULL,
  account_ref_encrypted TEXT,                       -- AES-256-GCM encrypted
  balance_encrypted     TEXT NOT NULL,              -- AES-256-GCM encrypted
  raw_json_encrypted    TEXT,                       -- AES-256-GCM encrypted full response
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR'
);

CREATE INDEX idx_asset_snapshots_user_id ON asset_snapshots(user_id);
CREATE INDEX idx_asset_snapshots_consent_id ON asset_snapshots(consent_id);
CREATE INDEX idx_asset_snapshots_fetched_at ON asset_snapshots(fetched_at);
CREATE INDEX idx_asset_snapshots_fi_type ON asset_snapshots(fi_type);

-- Land Records — Property records from Surepass or manual entry
CREATE TABLE land_records (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state                 VARCHAR(100) NOT NULL,
  district              VARCHAR(100) NOT NULL,
  survey_number         VARCHAR(100),
  owner_name_encrypted  TEXT,                       -- AES-256-GCM encrypted
  area_sqft             NUMERIC(12, 2),
  registration_date     DATE,
  source                land_source NOT NULL DEFAULT 'SUREPASS',
  raw_json_encrypted    TEXT,                       -- AES-256-GCM encrypted
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_land_records_user_id ON land_records(user_id);
CREATE INDEX idx_land_records_state ON land_records(state);
CREATE INDEX idx_land_records_fetched_at ON land_records(fetched_at);

-- Estate Cases — Deceased estate discovery
CREATE TABLE estate_cases (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filed_by_user_id          UUID NOT NULL REFERENCES users(id),
  deceased_name_encrypted   TEXT NOT NULL,           -- AES-256-GCM encrypted
  deceased_aadhaar_hash     VARCHAR(128) NOT NULL,   -- SHA-256(aadhaar + salt)
  death_certificate_s3_key  TEXT NOT NULL,
  legal_heir_doc_s3_key     TEXT NOT NULL,
  status                    estate_status NOT NULL DEFAULT 'PENDING',
  verified_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estate_cases_filed_by ON estate_cases(filed_by_user_id);
CREATE INDEX idx_estate_cases_deceased_hash ON estate_cases(deceased_aadhaar_hash);
CREATE INDEX idx_estate_cases_status ON estate_cases(status);

-- Audit Logs — IMMUTABLE, append-only (7-year RBI retention mandate)
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID,                               -- Nullable for system events
  action        audit_action NOT NULL,
  entity_type   VARCHAR(100),
  entity_id     UUID,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,                              -- Additional structured data
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ───────────────────────────────────────────────────────────────
-- IMMUTABILITY ENFORCEMENT — Prevent UPDATE/DELETE on audit_logs
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not permitted.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- ───────────────────────────────────────────────────────────────
-- Refresh Tokens table — for JWT refresh token tracking
-- ───────────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ───────────────────────────────────────────────────────────────
-- Reports table — generated PDF reports
-- ───────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_key      TEXT NOT NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'ASSET_SUMMARY',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
 
 -- %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
-- Sessions table for Redis-backed RBAC active sessions
-- %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

CREATE TABLE sessions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id              VARCHAR(36) NOT NULL UNIQUE,
  role                    VARCHAR(20) NOT NULL CHECK (role IN ('user', 'legal_heir', 'admin')),
  ip_address              INET,
  user_agent              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at              TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);