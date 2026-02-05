# Phase 1 — Foundation: Step-by-Step Implementation Guide
# Status: Updated for PRD v1.1
# Duration: 2-3 weeks (realistic for solo dev, 1.5-2 weeks for team)
# Scope: Project config, DB schema with security enhancements, Auth, Supabase clients, validators, menu CRUD with image upload, kiosk shell

---

## Pre-Flight Checklist

Before starting, confirm you have these in place:

```bash
# Verify your setup
node -v                    # Should be 20.9+
pnpm -v                    # Any recent version
pnpm dev                   # Should start without errors on localhost:3000
```

Your `.env.local` should have these filled in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

If any of these are missing, get them from your Supabase project dashboard
(Settings → API).

---

## Step-by-Step Build Order

The order matters. Each step depends on the previous one.

---

### Step 1: Project Configuration Files

Create these configuration files at the project root.

**postcss.config.mjs** — Tailwind v4 PostCSS plugin
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**src/app/globals.css** — Tailwind v4 CSS-first config
```css
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a5f;

  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-danger: #ef4444;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

@variant dark (&:where(.dark, .dark *));
```

**src/lib/utils/cn.ts** — Class name utility (needed by shadcn/ui)
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install the utility deps if not already:
```bash
pnpm add clsx tailwind-merge
```

**Initialize shadcn/ui:**
```bash
pnpm dlx shadcn@latest init
```
Choose: New York style, Zinc base color, CSS variables = yes.
Then add the components you'll need first:
```bash
pnpm dlx shadcn@latest add button card input sheet dialog badge toast tabs
```

✅ **Checkpoint:** `pnpm dev` runs, you see the default Next.js page with Tailwind working.

---

### Step 2: Supabase Client Setup

Create the three Supabase client factories. This is foundational — everything else depends on it.

**src/lib/supabase/client.ts** — Browser client (client components)
```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**src/lib/supabase/server.ts** — Server client (Server Components + Actions)
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can't set cookies from Server Components — this is expected
          }
        },
      },
    }
  );
}
```

