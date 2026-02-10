-- Migration: Add item-level status tracking for waiter module
-- Created: 2026-02-09 14:00:00
-- Purpose: Enable granular item status tracking (pending → preparing → ready → served)

-- Create item status enum
CREATE TYPE order_item_status AS ENUM ('pending', 'preparing', 'ready', 'served');

-- Add status columns to order_items
ALTER TABLE order_items
  ADD COLUMN status order_item_status NOT NULL DEFAULT 'pending',
  ADD COLUMN ready_at TIMESTAMPTZ,
  ADD COLUMN served_at TIMESTAMPTZ,
  ADD COLUMN served_by UUID REFERENCES profiles(id);

-- Index for waiter queries (ready items that need to be served)
CREATE INDEX idx_order_items_status ON order_items(status)
  WHERE status IN ('ready', 'preparing');

-- Index for kitchen queries (items in progress)
CREATE INDEX idx_order_items_order_status ON order_items(order_id, status);

-- Backfill existing orders based on order status
-- This ensures historical data is consistent
UPDATE order_items SET status = 'served', served_at = o.served_at
  FROM orders o
  WHERE order_items.order_id = o.id AND o.status = 'served';

UPDATE order_items SET status = 'ready', ready_at = o.ready_at
  FROM orders o
  WHERE order_items.order_id = o.id AND o.status = 'ready';

UPDATE order_items SET status = 'preparing'
  FROM orders o
  WHERE order_items.order_id = o.id AND o.status = 'preparing';

UPDATE order_items SET status = 'pending'
  FROM orders o
  WHERE order_items.order_id = o.id AND o.status IN ('pending_payment', 'paid');

-- Rollback:
-- UPDATE order_items SET status = 'pending' WHERE status IS NOT NULL;
-- DROP INDEX IF EXISTS idx_order_items_order_status;
-- DROP INDEX IF EXISTS idx_order_items_status;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS served_by;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS served_at;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS ready_at;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS status;
-- DROP TYPE IF EXISTS order_item_status;
