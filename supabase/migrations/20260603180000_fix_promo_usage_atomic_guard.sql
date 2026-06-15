-- Migration: Make increment_promo_usage atomic with a max-usage guard
-- Replaces the plain increment with one that only succeeds when under the cap.
-- Returns TRUE if the increment succeeded, FALSE if the limit was already reached.
-- This prevents TOCTOU races where two concurrent orders both pass validatePromoCode
-- and then both increment — exceeding max_usage_count.

CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE promo_codes
  SET current_usage_count = COALESCE(current_usage_count, 0) + 1
  WHERE id = promo_id
    AND (max_usage_count IS NULL OR current_usage_count < max_usage_count);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO anon;

-- Rollback:
-- Restore the original non-guarded version:
-- CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   UPDATE promo_codes SET current_usage_count = COALESCE(current_usage_count, 0) + 1 WHERE id = promo_id;
-- END; $$;
