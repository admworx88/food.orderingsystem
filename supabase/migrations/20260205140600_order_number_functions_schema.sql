-- Migration: Order number sequence and function
-- Created: 2026-02-05 14:06:00
-- Purpose: Thread-safe order number generation (A0001, A0002, etc.)

-- Create sequence for thread-safe order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Function to generate formatted order numbers (A0001, A0002, etc.)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  next_num := nextval('order_number_seq');
  RETURN 'A' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Note: Default value for orders.order_number is set in the orders migration

-- Optional: Daily reset function (run via cron at midnight)
-- This is NOT automatic - requires manual cron job setup
COMMENT ON SEQUENCE order_number_seq IS 'Auto-incrementing sequence for order numbers. Reset daily via cron if needed.';

-- Optional daily reset (run via cron):
-- SELECT setval('order_number_seq', 1, false);

-- Rollback:
-- DROP FUNCTION IF EXISTS generate_order_number();
-- DROP SEQUENCE IF EXISTS order_number_seq;
