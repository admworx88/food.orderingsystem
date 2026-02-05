# System Architecture Document
# OrderFlow — Hotel Restaurant Web Ordering System

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
├── (kiosk)/            # Public-facing, touch-optimized
│   ├── layout.tsx      # Full-screen, no nav, idle timer
│   ├── page.tsx        # Welcome / splash screen
│   ├── menu/
│   │   └── page.tsx    # Category grid → item list → detail sheet
│   ├── cart/
│   │   └── page.tsx    # Order summary, order type selection
│   ├── checkout/
│   │   └── page.tsx    # Payment method selection + processing
│   └── confirmation/
│       └── page.tsx    # Order number + estimated wait
│
├── (kitchen)/          # Staff-only, large display optimized
│   ├── layout.tsx      # Dark theme, full-screen, status bar
│   ├── orders/
│   │   └── page.tsx    # Real-time order queue (KDS)
│   └── settings/
│       └── page.tsx    # KDS preferences (sound, auto-hide, filters)
│
├── (cashier)/          # Staff-only, point-of-sale layout
│   ├── layout.tsx      # Split panel (orders | payment)
│   ├── payments/
│   │   └── page.tsx    # Pending orders + payment processing
│   └── reports/
│       └── page.tsx    # Shift summary, cash drawer
│
├── (admin)/            # Admin-only, dashboard layout
│   ├── layout.tsx      # Sidebar navigation
│   ├── page.tsx        # Dashboard (today's stats)
│   ├── menu-management/
│   │   └── page.tsx    # CRUD items, categories, addons
│   ├── users/
│   │   └── page.tsx    # Staff accounts, roles, PINs
│   ├── analytics/
│   │   └── page.tsx    # Charts, reports, exports
│   └── settings/
│       └── page.tsx    # Tax, charges, hours, system config
│
├── api/
│   └── webhooks/
│       └── paymongo/
│           └── route.ts  # Payment confirmation webhook
│
├── layout.tsx          # Root layout (providers, fonts)
├── not-found.tsx
└── globals.css
```

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
  ├── /(admin)/*   → Require auth + role = admin
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
hotel-restaurant-ordering/
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
│   │   ├── globals.css             # Tailwind base + custom vars
│   │   ├── not-found.tsx
│   │   │
│   │   ├── (kiosk)/
│   │   │   ├── layout.tsx          # Fullscreen, idle timer, no nav
│   │   │   ├── page.tsx            # Welcome screen
│   │   │   ├── menu/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── confirmation/page.tsx
│   │   │
│   │   ├── (kitchen)/
│   │   │   ├── layout.tsx          # Dark theme, fullscreen
│   │   │   ├── orders/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── (cashier)/
│   │   │   ├── layout.tsx          # POS layout
│   │   │   ├── payments/page.tsx
│   │   │   └── reports/page.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx          # Sidebar nav
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── menu-management/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   └── api/
│   │       └── webhooks/
│   │           └── paymongo/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── kiosk/                  # Kiosk-specific
│   │   ├── kitchen/                # KDS-specific
│   │   ├── cashier/                # Cashier-specific
│   │   ├── admin/                  # Admin-specific
│   │   └── shared/                 # Cross-cutting
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client (createBrowserClient)
│   │   │   ├── server.ts           # Server client (createServerClient)
│   │   │   ├── admin.ts            # Service role client (migrations)
│   │   │   ├── middleware.ts        # Auth helper for middleware
│   │   │   └── types.ts            # Generated DB types
│   │   ├── utils/
│   │   │   ├── cn.ts               # className merger
│   │   │   ├── currency.ts         # PHP formatting
│   │   │   ├── order-number.ts     # Generate A001, A002...
│   │   │   └── date.ts             # Date helpers
│   │   ├── validators/
│   │   │   ├── order.ts            # Zod schemas for orders
│   │   │   ├── menu-item.ts        # Zod schemas for menu items
│   │   │   └── payment.ts          # Zod schemas for payments
│   │   └── constants/
│   │       ├── order-status.ts     # Status enums and labels
│   │       └── payment-methods.ts  # Payment method configs
│   │
│   ├── hooks/
│   │   ├── use-realtime-orders.ts  # Supabase realtime subscription
│   │   ├── use-menu-items.ts       # Fetch + cache menu items
│   │   ├── use-sound.ts            # Audio notification hook
│   │   └── use-idle-timer.ts       # Inactivity detection
│   │
│   ├── stores/
│   │   ├── cart-store.ts           # Zustand: cart state + actions
│   │   ├── kiosk-ui-store.ts       # Zustand: kiosk UI state
│   │   └── kitchen-ui-store.ts     # Zustand: KDS preferences
│   │
│   ├── types/
│   │   ├── database.ts             # Supabase generated types
│   │   ├── order.ts                # Order-related types
│   │   ├── menu.ts                 # Menu-related types
│   │   └── payment.ts              # Payment-related types
│   │
│   └── services/
│       ├── order-service.ts        # Order CRUD server actions
│       ├── menu-service.ts         # Menu CRUD server actions
│       ├── payment-service.ts      # Payment processing
│       └── analytics-service.ts    # Reporting queries
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_categories.sql
│   │   ├── 003_create_menu_items.sql
│   │   ├── 004_create_addon_groups.sql
│   │   ├── 005_create_addon_options.sql
│   │   ├── 006_create_orders.sql
│   │   ├── 007_create_order_items.sql
│   │   ├── 008_create_order_item_addons.sql
│   │   ├── 009_create_payments.sql
│   │   ├── 010_create_settings.sql
│   │   ├── 011_create_rls_policies.sql
│   │   ├── 012_create_functions.sql
│   │   └── 013_seed_data.sql
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
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 9. Key Design Decisions

### 9.1 Denormalized Order Items
Order items store `item_name` and `unit_price` at time of order, not just FK references. This ensures historical orders remain accurate even after menu price changes.

### 9.2 Order Number Reset
Order numbers reset daily (A001 → A999, then B001...). This matches how fast-food restaurants cycle through manageable order numbers that kitchen staff can call out.

### 9.3 Optimistic UI for Kitchen
Kitchen status changes use optimistic updates — the UI advances immediately while the database write happens in background. If the write fails, the UI reverts and shows a toast error.

### 9.4 Separate Payment Records
Payments are a separate table from orders to support split payments, refunds, and audit trails. One order can have multiple payment records.

### 9.5 Server Actions over API Routes
Most mutations use Next.js Server Actions (form actions) rather than API routes. This reduces boilerplate, provides automatic revalidation, and keeps business logic co-located. API routes are reserved for webhooks and external integrations only.
