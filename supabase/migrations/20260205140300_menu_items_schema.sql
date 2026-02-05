-- Migration: Create menu_items table
-- Created: 2026-02-05 14:03:00
-- Purpose: Menu items with soft delete pattern

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time_minutes INT DEFAULT 15,
  display_order INT NOT NULL DEFAULT 0,
  allergens TEXT[],                      -- Array of allergen strings
  nutritional_info JSONB,                -- {calories, protein, carbs, fat, fiber, sodium}
  translations JSONB,                     -- {en: {name, description}, tl: {name, description}}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                  -- Soft delete pattern
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id, is_available, display_order);
CREATE INDEX idx_menu_items_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX idx_menu_items_deleted ON menu_items(deleted_at) WHERE deleted_at IS NULL;

-- Rollback:
-- DROP INDEX IF EXISTS idx_menu_items_deleted;
-- DROP INDEX IF EXISTS idx_menu_items_available;
-- DROP INDEX IF EXISTS idx_menu_items_category;
-- DROP TABLE IF EXISTS menu_items;
