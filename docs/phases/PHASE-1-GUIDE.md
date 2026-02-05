# Phase 1 — Foundation: Step-by-Step Implementation Guide

> **Version**: 2.1 | **Last Updated**: February 2026 | **Status**: Updated for PRD v1.2

**Scope**: Project configuration, database schema with security enhancements, authentication, Supabase clients, validators, menu CRUD with image upload, kiosk shell.

---

## Quick Reference

### Phase 1 Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 1 | Project Configuration Files | ⬜ |
| 2 | Supabase Client Setup | ⬜ |
| 3 | Database Migrations (21 files) | ⬜ |
| 4 | Auth Middleware | ⬜ |
| 5 | Route Group Layouts | ⬜ |
| 6 | Shared Types & Validators | ⬜ |
| 6.5 | Zod Validators | ⬜ |
| 7 | Admin Menu CRUD | ⬜ |
| 8 | Kiosk Menu Display | ⬜ |

### Key Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run type-check             # TypeScript validation

# Supabase
npx supabase start             # Start local Supabase
npx supabase migration list    # Check applied migrations
npm run supabase:push          # Apply migrations
npm run supabase:types         # Regenerate types

# Verification
npx supabase db reset          # Reset local DB (dev only!)
psql $DATABASE_URL -c "\dt"    # List all tables
```

### Critical Files to Create

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/supabase/admin.ts` | Admin client (webhooks only) |
| `src/middleware.ts` | Auth + role-based routing |
| `src/services/menu-service.ts` | Menu CRUD Server Actions |
| `supabase/migrations/*.sql` | 21 migration files |

---

## Pre-Flight Checklist

Before starting, confirm you have these in place:

```bash
# Verify your setup
node -v                    # Should be 20.9+
npm -v                     # Any recent version
npm run dev                # Should start without errors on localhost:3000
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
npm install clsx tailwind-merge
```

**Initialize shadcn/ui:**
```bash
npx shadcn@latest init
```
Choose: New York style, Zinc base color, CSS variables = yes.
Then add the components you'll need first:
```bash
npx shadcn@latest add button card input sheet dialog badge toast tabs
```

✅ **Checkpoint:** `npm run dev` runs, you see the default Next.js page with Tailwind working.

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
// npm run supabase:types
// For now, use this placeholder:
export type Database = Record<string, never>;
```

Install Supabase SSR helper:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

✅ **Checkpoint:** No import errors. `npm run type-check` passes.

---

### Step 3: Database Migrations

This is the big one. Create each migration file in `supabase/migrations/`.
Refer to `docs/agents/AGENT-DATABASE.md` for the FULL SQL — copy each table
schema from there into the corresponding migration file.

**Migration Naming Convention:**
`YYYYMMDDHHMMSS_description.sql`

**IMPORTANT:** Supabase requires timestamps in `YYYYMMDDHHMMSS` format at the start of the filename.

Where:
- `YYYYMMDDHHMMSS` = timestamp (e.g., `20260205140800` for Feb 5, 2026 at 14:08:00)
- `description` = descriptive name (e.g., `enums_schema`, `orders_schema`, `all_tables_rls_security`)

**Examples:**
- `20260205140000_enums_schema.sql` ✅ Correct
- `20260205140800_orders_schema.sql` ✅ Correct
- `enums_schema_05022026_140000.sql` ❌ Wrong (will be skipped by Supabase CLI)

**The order is critical (foreign key dependencies):**

```
supabase/migrations/
├── 20260205140000_enums_schema.sql                      ← user_role, order_type, order_status, payment_status, payment_method, discount_type
├── 20260205140100_profiles_schema.sql                   ← extends auth.users with role, pin_code
├── 20260205140200_categories_schema.sql                 ← menu categories
├── 20260205140300_menu_items_schema.sql                 ← depends on categories (includes allergens, nutritional_info, translations, deleted_at)
├── 20260205140400_addon_groups_schema.sql               ← depends on menu_items
├── 20260205140500_addon_options_schema.sql              ← depends on addon_groups
├── 20260205140600_order_number_functions_schema.sql     ← sequence + generate_order_number() function (race-condition safe)
├── 20260205140700_promo_codes_schema.sql                ← discount/coupon management (NEW in PRD v1.1)
├── 20260205140800_orders_schema.sql                     ← includes expires_at, version, promo_code_id, guest_phone, deleted_at
├── 20260205140900_order_items_schema.sql                ← depends on orders + menu_items
├── 20260205141000_order_item_addons_schema.sql          ← depends on order_items + addon_options
├── 20260205141100_payments_schema.sql                   ← depends on orders + profiles
├── 20260205141200_order_events_schema.sql               ← analytics tracking (NEW in PRD v1.1)
├── 20260205141300_kitchen_stations_schema.sql           ← multi-station routing (NEW in PRD v1.1)
├── 20260205141400_bir_receipt_config_schema.sql         ← Philippines tax compliance (NEW in PRD v1.1)
├── 20260205141500_settings_schema.sql                   ← system config (tax_rate, service_charge, timeout settings)
├── 20260205141600_audit_log_schema.sql                  ← audit trail for all actions
├── 20260205141700_menu_images_buckets_storage.sql       ← Supabase Storage bucket + policies
├── 20260205141800_all_tables_indexes_performance.sql    ← performance indexes (CRITICAL for scale)
├── 20260205141900_orders_realtime.sql                   ← enable Realtime publication for orders table
├── 20260205142000_all_tables_rls_security.sql           ← RLS for ALL tables (includes soft delete checks)
└── 20260205142100_system_seed_data.sql                  ← default settings, sample categories, admin user
```

**Benefits of this naming convention:**
- ✅ **Descriptive**: Instantly know what table/feature is affected
- ✅ **Sortable**: Chronological order by timestamp
- ✅ **Team-friendly**: No merge conflicts on migration numbers
- ✅ **Searchable**: Easy to find migrations by table name or type
- ✅ **Clear intent**: `_rls`, `_schema`, `_functions` makes purpose obvious

**Critical Migration Examples:**

**order_number_functions.140600.sql** — Order number generation (prevents race conditions):
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

**menu_images_buckets.141700.sql** — Supabase Storage bucket:
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

**all_tables_indexes.141800.sql** — Performance indexes (CRITICAL):
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

**20260205141900_orders_realtime.sql141900.sql** — Realtime for orders table:
```sql
-- Migration: Enable Realtime for orders table
-- Created: 2026-02-05 14:19:00
-- Author: System
-- Purpose: Allow Kitchen Display to receive live order updates

