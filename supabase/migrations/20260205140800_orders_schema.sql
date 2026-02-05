-- Migration: Create orders table
-- Created: 2026-02-05 14:08:00
-- Purpose: Main orders table with optimistic locking and soft delete

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL DEFAULT generate_order_number(), -- Auto-generated via sequence
  order_type order_type NOT NULL,
  table_number TEXT,                  -- For dine_in
  room_number TEXT,                   -- For room_service
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_code_id UUID REFERENCES promo_codes(id),  -- FK to promo_codes
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_instructions TEXT,
  estimated_ready_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,              -- 15-minute timeout for unpaid orders
  version INT DEFAULT 1,                -- Optimistic locking
  guest_phone TEXT,                     -- For order history lookup
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ                -- Soft delete pattern
);

CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('served', 'cancelled');
CREATE INDEX idx_orders_payment ON orders(payment_status) WHERE payment_status = 'unpaid';
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_expires ON orders(expires_at) WHERE expires_at IS NOT NULL AND payment_status = 'unpaid';
CREATE INDEX idx_orders_deleted ON orders(deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback:
-- DROP TRIGGER IF EXISTS orders_updated_at ON orders;
-- DROP FUNCTION IF EXISTS update_updated_at();
-- DROP INDEX IF EXISTS idx_orders_deleted;
-- DROP INDEX IF EXISTS idx_orders_expires;
-- DROP INDEX IF EXISTS idx_orders_number;
-- DROP INDEX IF EXISTS idx_orders_created;
-- DROP INDEX IF EXISTS idx_orders_payment;
-- DROP INDEX IF EXISTS idx_orders_status;
-- DROP TABLE IF EXISTS orders;
