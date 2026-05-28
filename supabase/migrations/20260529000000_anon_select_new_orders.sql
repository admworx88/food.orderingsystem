-- Migration: Allow anon to read back freshly created pending orders
-- Root cause: INSERT...RETURNING requires a SELECT policy for the same role.
-- Without this, PostgREST blocks the RETURNING clause and throws 42501.
-- Scope is minimal: only unpaid pending_payment orders within the last 2 minutes.

CREATE POLICY "Kiosk can read new pending orders"
  ON orders FOR SELECT TO anon
  USING (
    status = 'pending_payment'
    AND payment_status = 'unpaid'
    AND created_at > NOW() - INTERVAL '2 minutes'
  );

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Kiosk can read new pending orders" ON orders;
