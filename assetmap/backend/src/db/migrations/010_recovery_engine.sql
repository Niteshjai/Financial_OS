-- ─────────────────────────────────────────────
-- 010 — Recovery Engine Tables
-- AssetMap "Bounty Hunter" Monetisation Model
-- ─────────────────────────────────────────────

-- RECOVERY CASES
CREATE TABLE IF NOT EXISTS recovery_cases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id)
                          ON DELETE CASCADE,

  -- Asset being recovered
  recovery_type           VARCHAR(30) NOT NULL CHECK (recovery_type IN (
                            'iepf_shares', 'iepf_dividend',
                            'epf_balance', 'epf_pension',
                            'mutual_fund', 'dormant_bank',
                            'insurance_maturity', 'ppf_balance'
                          )),
  asset_description       TEXT NOT NULL,
  institution_name        VARCHAR(300),
  estimated_value_paise   BIGINT NOT NULL,
  confirmed_value_paise   BIGINT,
  recovered_value_paise   BIGINT,

  -- Reference numbers (encrypted)
  folio_number_enc        TEXT,
  policy_number_enc       TEXT,
  uan_number_enc          TEXT,
  account_number_enc      TEXT,
  isin                    VARCHAR(20),
  srn_number              VARCHAR(100),
  claim_reference         VARCHAR(200),

  -- Workflow status
  status                  VARCHAR(30) NOT NULL DEFAULT 'pending_agreement'
                          CHECK (status IN (
                            'pending_agreement',
                            'agreement_signed',
                            'documents_collecting',
                            'documents_complete',
                            'submitted',
                            'under_review',
                            'additional_docs_needed',
                            'approved',
                            'amount_credited',
                            'fee_collected',
                            'completed',
                            'rejected',
                            'withdrawn'
                          )),

  -- Timeline
  initiated_at            TIMESTAMPTZ,
  submitted_at            TIMESTAMPTZ,
  estimated_completion    DATE,
  completed_at            TIMESTAMPTZ,
  last_status_update      TIMESTAMPTZ DEFAULT NOW(),

  -- Success fee
  fee_pct                 DECIMAL(4,2) NOT NULL DEFAULT 7.50,
  fee_amount_paise        BIGINT,
  fee_agreement_signed_at TIMESTAMPTZ,
  fee_collected_at        TIMESTAMPTZ,
  fee_payment_id          VARCHAR(200),

  -- Government submission tracking
  submission_ref          VARCHAR(200),
  nodal_officer_name      VARCHAR(200),
  nodal_officer_email     VARCHAR(200),
  company_rta             VARCHAR(200),

  -- Internal notes
  internal_notes          TEXT,
  rejection_reason        TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents required and collected per case
CREATE TABLE IF NOT EXISTS recovery_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES recovery_cases(id)
                    ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),

  doc_type          VARCHAR(50) NOT NULL CHECK (doc_type IN (
                      'aadhaar_front', 'aadhaar_back',
                      'pan_card', 'passport_photo',
                      'cancelled_cheque', 'bank_passbook',
                      'demat_statement', 'share_certificate',
                      'indemnity_bond', 'entitlement_letter',
                      'death_certificate', 'legal_heir',
                      'pf_statement', 'mf_statement',
                      'succession_certificate', 'affidavit',
                      'other'
                    )),
  doc_label         VARCHAR(200) NOT NULL,
  is_required       BOOLEAN DEFAULT true,
  is_received       BOOLEAN DEFAULT false,
  is_verified       BOOLEAN DEFAULT false,

  s3_key            TEXT,
  file_name         VARCHAR(300),
  file_size_bytes   INTEGER,
  mime_type         VARCHAR(100),
  uploaded_at       TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  verified_by       VARCHAR(100),

  digilocker_uri    TEXT,
  auto_fetched      BOOLEAN DEFAULT false,

  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Status timeline — every state change logged
CREATE TABLE IF NOT EXISTS recovery_timeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES recovery_cases(id)
                    ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  from_status       VARCHAR(30),
  to_status         VARCHAR(30) NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  is_user_visible   BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fee agreements — legal record of user accepting success fee
CREATE TABLE IF NOT EXISTS recovery_fee_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES recovery_cases(id)
                    ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  fee_pct           DECIMAL(4,2) NOT NULL,
  estimated_fee_paise BIGINT,
  agreement_text    TEXT NOT NULL,
  user_ip           INET,
  user_agent        TEXT,
  signed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active         BOOLEAN DEFAULT true
);

-- Notifications sent to user per case
CREATE TABLE IF NOT EXISTS recovery_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES recovery_cases(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  channel           VARCHAR(20) CHECK (channel IN ('sms','push','email')),
  title             VARCHAR(200),
  body              TEXT,
  sent_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Platform revenue tracking
CREATE TABLE IF NOT EXISTS recovery_revenue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES recovery_cases(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  recovery_type     VARCHAR(30),
  recovered_paise   BIGINT NOT NULL,
  fee_pct           DECIMAL(4,2) NOT NULL,
  fee_paise         BIGINT NOT NULL,
  gst_paise         BIGINT NOT NULL,
  total_charged_paise BIGINT NOT NULL,
  payment_id        VARCHAR(200),
  payment_method    VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recovery_cases_user
  ON recovery_cases(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status
  ON recovery_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_documents_case
  ON recovery_documents(case_id, is_required, is_received);
CREATE INDEX IF NOT EXISTS idx_recovery_timeline_case
  ON recovery_timeline(case_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_recovery_revenue_user
  ON recovery_revenue(user_id, created_at DESC);

-- RLS
ALTER TABLE recovery_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_timeline      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_fee_agreements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recovery_cases_rls') THEN
    CREATE POLICY recovery_cases_rls ON recovery_cases
      FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recovery_docs_rls') THEN
    CREATE POLICY recovery_docs_rls ON recovery_documents
      FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recovery_timeline_rls') THEN
    CREATE POLICY recovery_timeline_rls ON recovery_timeline
      FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
  END IF;
END $$;
