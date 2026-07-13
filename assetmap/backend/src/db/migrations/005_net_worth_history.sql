-- Migration: 005_net_worth_history.sql
-- Description: Create table for tracking user net worth over time

CREATE TABLE IF NOT EXISTS net_worth_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  net_worth NUMERIC(15, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_id ON net_worth_history(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_recorded_at ON net_worth_history(recorded_at);
