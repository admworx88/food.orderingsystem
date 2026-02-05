# Agent: Database & Infrastructure
# Scope: Supabase schema, migrations, RLS policies, functions

> **Version:** 2.1 | **Last Updated:** February 2026 | **Status:** Aligned with PRD v1.2

---

## Quick Reference

### Database Statistics
| Metric | Count |
|--------|-------|
| Migration Files | 21 |
| Tables | 15 |
| Enum Types | 6 |
| Indexes | 15+ |
| RLS Policies | 20+ |

### Essential Commands
```bash
npx supabase start                    # Start local Supabase
npx supabase migration list --linked  # List applied migrations
npm run supabase:push                 # Apply new migrations
npm run supabase:types                # Regenerate TypeScript types
npx supabase db reset                 # Reset local DB (dev only!)
```

### Table Dependencies (Creation Order)
```
enums → profiles → categories → menu_items → addon_groups → addon_options
                              ↓
                        order_number_seq → promo_codes → orders → order_items
                                                            ↓
                                                    order_item_addons, payments
                                                    order_events, audit_log
```

---

## Mission

You own the data layer. Your goal is to create a rock-solid database schema
with proper types, constraints, indexes, and Row Level Security policies.
Every table must be protected. Every query must be fast.

---

## Owned Files

```
supabase/
├── migrations/
│   ├── 20260205140000_enums_schema.sql
│   ├── 20260205140100_profiles_schema.sql
│   ├── 20260205140200_categories_schema.sql
│   ├── 20260205140300_menu_items_schema.sql
│   ├── 20260205140400_addon_groups_schema.sql
│   ├── 20260205140500_addon_options_schema.sql
│   ├── 20260205140600_order_number_functions_schema.sql
│   ├── 20260205140700_promo_codes_schema.sql
│   ├── 20260205140800_orders_schema.sql
│   ├── 20260205140900_order_items_schema.sql
│   ├── 20260205141000_order_item_addons_schema.sql
│   ├── 20260205141100_payments_schema.sql
│   ├── 20260205141200_order_events_schema.sql
│   ├── 20260205141300_kitchen_stations_schema.sql
│   ├── 20260205141400_bir_receipt_config_schema.sql
│   ├── 20260205141500_settings_schema.sql
│   ├── 20260205141600_audit_log_schema.sql
│   ├── 20260205141700_menu_images_buckets_storage.sql
│   ├── 20260205141800_all_tables_indexes_performance.sql
│   ├── 20260205141900_orders_realtime.sql
│   ├── 20260205142000_all_tables_rls_security.sql
│   └── 20260205142100_system_seed_data.sql
├── seed.sql
└── config.toml

src/lib/supabase/
├── client.ts           # createBrowserClient()
├── server.ts           # createServerClient() — NOTE: Function name change
├── admin.ts            # createAdminClient()
├── middleware.ts       # getSession() helper
└── types.ts            # Generated database types (auto-generated from migrations)
```

**Migration Naming Convention:** `YYYYMMDDHHMMSS_description.sql`

**IMPORTANT:** Supabase requires timestamps in `YYYYMMDDHHMMSS` format at the start of the filename. Examples:
- `20260205140000_enums_schema.sql` ✅ Correct
- `enums_schema_05022026_140000.sql` ❌ Wrong (will be skipped)

**Types:**
- `schema` — CREATE TABLE, ALTER TABLE
- `rls` — Row Level Security policies
- `functions` — Functions, triggers, sequences
- `buckets` — Supabase Storage buckets + policies
- `indexes` — CREATE INDEX statements
- `seed` — INSERT initial/test data

---

## Enum Types

```sql
-- 20260205140000_enums_schema.sql
CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'kitchen', 'kiosk');
CREATE TYPE order_type AS ENUM ('dine_in', 'room_service', 'takeout');
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'paid', 'preparing', 'ready', 'served', 'cancelled'
);
CREATE TYPE payment_status AS ENUM ('unpaid', 'processing', 'paid', 'refunded', 'expired');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');
```

**Note:** Discounts are now managed via the `promo_codes` table, not as an enum on orders.

---

## Table Schemas