-- Enable Realtime replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

COMMENT ON TABLE orders IS 'Orders table with Realtime enabled for kitchen display updates';
```

**system_seed.142100.sql** — Essential settings:
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
npm run supabase:push

# Generate TypeScript types
npm run supabase:types
```

✅ **Checkpoint (Enhanced):** Verify the following:
```bash
# 1. All 21 migration files applied (check naming convention)
npx supabase migration list --linked
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

✅ **Checkpoint:** All imports resolve. `npm run type-check` clean.

---

### Step 6.5: Zod Validators (Input Validation)

Before building Server Actions, create Zod schemas for type-safe validation.

Install Zod:
```bash
npm install zod
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

### Step 7: Admin Menu CRUD (Server Actions + Full CRUD Forms)

This is where real functionality starts. Build the complete admin menu management
with create, edit, delete forms so you have data to display on the kiosk.

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

**2. Create Admin UI Components**

Build these components for complete CRUD functionality:

**src/components/admin/create-menu-item-dialog.tsx** — Dialog with form for creating menu items
**src/components/admin/edit-menu-item-dialog.tsx** — Dialog for editing existing menu items
**src/components/admin/delete-menu-item-dialog.tsx** — Confirmation dialog for deletion
**src/components/admin/menu-item-form.tsx** — Reusable form component with image upload
**src/components/admin/category-form-dialog.tsx** — Dialog for creating/editing categories

**3. src/app/(admin)/menu-management/page.tsx** — Complete admin page:

