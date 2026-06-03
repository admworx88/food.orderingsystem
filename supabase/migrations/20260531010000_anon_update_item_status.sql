-- Allow the anon role to update order_items from ready → served.
--
-- Context: The kiosk Orders view lets PIN-authenticated staff (waiter/cashier)
-- mark items as served. PIN sign-in does NOT create a Supabase Auth session,
-- so the Next.js server action runs as anon on Vercel. The existing UPDATE
-- policies on order_items are scoped TO authenticated, which the anon role
-- cannot satisfy, causing the "Failed to update item status" error.
--
-- This policy mirrors the authenticated "Waiters can mark items served" policy
-- but targets the anon role so that the admin-client bypass in the server action
-- is not the only line of defence. The USING / WITH CHECK constraints enforce
-- the same transition guard (ready → served only).

CREATE POLICY "Anon can mark items served"
  ON order_items FOR UPDATE TO anon
  USING (status = 'ready')
  WITH CHECK (status = 'served');

-- Rollback:
-- DROP POLICY IF EXISTS "Anon can mark items served" ON order_items;