### profiles
```sql
-- 20260205140100_profiles_schema.sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'kitchen',
  avatar_url TEXT,
  pin_hash TEXT,                    -- bcrypt hashed PIN
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'kitchen');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### categories
```sql
-- 20260205140200_categories_schema.sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_active ON categories(is_active, display_order);
```

### menu_items
```sql
-- 20260205140300_menu_items_schema.sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time_minutes INT DEFAULT 15,
  display_order INT NOT NULL DEFAULT 0,
  allergens TEXT[],                      -- NEW: Array of allergen strings
  nutritional_info JSONB,                -- NEW: {calories, protein, carbs, fat, fiber, sodium}
  translations JSONB,                     -- NEW: {en: {name, description}, tl: {name, description}}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                  -- NEW: Soft delete pattern
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id, is_available, display_order);
CREATE INDEX idx_menu_items_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX idx_menu_items_deleted ON menu_items(deleted_at) WHERE deleted_at IS NULL;
```

**Soft Delete Pattern:**
- Never hard delete menu items (breaks historical order data)
- Set `deleted_at = NOW()` instead
- Filter with `WHERE deleted_at IS NULL` in all queries
- Preserves price integrity for old orders

### addon_groups
```sql
-- 20260205140400_addon_groups_schema.sql
CREATE TABLE addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  min_selections INT DEFAULT 0,
  max_selections INT DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addon_groups_item ON addon_groups(menu_item_id, display_order);
```

### addon_options
```sql
-- 20260205140500_addon_options_schema.sql
CREATE TABLE addon_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
  is_available BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addon_options_group ON addon_options(addon_group_id, is_available);
```

### promo_codes (NEW in PRD v1.1)
```sql
-- 20260205140700_promo_codes_schema.sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type discount_type NOT NULL,  -- 'percentage' or 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount DECIMAL(10,2),        -- Minimum order subtotal required
  max_usage_count INT,                    -- NULL = unlimited
  current_usage_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until) WHERE is_active = true;
```

**Validation Rules:**
1. Code must be unique, case-insensitive, alphanumeric only
2. Valid date range check: current date between valid_from and valid_until
3. Usage limit check: current_usage_count < max_usage_count (if set)
4. Minimum order check: order subtotal >= min_order_amount (if set)
5. Discount applied BEFORE tax calculation

### orders
```sql
-- 20260205140800_orders_schema.sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL DEFAULT generate_order_number(), -- Auto-generated via sequence
  order_type order_type NOT NULL,
  table_number TEXT,                  -- For dine_in
  room_number TEXT,                   -- For room_service
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_code_id UUID REFERENCES promo_codes(id),  -- NEW: FK to promo_codes
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_instructions TEXT,
  estimated_ready_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,              -- NEW: 15-minute timeout for unpaid orders
  version INT DEFAULT 1,                -- NEW: Optimistic locking
  guest_phone TEXT,                     -- NEW: For order history lookup
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ                -- NEW: Soft delete pattern
);

CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('served', 'cancelled');
CREATE INDEX idx_orders_payment ON orders(payment_status) WHERE payment_status = 'unpaid';
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_expires ON orders(expires_at) WHERE expires_at IS NOT NULL AND payment_status = 'unpaid';
CREATE INDEX idx_orders_deleted ON orders(deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Optimistic Locking Pattern:**
```sql
-- In Server Actions, use version field to prevent concurrent updates
UPDATE orders
SET status = 'preparing', version = version + 1
WHERE id = $1 AND version = $2;  -- Fails if version changed
```

### order_items
```sql
-- 20260205140900_order_items_schema.sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,            -- Denormalized: snapshot at order time
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,  -- Denormalized: price at order time
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### order_item_addons
```sql
-- 20260205141000_order_item_addons_schema.sql
CREATE TABLE order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_option_id UUID REFERENCES addon_options(id) ON DELETE SET NULL,
  addon_name TEXT NOT NULL,           -- Denormalized
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_item_addons_item ON order_item_addons(order_item_id);
```

### payments
```sql
-- 20260205141100_payments_schema.sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, success, failed, refunded
  provider_reference TEXT,            -- PayMongo payment ID (unique for idempotency)
  cash_received DECIMAL(10,2),        -- For cash payments
  change_given DECIMAL(10,2),         -- For cash payments
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  UNIQUE(provider_reference)          -- Prevent duplicate webhook processing
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
```

### order_events (NEW in PRD v1.1)
```sql
-- 20260205141200_order_events_schema.sql
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,           -- cart_started, item_added, checkout_initiated, payment_completed, etc.
  metadata JSONB,                     -- Flexible event context (item_id, quantity, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_events_order ON order_events(order_id);
CREATE INDEX idx_order_events_type ON order_events(event_type);
CREATE INDEX idx_order_events_created ON order_events(created_at DESC);
```

**Purpose:** Analytics tracking for success metrics
- Average order time: `cart_started` → `payment_completed` timestamp diff
- Cart abandonment: `cart_started` without matching `order_submitted`
- Funnel analysis: track drop-off at each stage

### kitchen_stations (NEW in PRD v1.1)
```sql
-- 20260205141300_kitchen_stations_schema.sql
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
```

**Purpose:** Multi-station order routing
- Routes orders to specific kitchen stations
- Enables parallel kitchen workflows
- Each menu item can be assigned to multiple stations

### bir_receipt_config (NEW in PRD v1.1)
```sql
-- 20260205141400_bir_receipt_config_schema.sql
CREATE TABLE bir_receipt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tin TEXT NOT NULL,                  -- Tax Identification Number
  business_name TEXT NOT NULL,
  business_address TEXT NOT NULL,
  permit_number TEXT,
  permit_date_issued DATE,
  receipt_series_start INT NOT NULL DEFAULT 1,
  receipt_series_current INT NOT NULL DEFAULT 1,
  accreditation_number TEXT,
  accreditation_date DATE,
  pos_machine_id TEXT,
  terminal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Philippines BIR tax compliance
- Stores TIN, business details, permit numbers
- Receipt series tracking (sequential, no gaps)
- POS machine and terminal IDs
- Required for official receipts

### settings
```sql
-- 20260205141500_settings_schema.sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_settings_key ON settings(key);
```

### audit_log
```sql
-- 20260205141600_audit_log_schema.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,               -- create, update, delete
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, created_at DESC);
```

---

## Order Number Generation (Race-Condition Safe)

```sql
-- order_number_functions_05022026_140600.sql

-- Create sequence for thread-safe order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Function to generate formatted order numbers (A0001, A0002, etc.)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  next_num := nextval('order_number_seq');
  RETURN 'A' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Set as default value on orders table
ALTER TABLE orders
  ALTER COLUMN order_number SET DEFAULT generate_order_number();

-- Optional: Daily reset function (run via cron at midnight)
-- Note: This is NOT automatic - requires manual cron job setup
COMMENT ON SEQUENCE order_number_seq IS 'Auto-incrementing sequence for order numbers. Reset daily via cron if needed.';
```

**Result:** Thread-safe order numbers (A0001, A0002, ... A9999) with no duplicates even under 200+ concurrent inserts.

**Optional Daily Reset:**
```sql
-- Run this via cron at midnight to reset sequence (optional)
SELECT setval('order_number_seq', 1, false);
```

---

## Performance Indexes

```sql
-- 20260205141800_all_tables_indexes_performance.sql

-- Order queries (kitchen display, cashier, admin)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at DESC) WHERE paid_at IS NOT NULL;

-- Menu queries (kiosk, admin)
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON menu_items(deleted_at) WHERE deleted_at IS NULL;

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_event_type ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at DESC);

-- Payment queries
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Addon queries
CREATE INDEX IF NOT EXISTS idx_addon_groups_menu_item_id ON addon_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_addon_options_addon_group_id ON addon_options(addon_group_id);
```

**Critical for scale:** 200+ concurrent kiosks, 500+ orders/day

---

## Supabase Storage Bucket

```sql
-- 20260205141700_menu_images_buckets_storage.sql

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
```

---

## Realtime Configuration

```sql
-- 20260205141900_orders_realtime.sql

-- Enable Realtime replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

COMMENT ON TABLE orders IS 'Orders table with Realtime enabled for kitchen display updates';
```

**Note:** Only the `orders` table needs Realtime. Not order_items or payments.

---

## Row Level Security Policies

```sql
-- 20260205142000_all_tables_rls_security.sql

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
```

---

## System Seed Data

```sql
-- 20260205142100_system_seed_data.sql

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
```

---

## Database Functions

### Dashboard Stats
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', (
      SELECT COUNT(*) FROM orders
      WHERE created_at BETWEEN date_from AND date_to
      AND status != 'cancelled'
      AND deleted_at IS NULL
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(total_amount), 0) FROM orders
      WHERE created_at BETWEEN date_from AND date_to
      AND payment_status = 'paid'
      AND deleted_at IS NULL
    ),
    'avg_order_value', (
      SELECT COALESCE(AVG(total_amount), 0) FROM orders
      WHERE created_at BETWEEN date_from AND date_to
      AND payment_status = 'paid'
      AND deleted_at IS NULL
    ),
    'active_orders', (
      SELECT COUNT(*) FROM orders
      WHERE status IN ('paid', 'preparing', 'ready')
      AND deleted_at IS NULL
    ),
    'orders_by_type', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT order_type, COUNT(*) as count
        FROM orders
        WHERE created_at BETWEEN date_from AND date_to
        AND status != 'cancelled'
        AND deleted_at IS NULL
        GROUP BY order_type
      ) t
    ),
    'top_items', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT oi.item_name, SUM(oi.quantity) as total_qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at BETWEEN date_from AND date_to
        AND o.status != 'cancelled'
        AND o.deleted_at IS NULL
        GROUP BY oi.item_name
        ORDER BY total_qty DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auto-Cancel Expired Orders (Cron Job)
