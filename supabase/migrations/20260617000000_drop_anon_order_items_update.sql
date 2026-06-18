-- Drop the anon UPDATE policy on order_items that allowed unauthenticated callers
-- to mark items as served. The updateItemToServed() Server Action uses createAdminClient()
-- which bypasses RLS entirely, making this policy redundant and a security risk.

DROP POLICY IF EXISTS "Anon can mark items served" ON order_items;

-- Rollback:
-- CREATE POLICY "Anon can mark items served" ON order_items
--   FOR UPDATE TO anon
--   USING (status = 'ready')
--   WITH CHECK (status = 'served');
