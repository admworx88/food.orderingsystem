-- Migration: Create settings table
-- Created: 2026-02-05 14:15:00
-- Purpose: System-wide configuration

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_settings_key ON settings(key);

-- Rollback:
-- DROP INDEX IF EXISTS idx_settings_key;
-- DROP TABLE IF EXISTS settings;