**src/lib/supabase/admin.ts** — Service role client (webhooks ONLY)
```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**⚠️ IMPORTANT**: Use `createServerClient()` (not `createClient()`) when importing from `server.ts` to avoid name collisions.

**src/lib/supabase/types.ts** — Placeholder (will be generated after migrations)
```typescript
// This file will be auto-generated after running:
// pnpm supabase gen types typescript --linked > src/lib/supabase/types.ts
// For now, use this placeholder:
export type Database = Record<string, never>;
```

Install Supabase SSR helper:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

✅ **Checkpoint:** No import errors. `pnpm type-check` passes.

---

### Step 3: Database Migrations

This is the big one. Create each migration file in `supabase/migrations/`.
Refer to `docs/agents/AGENT-DATABASE.md` for the FULL SQL — copy each table
schema from there into the corresponding migration file.

**Migration Naming Convention:**
`{table_name}_{type}_{DDMMYYYY}_{HHMMSS}.sql`

Where:
- `table_name` = affected table or feature (e.g., `enums`, `profiles`, `orders`)
- `type` = change type: `schema`, `rls`, `functions`, `buckets`, `indexes`, `seed`
- `DDMMYYYY` = date (e.g., `05022026` for Feb 5, 2026)
- `HHMMSS` = time in 24h format (e.g., `143045` for 2:30:45 PM)

**Example**: `orders_schema_05022026_143045.sql`

**The order is critical (foreign key dependencies):**

```
supabase/migrations/
├── enums_schema_05022026_140000.sql              ← user_role, order_type, order_status, payment_status, payment_method, discount_type
├── profiles_schema_05022026_140100.sql           ← extends auth.users with role, pin_code
├── categories_schema_05022026_140200.sql         ← menu categories
├── menu_items_schema_05022026_140300.sql         ← depends on categories (includes allergens, nutritional_info, translations, deleted_at)
├── addon_groups_schema_05022026_140400.sql       ← depends on menu_items
├── addon_options_schema_05022026_140500.sql      ← depends on addon_groups
├── order_number_functions_05022026_140600.sql    ← sequence + generate_order_number() function (race-condition safe)
├── promo_codes_schema_05022026_140700.sql        ← discount/coupon management (NEW in PRD v1.1)
├── orders_schema_05022026_140800.sql             ← includes expires_at, version, promo_code_id, guest_phone, deleted_at
├── order_items_schema_05022026_140900.sql        ← depends on orders + menu_items
├── order_item_addons_schema_05022026_141000.sql  ← depends on order_items + addon_options
├── payments_schema_05022026_141100.sql           ← depends on orders + profiles
├── order_events_schema_05022026_141200.sql       ← analytics tracking (NEW in PRD v1.1)
├── kitchen_stations_schema_05022026_141300.sql   ← multi-station routing (NEW in PRD v1.1)
├── bir_receipt_config_schema_05022026_141400.sql ← Philippines tax compliance (NEW in PRD v1.1)
├── settings_schema_05022026_141500.sql           ← system config (tax_rate, service_charge, timeout settings)
├── audit_log_schema_05022026_141600.sql          ← audit trail for all actions
├── menu_images_buckets_05022026_141700.sql       ← Supabase Storage bucket + policies
├── all_tables_indexes_05022026_141800.sql        ← performance indexes (CRITICAL for scale)
├── orders_realtime_05022026_141900.sql           ← enable Realtime publication for orders table
├── all_tables_rls_05022026_142000.sql            ← RLS for ALL tables (includes soft delete checks)
└── system_seed_05022026_142100.sql               ← default settings, sample categories, admin user
```

**Benefits of this naming convention:**
- ✅ **Descriptive**: Instantly know what table/feature is affected
- ✅ **Sortable**: Chronological order by timestamp
- ✅ **Team-friendly**: No merge conflicts on migration numbers
- ✅ **Searchable**: Easy to find migrations by table name or type
- ✅ **Clear intent**: `_rls`, `_schema`, `_functions` makes purpose obvious

**Critical Migration Examples:**

**order_number_functions_05022026_140600.sql** — Order number generation (prevents race conditions):
```sql
-- Migration: Order number sequence and function
-- Created: 2026-02-05 14:06:00
-- Author: System
-- Purpose: Thread-safe order number generation

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

-- Optional: Daily reset function (run via cron at midnight)
COMMENT ON SEQUENCE order_number_seq IS 'Auto-incrementing sequence for daily order numbers. Reset daily via cron.';
```

**menu_images_buckets_05022026_141700.sql** — Supabase Storage bucket:
```sql
-- Migration: Menu images storage bucket
-- Created: 2026-02-05 14:17:00
-- Author: System
-- Purpose: Create public storage bucket for menu item images

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

**all_tables_indexes_05022026_141800.sql** — Performance indexes (CRITICAL):
```sql
-- Migration: Performance indexes for all tables
-- Created: 2026-02-05 14:18:00
-- Author: System
-- Purpose: Optimize query performance for high-traffic tables

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

**orders_realtime_05022026_141900.sql** — Realtime for orders table:
```sql
-- Migration: Enable Realtime for orders table
-- Created: 2026-02-05 14:19:00
-- Author: System
-- Purpose: Allow Kitchen Display to receive live order updates

-- Enable Realtime replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

COMMENT ON TABLE orders IS 'Orders table with Realtime enabled for kitchen display updates';
```

**system_seed_05022026_142100.sql** — Essential settings:
```sql
-- System settings (required for order calculations)
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '0.12'),
  ('service_charge', '0.10'),
  ('unpaid_order_timeout_minutes', '15'),
  ('order_grace_period_minutes', '5'),
  ('operating_hours', '{"open": "06:00", "close": "23:00"}');

