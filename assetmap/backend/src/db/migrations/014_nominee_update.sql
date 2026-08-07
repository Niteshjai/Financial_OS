-- ─────────────────────────────────────────────────
-- NOMINEE UPDATE SYSTEM — "Fill Once, Update Everywhere"
-- Migration 014
-- ─────────────────────────────────────────────────

-- Nominee details collected from user (one form)
CREATE TABLE IF NOT EXISTS nominee_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id)
                        ON DELETE CASCADE,

  -- Nominee details (all encrypted via AES-256-GCM)
  nominee_name_enc      TEXT NOT NULL,
  nominee_dob_enc       TEXT NOT NULL,
  relationship          VARCHAR(50) NOT NULL CHECK (relationship IN (
                          'spouse','son','daughter','father','mother',
                          'brother','sister','grandson','granddaughter',
                          'other'
                        )),
  relationship_label    VARCHAR(100),
  nominee_mobile_enc    TEXT,
  nominee_email_enc     TEXT,
  nominee_address_enc   TEXT,

  -- Aadhaar — SHA-256 hash only, never store raw number
  nominee_aadhaar_hash  VARCHAR(64),

  -- For minor nominees
  is_minor              BOOLEAN DEFAULT false,
  guardian_name_enc     TEXT,
  guardian_relation     VARCHAR(50),
  guardian_mobile_enc   TEXT,

  -- Allocation (when multiple nominees)
  allocation_pct        INTEGER DEFAULT 100
                        CHECK (allocation_pct BETWEEN 1 AND 100),
  priority_order        INTEGER DEFAULT 1,

  -- Status
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One update batch per user per submission
CREATE TABLE IF NOT EXISTS nominee_update_batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id)
                        ON DELETE CASCADE,

  -- Nominees in this batch (array of nominee_profile IDs)
  nominee_profile_ids   UUID[] NOT NULL DEFAULT '{}',

  -- Overall status
  status                VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'processing',
                          'partial',
                          'completed',
                          'failed'
                        )),

  -- Counts
  total_accounts        INTEGER DEFAULT 0,
  completed_accounts    INTEGER DEFAULT 0,
  failed_accounts       INTEGER DEFAULT 0,
  pending_accounts      INTEGER DEFAULT 0,

  -- Timing
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-institution update task
CREATE TABLE IF NOT EXISTS nominee_update_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id              UUID NOT NULL
                        REFERENCES nominee_update_batches(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),

  -- Which account
  canonical_asset_id    UUID,
  institution_name      VARCHAR(200) NOT NULL,
  institution_type      VARCHAR(30) NOT NULL CHECK (institution_type IN (
                          'mutual_fund',
                          'epfo',
                          'nps',
                          'bank',
                          'insurance',
                          'demat'
                        )),
  account_ref_enc       TEXT,
  folio_number_enc      TEXT,

  -- Update method
  update_method         VARCHAR(20) NOT NULL CHECK (update_method IN (
                          'full_auto',
                          'guided_otp',
                          'form_email',
                          'manual_branch'
                        )),

  -- Status
  status                VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'auto_submitted',
                          'session_opened',
                          'user_completed',
                          'form_sent',
                          'verified',
                          'failed',
                          'skipped'
                        )),

  -- Session data (for guided OTP)
  session_url           TEXT,
  session_expires_at    TIMESTAMPTZ,
  user_opened_at        TIMESTAMPTZ,
  user_completed_at     TIMESTAMPTZ,

  -- API / email tracking
  api_response          JSONB,
  email_sent_at         TIMESTAMPTZ,
  email_message_id      VARCHAR(200),
  form_s3_key           TEXT,

  -- Verification
  pre_update_nominee    TEXT,
  post_update_nominee   TEXT,
  verified_at           TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  next_verify_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

  -- Error
  error_message         TEXT,
  retry_count           INTEGER DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline log per task
CREATE TABLE IF NOT EXISTS nominee_task_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL
                  REFERENCES nominee_update_tasks(id)
                  ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  event           VARCHAR(100) NOT NULL,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nominee_profiles_user
  ON nominee_profiles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_nominee_batches_user
  ON nominee_update_batches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nominee_tasks_batch
  ON nominee_update_tasks(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_nominee_tasks_verify
  ON nominee_update_tasks(next_verify_at, status)
  WHERE status NOT IN ('verified','skipped','failed');
CREATE INDEX IF NOT EXISTS idx_nominee_timeline_task
  ON nominee_task_timeline(task_id, created_at);
