-- Fix: Recreate auto_update_order_status_from_items as SECURITY DEFINER so it
-- always runs with owner (postgres superuser) privileges and can UPDATE orders
-- regardless of the calling role's RLS restrictions. Previously the trigger ran
-- as SECURITY INVOKER, which worked for authenticated callers but could fail when
-- the service_role or anon role had RLS blocking writes on the orders table.
CREATE OR REPLACE FUNCTION auto_update_order_status_from_items()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID;
  v_total_items INT;
  v_ready_items INT;
  v_served_items INT;
  v_current_status order_status;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- Get current order status
  SELECT status INTO v_current_status FROM orders WHERE id = v_order_id;

  -- Skip if order not in active state (only auto-calculate for preparing/ready orders)
  IF v_current_status NOT IN ('preparing', 'ready') THEN
    RETURN NEW;
  END IF;

  -- Count items by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ready'),
    COUNT(*) FILTER (WHERE status = 'served')
  INTO v_total_items, v_ready_items, v_served_items
  FROM order_items
  WHERE order_id = v_order_id;

  -- Auto-transition to 'served' when all items served
  IF v_served_items = v_total_items AND v_total_items > 0 THEN
    UPDATE orders
    SET status = 'served', served_at = now(), version = version + 1
    WHERE id = v_order_id AND status != 'served';
  -- Auto-transition to 'ready' when all items ready/served (and at least one not yet served)
  ELSIF v_ready_items + v_served_items = v_total_items AND v_served_items < v_total_items THEN
    UPDATE orders
    SET status = 'ready', ready_at = now(), version = version + 1
    WHERE id = v_order_id AND status = 'preparing';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rollback:
-- CREATE OR REPLACE FUNCTION auto_update_order_status_from_items()
-- RETURNS TRIGGER AS $$ ... $$ LANGUAGE plpgsql;
