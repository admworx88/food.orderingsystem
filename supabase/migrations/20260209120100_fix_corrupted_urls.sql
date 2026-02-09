-- Migration: Fix corrupted image URLs
-- Created: 2026-02-09 12:01:00
-- Purpose: Set corrupted REPLACE(...) strings to NULL so images can be re-uploaded
--
-- ROOT CAUSE ANALYSIS:
-- During debugging of the image display issue (hostname mismatch 127.0.0.1 vs localhost),
-- an incorrect attempt was made to update URLs using the Supabase JS client:
--
--   await supabase.from('menu_items').update({
--     image_url: "REPLACE(image_url, 'http://127.0.0.1:', 'http://localhost:')"
--   })
--
-- This stored the literal SQL string as the column value instead of executing the
-- REPLACE() function. The correct approach would have been to use raw SQL via
-- supabase.rpc() or apply a proper migration file.
--
-- SCOPE OF CORRUPTION:
-- Only the menu_items.image_url column was affected. No other tables store image URLs.
--
-- PREVENTION:
-- 1. Always use migrations for data transformations, not JS client updates with SQL strings
-- 2. The normalize_image_urls migration (20260209120000) shows the correct pattern
-- 3. Added normalizeImageUrl() utility in src/lib/utils/image.ts for runtime handling

-- Fix corrupted URLs that have the literal REPLACE string
UPDATE menu_items
SET image_url = NULL
WHERE image_url LIKE 'REPLACE(%';

-- Rollback:
-- Manual rollback not possible - original URLs were overwritten before this migration.
-- The data loss occurred during the incorrect JS client update, not this migration.
-- This migration only cleans up the corrupted entries to allow re-upload.
