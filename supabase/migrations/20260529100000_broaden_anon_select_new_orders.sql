-- Broaden the anon SELECT policy to cover all recently created orders (not just pending_payment).
-- GCash/card orders are inserted with status='paid', so the previous narrow policy excluded them.
-- A 2-minute time window is still tight enough to be safe.

DROP POLICY IF EXISTS "Kiosk can read new pending orders" ON orders;

CREATE POLICY "Kiosk can read new orders"
  ON orders FOR SELECT TO anon
  USING (created_at > NOW() - INTERVAL '2 minutes');

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Kiosk can read new orders" ON orders;
-- CREATE POLICY "Kiosk can read new pending orders"
--   ON orders FOR SELECT TO anon
--   USING (status = 'pending_payment' AND payment_status = 'unpaid' AND created_at > NOW() - INTERVAL '2 minutes');