```typescript
import { getCategories, getMenuItems } from '@/services/menu-service';
import { CreateMenuItemDialog } from '@/components/admin/create-menu-item-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';

export default async function MenuManagementPage() {
  const [categoriesResult, menuItemsResult] = await Promise.all([
    getCategories(),
    getMenuItems(),
  ]);

  if (!categoriesResult.success || !menuItemsResult.success) {
    return <div>Failed to load menu data</div>;
  }

  const categories = categoriesResult.data || [];
  const menuItems = menuItemsResult.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Menu Management</h1>
        <CreateMenuItemDialog categories={categories} />
      </div>

      {/* Categories section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Categories ({categories.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>Order: {category.display_order}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Menu items section with edit/delete actions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Menu Items ({menuItems.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Card key={item.id}>
              {/* Item card with edit/delete buttons */}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**4. Add Server Actions for full CRUD**

Update `src/services/menu-service.ts` with:
- `updateMenuItem(id, input)` - Update existing menu item
- `deleteMenuItem(id)` - Soft delete (set deleted_at)
- `createCategory(input)` - Create category
- `updateCategory(id, input)` - Update category
- `deleteCategory(id)` - Delete category

**5. Seed test data** — Already in migration 20260205142100_system_seed_data.sql

✅ **Checkpoint:**
- Admin page at `/admin/menu-management` shows categories and items
- **CREATE**: Dialog opens to add new menu items with image upload
- **READ**: Categories and menu items display with all details
- **UPDATE**: Click edit button opens pre-filled form
- **DELETE**: Delete button shows confirmation dialog
- Image upload works and stores in Supabase Storage
- Menu item images display with public URLs
- All forms validate with Zod schemas
- Success/error toasts show feedback

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
- [ ] Admin can create categories via dialog form
- [ ] Admin can edit categories via dialog form
- [ ] Admin can delete categories with confirmation
- [ ] Admin can create menu items via dialog with image upload
- [ ] Admin can edit menu items via dialog with image upload
- [ ] Admin can delete menu items with confirmation (soft delete)
- [ ] Image upload working (Supabase Storage with validation)
- [ ] Menu item images display with public URLs
- [ ] Availability toggle working (instant update)
- [ ] All forms validate with Zod schemas
- [ ] Success/error toasts provide user feedback
- [ ] Soft delete preserves historical data in orders

**Kiosk Functionality:**
- [ ] Kiosk displays menu categories
- [ ] Kiosk displays menu items with images
- [ ] Prices formatted as ₱ (Philippine Peso)
- [ ] Menu data filtered by `is_available = true AND deleted_at IS NULL`

**Build & Type Checks:**
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run type-check` passes with strict mode
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
20260205140800_orders_schema.sql143045.sql      ← Create orders table
orders_rls.143102.sql         ← Add RLS policies for orders
orders_indexes.143215.sql     ← Add performance indexes
orders_functions.143348.sql   ← Order-related functions (e.g., auto-cancel expired)
menu_images_buckets.150023.sql ← Storage bucket setup
system_seed.160512.sql        ← Seed default settings
```

**How to generate migration filename**:
```bash
# Bash function for quick migration naming (Supabase-compatible format)
create_migration() {
  local description=$1
  local timestamp=$(date +"%Y%m%d%H%M%S")
  local filename="${timestamp}_${description}.sql"
  echo "Creating: supabase/migrations/$filename"
  touch "supabase/migrations/$filename"
}

# Usage:
create_migration "orders_schema"           # 20260205140800_orders_schema.sql
create_migration "menu_items_rls"          # 20260205141500_menu_items_rls.sql
create_migration "all_tables_indexes_performance"  # 20260205142000_all_tables_indexes_performance.sql
```

**Why this format?**
- **Maximum uniqueness**: Seconds precision prevents conflicts even when creating multiple migrations rapidly
- **No conflicts**: Timestamps ensure unique filenames across team
- **Self-documenting**: Table + type makes purpose clear at a glance
- **Natural ordering**: Files sort chronologically by timestamp
- **Easy searching**: `ls *orders*` shows all orders-related migrations
- **Team-friendly**: No merge conflicts on sequential numbers

---

## Troubleshooting Guide

### Common Phase 1 Errors

#### Configuration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module 'tailwind-merge'` | Missing dependency | Run `npm install clsx tailwind-merge` |
| `PostCSS plugin tailwindcss requires PostCSS 8` | Wrong PostCSS plugin | Use `@tailwindcss/postcss` in `postcss.config.mjs` |
| `@tailwind directive not supported` | Tailwind v3 syntax in v4 | Use `@import "tailwindcss"` instead |
| `Cannot resolve @/lib/...` | Path alias issue | Check `tsconfig.json` has `"@/*": ["./src/*"]` in paths |

#### Supabase Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "xxx" does not exist` | Missing migration | Run `npm run supabase:push` |
| `permission denied for table xxx` | RLS blocking access | Check RLS policies in `AGENT-DATABASE.md` |
| `SUPABASE_URL is not defined` | Missing env vars | Check `.env.local` has all required values |
| `JWT expired` | Stale auth session | Clear cookies, re-login |
| `duplicate key value violates unique constraint` | Duplicate data | Check for existing records before insert |

#### Auth/Middleware Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Redirect loop on /login` | Auth check failing | Verify Supabase anon key is correct |
| `Cannot destructure property 'user'` | Async auth call | Ensure `await supabase.auth.getUser()` |
| `profile is null` | User exists but no profile | Create profile in `profiles` table |
| `userRole is undefined` | Profile query failed | Check RLS allows profile reads |

