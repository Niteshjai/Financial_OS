-- Migration 012 — Add subscription tiers to users table

ALTER TABLE users 
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
