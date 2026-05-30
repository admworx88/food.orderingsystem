-- Allow anon to read back freshly inserted order_items rows.
-- Root cause: INSERT...RETURNING on order_items requires SELECT policy for the caller's role.
-- The kiosk runs as anon (no auth session), so without this the .select('id') after insert
-- throws 42501 (RLS violation) even though the INSERT policy already allows anon inserts.
-- The 2-minute window is narrow enough to be safe while covering the createOrder flow.

CREATE POLICY "Kiosk can read new order items"
  ON order_items FOR SELECT TO anon
  USING (
    created_at > NOW() - INTERVAL '2 minutes'
  );

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Kiosk can read new order items" ON order_items;
