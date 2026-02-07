# System Architecture Document
# OrderFlow — Hotel Restaurant Web Ordering System

**Version:** 2.3 (Aligned with PRD and actual codebase)
**Date:** February 7, 2026
**Status:** Phase 1 + Kiosk Frontend Complete ✅ — Phase 2 Backend Integration in Progress

---

## Quick Reference

### Architecture at a Glance

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 (App Router) | SSR, Server Components, Server Actions |
| **Styling** | Tailwind CSS v4 | CSS-first configuration |
| **Components** | shadcn/ui | Accessible, composable primitives |
| **Client State** | Zustand | Cart, UI preferences |
| **Database** | Supabase (PostgreSQL) | Data persistence, RLS |
| **Auth** | Supabase Auth | Role-based access control |
| **Realtime** | Supabase Realtime | WebSocket subscriptions |
| **Storage** | Supabase Storage | Menu images |
| **Payments** | PayMongo | GCash, cards (Philippines) |

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server vs Client rendering | Server Components default | Better performance, SEO, data fetching |
| Data mutations | Server Actions | Type-safe, no API boilerplate |
| Caching | Opt-in (`use cache`) | Next.js 16 default is dynamic |
| Module isolation | Route groups | Clear boundaries, separate layouts |
| Real-time updates | Supabase channels | WebSocket-based, filtered by status |

### Data Flow Summary

```
Kiosk → Cart (Zustand) → Server Action → Supabase → Realtime → Kitchen/Cashier
          ↓                   ↓              ↓
       localStorage       Price verify     RLS filter
```

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENTS (Next.js)                         │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  /(kiosk)   │ │ /(kitchen)  │ │/(cashier)│ │  /(admin)    │ │
│  │  Touch UI   │ │  KDS View   │ │ Payments │ │  Dashboard   │ │
│  │  Menu+Cart  │ │  Real-time  │ │ Register │ │  Reports     │ │
│  └──────┬──────┘ └──────┬──────┘ └────┬─────┘ └──────┬───────┘ │
│         │               │              │              │          │
│         └───────────────┴──────────────┴──────────────┘          │
│                              │                                   │
│                   ┌──────────┴──────────┐                        │
│                   │  Zustand (Client)   │                        │
│                   │  Cart, UI State     │                        │
│                   └──────────┬──────────┘                        │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │  Next.js Server Layer   │
                  │  • Server Actions       │
                  │  • API Routes           │
                  │  • Middleware (Auth)     │
                  └────────────┬────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────┴──────┐   ┌────────┴────────┐   ┌───────┴───────┐
   │  Supabase   │   │   Supabase      │   │  PayMongo     │
   │  Database   │   │   Realtime      │   │  (Payments)   │
   │  + Auth     │   │   (WebSocket)   │   │  GCash/Card   │
   │  + Storage  │   │                 │   │               │
   └─────────────┘   └─────────────────┘   └───────────────┘