-- Sample categories
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Rice Meals', 'rice-meals', 'Filipino rice meals and combos', 1, true),
  ('Soups', 'soups', 'Hot soups and broths', 2, true),
  ('Desserts', 'desserts', 'Sweet treats', 3, true),
  ('Beverages', 'beverages', 'Drinks hot and cold', 4, true);
```

After creating all migration files:
```bash
# Push to your Supabase project
pnpm supabase db push

# Generate TypeScript types
pnpm supabase gen types typescript --linked > src/lib/supabase/types.ts
```

✅ **Checkpoint (Enhanced):** Verify the following:
```bash
# 1. All 21 migration files applied (check naming convention)
pnpm supabase migration list --linked
# Expected output should show migrations in format: tablename_type_DDMMYYYY_HHMMSS.sql

# 2. Verify all tables exist
psql $DATABASE_URL -c "\dt" | grep -E 'profiles|categories|menu_items|orders|payments|promo_codes|order_events|kitchen_stations|bir_receipt_config|settings|audit_log'

# 3. Verify order number generation works
# In Supabase SQL Editor, run:
SELECT generate_order_number();  -- Should return "A0001"
SELECT generate_order_number();  -- Should return "A0002"
SELECT generate_order_number();  -- Should return "A0003"

# 4. Verify indexes created (should see ~15+ indexes)
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

# 5. Verify RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- All tables should show rowsecurity = true

# 6. Verify Realtime enabled for orders
SELECT schemaname, tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- Should show: public | orders

# 7. Verify Storage bucket created
SELECT id, name, public FROM storage.buckets WHERE id = 'menu-images';
-- Should return: menu-images | menu-images | true

# 8. Verify settings seeded (should have 5 settings)
SELECT key, value FROM settings ORDER BY key;
-- Should show: tax_rate, service_charge, unpaid_order_timeout_minutes, etc.

# 9. Verify sample categories seeded
SELECT name, slug FROM categories ORDER BY display_order;
-- Should show: Rice Meals, Soups, Desserts, Beverages

# 10. No SQL errors in migration logs
tail -n 100 ~/.supabase/logs/migrations.log
```

**Migration File Checklist:**
- [ ] 21 migration files created with correct naming format
- [ ] Each file has header comment (created date, author, purpose)
- [ ] Migrations use `IF NOT EXISTS` or `ON CONFLICT` where applicable
- [ ] All FK constraints defined correctly
- [ ] Soft delete pattern (`deleted_at`) on menu_items, orders
- [ ] Timestamps (`created_at`, `updated_at`) on all tables

---

### Step 4: Auth Middleware (Role-Based Routing)

**src/middleware.ts** (or `proxy.ts` if you prefer Next.js 16 naming)
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Kiosk routes are public — no auth needed
  if (path.startsWith("/menu") || path.startsWith("/cart") ||
      path.startsWith("/checkout") || path.startsWith("/confirmation") ||
      path === "/") {
    return supabaseResponse;
  }

  // All staff routes require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Fetch user role ONCE (not 3 times!) — performance optimization
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || null;

  // Role-based access checks
  if (path.startsWith("/orders") || path.startsWith("/kitchen")) {
    if (!userRole || !["kitchen", "admin"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (path.startsWith("/payments") || path.startsWith("/cashier")) {
    if (!userRole || !["cashier", "admin"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (path.startsWith("/admin")) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

✅ **Checkpoint:** Unauthenticated access to `/admin` redirects to `/login`.

---

### Step 5: Route Group Layouts

Create the four layout shells. These don't need full UI yet — just the structure.

**src/app/layout.tsx** — Root layout
```typescript
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"; // or your toast component
import "./globals.css";