#### Build Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Type 'X' is not assignable to type 'Y'` | Type mismatch | Regenerate types: `npm run supabase:types` |
| `Module has no exported member` | Outdated imports | Check export names in source files |
| `params is not a Promise` | Next.js 16 change | Add `await` before accessing params |
| `'use client' must be first` | Directive placement | Move `'use client'` to line 1 |

### Verification Commands

After each step, run these to verify your work:

```bash
# Step 1: Configuration
npm run dev  # Should start without errors

# Step 2: Supabase Clients
npm run type-check  # Should pass with no errors

# Step 3: Migrations
npx supabase migration list --linked  # Should show 21 applied
psql $DATABASE_URL -c "SELECT generate_order_number();"  # Should return A0001

# Step 4: Middleware
curl -I http://localhost:3000/admin  # Should redirect to /login (302)

# Step 5: Route Groups
curl -I http://localhost:3000/menu  # Should return 200

# Step 6-7: Admin CRUD
npm run build  # Should succeed with no errors
```

### Debug Checklist

If something isn't working, check these in order:

1. **Environment variables**: Are all Supabase keys in `.env.local`?
2. **Dependencies**: Run `npm install` to ensure all packages installed
3. **Types**: Run `npm run supabase:types` to regenerate DB types
4. **Migrations**: Run `npx supabase migration list` to verify all applied
5. **RLS policies**: Check table has correct RLS in Supabase Dashboard
6. **Console errors**: Check browser DevTools and terminal for errors
7. **Build**: Run `npm run build` to catch TypeScript errors

---

## Common Gotchas

### 1. Server Client Naming

```typescript
// WRONG - imports collide
import { createServerClient } from "@supabase/ssr";
import { createServerClient } from "@/lib/supabase/server"; // Name collision!

// RIGHT - our wrapper has unique name
import { createServerClient as createServerSupabase } from "@supabase/ssr";
// Our file exports createServerClient() - no collision
```

### 2. Async Params in Next.js 16

```typescript
// WRONG - will throw runtime error
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id; // TypeError!
}

// RIGHT - params is async in Next.js 16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### 3. Client vs Server Components

```typescript
// WRONG - hooks in Server Component
export default async function MenuPage() {
  const [items, setItems] = useState([]);  // Error! No hooks in Server Components
}

// RIGHT - Server Components fetch directly
export default async function MenuPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.from('menu_items').select('*');
  return <MenuGrid items={data} />;
}
```

### 4. RLS and Anonymous Access

```sql
-- WRONG - blocks anonymous kiosk users
CREATE POLICY "Authenticated read menu"
ON menu_items FOR SELECT
USING (auth.role() = 'authenticated');

-- RIGHT - allows anonymous kiosk users
CREATE POLICY "Public read active menu"
ON menu_items FOR SELECT
USING (is_available = true AND deleted_at IS NULL);
```

### 5. Image Upload File Validation

```typescript
// WRONG - no validation
const file = formData.get('image') as File;
await supabase.storage.from('menu-images').upload(path, file);

// RIGHT - validate type and size
const file = formData.get('image') as File;
if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
  throw new Error('Invalid file type');
}
if (file.size > 2 * 1024 * 1024) {
  throw new Error('File too large');
}
await supabase.storage.from('menu-images').upload(path, file);
```

### 6. Soft Delete Filtering

```typescript
// WRONG - shows deleted items
const { data } = await supabase.from('menu_items').select('*');

// RIGHT - filter out soft-deleted
const { data } = await supabase
  .from('menu_items')
  .select('*')
  .is('deleted_at', null);  // Only show non-deleted items
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Migration** | SQL file that changes database schema |
| **RLS** | Row Level Security - Postgres access control |
| **Server Component** | React component rendered on server (no hooks) |
| **Client Component** | React component with `'use client'` (has hooks) |
| **Server Action** | `'use server'` function called from client |
| **Soft Delete** | Setting `deleted_at` instead of removing row |
| **Route Group** | Next.js `(folder)` syntax for grouping routes |
| **shadcn/ui** | Component library used for UI primitives |
| **Zustand** | Client state management library (Phase 2) |
| **Zod** | TypeScript-first validation library |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | Feb 2026 | Added Quick Reference, Troubleshooting Guide, Common Gotchas, Glossary |
| 2.0 | Feb 2026 | Updated for PRD v1.1 - 21 migrations, enhanced security |
| 1.0 | Feb 2026 | Initial Phase 1 guide |

---

## Related Documents

- [PRD.md](../prd/PRD.md) — Product Requirements Document
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) — System Architecture
- [AGENT-DATABASE.md](../agents/AGENT-DATABASE.md) — Complete SQL schema
- [CLAUDE.md](../../CLAUDE.md) — Development guidelines