```

---

## 2. Next.js Route Group Architecture

The app uses Next.js route groups to isolate four distinct interfaces,
each with its own layout, auth requirements, and UI paradigm.

```
app/
├── (kiosk)/            # Public-facing, touch-optimized (route group)
│   ├── layout.tsx      # Full-screen, no nav, idle timer
│   ├── page.tsx        # Welcome / splash screen
│   ├── menu/
│   │   └── page.tsx    # Category grid → item list → detail sheet
│   ├── cart/
│   │   └── page.tsx    # Order summary, special instructions
│   ├── checkout/
│   │   └── page.tsx    # 4-step flow: order type, promo, phone, payment
│   └── confirmation/
│       └── page.tsx    # Order number + auto-redirect
│
├── (kitchen)/          # Staff-only, large display optimized (route group)
│   ├── layout.tsx      # Dark theme, full-screen, status bar
│   └── orders/
│       └── page.tsx    # Real-time order queue (KDS)
│
├── (cashier)/          # Staff-only, point-of-sale layout (route group)
│   └── layout.tsx      # POS layout (pages pending Phase 3)
│
├── admin/              # Admin-only, dashboard layout (regular folder, NOT route group)
│   ├── layout.tsx      # Sidebar navigation
│   ├── page.tsx        # Dashboard (today's stats, charts)
│   ├── menu-management/
│   │   └── page.tsx    # CRUD items, categories, addons
│   ├── users/
│   │   └── page.tsx    # Staff accounts, roles, PINs
│   └── order-history/
│       └── page.tsx    # Order history + reports
│
├── login/
│   └── page.tsx        # Staff login page (email + password)
├── signup/
│   └── page.tsx        # Staff signup page
├── unauthorized/
│   └── page.tsx        # 403 - Unauthorized access page
│
├── layout.tsx          # Root layout (providers, fonts)
├── not-found.tsx
└── globals.css
```

**Note**: Admin uses a regular `admin/` folder (not a route group) because admin
pages need the `/admin` URL prefix (e.g., `/admin/menu-management`). Route groups
remove the folder name from the URL, which would cause conflicts for admin pages.

---

## 3. Component Architecture

```
components/
├── ui/                     # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── toast.tsx
│   ├── tabs.tsx
│   └── ...
│
├── kiosk/                  # Kiosk-specific components
│   ├── menu-grid.tsx       # Category grid with images
│   ├── menu-item-card.tsx  # Individual item card (touch-optimized)
│   ├── item-detail-sheet.tsx  # Bottom sheet for customization
│   ├── addon-selector.tsx  # Add-on group selector
│   ├── cart-drawer.tsx     # Slide-out cart summary
│   ├── cart-item.tsx       # Individual cart line item
│   ├── order-type-selector.tsx  # Dine-in / Room Service / Takeout
│   ├── payment-method-selector.tsx
│   ├── order-number-display.tsx # Big order number confirmation
│   ├── idle-timer.tsx      # Inactivity reset component
│   └── numpad.tsx          # On-screen number pad for table/room
│
├── kitchen/                # KDS-specific components
│   ├── order-card.tsx      # Single order card with items
│   ├── order-queue.tsx     # Scrolling order queue
│   ├── status-controls.tsx # Bump bar: Next status button
│   ├── order-timer.tsx     # Elapsed time indicator
│   ├── filter-bar.tsx      # Filter by type, status
│   └── audio-alert.tsx     # New order sound notification
│
├── cashier/                # Cashier-specific components
│   ├── pending-orders-list.tsx
│   ├── payment-form.tsx    # Cash / GCash / Card processing
│   ├── cash-calculator.tsx # Tendered amount + change
│   ├── receipt-preview.tsx
│   ├── discount-selector.tsx
│   └── shift-summary.tsx
│
├── admin/                  # Admin-specific components
│   ├── sidebar-nav.tsx
│   ├── stats-cards.tsx
│   ├── menu-item-form.tsx  # Create/edit menu item
│   ├── category-form.tsx
│   ├── addon-group-form.tsx
│   ├── user-form.tsx
│   ├── sales-chart.tsx
│   └── settings-form.tsx
│
└── shared/                 # Cross-module components
    ├── order-status-badge.tsx
    ├── price-display.tsx
    ├── loading-spinner.tsx
    ├── empty-state.tsx
    ├── error-boundary.tsx
    └── currency-formatter.tsx
```

---

## 4. Data Flow Architecture

### 4.1 Order Creation Flow (Kiosk)

```
[Guest Interaction]
    │
    ▼
┌─────────────────────────────────────────────┐
│ Zustand Cart Store (Client)                 │
│ • items[], orderType, tableNumber, etc.     │
│ • addItem(), removeItem(), updateQuantity() │
│ • calculateTotals()                         │
└──────────────────┬──────────────────────────┘
                   │ "Place Order" clicked
                   ▼
┌─────────────────────────────────────────────┐
│ Server Action: createOrder()                │
│ 1. Validate cart with Zod                   │
│ 2. Verify menu items still available        │
│ 3. Recalculate prices server-side           │
│ 4. Generate order number (A001, A002...)    │
│ 5. Insert into orders + order_items         │
│ 6. If pay-at-counter → status: pending_pay  │
│    If digital pay → create PayMongo session │
│ 7. Return order confirmation                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Supabase Realtime                           │
│ • Kitchen subscribes to orders table        │
│ • New order triggers real-time push         │
│ • Kitchen display auto-updates              │
└─────────────────────────────────────────────┘
```

### 4.2 Real-Time Subscription Model

```
                ┌──────────────────────┐
                │    Supabase DB       │
                │    orders table      │
                └──────────┬───────────┘
                           │ Postgres Changes
                           ▼
              ┌────────────────────────┐
              │   Supabase Realtime    │
              │   (WebSocket Server)   │
              └────┬──────┬──────┬─────┘
                   │      │      │
          ┌────────┘      │      └────────┐
          ▼               ▼               ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │  Kitchen  │  │  Cashier  │  │   Kiosk   │
    │  Channel  │  │  Channel  │  │  Channel  │
    │           │  │           │  │           │
    │ Filters:  │  │ Filters:  │  │ Filters:  │
    │ status IN │  │ payment   │  │ id = own  │
    │ (paid,    │  │ _status = │  │ order_id  │
    │ preparing,│  │ 'unpaid'  │  │           │
    │ ready)    │  │           │  │           │
    └───────────┘  └───────────┘  └───────────┘