export const metadata: Metadata = {
  title: "OrderFlow — Hotel Restaurant",
  description: "Self-service ordering system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**src/app/(kiosk)/layout.tsx** — Fullscreen, no nav
```typescript
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      {children}
    </div>
  );
}
```

**src/app/(kitchen)/layout.tsx** — Dark theme, fullscreen
```typescript
export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-dvh bg-gray-950 text-white">
      {children}
    </div>
  );
}
```

**src/app/(cashier)/layout.tsx** — POS layout
```typescript
export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b px-6 py-3 font-semibold">Cashier</header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**src/app/(admin)/layout.tsx** — Sidebar nav
```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <nav className="space-y-2">
          <p className="font-bold text-lg">OrderFlow Admin</p>
          {/* Sidebar links will go here */}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

**src/app/login/page.tsx** — Staff login page (referenced by middleware)
```typescript
'use client'
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      router.push('/admin');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OrderFlow Staff Login</CardTitle>
          <CardDescription>Enter your credentials to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**src/app/unauthorized/page.tsx** — Unauthorized access page
```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}
```

Create placeholder pages for each route group:
```
src/app/(kiosk)/page.tsx          → "Welcome to OrderFlow" + "Start Order" button
src/app/(kitchen)/orders/page.tsx → "Kitchen Display — Coming Soon"
src/app/(cashier)/payments/page.tsx → "Cashier — Coming Soon"
src/app/(admin)/page.tsx          → "Admin Dashboard — Coming Soon"
```

✅ **Checkpoint:** All routes render correctly. Login page works. Unauthorized access redirects properly.

---

### Step 6: Shared Types & Validators

**src/types/order.ts**
```typescript
export type OrderType = "dine_in" | "room_service" | "takeout";
export type OrderStatus = "pending_payment" | "paid" | "preparing" | "ready" | "served" | "cancelled";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "refunded";
export type PaymentMethod = "cash" | "gcash" | "card";
export type UserRole = "admin" | "cashier" | "kitchen" | "kiosk";
```

**src/lib/utils/currency.ts**
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}
```

**src/lib/constants/order-status.ts**
```typescript
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  served: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};
```

✅ **Checkpoint:** All imports resolve. `pnpm type-check` clean.

---

### Step 6.5: Zod Validators (Input Validation)

Before building Server Actions, create Zod schemas for type-safe validation.

Install Zod:
```bash
pnpm add zod
```

**src/lib/validators/menu-item.ts**
```typescript
import { z } from 'zod';

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  category_id: z.string().uuid('Invalid category'),
  base_price: z.number().positive('Price must be positive').max(99999.99),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  preparation_time_minutes: z.number().int().positive().max(300).default(15),
  allergens: z.array(z.string()).optional(),
  nutritional_info: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
```

**src/lib/validators/category.ts**
```typescript
import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(200).optional(),
  display_order: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
```

✅ **Checkpoint:** Validators compile. No type errors.

---

### Step 7: Admin Menu CRUD (Server Actions + Basic UI)

This is where real functionality starts. Build the admin menu management
so you have data to display on the kiosk.

**First: Set up Supabase Storage for menu images**

In Supabase Dashboard → Storage:
1. Create a new bucket called `menu-images`
2. Set to **Public** bucket
3. Add storage policy:
```sql
-- Allow public read access
CREATE POLICY "Public read menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow authenticated users (admin) to upload
CREATE POLICY "Admin upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated'
);
```

**1. src/services/menu-service.ts** — Server Actions with error handling:

```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server';
import { menuItemSchema, categorySchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data;
}

export async function createMenuItem(formData: FormData) {
  try {
    const input = menuItemSchema.parse({
      name: formData.get('name'),
      description: formData.get('description'),
      category_id: formData.get('category_id'),
      base_price: parseFloat(formData.get('base_price') as string),
      is_available: formData.get('is_available') === 'true',
      preparation_time_minutes: parseInt(formData.get('preparation_time_minutes') as string),
    });

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('menu_items')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/menu-management');
    return { success: true, data };
  } catch (error) {
    console.error('createMenuItem failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create menu item'
    };
  }
}

export async function uploadMenuImage(formData: FormData) {
  try {
    const supabase = await createServerClient();
    const file = formData.get('image') as File;

    if (!file) throw new Error('No file provided');

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Use JPG, PNG, or WebP.');
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File too large. Max size is 2MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `menu-items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('uploadMenuImage failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    };
  }
}

