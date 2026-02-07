-- Migration: Revoke anon access to increment_promo_usage
-- Security fix: anon role should not be able to increment promo usage counts directly.
-- The function is only called from Server Actions which use the authenticated server client.

REVOKE EXECUTE ON FUNCTION increment_promo_usage(UUID) FROM anon;

-- Rollback:
-- GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO anon;