```

---

## 5. State Management Strategy

### Client State (Zustand)
- **Cart Store**: items, quantities, addons, order type, totals
- **Kiosk UI Store**: current category, active sheet, idle timer
- **Kitchen UI Store**: active filters, sort order, sound enabled

### Server State (Supabase + React Query-like patterns)
- Menu items → fetched on page load, cached
- Orders → real-time subscription, no polling
- Settings → fetched once, cached in context

### Why Zustand over Context/Redux
- Lightweight (1KB), no provider wrapper needed
- Works seamlessly with Next.js server/client boundary
- Built-in devtools, persist middleware for cart recovery
- Simpler API than Redux for this scale

---

## 6. Authentication Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│   Kiosk     │────▶│ No auth required                     │
│   (Public)  │     │ Anonymous Supabase access             │
└─────────────┘     │ RLS: SELECT on active menu items only │
                    └──────────────────────────────────────┘

┌─────────────┐     ┌──────────────────────────────────────┐
│   Kitchen   │────▶│ PIN-based quick login                 │
│   Staff     │     │ Supabase Auth (email + PIN shortcut)  │
└─────────────┘     │ Role: 'kitchen'                       │
                    │ Middleware validates role on route     │
                    └──────────────────────────────────────┘

┌─────────────┐     ┌──────────────────────────────────────┐
│   Cashier   │────▶│ Email/password + PIN login            │
│   Staff     │     │ Role: 'cashier'                       │
└─────────────┘     │ Middleware validates role on route     │
                    └──────────────────────────────────────┘

┌─────────────┐     ┌──────────────────────────────────────┐
│   Admin     │────▶│ Email/password login (no PIN)         │
│             │     │ Role: 'admin'                         │
└─────────────┘     │ Middleware validates role on route     │
                    │ Full access to all tables              │
                    └──────────────────────────────────────┘
```

### Middleware (middleware.ts)
```
Request → Check path
  ├── /(kiosk)/*   → Allow (public)
  ├── /(kitchen)/* → Require auth + role in [kitchen, admin]
  ├── /(cashier)/* → Require auth + role in [cashier, admin]
  ├── /admin/*     → Require auth + role = admin
  └── /api/*       → Validate webhook signatures or auth
```

---

## 7. Payment Flow Architecture

### 7.1 Pay at Counter (Cash)
```
Kiosk                          Cashier
  │                               │
  │ order.payment_method = cash   │
  │ order.payment_status = unpaid │
  │──────────────────────────────▶│
  │                               │ Order appears in pending queue
  │                               │ Cashier enters amount tendered
  │                               │ System calculates change
  │                               │ Cashier confirms payment
  │                               │
  │                               │ payment record created
  │                               │ order.payment_status = paid
  │◀──────────────────────────────│
  │ (via realtime subscription)   │
  │ Kitchen receives order        │
```

### 7.2 Digital Payment (GCash / Card)
```
Kiosk                    PayMongo API           Webhook Handler
  │                          │                        │
  │ Create Payment Intent    │                        │
  │─────────────────────────▶│                        │
  │                          │                        │
  │ Redirect / Card Form     │                        │
  │◀─────────────────────────│                        │
  │                          │                        │
  │ Guest completes payment  │                        │
  │─────────────────────────▶│                        │
  │                          │ Payment Confirmed      │
  │                          │───────────────────────▶│
  │                          │                        │ Update order status
  │                          │                        │ Insert payment record
  │ Redirect to confirmation │                        │
  │◀─────────────────────────│                        │
```

---

## 8. Folder Structure — Full Project

