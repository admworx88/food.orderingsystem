-- Add taken_by column to orders — tracks which staff member placed the order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS taken_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for reporting queries (filter orders by staff member)
CREATE INDEX IF NOT EXISTS orders_taken_by_idx ON orders(taken_by);

-- Rollback:
-- DROP INDEX IF EXISTS orders_taken_by_idx;
-- ALTER TABLE orders DROP COLUMN IF EXISTS taken_by;