export async function toggleItemAvailability(id: string) {
  const supabase = await createServerClient();

  const { data: current } = await supabase
    .from('menu_items')
    .select('is_available')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: !current?.is_available })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/admin/menu-management');
}
```

**2. src/app/(admin)/menu-management/page.tsx** — Admin page with image upload:

```typescript
import { getCategories } from '@/services/menu-service';
import { Button } from '@/components/ui/button';
// ... other imports

export default async function MenuManagementPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Menu Management</h1>
      {/* Category list with add/edit dialogs */}
      {/* Menu items grid with image upload form */}
    </div>
  );
}
```

**3. Seed test data** — Already in migration 021_seed_data.sql

✅ **Checkpoint:**
- Admin page at `/admin/menu-management` shows categories and items
- You can create, edit, and toggle availability
- Image upload works and stores in Supabase Storage
- Menu item images display with public URLs

---

### Step 8: Kiosk Menu Display (Read-Only)

Now wire the kiosk to display the menu data that admin created.

1. **src/app/(kiosk)/menu/page.tsx** — Server Component that:
   - Fetches categories + items from Supabase
   - Renders a category grid
   - Clicking a category shows its items

2. **src/components/kiosk/menu-grid.tsx** — Category cards with images
3. **src/components/kiosk/menu-item-card.tsx** — Item card with name, price, image

✅ **Checkpoint:** Guest can browse the menu at `/menu`. Categories and items display correctly.
    Prices show in ₱ format. Images load from Supabase Storage.

---

## Phase 1 Complete When:

**Configuration & Setup:**
- [ ] Tailwind v4 CSS-first config working (`@import "tailwindcss"`)
- [ ] PostCSS configured with `@tailwindcss/postcss`
- [ ] shadcn/ui components installed and rendering
- [ ] Environment variables set in `.env.local`

**Supabase Setup:**
- [ ] Three Supabase client factories created (client, server, admin)
- [ ] All 21 migration files applied successfully
- [ ] TypeScript types generated from schema
- [ ] Order number sequence generates "A0001", "A0002", etc.
- [ ] Performance indexes created on all critical queries
- [ ] Realtime enabled for `orders` table
- [ ] RLS policies enabled on all tables
- [ ] Soft delete pattern working (deleted_at checks)
- [ ] Supabase Storage bucket `menu-images` created with policies

**Authentication & Security:**
- [ ] Auth middleware protecting staff routes with role checks
- [ ] Login page functional at `/login`
- [ ] Unauthorized page at `/unauthorized`
- [ ] Middleware queries user profile only once (not 3 times)

**Route Groups:**
- [ ] Four route group layouts rendering:
  - [ ] `/(kiosk)` — fullscreen, light theme
  - [ ] `/(kitchen)` — fullscreen, dark theme
  - [ ] `/(cashier)` — POS layout
  - [ ] `/(admin)` — sidebar navigation

**Data Validation:**
- [ ] Zod validators created for menu items and categories
- [ ] Input validation working in Server Actions

**Admin Functionality:**
- [ ] Admin can create, edit, delete categories
- [ ] Admin can create, edit menu items
- [ ] Image upload working (Supabase Storage)
- [ ] Menu item images display with public URLs
- [ ] Availability toggle working (real-time update)
- [ ] Soft delete preserves historical data

**Kiosk Functionality:**
- [ ] Kiosk displays menu categories
- [ ] Kiosk displays menu items with images
- [ ] Prices formatted as ₱ (Philippine Peso)
- [ ] Menu data filtered by `is_available = true AND deleted_at IS NULL`

**Build & Type Checks:**
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm type-check` passes with strict mode
- [ ] No console errors in browser
- [ ] All imports resolve correctly

---

## What Comes Next (Phase 2 Preview)

Phase 2 is where it gets exciting — the ordering flow:
- Zustand cart store with add/remove/quantity
- Item detail sheet with addon selection
- Cart page with order type selector (dine-in/room/takeout)
- Order submission via Server Action with server-side price recalculation
- Kitchen Display System with Supabase Realtime
- Order status workflow (New → Preparing → Ready → Served)
- Order age tracking with color coding

