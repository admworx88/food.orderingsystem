-- Migration: Fix corrupted image URLs
-- Created: 2026-02-09 12:01:00
-- Purpose: Set corrupted REPLACE(...) strings to NULL so images can be re-uploaded

-- Fix corrupted URLs that have the literal REPLACE string
UPDATE menu_items
SET image_url = NULL
WHERE image_url LIKE 'REPLACE(%';

-- Rollback:
-- Manual rollback not possible - original URLs were lost
