-- Migration: Enable Realtime for order_items table
-- Created: 2026-02-11 10:00:00
-- Purpose: Real-time updates for waiter item-level tracking and kitchen per-item status

-- Enable Realtime replication for order_items table
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

COMMENT ON TABLE order_items IS 'Order items table with Realtime enabled for waiter and kitchen item-level tracking';

-- Rollback:
-- ALTER PUBLICATION supabase_realtime DROP TABLE order_items;
