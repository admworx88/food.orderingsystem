-- Migration: Enable Realtime for orders table
-- Created: 2026-02-05 14:19:00
-- Purpose: Real-time updates for kitchen display and cashier

-- Enable Realtime replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

COMMENT ON TABLE orders IS 'Orders table with Realtime enabled for kitchen display updates';

-- Rollback:
-- ALTER PUBLICATION supabase_realtime DROP TABLE orders;