```
food.orderingsystem/
├── docs/
│   ├── prd/
│   │   └── PRD.md
│   ├── architecture/
│   │   └── ARCHITECTURE.md
│   └── agents/
│       ├── AGENT-KIOSK.md
│       ├── AGENT-KITCHEN.md
│       ├── AGENT-CASHIER.md
│       ├── AGENT-ADMIN.md
│       ├── AGENT-DATABASE.md
│       └── AGENT-PAYMENTS.md
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: providers, fonts, metadata
│   │   ├── globals.css             # Tailwind v4 CSS (design tokens in @theme)
│   │   ├── page.tsx                # Home page
│   │   ├── not-found.tsx
│   │   │
│   │   ├── (kiosk)/               # Route group — public, touch-optimized
│   │   │   ├── layout.tsx          # Fullscreen, idle timer, no nav
│   │   │   ├── page.tsx            # Welcome/splash screen
│   │   │   ├── menu/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── confirmation/page.tsx
│   │   │
│   │   ├── (kitchen)/             # Route group — staff, dark theme
│   │   │   ├── layout.tsx          # Dark theme, fullscreen
│   │   │   └── orders/page.tsx     # Real-time KDS
│   │   │
│   │   ├── (cashier)/             # Route group — staff, POS layout
│   │   │   └── layout.tsx          # POS layout (pages pending Phase 3)
│   │   │
│   │   ├── admin/                 # Regular folder (NOT route group) — URL: /admin/*
│   │   │   ├── layout.tsx          # Sidebar nav
│   │   │   ├── page.tsx            # Dashboard (stats, charts)
│   │   │   ├── menu-management/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── order-history/page.tsx
│   │   │
│   │   ├── login/page.tsx          # Staff login
│   │   ├── signup/page.tsx         # Staff signup
│   │   └── unauthorized/page.tsx   # 403 page
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (20 components)
│   │   ├── kiosk/                  # Kiosk-specific (menu-grid, item-card, cart-drawer, etc.)
│   │   ├── kitchen/                # KDS-specific (order-card, order-queue)
│   │   ├── admin/                  # Admin-specific (stats-cards, menu-item-form, charts, etc.)
│   │   ├── auth/                   # Auth components (login-form, signup-form)
│   │   └── shared/                 # Cross-module (date-range-picker, pagination)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # createBrowserClient() — browser/client components
│   │   │   ├── server.ts           # createServerClient() — Server Components + Actions
│   │   │   ├── admin.ts            # createAdminClient() — webhooks/admin scripts ONLY
│   │   │   └── types.ts            # Generated DB types (auto-generated from migrations)
│   │   ├── utils/
│   │   │   ├── cn.ts               # className merger (Tailwind)
│   │   │   ├── currency.ts         # formatCurrency() — Philippine Peso
│   │   │   └── rate-limiter.ts     # Rate limiting utility
│   │   ├── validators/
│   │   │   ├── auth.ts             # Login/signup validation
│   │   │   ├── category.ts         # Category validation
│   │   │   ├── menu-item.ts        # Menu item validation
│   │   │   ├── order.ts            # Order validation
│   │   │   └── user.ts             # User validation
│   │   └── constants/
│   │       └── order-status.ts     # Status enums and labels
│   │
│   ├── hooks/
│   │   └── use-realtime-orders.ts  # Supabase realtime subscription
│   │
│   ├── stores/
│   │   └── cart-store.ts           # Zustand: cart state + localStorage persistence
│   │
│   ├── types/
│   │   ├── auth.ts                 # Auth-related types
│   │   ├── dashboard.ts            # Dashboard/analytics types
│   │   └── order.ts                # Order-related types
│   │   # Note: Database types are in lib/supabase/types.ts (auto-generated)
│   │
│   └── services/
│       ├── order-service.ts        # Order CRUD server actions
│       ├── menu-service.ts         # Menu CRUD server actions
│       ├── analytics-service.ts    # Reporting queries
│       ├── auth-service.ts         # Authentication operations
│       └── user-service.ts         # User management
│
├── supabase/
│   ├── migrations/                 # 25 timestamped SQL migration files
│   │   ├── 20260205140000_enums_schema.sql
│   │   ├── 20260205140100_profiles_schema.sql
│   │   ├── ...                     # (see supabase/migrations/ for full list)
│   │   └── 20260207000002_menu_categories_seed_data.sql
│   ├── seed.sql
│   └── config.toml
│
├── public/
│   ├── sounds/
│   │   └── new-order.mp3
│   └── images/
│       └── placeholder-food.png
│
├── .env.local.example
├── middleware.ts           # Auth middleware (can also use proxy.ts for Next.js 16)
├── next.config.ts
├── postcss.config.mjs      # Tailwind v4 PostCSS plugin (@tailwindcss/postcss)
├── tsconfig.json
├── package.json
└── README.md

**Notes**:
- Admin uses a regular `admin/` folder (not route group) — needs `/admin` URL prefix
- Tailwind v4 uses CSS-first config in `globals.css` via `@theme`. No `tailwind.config.js/ts`.
- Migration naming: `YYYYMMDDHHMMSS_description.sql` (Supabase default timestamp format)
```

