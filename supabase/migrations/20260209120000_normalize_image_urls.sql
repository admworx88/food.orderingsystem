-- Migration: Normalize image URLs to use localhost instead of 127.0.0.1
-- Created: 2026-02-09 12:00:00
-- Purpose: Fix broken images by standardizing hostname in existing image URLs

-- Update all menu_items with 127.0.0.1 URLs to use localhost
UPDATE menu_items
SET image_url = REPLACE(image_url, 'http://127.0.0.1:', 'http://localhost:')
WHERE image_url LIKE 'http://127.0.0.1:%';

-- Rollback:
-- UPDATE menu_items
-- SET image_url = REPLACE(image_url, 'http://localhost:', 'http://127.0.0.1:')
-- WHERE image_url LIKE 'http://localhost:%';
