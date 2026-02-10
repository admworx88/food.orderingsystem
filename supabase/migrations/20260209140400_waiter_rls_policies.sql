-- Migration: RLS policies for waiter role
-- Created: 2026-02-09 14:04:00
-- Purpose: Enable waiters to view orders and update item status to served

-- Update existing order read policy to include waiter
DROP POLICY IF EXISTS "Kitchen can read active orders" ON orders;

CREATE POLICY "Staff can read active orders"
  ON orders FOR SELECT TO authenticated
  USING (
    public.user_role() IN ('kitchen', 'cashier', 'waiter', 'admin')
    AND deleted_at IS NULL
  );

-- Update existing order items read policy to include waiter
DROP POLICY IF EXISTS "Staff can read order items" ON order_items;

CREATE POLICY "Staff can read order items"
  ON order_items FOR SELECT TO authenticated
  USING (
    public.user_role() IN ('kitchen', 'cashier', 'waiter', 'admin')
  );

-- Waiter can mark items as served
CREATE POLICY "Waiters can mark items served"
  ON order_items FOR UPDATE TO authenticated
  USING (
    public.user_role() IN ('waiter', 'admin')
    AND status = 'ready'
  )
  WITH CHECK (
    status = 'served'
  );

-- Kitchen can update items to preparing or ready
CREATE POLICY "Kitchen can update item status"
  ON order_items FOR UPDATE TO authenticated
  USING (
    public.user_role() IN ('kitchen', 'admin')
    AND status IN ('pending', 'preparing')
  )
  WITH CHECK (
    status IN ('preparing', 'ready')
  );

-- Rollback:
-- DROP POLICY IF EXISTS "Kitchen can update item status" ON order_items;
-- DROP POLICY IF EXISTS "Waiters can mark items served" ON order_items;
-- DROP POLICY IF EXISTS "Staff can read order items" ON order_items;
-- DROP POLICY IF EXISTS "Staff can read active orders" ON orders;
--
-- -- Recreate original policies
-- CREATE POLICY "Kitchen can read active orders"
--   ON orders FOR SELECT USING (
--     public.user_role() IN ('kitchen', 'cashier', 'admin') AND deleted_at IS NULL
--   );
-- CREATE POLICY "Staff can read order items"
--   ON order_items FOR SELECT USING (
--     public.user_role() IN ('kitchen', 'cashier', 'admin')
--   );
