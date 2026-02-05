# Product Requirements Document (PRD)
# Hotel Restaurant Web Ordering System — "OrderFlow"

**Version:** 1.0
**Date:** February 2, 2026
**Author:** System Architect
**Status:** Draft

---

## 1. Executive Summary

OrderFlow is a web-based restaurant ordering system designed for hotel restaurants, modeled after the self-service kiosk experience found in QSR chains like McDonald's and Jollibee. The system enables guests to browse menus, customize orders, and pay — all from touch-screen kiosks or personal devices. Orders flow in real-time to kitchen display screens, and payments are handled at a cashier station or via digital wallets (GCash, credit/debit cards).

---

## 2. Problem Statement

Hotel restaurants currently rely on traditional waiter-based ordering which creates:
- Long wait times during peak hours
- Order inaccuracies from verbal miscommunication
- Inefficient kitchen workflows without digital order queuing
- Limited payment flexibility (cash-only or manual card processing)
- No real-time analytics on order patterns and revenue

---

## 3. Target Users & Personas

### 3.1 Hotel Guest (Kiosk User)
- Browses the menu on a touch-screen kiosk or tablet
- Customizes orders (add-ons, remove ingredients, special requests)
- Views order summary, confirms, and receives an order number
- Pays at cashier or via GCash/credit card at kiosk

### 3.2 Kitchen Staff
- Views incoming orders on a Kitchen Display System (KDS)
- Marks items as "Preparing" → "Ready" → "Served"
- Filters by order priority, type (dine-in, room service, takeout)
- Receives audio alerts for new orders

### 3.3 Cashier
- Processes payments (cash, GCash, credit/debit card)
- Views pending payment orders
- Issues receipts (digital or printed)
- Handles refunds and order modifications

### 3.4 Restaurant Manager / Admin
- Manages menu items, categories, pricing, and availability
- Views real-time analytics and sales reports
- Manages user accounts and roles
- Configures system settings (tax rates, service charges, operating hours)

---

## 4. System Architecture Decision

### Why Next.js (Not TanStack Router)

| Criteria | Next.js 16 (App Router) | TanStack Router |
|---|---|---|
| Full-stack capability | ✅ Server Actions, API Routes, Middleware | ❌ Client-only, needs separate backend |
| Real-time (Supabase) | ✅ Works with both server & client | ✅ Client-only subscriptions |
| SEO (admin/menu pages) | ✅ Built-in SSR/SSG | ❌ CSR only |
| Authentication | ✅ Middleware + Server-side auth | ⚠️ Client-side only |
| Route Groups | ✅ (kiosk), (kitchen), (cashier), (admin) | ⚠️ Manual setup |
| Deployment | ✅ Vercel, Docker, self-host | ✅ Any static host |
| Supabase Integration | ✅ SSR helpers, server client, RLS | ✅ Client-only |

**Decision: Next.js 16 (App Router) as the sole framework.**

Rationale: We need server-side auth validation, API routes for webhook handlers (payment callbacks), middleware for role-based access, and server actions for secure database mutations. TanStack Router would require building a separate API layer, defeating the purpose of Supabase as the backend. Next.js 16 brings Turbopack as the default bundler, opt-in caching via Cache Components, and React 19.2 features (View Transitions, useEffectEvent) that benefit our kiosk UX.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS 4.1 + shadcn/ui |
| State Management | Zustand (client cart/UI state) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password, PIN for staff) |
| Real-time | Supabase Realtime (Postgres Changes) |
| Payments | GCash (PayMongo API), Credit Card (PayMongo) |
| File Storage | Supabase Storage (menu images) |
| Validation | Zod |
| Deployment | Vercel or Docker (self-hosted) |

---

## 5. Core Features

### 5.1 Kiosk Module (Guest-Facing)
- **F-K01**: Browse menu by category with images, descriptions, prices
- **F-K02**: Search and filter menu items
- **F-K03**: Customize items (size, add-ons, special instructions)
- **F-K04**: Add to cart, modify quantities, remove items
- **F-K05**: Select order type: Dine-in (table number), Room Service (room number), Takeout
- **F-K06**: View order summary with subtotal, tax, service charge
- **F-K07**: Choose payment method: Pay at Counter, GCash, Credit/Debit Card
- **F-K08**: Receive order number and estimated wait time
- **F-K09**: Touch-optimized UI (large buttons, swipe gestures)
- **F-K10**: Idle timeout — reset to welcome screen after inactivity

