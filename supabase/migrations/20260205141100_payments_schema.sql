-- Migration: Create payments table
-- Created: 2026-02-05 14:11:00
-- Purpose: Payment transactions with idempotency

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, success, failed, refunded
  provider_reference TEXT,            -- PayMongo payment ID (unique for idempotency)
  cash_received DECIMAL(10,2),        -- For cash payments
  change_given DECIMAL(10,2),         -- For cash payments
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  UNIQUE(provider_reference)          -- Prevent duplicate webhook processing
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);

-- Rollback:
-- DROP INDEX IF EXISTS idx_payments_status;
-- DROP INDEX IF EXISTS idx_payments_reference;
-- DROP INDEX IF EXISTS idx_payments_order;
-- DROP TABLE IF EXISTS payments;
