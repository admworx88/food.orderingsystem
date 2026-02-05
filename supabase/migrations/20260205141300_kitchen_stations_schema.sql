-- Migration: Create kitchen_stations table
-- Created: 2026-02-05 14:13:00
-- Purpose: Multi-station order routing

CREATE TABLE kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                 -- 'Grill', 'Fryer', 'Salad', 'Dessert', etc.
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: many-to-many relationship
CREATE TABLE menu_item_stations (
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  kitchen_station_id UUID NOT NULL REFERENCES kitchen_stations(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, kitchen_station_id)
);

CREATE INDEX idx_menu_item_stations_station ON menu_item_stations(kitchen_station_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_menu_item_stations_station;
-- DROP TABLE IF EXISTS menu_item_stations;
-- DROP TABLE IF EXISTS kitchen_stations;