### 5.2 Kitchen Display System (KDS)
- **F-KD01**: Real-time order queue (newest at bottom, oldest at top)
- **F-KD02**: Order cards showing items, customizations, order type, table/room
- **F-KD03**: Status workflow: New → Preparing → Ready → Served
- **F-KD04**: Color coding by age (green < 5min, yellow 5-10min, red > 10min)
- **F-KD05**: Audio notification on new order
- **F-KD06**: Filter by order type and status
- **F-KD07**: Bump bar / touch interaction to advance status
- **F-KD08**: Auto-hide served orders after configurable delay
- **F-KD09**: Recall served orders if needed

### 5.3 Cashier Module
- **F-C01**: View orders pending payment
- **F-C02**: Process cash payments (enter amount, calculate change)
- **F-C03**: Process GCash payments (generate QR or redirect)
- **F-C04**: Process credit/debit card payments (PayMongo integration)
- **F-C05**: Split payment across methods
- **F-C06**: Apply discounts (senior, PWD, promo codes)
- **F-C07**: Generate and print receipts
- **F-C08**: Handle refunds and cancellations
- **F-C09**: End-of-day cash reconciliation report

### 5.4 Admin Module
- **F-A01**: CRUD menu items with images, categories, pricing
- **F-A02**: Manage item availability (in-stock / out-of-stock toggle)
- **F-A03**: Manage categories and display ordering
- **F-A04**: Manage add-on groups and pricing
- **F-A05**: User management (roles: admin, cashier, kitchen)
- **F-A06**: Real-time dashboard (orders today, revenue, avg order value)
- **F-A07**: Sales reports by date range, category, item
- **F-A08**: System settings (tax rate, service charge, operating hours)
- **F-A09**: Audit log of all system actions

---

## 6. Order Lifecycle (Process Flow)

```
Guest at Kiosk                  Kitchen Display              Cashier
─────────────────               ───────────────              ───────
1. Browse Menu
2. Add Items to Cart
3. Review Order
4. Select Order Type
   (dine-in/room/takeout)
5. Choose Payment Method
   ├─ "Pay at Counter" ──────────────────────────────────→ 10. Receive Order
   │                                                         11. Process Payment
   │                                                         12. Confirm Payment
   ├─ GCash/Card ─→ 6. Process Payment                      (auto-confirmed)
   │                 7. Payment Confirmed
   │
8. Order Created ──────────→ 9. New Order Alert
   (order number shown)        Order appears on KDS
                               13. Mark "Preparing"
                               14. Mark "Ready"
                               (guest notified)
                               15. Mark "Served"
```

---

## 7. Database Schema (Supabase / PostgreSQL)

### Core Tables

**profiles** — extends Supabase auth.users
- id (uuid, FK → auth.users)
- full_name, role (admin | cashier | kitchen | kiosk), avatar_url
- pin_code (for quick staff login)
- created_at, updated_at

**categories**
- id (uuid), name, slug, description, image_url
- display_order (int), is_active (bool)
- created_at, updated_at

**menu_items**
- id (uuid), category_id (FK), name, slug, description
- base_price (decimal), image_url
- is_available (bool), is_featured (bool)
- preparation_time_minutes (int)
- display_order (int)
- created_at, updated_at

**addon_groups**
- id (uuid), name, is_required (bool)
- min_selections (int), max_selections (int)
- menu_item_id (FK → menu_items)

**addon_options**
- id (uuid), addon_group_id (FK), name
- additional_price (decimal), is_available (bool)

**orders**
- id (uuid), order_number (serial, human-readable e.g. "A001")
- order_type (enum: dine_in | room_service | takeout)
- table_number (nullable), room_number (nullable)
- status (enum: pending_payment | paid | preparing | ready | served | cancelled)
- payment_status (enum: unpaid | processing | paid | refunded)
- payment_method (enum: cash | gcash | card | null)
- subtotal, tax_amount, service_charge, discount_amount, total_amount
- special_instructions (text)
- estimated_ready_at (timestamp)
- created_at, updated_at, paid_at, ready_at, served_at

