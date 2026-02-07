-- Migration: Add atomic increment function for promo code usage
-- This function atomically increments the usage count to prevent race conditions

CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_usage_count = COALESCE(current_usage_count, 0) + 1
  WHERE id = promo_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO anon;

-- Rollback:
-- DROP FUNCTION IF EXISTS increment_promo_usage(UUID);