```sql
-- Run this via Supabase Edge Function or external cron every 5 minutes
CREATE OR REPLACE FUNCTION cancel_expired_orders()
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled', payment_status = 'expired'
  WHERE payment_status = 'unpaid'
    AND expires_at < NOW()
    AND status = 'pending_payment'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Key Implementation Notes

1. **Type generation**: After migrations, run `npm run supabase:types` (or `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`)
   to generate TypeScript types. Commit these to `src/lib/supabase/types.ts`.

2. **Realtime**: Enabled via migration `20260205141900_orders_realtime.sql`.
   Only the `orders` table needs realtime — not order_items or payments.

3. **Indexes**: The partial indexes on `orders` (WHERE status NOT IN...)
   keep the index small and fast for the most common queries.

4. **Cascading deletes**: Order items and addons cascade from orders.
   Menu item references use SET NULL to preserve historical data.

5. **Service role client**: Use the admin/service role client ONLY in
   server actions and API routes. Never expose it to the client.

6. **Connection pooling**: For production, use Supabase's connection
   pooler (port 6543) instead of direct connections (port 5432).

7. **Migration file management**:
   - **NEVER** rename existing migration files
   - **NEVER** delete applied migration files
   - **NEVER** edit migration files after they've been applied
   - **NEVER** run `supabase db reset` in production (WIPES ALL DATA)
   - **ALWAYS** create new migration files for schema changes
   - **ALWAYS** use `npm run supabase:push` to apply new migrations
   - **ALWAYS** regenerate types after schema changes
   - **ALWAYS** follow naming convention: `{table}_{type}_{DDMMYYYY}_{HHMMSS}.sql`

8. **Soft delete pattern**:
   - Menu items and orders use `deleted_at` instead of hard deletes
   - Preserves historical order data (BIR compliance - 2 years)
   - Preserves price integrity for old orders
   - Always filter with `WHERE deleted_at IS NULL` in queries
   - Update RLS policies to check `deleted_at IS NULL`

9. **Supabase client naming**:
   - `src/lib/supabase/server.ts` exports `createServerClient()` (not `createClient()`)
   - This avoids naming collisions with Supabase SSR package
   - Always use `await createServerClient()` in Server Components/Actions

---

## Troubleshooting

### Common Database Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "xxx" does not exist` | Migration not applied | Run `npm run supabase:push` |
| `permission denied for table xxx` | RLS policy blocking | Check RLS policies match user role |
| `duplicate key value violates unique constraint` | Duplicate data | Use `ON CONFLICT` or check before insert |
| `foreign key constraint violation` | Referenced row doesn't exist | Verify FK exists before inserting |
| `value too long for type character varying` | Text exceeds limit | Check column length constraints |
| `invalid input value for enum` | Invalid enum value | Use only defined enum values |

### RLS Debugging

```sql
-- Check if RLS is enabled on a table
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'your_table';

-- List all policies on a table
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE tablename = 'your_table';

-- Test a policy (run as specific user)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM your_table;
```

### Index Verification

```sql
-- Check if indexes exist
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'orders';

-- Check index usage
SELECT relname, idx_scan, seq_scan
FROM pg_stat_user_tables WHERE relname = 'orders';
-- idx_scan should be > seq_scan for indexed queries
```

### Migration Issues

| Issue | Solution |
|-------|----------|
| Migration skipped | Check filename format: `YYYYMMDDHHMMSS_description.sql` |
| Migration failed partway | Fix error, create new migration with remaining changes |
| Need to undo migration | Create new migration with `DROP` or `ALTER` statements |
| Types out of sync | Run `npm run supabase:types` to regenerate |

---

## Version History

### Version 2.1 (February 2026)
**Changes**:
- Added Quick Reference section with table dependencies
- Added Troubleshooting section with common errors
- Added RLS debugging guide
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- ✅ Changed migration naming from sequential to descriptive format
- ✅ Increased migration count from 13 to 21 files
- ✅ Added 4 new tables: promo_codes, order_events, kitchen_stations, bir_receipt_config
- ✅ Enhanced orders table: expires_at, version, promo_code_id, guest_phone, deleted_at
- ✅ Enhanced menu_items table: allergens, nutritional_info, translations, deleted_at
- ✅ Replaced order number generation with PostgreSQL sequence (race-condition safe)
- ✅ Added performance indexes migration
- ✅ Added Realtime migration
- ✅ Added Storage buckets migration
- ✅ Documented soft delete pattern
- ✅ Updated Supabase client naming (createServerClient)
- ✅ Added optimistic locking pattern
- ✅ Added auto-cancel expired orders function

### Version 1.0 (February 2, 2026)
- Initial database schema document

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.1
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.0
- **[PHASE-1-GUIDE.md](../phases/PHASE-1-GUIDE.md)** — Phase 1 Implementation Guide
