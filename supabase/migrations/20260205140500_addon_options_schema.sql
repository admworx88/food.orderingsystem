-- Migration: Create addon_options table
-- Created: 2026-02-05 14:05:00
-- Purpose: Individual addon options within addon groups

CREATE TABLE addon_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
  is_available BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addon_options_group ON addon_options(addon_group_id, is_available);

-- Rollback:
-- DROP INDEX IF EXISTS idx_addon_options_group;
-- DROP TABLE IF EXISTS addon_options;
