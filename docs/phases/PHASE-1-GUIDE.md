# Phase 1 — Foundation: Step-by-Step Implementation Guide
# Status: Ready to Start
# Duration: ~2 weeks
# Scope: Project config, DB schema, Auth, Supabase clients, basic menu CRUD, kiosk shell

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

export async function createClient() {
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

The order is critical (foreign key dependencies):

```
supabase/migrations/
├── 001_create_enums.sql            ← user_role, order_type, order_status, etc.
├── 002_create_profiles.sql         ← depends on auth.users
├── 003_create_categories.sql
├── 004_create_menu_items.sql       ← depends on categories
├── 005_create_addon_groups.sql     ← depends on menu_items
├── 006_create_addon_options.sql    ← depends on addon_groups
├── 007_create_orders.sql
├── 008_create_order_items.sql      ← depends on orders + menu_items
├── 009_create_order_item_addons.sql ← depends on order_items + addon_options
├── 010_create_payments.sql         ← depends on orders + profiles
├── 011_create_settings.sql
├── 012_create_audit_log.sql
├── 013_create_rls_policies.sql     ← RLS for ALL tables
├── 014_create_functions.sql        ← generate_order_number, dashboard stats
└── 015_seed_data.sql               ← Default settings, sample categories
```

After creating all migration files:
```bash
# Push to your Supabase project
pnpm supabase db push

# Generate TypeScript types
pnpm supabase gen types typescript --linked > src/lib/supabase/types.ts
```

Also go to Supabase Dashboard → Database → Replication and **enable Realtime
for the `orders` table**. Only this table needs it.

✅ **Checkpoint:** All tables visible in Supabase Table Editor. Types generated. No SQL errors.

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

  // Role-based access check
  if (path.startsWith("/orders") || path.startsWith("/kitchen")) {
    // Kitchen + Admin can access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["kitchen", "admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (path.startsWith("/payments") || path.startsWith("/cashier")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["cashier", "admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
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

Create placeholder pages for each route group:
```
src/app/(kiosk)/page.tsx          → "Welcome to OrderFlow" + "Start Order" button
src/app/(kitchen)/orders/page.tsx → "Kitchen Display — Coming Soon"
src/app/(cashier)/payments/page.tsx → "Cashier — Coming Soon"
src/app/(admin)/page.tsx          → "Admin Dashboard — Coming Soon"
```

✅ **Checkpoint:** All four routes render their layout. No 404s.

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

### Step 7: Admin Menu CRUD (Server Actions + Basic UI)

This is where real functionality starts. Build the admin menu management
so you have data to display on the kiosk.

1. **src/services/menu-service.ts** — Server Actions for:
   - `getCategories()` — fetch all categories
   - `createCategory(formData)` — insert new category
   - `updateCategory(id, formData)` — update existing
   - `deleteCategory(id)` — soft delete (set is_active = false)
   - `getMenuItems(categoryId?)` — fetch items with addons
   - `createMenuItem(formData)` — insert new item
   - `updateMenuItem(id, formData)` — update existing
   - `toggleItemAvailability(id)` — quick toggle

2. **src/app/(admin)/menu-management/page.tsx** — Admin page that:
   - Lists categories with edit/delete
   - Lists menu items per category
   - Has "Add Category" and "Add Item" dialogs
   - Has availability toggle switches

3. **Seed some test data** via the Supabase dashboard or a seed migration:
   - 4-5 categories (Rice Meals, Soups, Desserts, Beverages, Specials)
   - 3-4 items per category with prices in PHP
   - A couple addon groups (Size: Regular/Large, Extras: Extra Rice)

✅ **Checkpoint:** Admin page at `/admin/menu-management` shows categories and items.
    You can create, edit, and toggle availability.

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

- [ ] Tailwind v4 + shadcn/ui rendering correctly
- [ ] Supabase clients (browser, server, admin) all working
- [ ] All database tables created with RLS policies
- [ ] TypeScript types generated from schema
- [ ] Auth middleware protecting staff routes
- [ ] Four route group layouts rendering
- [ ] Admin can CRUD menu categories and items
- [ ] Kiosk displays the menu (read-only)
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm type-check` passes clean

---

## What Comes Next (Phase 2 Preview)

Phase 2 is where it gets exciting — the ordering flow:
- Zustand cart store with add/remove/quantity
- Item detail sheet with addon selection
- Cart page with order type selector (dine-in/room/takeout)
- Order submission via Server Action
- Kitchen Display System with Supabase Realtime
- Order status workflow (New → Preparing → Ready → Served)
