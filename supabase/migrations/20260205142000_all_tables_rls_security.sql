-- Migration: Enable Row Level Security on all tables
-- Created: 2026-02-05 14:20:00
-- Purpose: Enforce security policies across all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_receipt_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === PROFILES ===
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (public.user_role() = 'admin');
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL USING (public.user_role() = 'admin');

-- === MENU (Read: public, Write: admin) ===
-- IMPORTANT: Filter out soft-deleted items
CREATE POLICY "Anyone can read active categories"
  ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access categories"
  ON categories FOR ALL USING (public.user_role() = 'admin');

CREATE POLICY "Anyone can read available items"
  ON menu_items FOR SELECT USING (is_available = true AND deleted_at IS NULL);
CREATE POLICY "Admin full access items"
  ON menu_items FOR ALL USING (public.user_role() = 'admin');

CREATE POLICY "Anyone can read addon groups"
  ON addon_groups FOR SELECT USING (true);
CREATE POLICY "Admin full access addon groups"
  ON addon_groups FOR ALL USING (public.user_role() = 'admin');

CREATE POLICY "Anyone can read available addon options"
  ON addon_options FOR SELECT USING (is_available = true);
CREATE POLICY "Admin full access addon options"
  ON addon_options FOR ALL USING (public.user_role() = 'admin');

-- === PROMO CODES ===
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access promo codes"
  ON promo_codes FOR ALL USING (public.user_role() = 'admin');

-- === ORDERS ===
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Kitchen can read active orders"
  ON orders FOR SELECT USING (
    public.user_role() IN ('kitchen', 'cashier', 'admin') AND deleted_at IS NULL
  );
CREATE POLICY "Kitchen can update order status"
  ON orders FOR UPDATE USING (
    public.user_role() IN ('kitchen', 'admin')
  );
CREATE POLICY "Cashier can update payment status"
  ON orders FOR UPDATE USING (
    public.user_role() IN ('cashier', 'admin')
  );
CREATE POLICY "Admin full access orders"
  ON orders FOR ALL USING (public.user_role() = 'admin');

-- === ORDER ITEMS ===
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read order items"
  ON order_items FOR SELECT USING (
    public.user_role() IN ('kitchen', 'cashier', 'admin')
  );

-- === PAYMENTS ===
CREATE POLICY "Cashier can manage payments"
  ON payments FOR ALL USING (
    public.user_role() IN ('cashier', 'admin')
  );

-- === ORDER EVENTS ===
CREATE POLICY "Anyone can create order events"
  ON order_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read order events"
  ON order_events FOR SELECT USING (public.user_role() = 'admin');

-- === KITCHEN STATIONS ===
CREATE POLICY "Anyone can read active kitchen stations"
  ON kitchen_stations FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access kitchen stations"
  ON kitchen_stations FOR ALL USING (public.user_role() = 'admin');

-- === BIR RECEIPT CONFIG ===
CREATE POLICY "Staff can read BIR config"
  ON bir_receipt_config FOR SELECT USING (
    public.user_role() IN ('cashier', 'admin')
  );
CREATE POLICY "Admin can manage BIR config"
  ON bir_receipt_config FOR ALL USING (public.user_role() = 'admin');

-- === SETTINGS ===
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage settings"
  ON settings FOR ALL USING (public.user_role() = 'admin');

-- === AUDIT LOG ===
CREATE POLICY "Admin can read audit log"
  ON audit_log FOR SELECT USING (public.user_role() = 'admin');

-- Rollback:
-- DROP POLICY IF EXISTS "Admin can read audit log" ON audit_log;
-- DROP POLICY IF EXISTS "Admin can manage settings" ON settings;
-- DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
-- DROP POLICY IF EXISTS "Admin can manage BIR config" ON bir_receipt_config;
-- DROP POLICY IF EXISTS "Staff can read BIR config" ON bir_receipt_config;
-- DROP POLICY IF EXISTS "Admin full access kitchen stations" ON kitchen_stations;
-- DROP POLICY IF EXISTS "Anyone can read active kitchen stations" ON kitchen_stations;
-- DROP POLICY IF EXISTS "Admin can read order events" ON order_events;
-- DROP POLICY IF EXISTS "Anyone can create order events" ON order_events;
-- DROP POLICY IF EXISTS "Cashier can manage payments" ON payments;
-- DROP POLICY IF EXISTS "Staff can read order items" ON order_items;
-- DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
-- DROP POLICY IF EXISTS "Admin full access orders" ON orders;
-- DROP POLICY IF EXISTS "Cashier can update payment status" ON orders;
-- DROP POLICY IF EXISTS "Kitchen can update order status" ON orders;
-- DROP POLICY IF EXISTS "Kitchen can read active orders" ON orders;
-- DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
-- DROP POLICY IF EXISTS "Admin full access promo codes" ON promo_codes;
-- DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;
-- DROP POLICY IF EXISTS "Admin full access addon options" ON addon_options;
-- DROP POLICY IF EXISTS "Anyone can read available addon options" ON addon_options;
-- DROP POLICY IF EXISTS "Admin full access addon groups" ON addon_groups;
-- DROP POLICY IF EXISTS "Anyone can read addon groups" ON addon_groups;
-- DROP POLICY IF EXISTS "Admin full access items" ON menu_items;
-- DROP POLICY IF EXISTS "Anyone can read available items" ON menu_items;
-- DROP POLICY IF EXISTS "Admin full access categories" ON categories;
-- DROP POLICY IF EXISTS "Anyone can read active categories" ON categories;
-- DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
-- DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
-- DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
-- DROP FUNCTION IF EXISTS public.user_role();
-- ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bir_receipt_config DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE kitchen_stations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_item_addons DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE promo_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE addon_options DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE addon_groups DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
