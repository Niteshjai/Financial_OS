-- Migration for Unified Nominee Update Platform
CREATE TABLE IF NOT EXISTS nomination_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- e.g. 'MFCENTRAL', 'KRA', 'BANK'
  asset_ref VARCHAR(255) NOT NULL, -- e.g. Folio, Demat A/C, Bank A/C
  payload_encrypted TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  job_id VARCHAR(255),
  tracking_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
