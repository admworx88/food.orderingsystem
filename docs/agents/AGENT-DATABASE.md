# Agent: Database & Infrastructure
# Scope: Supabase schema, migrations, RLS policies, functions

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
│   ├── 001_create_profiles.sql
│   ├── 002_create_categories.sql
│   ├── 003_create_menu_items.sql
│   ├── 004_create_addon_groups.sql
│   ├── 005_create_addon_options.sql
│   ├── 006_create_orders.sql
│   ├── 007_create_order_items.sql
│   ├── 008_create_order_item_addons.sql
│   ├── 009_create_payments.sql
│   ├── 010_create_settings.sql
│   ├── 011_create_rls_policies.sql
│   ├── 012_create_functions.sql
│   └── 013_seed_data.sql
├── seed.sql
└── config.toml

src/lib/supabase/
├── client.ts           # createBrowserClient()
├── server.ts           # createServerClient()
├── admin.ts            # createServiceRoleClient()
├── middleware.ts        # getSession() helper
└── types.ts            # Generated database types
```

---

## Enum Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'kitchen', 'kiosk');
CREATE TYPE order_type AS ENUM ('dine_in', 'room_service', 'takeout');
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'paid', 'preparing', 'ready', 'served', 'cancelled'
);
CREATE TYPE payment_status AS ENUM ('unpaid', 'processing', 'paid', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card');
CREATE TYPE discount_type AS ENUM ('senior', 'pwd', 'promo');
```

---

## Table Schemas

### profiles
```sql
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id, is_available, display_order);
CREATE INDEX idx_menu_items_available ON menu_items(is_available) WHERE is_available = true;
```

### addon_groups
```sql
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

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,         -- Human-readable: A001, A002...
  order_type order_type NOT NULL,
  table_number TEXT,                  -- For dine_in
  room_number TEXT,                   -- For room_service
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type discount_type,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_instructions TEXT,
  estimated_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('served', 'cancelled');
CREATE INDEX idx_orders_payment ON orders(payment_status) WHERE payment_status = 'unpaid';
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

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

### order_items
```sql
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
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, success, failed, refunded
  provider_reference TEXT,            -- PayMongo payment ID
  cash_received DECIMAL(10,2),        -- For cash payments
  change_given DECIMAL(10,2),         -- For cash payments
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(provider_reference)          -- Prevent duplicate webhook processing
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(provider_reference) WHERE provider_reference IS NOT NULL;
```

### settings
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '0.12'),
  ('service_charge_rate', '0.05'),
  ('service_charge_enabled', 'true'),
  ('restaurant_name', '"Hotel Restaurant"'),
  ('currency_symbol', '"₱"'),
  ('idle_timeout_seconds', '120'),
  ('kds_auto_hide_seconds', '30'),
  ('order_number_prefix', '"A"');
```

### audit_log
```sql
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

## Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === PROFILES ===
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (auth.user_role() = 'admin');
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL USING (auth.user_role() = 'admin');

-- === MENU (Read: public, Write: admin) ===
CREATE POLICY "Anyone can read active categories"
  ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access categories"
  ON categories FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Anyone can read available items"
  ON menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Admin full access items"
  ON menu_items FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Anyone can read addon groups"
  ON addon_groups FOR SELECT USING (true);
CREATE POLICY "Admin full access addon groups"
  ON addon_groups FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Anyone can read available addon options"
  ON addon_options FOR SELECT USING (is_available = true);
CREATE POLICY "Admin full access addon options"
  ON addon_options FOR ALL USING (auth.user_role() = 'admin');

-- === ORDERS ===
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Kitchen can read active orders"
  ON orders FOR SELECT USING (
    auth.user_role() IN ('kitchen', 'cashier', 'admin')
  );
CREATE POLICY "Kitchen can update order status"
  ON orders FOR UPDATE USING (
    auth.user_role() IN ('kitchen', 'admin')
  );
CREATE POLICY "Cashier can update payment status"
  ON orders FOR UPDATE USING (
    auth.user_role() IN ('cashier', 'admin')
  );
CREATE POLICY "Admin full access orders"
  ON orders FOR ALL USING (auth.user_role() = 'admin');

-- === ORDER ITEMS ===
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read order items"
  ON order_items FOR SELECT USING (
    auth.user_role() IN ('kitchen', 'cashier', 'admin')
  );

-- === PAYMENTS ===
CREATE POLICY "Cashier can manage payments"
  ON payments FOR ALL USING (
    auth.user_role() IN ('cashier', 'admin')
  );

-- === SETTINGS ===
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage settings"
  ON settings FOR ALL USING (auth.user_role() = 'admin');
```

---

## Database Functions

### Generate Order Number
```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  today_count INT;
  new_number TEXT;
BEGIN
  SELECT value::text INTO prefix FROM settings WHERE key = 'order_number_prefix';
  prefix := COALESCE(TRIM(BOTH '"' FROM prefix), 'A');
  
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE created_at::date = CURRENT_DATE;
  
  new_number := prefix || LPAD(today_count::text, 3, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
```

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
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(total_amount), 0) FROM orders
      WHERE created_at BETWEEN date_from AND date_to
      AND payment_status = 'paid'
    ),
    'avg_order_value', (
      SELECT COALESCE(AVG(total_amount), 0) FROM orders
      WHERE created_at BETWEEN date_from AND date_to
      AND payment_status = 'paid'
    ),
    'active_orders', (
      SELECT COUNT(*) FROM orders
      WHERE status IN ('paid', 'preparing', 'ready')
    ),
    'orders_by_type', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT order_type, COUNT(*) as count
        FROM orders
        WHERE created_at BETWEEN date_from AND date_to
        AND status != 'cancelled'
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

---

## Key Implementation Notes

1. **Type generation**: After migrations, run `supabase gen types typescript`
   to generate TypeScript types. Commit these to `src/lib/supabase/types.ts`.

2. **Realtime**: Enable realtime on `orders` table in Supabase dashboard.
   Only the `orders` table needs realtime — not order_items or payments.

3. **Indexes**: The partial indexes on `orders` (WHERE status NOT IN...)
   keep the index small and fast for the most common queries.

4. **Cascading deletes**: Order items and addons cascade from orders.
   Menu item references use SET NULL to preserve historical data.

5. **Service role client**: Use the admin/service role client ONLY in
   server actions and API routes. Never expose it to the client.

6. **Connection pooling**: For production, use Supabase's connection
   pooler (port 6543) instead of direct connections (port 5432).
