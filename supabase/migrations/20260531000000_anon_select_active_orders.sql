-- Allow anon (kiosk, unauthenticated browser client) to read orders that are
-- actively being prepared or ready for service. This is required so that the
-- kiosk staff Orders view (which uses the anon/publishable key via
-- createBrowserClient) can display preparing/ready orders regardless of age.
-- These orders contain no PII beyond table/room identifiers — safe for a
-- restaurant kiosk context.
CREATE POLICY "Anon can read active kitchen orders"
  ON orders FOR SELECT TO anon
  USING (status IN ('preparing', 'ready') AND deleted_at IS NULL);

-- Also allow anon to read order_items for those orders
-- (needed by use-realtime-waiter-orders to get item-level status)
CREATE POLICY "Anon can read items of active orders"
  ON order_items FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.status IN ('preparing', 'ready')
        AND orders.deleted_at IS NULL
    )
  );

-- Rollback:
-- DROP POLICY IF EXISTS "Anon can read items of active orders" ON order_items;
-- DROP POLICY IF EXISTS "Anon can read active kitchen orders" ON orders;
