-- Migration: Create addon_groups table
-- Created: 2026-02-05 14:04:00
-- Purpose: Addon groups for menu item customization

CREATE TABLE addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  min_selections INT DEFAULT 0,
  max_selections INT DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addon_groups_item ON addon_groups(menu_item_id, display_order);

-- Rollback:
-- DROP INDEX IF EXISTS idx_addon_groups_item;
-- DROP TABLE IF EXISTS addon_groups;