---

## 9. Database Schema Enhancements (PRD v1.1)

### New Tables Added in v1.1

**promo_codes** — Discount and coupon management
- Supports percentage and fixed-amount discounts
- Usage limits and validity periods
- Applied before tax calculation

**order_events** — Analytics tracking for success metrics
- Tracks cart_started, item_added, checkout_initiated, payment_completed events
- Enables funnel analysis and average order time calculations
- JSONB metadata for flexible event context

**kitchen_stations** — Multi-station order routing
- Routes orders to specific stations (Grill, Fryer, Salad, Dessert)
- Junction table `menu_item_stations` links items to stations
- Enables parallel kitchen workflows

**bir_receipt_config** — Philippines BIR tax compliance
- Stores TIN, business details, permit numbers
- Receipt series tracking (sequential, no gaps)
- POS machine and terminal IDs

### Enhanced Table Fields

**orders table**:
- `expires_at` — 15-minute timeout for unpaid orders
- `version` — Optimistic locking for concurrent updates
- `promo_code_id` — FK to promo_codes table
- `guest_phone` — For order history lookup
- `deleted_at` — Soft delete pattern

**menu_items table**:
- `allergens` — Text array for dietary restrictions
- `nutritional_info` — JSONB nutrition facts
- `translations` — JSONB multi-language support
- `deleted_at` — Soft delete to preserve order history

### Performance Indexes

Critical indexes for scalability (200+ concurrent kiosks, 500+ orders/day):
- `idx_orders_status`, `idx_orders_payment_status` — Kitchen and cashier queries
- `idx_menu_items_is_available` — Kiosk menu filtering
- `idx_order_events_event_type` — Analytics queries
- Partial indexes with `WHERE` clauses for optimization

---

## 10. Security Architecture

### Input Validation & Sanitization

```typescript
// All Server Actions use Zod validation
import { menuItemSchema } from '@/lib/validators/menu-item';

export async function createMenuItem(formData: FormData) {
  const validated = menuItemSchema.parse({
    name: formData.get('name'),
    base_price: parseFloat(formData.get('base_price') as string),
    // ... Zod ensures type safety and validation
  });
}

// XSS prevention via DOMPurify
import DOMPurify from 'isomorphic-dompurify';
const sanitized = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

### Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 orders/min per IP
});
```

### Server-Side Price Recalculation

**CRITICAL**: All order totals are recalculated server-side to prevent client tampering.

```typescript
// Server Action: createOrder
// NEVER trust client-submitted prices
const menuItems = await supabase
  .from('menu_items')
  .select('id, base_price, addon_groups(addon_options(id, additional_price))')
  .in('id', cartItems.map(item => item.id));

// Recalculate from database prices only
const calculatedTotal = cartItems.reduce((sum, cartItem) => {
  const menuItem = menuItems.find(m => m.id === cartItem.id);
  const itemTotal = menuItem.base_price * cartItem.quantity;
  // ... add addons from DB prices
}, 0);
```

### Webhook Security (PayMongo)

```typescript
// /api/webhooks/paymongo/route.ts
export async function POST(req: Request) {
  // 1. Verify HMAC signature
  const signature = req.headers.get('paymongo-signature');
  const isValid = verifyWebhookSignature(await req.text(), signature);
  if (!isValid) return new Response('Unauthorized', { status: 401 });

  // 2. Idempotency check (prevent duplicate processing)
  const existingPayment = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', event.data.id)
    .single();
  if (existingPayment.data) return new Response('Already processed', { status: 200 });

  // 3. Verify amount matches order total
  const expectedAmount = Math.round(order.data.total_amount * 100);
  if (event.data.attributes.amount !== expectedAmount) {
    return new Response('Amount mismatch', { status: 400 });
  }
}
```

### Soft Delete Pattern

Menu items and orders use `deleted_at` instead of hard deletes to preserve:
- Historical order data (BIR compliance - 2 years)
- Price integrity for old orders
- Audit trail

```sql
-- Never hard delete
UPDATE menu_items SET deleted_at = NOW() WHERE id = $1;

-- Filter in all queries
SELECT * FROM menu_items WHERE deleted_at IS NULL;
```

---

## 11. Migration Naming Convention

**Format**: `YYYYMMDDHHMMSS_description.sql` (Supabase default timestamp format)

**Examples**:
- `20260205140000_enums_schema.sql` — Enum type definitions
- `20260205140800_orders_schema.sql` — Orders table creation
- `20260207000001_add_increment_promo_usage_function.sql` — New function
- `20260207000002_menu_categories_seed_data.sql` — Seed data

