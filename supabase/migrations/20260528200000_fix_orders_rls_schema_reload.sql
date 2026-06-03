-- Migration: Re-assert orders INSERT policy and reload PostgREST schema cache
-- Fixes: "new row violates row-level security policy for table orders" (code 42501)
-- Root cause: INSERT policy may have been dropped or PostgREST cache stale after
--             adding kiosk_location / ewallet columns + ocean_view enum value.

-- Re-assert anon INSERT permission on orders
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Reload PostgREST schema cache so new columns are recognised
NOTIFY pgrst, 'reload schema';

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
