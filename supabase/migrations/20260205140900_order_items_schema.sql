-- Migration: Create order_items table
-- Created: 2026-02-05 14:09:00
-- Purpose: Order items with denormalized price and name

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,            -- Denormalized: snapshot at order time
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,  -- Denormalized: price at order time
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_order_items_order;
-- DROP TABLE IF EXISTS order_items;