**Description suffixes used**:
- `_schema` — CREATE TABLE, ALTER TABLE
- `_rls` — Row Level Security policies
- `_functions` — Functions, triggers, sequences
- `_buckets` — Supabase Storage buckets + policies
- `_indexes` — CREATE INDEX statements
- `_seed_data` — INSERT initial/test data
- `_realtime` — Realtime subscription configuration

**Benefits**:
- Chronological: Sorts naturally by timestamp
- Descriptive: Suffix clarifies what's affected
- Searchable: `ls *orders*` shows all order-related migrations
- No conflicts: Timestamp precision prevents merge conflicts

---

## 12. Key Design Decisions

### 12.1 Denormalized Order Items
Order items store `item_name` and `unit_price` at time of order, not just FK references. This ensures historical orders remain accurate even after menu price changes.

### 12.2 Order Number Generation
Order numbers are generated via PostgreSQL sequence using `generate_order_number()` function, returning A0001, A0002, A0003, etc. This prevents race conditions even with 200+ concurrent order submissions. The sequence can optionally be reset daily via cron job for human-readable numbers, but this is not automatic.

### 12.3 Optimistic UI for Kitchen
Kitchen status changes use optimistic updates — the UI advances immediately while the database write happens in background. If the write fails, the UI reverts and shows a toast error.

### 12.4 Separate Payment Records
Payments are a separate table from orders to support split payments, refunds, and audit trails. One order can have multiple payment records.

### 12.5 Server Actions over API Routes
Most mutations use Next.js Server Actions (form actions) rather than API routes. This reduces boilerplate, provides automatic revalidation, and keeps business logic co-located. API routes are reserved for webhooks and external integrations only.

---

## 13. Important Implementation Notes

### Supabase Client Usage

⚠️ **CRITICAL**: Always use the correct client for the context:

```typescript
// ✅ CORRECT
// In Server Components and Server Actions
import { createServerClient } from '@/lib/supabase/server';
const supabase = await createServerClient();

// In Client Components
import { createBrowserClient } from '@/lib/supabase/client';
const supabase = createBrowserClient();

// In Webhooks and Admin Scripts ONLY
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();

// ❌ NEVER do this in client components
import { createAdminClient } from '@/lib/supabase/admin'; // Bypasses RLS!
```

**Naming convention**: Each file exports a distinctly named function to avoid confusion:
- `client.ts` → `createBrowserClient()`
- `server.ts` → `createServerClient()`
- `admin.ts` → `createAdminClient()`

### Tailwind CSS v4 Configuration

⚠️ **BREAKING CHANGE from Tailwind v3**:

- **NO `tailwind.config.ts` or `tailwind.config.js` file**
- Configuration is CSS-first in `src/app/globals.css` via `@theme` blocks
- PostCSS plugin changed to `@tailwindcss/postcss`
- Use `@import "tailwindcss"` instead of `@tailwind` directives

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #2563eb;
  --font-display: "Cabinet Grotesk", sans-serif;
}
```

### Next.js 16 Async Params

All `params` and `searchParams` in pages/layouts are now async:

```typescript
// ✅ CORRECT - Next.js 16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ❌ WRONG - Old Next.js 15 pattern
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // Will throw runtime error
}
```

### Migration File Management

**NEVER**:
- Rename existing migration files
- Delete applied migration files
- Edit migration files after they've been applied
- Run `supabase db reset` in production (WIPES ALL DATA)

**ALWAYS**:
- Create new migration files for schema changes
- Use `supabase db push` to apply new migrations
- Regenerate types after schema changes: `npm run supabase:types` (or `npx supabase gen types typescript --local > src/lib/supabase/types.ts`)
- Follow naming convention: `YYYYMMDDHHMMSS_description.sql`

---

## 14. Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.1
- **[PHASE-1-GUIDE.md](../phases/PHASE-1-GUIDE.md)** — Phase 1 Implementation Guide
- **[AGENT-DATABASE.md](../agents/AGENT-DATABASE.md)** — Complete SQL schema and RLS policies
- **[AGENT-KIOSK.md](../agents/AGENT-KIOSK.md)** — Kiosk module specification
- **[AGENT-KITCHEN.md](../agents/AGENT-KITCHEN.md)** — Kitchen Display System specification
- **[AGENT-CASHIER.md](../agents/AGENT-CASHIER.md)** — Cashier module specification
- **[AGENT-ADMIN.md](../agents/AGENT-ADMIN.md)** — Admin dashboard specification
- **[AGENT-PAYMENTS.md](../agents/AGENT-PAYMENTS.md)** — PayMongo integration guide

---

## 16. Caching Strategy

### Next.js 16 Caching Model

Next.js 16 changed caching to be **fully opt-in**. All data fetches are dynamic by default.

```
┌─────────────────────────────────────────────────────────────┐
│                    Caching Tiers                            │
├─────────────────────────────────────────────────────────────┤
│ No Cache (Default)  │ Every request fetches fresh data     │
│─────────────────────┼───────────────────────────────────────│
│ 'use cache' directive │ Cache entire component/function    │
│─────────────────────┼───────────────────────────────────────│
│ unstable_cache()    │ Fine-grained data caching             │
│─────────────────────┼───────────────────────────────────────│
│ Browser Cache       │ Static assets (images, fonts)         │
└─────────────────────────────────────────────────────────────┘
```

### Caching by Module

| Module | Data | Cache Strategy | Reason |
|--------|------|----------------|--------|
| **Kiosk** | Menu items | `use cache` with 5min TTL | Menu changes infrequently |
| **Kiosk** | Categories | `use cache` with 5min TTL | Rarely changes |
| **Kitchen** | Orders | No cache (Realtime) | Must be live |
| **Cashier** | Pending orders | No cache (Realtime) | Must be live |
| **Admin** | Analytics | No cache | Always fresh data needed |
| **Admin** | Settings | `use cache` with 1min TTL | Changes are infrequent |

### Implementation Pattern

```typescript
// Cache a Server Component
'use cache'
export async function MenuItems() {
  cacheLife('minutes', 5); // 5-minute TTL
  cacheTag('menu-items');  // For manual revalidation

  const { data } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true);

  return data;
}

