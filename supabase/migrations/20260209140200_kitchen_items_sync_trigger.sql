-- Migration: Kitchen to items sync trigger
-- Created: 2026-02-09 14:02:00
-- Purpose: When kitchen bumps order status, sync all item statuses

-- Function to sync order items when order status changes
CREATE OR REPLACE FUNCTION sync_order_items_on_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When order bumped from 'paid' to 'preparing', mark all pending items 'preparing'
  IF NEW.status = 'preparing' AND OLD.status = 'paid' THEN
    UPDATE order_items
    SET status = 'preparing'
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;

  -- When order is cancelled, reset all items to pending (cleanup)
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE order_items
    SET status = 'pending', ready_at = NULL, served_at = NULL, served_by = NULL
    WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
CREATE TRIGGER orders_sync_items_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_items_on_order_status();

-- Rollback:
-- DROP TRIGGER IF EXISTS orders_sync_items_status ON orders;
-- DROP FUNCTION IF EXISTS sync_order_items_on_order_status();