**order_items**
- id (uuid), order_id (FK), menu_item_id (FK)
- item_name (denormalized), quantity, unit_price, total_price
- special_instructions

**order_item_addons**
- id (uuid), order_item_id (FK), addon_option_id (FK)
- addon_name (denormalized), additional_price

**payments**
- id (uuid), order_id (FK)
- method (enum: cash | gcash | card)
- amount (decimal), status (enum: pending | success | failed | refunded)
- provider_reference (text, e.g. PayMongo payment ID)
- cash_received, change_given (nullable, for cash)
- processed_by (FK → profiles, nullable)
- created_at, completed_at

**settings**
- id (uuid), key (unique), value (jsonb)
- e.g. tax_rate: 0.12, service_charge: 0.10, operating_hours: {...}

---

## 8. Real-Time Architecture

Supabase Realtime is used for two critical flows:

### 8.1 Kiosk → Kitchen
When an order is created or payment confirmed:
```
supabase.channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=in.(paid,preparing,ready)'
  }, handleOrderChange)
  .subscribe()
```

### 8.2 Kitchen → Kiosk (Order Ready Notification)
When kitchen marks order as "Ready":
```
supabase.channel('order-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, handleStatusChange)
  .subscribe()
```

---

## 9. Payment Integration

### PayMongo (Philippines Payment Gateway)
- **GCash**: Create a PayMongo GCash source → redirect user → webhook confirms payment
- **Credit/Debit Card**: PayMongo payment intent → card element → 3DS verification
- **Webhook URL**: `/api/webhooks/paymongo` — receives payment confirmations

### Cash Flow
- Order created with `payment_status: unpaid`
- Cashier sees order in pending queue
- Cashier processes cash → marks as paid
- Kitchen receives the order

---

## 10. Security & Access Control

### Role-Based Access (Supabase RLS)

| Route Group | Required Role | Access Level |
|---|---|---|
| /(kiosk) | public / kiosk | Menu read, order create |
| /(kitchen) | kitchen, admin | Orders read/update status |
| /(cashier) | cashier, admin | Orders read, payments create |
| /(admin) | admin | Full CRUD on all tables |

### Supabase RLS Policies (examples)
```sql
-- Kiosk can only read active menu items
CREATE POLICY "Public read active menu"
  ON menu_items FOR SELECT
  USING (is_available = true);

-- Kitchen can only update order status
CREATE POLICY "Kitchen update order status"
  ON orders FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('kitchen', 'admin'))
  WITH CHECK (status IN ('preparing', 'ready', 'served'));
```

---

## 11. Non-Functional Requirements

- **Performance**: Menu page load < 2s, order submission < 1s
- **Availability**: 99.9% uptime during operating hours
- **Scalability**: Handle 200+ concurrent kiosk sessions
- **Accessibility**: Touch targets ≥ 48px, high contrast mode
- **Offline Resilience**: Queue orders locally if connection drops
- **Data Retention**: Order history retained for 2 years

---

## 12. Success Metrics

| Metric | Target |
|---|---|
| Average order time (browse → submit) | < 3 minutes |
| Order accuracy rate | > 99% |
| Kitchen order processing time | < 15 minutes |
| Payment success rate (digital) | > 98% |
| System uptime | > 99.9% |

---

## 13. Milestones

| Phase | Scope | Duration |
|---|---|---|
| Phase 1 — Foundation | Auth, DB schema, menu CRUD, basic kiosk UI | 2 weeks |
| Phase 2 — Ordering | Cart, order flow, kitchen display, real-time | 2 weeks |
| Phase 3 — Payments | Cash, GCash, card integration, cashier module | 2 weeks |
| Phase 4 — Admin & Polish | Analytics, reports, settings, optimization | 1 week |
| Phase 5 — Testing & Deploy | E2E testing, load testing, deployment | 1 week |
