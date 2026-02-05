-- Migration: Create menu-images storage bucket
-- Created: 2026-02-05 14:17:00
-- Purpose: Image uploads for menu items

-- Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Public read menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated'
);

-- Rollback:
-- DROP POLICY IF EXISTS "Authenticated delete own images" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated upload menu images" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'menu-images';
