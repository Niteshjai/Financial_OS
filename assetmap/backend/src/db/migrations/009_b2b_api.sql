CREATE TABLE IF NOT EXISTS b2b_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'basic',
  rate_limit_per_hour INT DEFAULT 1000,
  rate_limit_per_day INT DEFAULT 10000,
  allowed_endpoints JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES b2b_clients(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(50) NOT NULL,
  environment VARCHAR(50) DEFAULT 'sandbox',
  description VARCHAR(255),
  scopes JSONB DEFAULT '[]',
  ip_whitelist JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES b2b_clients(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(user_id, client_id)
);

CREATE TABLE IF NOT EXISTS b2b_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES b2b_clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret_key_enc TEXT NOT NULL,
  events JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES b2b_webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo clients
INSERT INTO b2b_clients (business_name, business_type, contact_email) VALUES 
('AssetMap Law Demo', 'law_firm', 'demo@assetmap.in'),
('Wealth Manager Pro', 'wealth_manager', 'wealth@assetmap.in'),
('Rapid NBFC', 'nbfc', 'nbfc@assetmap.in'),
('Safe Guard Insurance', 'insurance_company', 'insure@assetmap.in'),
('HR Connect Payroll', 'hr_payroll', 'hr@assetmap.in')
ON CONFLICT DO NOTHING;
