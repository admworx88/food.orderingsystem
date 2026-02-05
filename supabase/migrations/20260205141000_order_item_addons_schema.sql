-- Migration: Create order_item_addons table
-- Created: 2026-02-05 14:10:00
-- Purpose: Addon options selected for order items

CREATE TABLE order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_option_id UUID REFERENCES addon_options(id) ON DELETE SET NULL,
  addon_name TEXT NOT NULL,           -- Denormalized
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_item_addons_item ON order_item_addons(order_item_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_order_item_addons_item;
-- DROP TABLE IF EXISTS order_item_addons;
