-- Migration: System seed data
-- Created: 2026-02-05 14:21:00
-- Purpose: Initial data for categories, kitchen stations, settings, and BIR config

-- System settings (required for order calculations)
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '0.12'),
  ('service_charge', '0.10'),
  ('unpaid_order_timeout_minutes', '15'),
  ('order_grace_period_minutes', '5'),
  ('operating_hours', '{"open": "06:00", "close": "23:00"}'),
  ('restaurant_name', '"Hotel Restaurant"'),
  ('currency_symbol', '"₱"'),
  ('idle_timeout_seconds', '120'),
  ('kds_auto_hide_seconds', '30'),
  ('order_number_prefix', '"A"');

-- Sample categories
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Rice Meals', 'rice-meals', 'Filipino rice meals and combos', 1, true),
  ('Soups', 'soups', 'Hot soups and broths', 2, true),
  ('Desserts', 'desserts', 'Sweet treats', 3, true),
  ('Beverages', 'beverages', 'Drinks hot and cold', 4, true);

-- Sample kitchen stations
INSERT INTO kitchen_stations (name, description, is_active) VALUES
  ('Grill', 'Grilled items and BBQ', true),
  ('Fryer', 'Fried dishes', true),
  ('Salad', 'Cold prep and salads', true),
  ('Dessert', 'Desserts and beverages', true);

-- Sample BIR config (Philippines compliance)
INSERT INTO bir_receipt_config (
  tin, business_name, business_address,
  permit_number, permit_date_issued,
  receipt_series_start, receipt_series_current,
  accreditation_number, accreditation_date,
  pos_machine_id, terminal_id
) VALUES (
  '000-000-000-000',
  'Hotel Restaurant',
  '123 Main St, Manila, Philippines',
  'FP-00000-2026',
  '2026-01-01',
  1,
  1,
  'ACC-00000-2026',
  '2026-01-01',
  'POS-001',
  'TERM-001'
);

-- Rollback:
-- DELETE FROM bir_receipt_config;
-- DELETE FROM kitchen_stations;
-- DELETE FROM categories;
-- DELETE FROM settings;
