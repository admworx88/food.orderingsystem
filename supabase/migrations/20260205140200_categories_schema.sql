-- Migration: Create categories table
-- Created: 2026-02-05 14:02:00
-- Purpose: Menu categories for organizing menu items

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_active ON categories(is_active, display_order);

-- Rollback:
-- DROP INDEX IF EXISTS idx_categories_active;
-- DROP TABLE IF EXISTS categories;