// Revalidate on menu update (Server Action)
export async function updateMenuItem(id: string, data: MenuItemInput) {
  await supabase.from('menu_items').update(data).eq('id', id);
  revalidateTag('menu-items'); // Bust the cache
}
```

---

## 17. Scalability Considerations

### Target Scale

- 200+ concurrent kiosk sessions
- 500+ orders per day
- 50+ menu items with images
- 3-5 kitchen stations
- 2-4 cashier terminals

### Database Optimization

| Optimization | Implementation | Impact |
|--------------|----------------|--------|
| **Indexes** | On status, payment_status, created_at | 10x faster queries |
| **Partial Indexes** | `WHERE is_available = true` | Smaller, faster index |
| **Connection Pooling** | Supabase default (pgbouncer) | Handle concurrent connections |
| **RLS Policies** | Scoped to user role | Reduce data transfer |

### Frontend Optimization

| Optimization | Implementation | Impact |
|--------------|----------------|--------|
| **Server Components** | Default for all pages | Smaller JS bundles |
| **Image Optimization** | Next.js `<Image>` + WebP | 50%+ smaller images |
| **Code Splitting** | Route groups (automatic) | Load only module code |
| **Streaming** | Server Component streaming | Faster TTFB |

### Realtime Optimization

```typescript
// Filter subscriptions to reduce traffic
const channel = supabase
  .channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=in.(paid,preparing,ready)' // Only relevant orders
  }, handleChange)
  .subscribe();
```

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Vercel Edge) │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Next.js    │   │  Next.js    │   │  Next.js    │
    │  Instance 1 │   │  Instance 2 │   │  Instance 3 │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │  (Postgres +    │
                    │   Realtime)     │
                    └─────────────────┘
```

---

## 18. Error Flow Architecture

### Error Handling Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Error Boundaries                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Component Level                                   │
│  → Try/catch in event handlers                              │
│  → Display inline errors, toast notifications               │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Server Action Level                               │
│  → Zod validation errors → structured response              │
│  → Database errors → logged + generic message               │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Route Level                                       │
│  → error.tsx for unexpected errors                          │
│  → not-found.tsx for 404s                                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Global Level                                      │
│  → Root error boundary                                      │
│  → Sentry/logging integration                               │
└─────────────────────────────────────────────────────────────┘
```

### Error Code Taxonomy

See PRD.md Section 17 for complete error code reference. Summary:

| Range | Category | Example |
|-------|----------|---------|
| E1xxx | Authentication | E1001: Invalid credentials, E1002: Session expired |
| E2xxx | Orders | E2001: Order not found, E2003: Order expired, E2006: Cart empty |
| E3xxx | Payments | E3001: Payment declined, E3002: Gateway unavailable |
| E4xxx | Menu | E4001: Item not found, E4005: Image upload failed |
| E5xxx | Promo Codes | E5001: Invalid code, E5002: Expired, E5005: Min order not met |
| E9xxx | System | E9001: Internal error, E9002: DB connection failed, E9003: Rate limited |

### Error Response Format

```typescript
// Standardized response for all Server Actions
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;       // E.g., "E2001" — see PRD Section 17
    message: string;    // User-friendly message
    details?: unknown;  // Validation errors, additional context
    timestamp?: string; // ISO 8601
    traceId?: string;   // For support reference
  };
}

