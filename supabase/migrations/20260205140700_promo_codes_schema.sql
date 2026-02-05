-- Migration: Create promo_codes table
-- Created: 2026-02-05 14:07:00
-- Purpose: Discount and coupon management

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type discount_type NOT NULL,  -- 'percentage' or 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount DECIMAL(10,2),        -- Minimum order subtotal required
  max_usage_count INT,                    -- NULL = unlimited
  current_usage_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until) WHERE is_active = true;

-- Rollback:
-- DROP INDEX IF EXISTS idx_promo_codes_valid;
-- DROP INDEX IF EXISTS idx_promo_codes_code;
-- DROP TABLE IF EXISTS promo_codes;