---

## Changelog: Phase 1 Guide v2.0 (Updated for PRD v1.1)

### Major Changes
1. **Migration files increased from 15 → 21**
   - Added `promo_codes`, `order_events`, `kitchen_stations`, `bir_receipt_config` tables
   - Added `order_number_seq` sequence with `generate_order_number()` function
   - Added dedicated `create_indexes.sql` migration
   - Added `enable_realtime.sql` migration (no manual dashboard step)

2. **Orders table enhanced** with:
   - `expires_at` — 15-minute timeout for unpaid orders
   - `version` — optimistic locking for concurrent updates
   - `promo_code_id` — FK to promo_codes table
   - `guest_phone` — for order history lookup
   - `deleted_at` — soft delete pattern

3. **Menu Items table enhanced** with:
   - `allergens` — text array for dietary restrictions
   - `nutritional_info` — JSONB for nutrition facts
   - `translations` — JSONB for multi-language support
   - `deleted_at` — soft delete to preserve order history

4. **Security enhancements**:
   - Middleware optimized to query profile once (not 3 times)
   - Added login page and unauthorized page
   - Added Zod validators before Server Actions
   - Input sanitization in Server Actions

5. **Image upload implementation**:
   - Supabase Storage setup with bucket policies
   - File type and size validation
   - Public URL generation

6. **Enhanced checkpoints**:
   - Specific SQL verification queries
   - Complete checklist with all new requirements
   - Build and type check validation

### Breaking Changes
- Supabase server client now exports `createServerClient()` (not `createClient()`)
- Migration order changed — must apply in correct sequence
- Seed data now required for system to function (settings table)

### Migration Notes
If upgrading from old Phase 1 guide:
1. Run new migrations (use new naming convention)
2. Regenerate TypeScript types
3. Update server client imports to `createServerClient()`
4. Add Zod validators before deploying Server Actions
5. Set up Supabase Storage bucket for images

### Migration Naming Convention Reference

**Format**: `{table_name}_{type}_{DDMMYYYY}_{HHMMSS}.sql`

**Types**:
- `schema` — CREATE TABLE, ALTER TABLE, ADD COLUMN
- `rls` — Row Level Security policies
- `functions` — Functions, triggers, sequences
- `buckets` — Supabase Storage buckets + policies
- `indexes` — CREATE INDEX statements
- `seed` — INSERT initial/test data

**Examples**:
```
orders_schema_05022026_143045.sql      ← Create orders table
orders_rls_05022026_143102.sql         ← Add RLS policies for orders
orders_indexes_05022026_143215.sql     ← Add performance indexes
orders_functions_05022026_143348.sql   ← Order-related functions (e.g., auto-cancel expired)
menu_images_buckets_05022026_150023.sql ← Storage bucket setup
system_seed_05022026_160512.sql        ← Seed default settings
```

**How to generate migration filename**:
```bash
# Bash function for quick migration naming
create_migration() {
  local table=$1
  local type=$2
  local timestamp=$(date +"%d%m%Y_%H%M%S")
  local filename="${table}_${type}_${timestamp}.sql"
  echo "Creating: supabase/migrations/$filename"
  touch "supabase/migrations/$filename"
}

# Usage:
create_migration "orders" "schema"     # orders_schema_05022026_143045.sql
create_migration "menu_items" "rls"    # menu_items_rls_05022026_143102.sql
```

**Why this format?**
- **Maximum uniqueness**: Seconds precision prevents conflicts even when creating multiple migrations rapidly
- **No conflicts**: Timestamps ensure unique filenames across team
- **Self-documenting**: Table + type makes purpose clear at a glance
- **Natural ordering**: Files sort chronologically by timestamp
- **Easy searching**: `ls *orders*` shows all orders-related migrations
- **Team-friendly**: No merge conflicts on sequential numbers