// Example Server Action
export async function createOrder(input: OrderInput): Promise<ActionResult> {
  try {
    const validated = orderSchema.parse(input);
    // ... process order
    return { success: true, data: order };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'E2006',
          message: 'Validation failed',
          details: error.flatten(),
        },
      };
    }
    console.error('createOrder failed:', error);
    return {
      success: false,
      error: {
        code: 'E9001',
        message: 'Failed to create order',
      },
    };
  }
}
```

---

## 19. Monitoring & Observability

### Logging Strategy

| Level | Use Case | Example |
|-------|----------|---------|
| **error** | Failures requiring attention | Payment failed, DB error |
| **warn** | Potential issues | Slow query, retry needed |
| **info** | Business events | Order created, status changed |
| **debug** | Development only | Query details, state changes |

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Order success rate | >99% | <95% |
| Payment success rate | >98% | <95% |
| Kitchen order latency | <30s | >60s |
| Page load time | <2s | >5s |
| API response time | <500ms | >2s |

### Audit Trail

Critical actions are logged to the `audit_log` table:

- Order status changes
- Payment processing
- Menu item changes
- User role changes
- Settings modifications

```sql
-- Audit log structure
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  action TEXT NOT NULL,           -- 'order.status_changed'
  entity_type TEXT NOT NULL,      -- 'orders'
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **Route Group** | Next.js `(folder)` syntax for grouping routes without affecting URL path |
| **Server Component** | React component rendered on server (default in App Router) |
| **Client Component** | Component with `'use client'` directive, hydrated in browser |
| **Server Action** | `'use server'` function callable from client, runs on server |
| **RLS** | Row Level Security - Postgres feature to restrict data access per user |
| **Realtime** | Supabase WebSocket feature for live database change notifications |
| **KDS** | Kitchen Display System - real-time order queue for kitchen staff |
| **POS** | Point of Sale - cashier interface for payment processing |
| **Optimistic Update** | UI updates immediately before server confirmation |
| **Hydration** | Process of attaching event handlers to server-rendered HTML |
| **TTL** | Time To Live - cache expiration duration |
| **TTFB** | Time To First Byte - server response time metric |
| **pgbouncer** | PostgreSQL connection pooler (used by Supabase) |
| **Soft Delete** | Setting `deleted_at` instead of removing records |
| **Idempotency** | Ensuring repeated requests produce same result |

---

## 21. Version History

### Version 2.3 (February 7, 2026)
**Status**: Aligned with PRD and actual codebase

**Changes**:
- Fixed error code taxonomy to match PRD Section 17 (domain-based: E1xxx Auth, E2xxx Orders, E3xxx Payments, E4xxx Menu, E5xxx Promo, E9xxx System)
- Fixed Supabase client export names to match actual code (`createBrowserClient`, `createServerClient`, `createAdminClient`)
- Fixed admin module: regular `admin/` folder, NOT route group `(admin)/` — needs `/admin` URL prefix
- Updated folder structure (Section 8) to match actual codebase: 25 migrations, actual services/hooks/stores/types files
- Fixed migration naming convention to `YYYYMMDDHHMMSS_description.sql` (Supabase default)
- Added signup page, auth components, order-history page
- Removed files that don't exist yet (payment-service, kiosk-ui-store, kitchen-ui-store, etc.)

### Version 2.1 (February 2026)
**Status**: Enhanced documentation

**Changes**:
- Added Quick Reference section with architecture overview
- Added Caching Strategy section (Next.js 16 opt-in caching)
- Added Scalability Considerations with optimization guides
- Added Error Flow Architecture with error code taxonomy
- Added Monitoring & Observability section
- Added comprehensive Glossary
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Phase 1 Guide alignment

**Major Updates**:
- Updated migration naming convention
- Added 4 new database tables
- Enhanced security architecture section
- Added performance indexes section
- Documented order number generation
- Fixed Tailwind v4 configuration
- Added implementation notes

### Version 1.0 (February 2, 2026)
- Initial architecture document

---
