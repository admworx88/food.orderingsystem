-- Add ewallet to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ewallet';

-- Add ewallet detail columns and kiosk_location to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS ewallet_provider TEXT,
  ADD COLUMN IF NOT EXISTS ewallet_reference TEXT,
  ADD COLUMN IF NOT EXISTS kiosk_location TEXT;

-- ROLLBACK:
-- Cannot remove enum values without recreating the type.
-- ALTER TABLE orders DROP COLUMN IF EXISTS ewallet_provider;
-- ALTER TABLE orders DROP COLUMN IF EXISTS ewallet_reference;
-- ALTER TABLE orders DROP COLUMN IF EXISTS kiosk_location;
