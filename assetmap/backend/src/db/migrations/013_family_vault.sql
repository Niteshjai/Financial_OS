-- ─────────────────────────────────────────────────────
-- FAMILY VAULT
-- ─────────────────────────────────────────────────────

-- Family groups (one per Pro subscriber)
CREATE TABLE family_vaults (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id       UUID NOT NULL REFERENCES users(id)
                        ON DELETE CASCADE,
  vault_name            VARCHAR(100) NOT NULL DEFAULT 'My Family',
  max_members           INTEGER NOT NULL DEFAULT 4,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one vault per primary user
  UNIQUE(primary_user_id)
);

-- Members of a family vault
CREATE TABLE family_vault_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id              UUID NOT NULL REFERENCES family_vaults(id)
                        ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id)
                        ON DELETE SET NULL,  -- NULL if invite not accepted yet
  primary_user_id       UUID NOT NULL REFERENCES users(id),

  -- Invite details
  invite_token          VARCHAR(100) UNIQUE,
  invite_token_expires  TIMESTAMPTZ,
  invited_mobile        VARCHAR(20),
  invited_name          VARCHAR(200),
  relationship          VARCHAR(50) CHECK (relationship IN (
                          'spouse','parent','child','sibling',
                          'grandparent','grandchild','other'
                        )),

  -- Member status
  status                VARCHAR(20) NOT NULL DEFAULT 'invited'
                        CHECK (status IN (
                          'invited',    -- invite sent, not accepted
                          'active',     -- accepted and sharing
                          'paused',     -- temporarily hidden from vault
                          'removed'     -- removed from vault
                        )),

  -- What this member has chosen to share
  -- Each is a boolean toggle controlled by the MEMBER (not primary user)
  share_bank_accounts   BOOLEAN DEFAULT true,
  share_fixed_deposits  BOOLEAN DEFAULT true,
  share_mutual_funds    BOOLEAN DEFAULT true,
  share_equity          BOOLEAN DEFAULT true,
  share_nps             BOOLEAN DEFAULT true,
  share_epf             BOOLEAN DEFAULT true,
  share_insurance       BOOLEAN DEFAULT true,
  share_land            BOOLEAN DEFAULT true,
  share_gold            BOOLEAN DEFAULT false,  -- off by default for privacy
  share_total_networth  BOOLEAN DEFAULT true,

  -- Display preferences
  display_name          VARCHAR(100),   -- what name shows in vault
  avatar_color          VARCHAR(7),     -- hex colour for avatar

  -- Timestamps
  invited_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at           TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Combined family net worth snapshots (monthly)
CREATE TABLE family_networth_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id              UUID NOT NULL REFERENCES family_vaults(id)
                        ON DELETE CASCADE,
  snapshot_month        DATE NOT NULL,  -- always 1st of month
  total_paise           BIGINT NOT NULL DEFAULT 0,
  member_breakdown      JSONB NOT NULL DEFAULT '{}',
  -- { "member_user_id": { "name": "Priya", "totalPaise": 5000000 } }
  asset_breakdown       JSONB NOT NULL DEFAULT '{}',
  -- { "BANK_ACCOUNT": 1234, "MUTUAL_FUND": 5678 }
  member_count          INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault_id, snapshot_month)
);

-- Shared family goals
CREATE TABLE family_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id              UUID NOT NULL REFERENCES family_vaults(id)
                        ON DELETE CASCADE,
  created_by_user_id    UUID NOT NULL REFERENCES users(id),

  name                  VARCHAR(200) NOT NULL,
  description           TEXT,
  goal_type             VARCHAR(50) CHECK (goal_type IN (
                          'education','home_purchase','emergency_fund',
                          'wedding','vacation','retirement',
                          'vehicle','medical','other'
                        )),
  emoji                 VARCHAR(10) DEFAULT '🎯',

  -- Target
  target_amount_paise   BIGINT NOT NULL,
  current_amount_paise  BIGINT NOT NULL DEFAULT 0,
  target_date           DATE,

  -- Which members are contributing
  contributing_members  UUID[] DEFAULT '{}',

  -- Status
  status                VARCHAR(20) DEFAULT 'active' CHECK (status IN (
                          'active','completed','cancelled'
                        )),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal contribution updates
CREATE TABLE family_goal_contributions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id               UUID NOT NULL REFERENCES family_goals(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  amount_paise          BIGINT NOT NULL,
  note                  TEXT,
  contributed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Family activity feed
CREATE TABLE family_activity_feed (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id              UUID NOT NULL REFERENCES family_vaults(id)
                        ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),

  activity_type         VARCHAR(50) NOT NULL CHECK (activity_type IN (
                          'member_joined',
                          'member_left',
                          'goal_created',
                          'goal_completed',
                          'goal_contribution',
                          'networth_milestone',
                          'nominee_added',
                          'will_created',
                          'large_asset_added'
                        )),
  title                 VARCHAR(300) NOT NULL,
  body                  TEXT,
  metadata              JSONB DEFAULT '{}',
  is_visible_to_all     BOOLEAN DEFAULT true,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_vaults_primary
  ON family_vaults(primary_user_id);
CREATE INDEX idx_family_members_vault
  ON family_vault_members(vault_id, status);
CREATE INDEX idx_family_members_user
  ON family_vault_members(user_id) WHERE status = 'active';
CREATE INDEX idx_family_members_token
  ON family_vault_members(invite_token)
  WHERE invite_token IS NOT NULL;
CREATE INDEX idx_family_snapshots_vault
  ON family_networth_snapshots(vault_id, snapshot_month DESC);
CREATE INDEX idx_family_goals_vault
  ON family_goals(vault_id, status);
CREATE INDEX idx_family_activity_vault
  ON family_activity_feed(vault_id, created_at DESC);

-- RLS
ALTER TABLE family_vaults              ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_vault_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_networth_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_goal_contributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_activity_feed       ENABLE ROW LEVEL SECURITY;

-- Primary user can see their vault
CREATE POLICY family_vaults_policy ON family_vaults
  FOR ALL USING (primary_user_id =
    current_setting('app.current_user_id', true)::UUID);

-- Members can see vaults they belong to
CREATE POLICY family_members_policy ON family_vault_members
  FOR ALL USING (
    primary_user_id = current_setting('app.current_user_id', true)::UUID
    OR user_id      = current_setting('app.current_user_id', true)::UUID
  );

CREATE POLICY family_snapshots_policy ON family_networth_snapshots
  FOR SELECT USING (
    vault_id IN (
      SELECT id FROM family_vaults
      WHERE primary_user_id = current_setting('app.current_user_id', true)::UUID
      UNION
      SELECT vault_id FROM family_vault_members
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND status = 'active'
    )
  );

CREATE POLICY family_goals_policy ON family_goals
  FOR ALL USING (
    vault_id IN (
      SELECT id FROM family_vaults
      WHERE primary_user_id = current_setting('app.current_user_id', true)::UUID
      UNION
      SELECT vault_id FROM family_vault_members
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND status = 'active'
    )
  );

CREATE POLICY family_activity_policy ON family_activity_feed
  FOR SELECT USING (
    vault_id IN (
      SELECT id FROM family_vaults
      WHERE primary_user_id = current_setting('app.current_user_id', true)::UUID
      UNION
      SELECT vault_id FROM family_vault_members
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND status = 'active'
    )
  );
