-- ═══════════════════════════════════════════════════════════════
-- Migration 011: Fix missing enum values and ensure columns exist
-- ═══════════════════════════════════════════════════════════════

-- Add LAND_RECORDS to fi_type enum (used by consent/land routes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LAND_RECORDS' AND enumtypid = 'fi_type'::regtype) THEN
    ALTER TYPE fi_type ADD VALUE 'LAND_RECORDS';
  END IF;
END$$;

-- Add PHONE_VERIFIED to audit_action enum (used by auth routes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PHONE_VERIFIED' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'PHONE_VERIFIED';
  END IF;
END$$;

-- Ensure users table has all expected columns
-- (fathers_name_encrypted, nationality, registered_at are in schema.sql
--  but may be missing if DB was created before these were added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS fathers_name_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian';
ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- Ensure land_records table has survey_number_enc
-- (should already exist from 004_land_records.sql, but just in case)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'land_records') THEN
    ALTER TABLE land_records ADD COLUMN IF NOT EXISTS survey_number_enc TEXT;
  END IF;
END$$;
