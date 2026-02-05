-- Migration: Create order_events table
-- Created: 2026-02-05 14:12:00
-- Purpose: Analytics tracking for success metrics

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,           -- cart_started, item_added, checkout_initiated, payment_completed, etc.
  metadata JSONB,                     -- Flexible event context (item_id, quantity, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_events_order ON order_events(order_id);
CREATE INDEX idx_order_events_type ON order_events(event_type);
CREATE INDEX idx_order_events_created ON order_events(created_at DESC);

-- Rollback:
-- DROP INDEX IF EXISTS idx_order_events_created;
-- DROP INDEX IF EXISTS idx_order_events_type;
-- DROP INDEX IF EXISTS idx_order_events_order;
-- DROP TABLE IF EXISTS order_events;
