-- Enable RLS on menu_item_stations (was missing, flagged by Supabase advisor)
ALTER TABLE menu_item_stations ENABLE ROW LEVEL SECURITY;

-- Anyone can read (menu items are public data; stations linked to menu items are reference data)
CREATE POLICY "Anyone can read menu item stations"
  ON menu_item_stations FOR SELECT USING (true);

-- Admin full control
CREATE POLICY "Admin full access menu item stations"
  ON menu_item_stations FOR ALL USING (public.user_role() = 'admin');

-- Rollback:
-- DROP POLICY IF EXISTS "Admin full access menu item stations" ON menu_item_stations;
-- DROP POLICY IF EXISTS "Anyone can read menu item stations" ON menu_item_stations;
-- ALTER TABLE menu_item_stations DISABLE ROW LEVEL SECURITY;
