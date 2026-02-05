-- Migration: Create performance indexes
-- Created: 2026-02-05 14:18:00
-- Purpose: Optimize query performance for 200+ concurrent kiosks

-- Order queries (kitchen display, cashier, admin)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at DESC) WHERE paid_at IS NOT NULL;

-- Menu queries (kiosk, admin)
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON menu_items(deleted_at) WHERE deleted_at IS NULL;

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_event_type ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at DESC);

-- Payment queries
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Addon queries
CREATE INDEX IF NOT EXISTS idx_addon_groups_menu_item_id ON addon_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_addon_options_addon_group_id ON addon_options(addon_group_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_addon_options_addon_group_id;
-- DROP INDEX IF EXISTS idx_addon_groups_menu_item_id;
-- DROP INDEX IF EXISTS idx_payments_status;
-- DROP INDEX IF EXISTS idx_payments_order_id;
-- DROP INDEX IF EXISTS idx_order_events_created_at;
-- DROP INDEX IF EXISTS idx_order_events_event_type;
-- DROP INDEX IF EXISTS idx_order_events_order_id;
-- DROP INDEX IF EXISTS idx_menu_items_deleted_at;
-- DROP INDEX IF EXISTS idx_menu_items_is_available;
-- DROP INDEX IF EXISTS idx_menu_items_category_id;
-- DROP INDEX IF EXISTS idx_orders_paid_at;
-- DROP INDEX IF EXISTS idx_orders_payment_status;
-- DROP INDEX IF EXISTS idx_orders_created_at;
-- DROP INDEX IF EXISTS idx_orders_status;
