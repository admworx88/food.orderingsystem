# Product Requirements Document (PRD)
# Hotel Restaurant Web Ordering System — "OrderFlow"

**Version:** 1.2
**Date:** February 5, 2026
**Author:** System Architect
**Status:** Complete PRD with User Stories, Risk Assessment, Testing & Recovery Plans

---

## 1. Executive Summary

Food Ordering System is a web-based restaurant ordering system designed for hotel restaurants, modeled after the self-service kiosk experience found in QSR chains like McDonald's and Jollibee. The system enables guests to browse menus, customize orders, and pay — all from touch-screen kiosks or personal devices. Orders flow in real-time to kitchen display screens, and payments are handled at a cashier station or via digital wallets (GCash, credit/debit cards).

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
- **F-A10**: Manage promo codes (discount %, validity period, usage limits)
- **F-A11**: BIR-compliant receipt configuration (TIN, permit number, series)

### 5.5 Additional Features (Phase 2+)
- **F-X01**: Order modification/cancellation (5-minute grace period after submit)
- **F-X02**: Table/room number validation against active reservations
- **F-X03**: Multi-language support (English, Tagalog minimum)
- **F-X04**: Nutritional information and allergen warnings
- **F-X05**: Guest order history via phone number lookup (optional account)
- **F-X06**: Kitchen station routing (grill, fryer, salad, dessert)
- **F-X07**: Delivery runner assignment for room service orders

---

## 6. User Stories & Acceptance Criteria

This section provides detailed user stories with acceptance criteria for key features. Each story follows the format: "As a [user], I want to [action] so that [benefit]."

### 6.1 Kiosk Module User Stories

#### US-K01: Browse Menu by Category
**As a** hotel guest
**I want to** browse menu items organized by category
**So that** I can quickly find what I'm looking for

**Acceptance Criteria:**
- [ ] Categories displayed as horizontal scrollable tabs at top of screen
- [ ] Tapping a category filters menu items instantly (no page reload)
- [ ] Each menu item card displays: image (16:9 ratio), name, short description (max 80 chars), price
- [ ] Default category is "Featured" or first category if no featured items
- [ ] Category with 0 available items is hidden from tabs
- [ ] Menu items load within 2 seconds on 4G connection
- [ ] Skeleton loaders shown while images load

#### US-K02: Customize Menu Item
**As a** hotel guest
**I want to** customize my order with add-ons and special instructions
**So that** I get exactly what I want

**Acceptance Criteria:**
- [ ] Tapping item opens customization modal/sheet
- [ ] Required add-on groups marked with asterisk (*) and must be selected before "Add to Cart"
- [ ] Optional add-on groups allow 0 selections
- [ ] Multi-select groups show checkboxes; single-select show radio buttons
- [ ] Running total updates in real-time as options are selected
- [ ] Special instructions textarea limited to 200 characters with counter
- [ ] "Add to Cart" button disabled until all required selections made
- [ ] Unavailable add-ons shown grayed out with "Unavailable" label

#### US-K03: Manage Shopping Cart
**As a** hotel guest
**I want to** review and modify my cart before checkout
**So that** I can ensure my order is correct

**Acceptance Criteria:**
- [ ] Cart icon in header shows item count badge (max "9+")
- [ ] Cart drawer/page shows all items with name, quantity, customizations, line total
- [ ] Quantity can be adjusted with +/- buttons (min 1, max 99)
- [ ] Swipe left or tap trash icon removes item with confirmation
- [ ] "Edit" button reopens customization modal for that item
- [ ] Subtotal, tax (12%), service charge (10%), and total displayed
- [ ] Empty cart shows illustration and "Start Ordering" CTA
- [ ] Cart persists across page refreshes (localStorage via Zustand)

#### US-K04: Complete Checkout
**As a** hotel guest
**I want to** select my order type and payment method
**So that** I can complete my order

**Acceptance Criteria:**
- [ ] Step 1: Select order type (Dine-in, Room Service, Takeout)
- [ ] Dine-in requires table number input (numeric, 1-999)
- [ ] Room Service requires room number input (alphanumeric, e.g., "301A")
- [ ] Takeout requires no additional input
- [ ] Step 2: Optional promo code input with "Apply" button
- [ ] Invalid promo shows inline error message (specific reason)
- [ ] Valid promo shows discount amount and updated total
- [ ] Step 3: Select payment method (Pay at Counter, GCash, Card)
- [ ] "Place Order" button shows final total amount
- [ ] Loading state prevents double-submission
- [ ] Success redirects to confirmation page with order number

#### US-K05: Idle Timeout Reset
**As a** restaurant operator
**I want** the kiosk to reset after inactivity
**So that** the next guest sees a fresh screen

**Acceptance Criteria:**
- [ ] 2-minute inactivity triggers warning modal: "Are you still there?" (30s countdown)
- [ ] Any touch/interaction dismisses warning and resets timer
- [ ] After countdown expires, cart is cleared and screen returns to welcome page
- [ ] In-progress payments are NOT interrupted (timeout paused during payment flow)
- [ ] Inactivity timer configurable in admin settings (default: 2 minutes)

### 6.2 Kitchen Display System User Stories

#### US-KD01: View Order Queue
**As a** kitchen staff member
**I want to** see all active orders in a queue
**So that** I can prepare them in the correct sequence

**Acceptance Criteria:**
- [ ] Orders displayed as cards in grid layout (responsive: 2-4 columns)
- [ ] Oldest orders appear first (top-left), newest last (bottom-right)
- [ ] Each card shows: order number, order type badge, table/room number, item list with quantities and customizations
- [ ] New orders trigger audio alert (configurable sound)
- [ ] New order card has brief highlight animation (pulse/glow)
- [ ] Screen auto-refreshes via Supabase Realtime (no manual refresh needed)

#### US-KD02: Track Order Age
**As a** kitchen staff member
**I want to** see how long each order has been waiting
**So that** I can prioritize older orders

**Acceptance Criteria:**
- [ ] Each order card shows elapsed time since payment (e.g., "3 min")
- [ ] Color coding: Green (0-5 min), Yellow (5-10 min), Red (>10 min)
- [ ] Timer updates every 30 seconds
- [ ] Border/background color changes based on age threshold
- [ ] Thresholds configurable in admin settings

#### US-KD03: Update Order Status
**As a** kitchen staff member
**I want to** mark orders as Preparing → Ready → Served
**So that** the system tracks order progress

**Acceptance Criteria:**
- [ ] Single tap/click on order card advances to next status
- [ ] Status badge updates immediately with visual feedback
- [ ] "Ready" status triggers notification to guest (if subscribed)
- [ ] "Served" orders move to separate "completed" section or hide after 5 min
- [ ] "Recall" button available for served orders (within 30 min)
- [ ] Long-press or swipe reveals additional actions (cancel, flag issue)

### 6.3 Cashier Module User Stories

#### US-C01: View Pending Payments
**As a** cashier
**I want to** see all orders waiting for payment
**So that** I can process them when guests arrive

**Acceptance Criteria:**
- [ ] List view of orders with status "pending_payment"
- [ ] Each row shows: order number, total amount, time remaining (countdown from 15 min)
- [ ] Sorted by creation time (oldest first)
- [ ] Clicking order opens payment processing modal
- [ ] Orders within 2 min of expiry highlighted in red
- [ ] Expired orders automatically removed from list

#### US-C02: Process Cash Payment
**As a** cashier
**I want to** record cash received and calculate change
**So that** I can complete cash transactions accurately

**Acceptance Criteria:**
- [ ] Order total displayed prominently
- [ ] Numeric keypad for entering cash received
- [ ] Quick-select buttons for common denominations (₱20, ₱50, ₱100, ₱500, ₱1000)
- [ ] Change calculated and displayed in real-time
- [ ] Cannot complete if cash received < total
- [ ] "Complete Payment" marks order as paid and sends to kitchen
- [ ] Receipt auto-prints (if printer configured) or shows print preview

#### US-C03: Process Refund
**As a** cashier
**I want to** process refunds for cancelled orders
**So that** guests can get their money back

**Acceptance Criteria:**
- [ ] Refund option available only for orders with status "paid" or later
- [ ] Refund requires manager PIN approval (4-digit code)
- [ ] Partial refund: select specific items to refund
- [ ] Full refund: one-click refund entire order
- [ ] Refund reason required (dropdown: guest request, wrong order, quality issue, other)
- [ ] For digital payments, refund initiated via PayMongo API
- [ ] Refund recorded in audit log with cashier ID and reason

### 6.4 Admin Module User Stories

#### US-A01: Manage Menu Items
**As a** restaurant manager
**I want to** add, edit, and disable menu items
**So that** the kiosk menu stays current

**Acceptance Criteria:**
- [ ] Table view of all menu items with search and category filter
- [ ] "Add Item" opens form: name, description, category, price, image upload
- [ ] Image upload accepts JPG/PNG, max 5MB, auto-resized to 800px width
- [ ] Required fields: name, category, price
- [ ] "Edit" opens same form pre-populated with current values
- [ ] "Toggle Availability" switches is_available without opening form
- [ ] "Delete" soft-deletes (sets deleted_at) with confirmation modal
- [ ] Bulk actions: select multiple items to toggle availability or delete
- [ ] Changes reflect on kiosk within 10 seconds (Realtime or revalidation)

#### US-A02: View Real-time Dashboard
**As a** restaurant manager
**I want to** see live metrics on a dashboard
**So that** I can monitor restaurant performance

**Acceptance Criteria:**
- [ ] Cards showing: Orders Today, Revenue Today, Avg Order Value, Active Kitchen Orders
- [ ] Revenue chart (line graph) showing hourly breakdown
- [ ] Top 5 selling items (today) with quantities
- [ ] Order status breakdown (pie chart): Pending, Preparing, Ready, Served
- [ ] Data refreshes every 60 seconds or on-demand refresh button
- [ ] Date picker to view historical data (past 90 days)
- [ ] Export to CSV button for detailed reports

---

## 7. Order Lifecycle (Process Flow)

```
Guest at Kiosk                           Kitchen Display              Cashier
─────────────────                        ───────────────              ───────
1. Browse Menu
2. Add Items to Cart
   (log event: cart_started)
3. Customize Items (add-ons)
4. Review Order
5. Select Order Type
   (dine-in/room/takeout)
   + Table/Room Number
6. Apply Promo Code (optional)
7. Choose Payment Method
   ├─ "Pay at Counter" ──────────────────────────────────→ 11. Pending Payment Queue
   │  8a. Order Created                                      12. Process Cash Payment
   │      (status: pending_payment)                          13. Calculate Change
   │      (expires_at: +15 min)                              14. Mark as Paid
   │  9a. Print Receipt                                      15. Print Official Receipt (BIR)
   │      (Order #A0042)                                         ↓
   │      [Must pay within 15 min]                              Order → Kitchen
   │
   ├─ GCash/Card
   │  8b. Create PayMongo Payment
   │      (idempotency_key = order_id)
   │  9b. Redirect to Payment Page
   │  10b. Payment Confirmed ──────────────→ (webhook)
   │      (order status: paid)              Auto-confirmed
   │
   └─ [All payment methods converge here] ─────────────→ 16. NEW ORDER ALERT 🔔
                                                            Order appears on KDS
                                                            (status: paid)
                                                            Timer starts (paid_at)
                                                         17. Mark "Preparing" (yellow)
                                                         18. Mark "Ready" (green) ──→ Guest Notification
                                                         19. Mark "Served" (gray)
                                                             → Auto-hide after 5 min

[TIMEOUT FLOW]
If unpaid order not paid within 15 min:
   → Cron job sets status = 'cancelled', payment_status = 'expired'
   → Removed from cashier pending queue
```

**Status Flow**:
- `pending_payment` (unpaid, 15-min countdown) → `paid` → `preparing` → `ready` → `served`
- Alternative: `pending_payment` → `cancelled` (timeout or guest cancellation)

---

## 8. Database Schema (Supabase / PostgreSQL)

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
- allergens (text[], array of allergens: dairy, nuts, gluten, shellfish, etc.)
- nutritional_info (jsonb: {calories, protein, carbs, fat, fiber, sodium})
- translations (jsonb: {en: {name, description}, tl: {name, description}})
- created_at, updated_at, deleted_at (soft delete — NEVER hard delete to preserve order history)

**addon_groups**
- id (uuid), name, is_required (bool)
- min_selections (int), max_selections (int)
- menu_item_id (FK → menu_items)

**addon_options**
- id (uuid), addon_group_id (FK), name
- additional_price (decimal), is_available (bool)

**orders**
- id (uuid), order_number (text, generated via DB sequence "A0001" — see implementation below)
- order_type (enum: dine_in | room_service | takeout)
- table_number (nullable), room_number (nullable)
- status (enum: pending_payment | paid | preparing | ready | served | cancelled)
- payment_status (enum: unpaid | processing | paid | refunded)
- payment_method (enum: cash | gcash | card | null)
- subtotal, tax_amount, service_charge, discount_amount, total_amount
- special_instructions (text, sanitized to prevent XSS)
- estimated_ready_at (timestamp)
- expires_at (timestamp, for unpaid orders — 15 min timeout)
- version (int, for optimistic locking on concurrent updates)
- promo_code_id (FK → promo_codes, nullable)
- guest_phone (text, nullable, for order history lookup)
- created_at, updated_at, paid_at, ready_at, served_at, deleted_at (soft delete)

**Order Number Generation (Race Condition Prevention)**
```sql
-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

-- Use DB function to generate formatted order number
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

-- Reset sequence daily (optional, for human-readable numbers)
-- Run via cron at midnight: SELECT setval('order_number_seq', 1, false);
```
**Result**: Thread-safe order numbers (A0001, A0002, ... A9999) with no duplicates even under 200+ concurrent inserts.

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

**promo_codes**
- id (uuid), code (text, unique), description
- discount_type (enum: percentage | fixed_amount)
- discount_value (decimal)
- min_order_amount (decimal, nullable)
- max_usage_count (int, nullable), current_usage_count (int, default 0)
- valid_from, valid_until (timestamps)
- is_active (bool)
- created_at, updated_at

**order_events**
- id (uuid), order_id (FK → orders)
- event_type (text: cart_started, item_added, checkout_initiated, payment_started, payment_completed, etc.)
- metadata (jsonb, stores additional context like item_id, quantity, etc.)
- created_at (timestamptz)
- **Purpose**: Analytics tracking for success metrics (avg order time, funnel analysis)

**kitchen_stations**
- id (uuid), name (text: Grill, Fryer, Salad, Dessert)
- description, is_active (bool)
- created_at, updated_at
- **Junction table**: menu_item_stations (menu_item_id, kitchen_station_id)

**bir_receipt_config** (Philippines compliance)
- id (uuid), tin (text, Tax Identification Number)
- business_name, business_address
- permit_number, permit_date_issued
- receipt_series_start (int), receipt_series_current (int)
- accreditation_number, accreditation_date
- pos_machine_id, terminal_id
- created_at, updated_at

**settings**
- id (uuid), key (unique), value (jsonb)
- e.g. tax_rate: 0.12, service_charge: 0.10, operating_hours: {...}
- **New settings**: unpaid_order_timeout_minutes: 15, order_grace_period_minutes: 5

### Indexes (Performance Critical)
```sql
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_order_events_event_type ON order_events(event_type);
```

---

## 9. Real-Time Architecture

Supabase Realtime is used for two critical flows. **Note**: With 200+ concurrent kiosks, efficient filtering is critical to prevent unnecessary broadcasts.

### 8.1 Kiosk → Kitchen
When an order is created or payment confirmed:
```typescript
// Kitchen Display subscribes with optimized filtering
supabase.channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=in.(paid,preparing,ready)'  // Only active orders
  }, (payload) => {
    // Client-side: Further filter by station if multi-station setup
    handleOrderChange(payload);
  })
  .subscribe()
```

**Scalability consideration**: In multi-restaurant hotels, add `location_id` filter:
```typescript
filter: 'status=in.(paid,preparing,ready).and(location_id=eq.main-restaurant)'
```

### 8.2 Kitchen → Kiosk (Order Ready Notification)
When kitchen marks order as "Ready":
```typescript
// Guest's kiosk session subscribes to their specific order
supabase.channel(`order-${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, handleStatusChange)
  .subscribe()
```

### 8.3 Order Age Calculation (Kitchen Display)
Color coding by order age (green < 5min, yellow 5-10min, red > 10min):
- **Reference timestamp**: `paid_at` (when order enters kitchen queue)
- **Update mechanism**: Client-side `setInterval` every 30 seconds
- **Formula**: `age_minutes = (Date.now() - new Date(order.paid_at)) / 60000`

```typescript
// Client-side hook in Kitchen Display
function useOrderAge(paidAt: string) {
  const [age, setAge] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setAge(Math.floor((Date.now() - new Date(paidAt).getTime()) / 60000));
    }, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [paidAt]);
  return age;
}
```

---

## 10. Payment Integration

### PayMongo (Philippines Payment Gateway)

#### GCash Flow
1. User selects GCash at kiosk
2. Server Action creates PayMongo GCash source with `idempotency_key = order_id`
3. User scans QR code or redirects to GCash app
4. PayMongo webhook sends confirmation to `/api/webhooks/paymongo`
5. Webhook handler validates HMAC signature + amount match
6. Order marked as `payment_status: paid`

#### Credit/Debit Card Flow
1. User enters card details via PayMongo Elements (iframe, PCI-compliant)
2. 3DS verification (if required by card issuer)
3. PayMongo payment intent created with `idempotency_key = order_id`
4. Webhook confirms payment
5. Order marked as paid

#### Webhook Security & Idempotency
```typescript
// /api/webhooks/paymongo/route.ts
export async function POST(req: Request) {
  // 1. Verify HMAC signature
  const signature = req.headers.get('paymongo-signature');
  const isValid = verifyWebhookSignature(await req.text(), signature);
  if (!isValid) return new Response('Unauthorized', { status: 401 });

  const event = await req.json();

  // 2. Check idempotency (prevent duplicate processing)
  const existingPayment = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', event.data.id)
    .single();
  if (existingPayment.data) {
    return new Response('Already processed', { status: 200 });
  }

  // 3. Verify payment amount matches order total
  const order = await supabase
    .from('orders')
    .select('total_amount')
    .eq('id', event.data.attributes.metadata.order_id)
    .single();

  const expectedAmount = Math.round(order.data.total_amount * 100); // Convert to centavos
  if (event.data.attributes.amount !== expectedAmount) {
    console.error('Payment amount mismatch', { expected: expectedAmount, received: event.data.attributes.amount });
    return new Response('Amount mismatch', { status: 400 });
  }

  // 4. Process payment
  await processPaymentConfirmation(event);
  return new Response('OK', { status: 200 });
}
```

### Cash Flow ("Pay at Counter")
- Order created with `payment_status: unpaid` and `expires_at = now() + 15 minutes`
- Kiosk prints receipt with order number + payment deadline
- Cashier sees order in pending payment queue
- Cashier processes cash → marks as paid
- **Auto-cancellation**: Scheduled job cancels unpaid orders after `expires_at`

```sql
-- Supabase Edge Function (cron job, runs every 5 minutes)
UPDATE orders
SET status = 'cancelled', payment_status = 'expired'
WHERE payment_status = 'unpaid'
  AND expires_at < NOW()
  AND status = 'pending_payment';
```

### Price Integrity Guarantee
**CRITICAL**: All payment amounts MUST be recalculated server-side to prevent client tampering.

```typescript
// Server Action: createOrder
export async function createOrder(cartItems: CartItem[]) {
  // NEVER trust client-submitted prices
  const menuItems = await supabase
    .from('menu_items')
    .select('id, base_price, addon_groups(addon_options(id, additional_price))')
    .in('id', cartItems.map(item => item.id));

  // Recalculate total server-side
  const calculatedTotal = cartItems.reduce((sum, cartItem) => {
    const menuItem = menuItems.find(m => m.id === cartItem.id);
    const itemTotal = menuItem.base_price * cartItem.quantity;
    const addonsTotal = cartItem.addons.reduce((addonSum, addon) => {
      const addonPrice = menuItem.addon_groups
        .flatMap(g => g.addon_options)
        .find(opt => opt.id === addon.id)?.additional_price || 0;
      return addonSum + addonPrice;
    }, 0);
    return sum + itemTotal + addonsTotal;
  }, 0);

  const taxAmount = calculatedTotal * 0.12; // 12% VAT
  const serviceCharge = calculatedTotal * 0.10; // 10% service charge
  const totalAmount = calculatedTotal + taxAmount + serviceCharge;

  // Insert order with server-calculated amounts
  await supabase.from('orders').insert({
    subtotal: calculatedTotal,
    tax_amount: taxAmount,
    service_charge: serviceCharge,
    total_amount: totalAmount,
    // ... other fields
  });
}
```

---

## 11. Security & Access Control

### Role-Based Access (Supabase RLS)

| Route Group | Required Role | Access Level |
|---|---|---|
| /(kiosk) | public / kiosk | Menu read, order create |
| /(kitchen) | kitchen, admin | Orders read/update status |
| /(cashier) | cashier, admin | Orders read, payments create |
| /(admin) | admin | Full CRUD on all tables |

### Supabase RLS Policies (examples)
```sql
-- Kiosk can only read active menu items (soft delete check)
CREATE POLICY "Public read active menu"
  ON menu_items FOR SELECT
  USING (is_available = true AND deleted_at IS NULL);

-- Kitchen can only update order status
CREATE POLICY "Kitchen update order status"
  ON orders FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('kitchen', 'admin'))
  WITH CHECK (status IN ('preparing', 'ready', 'served'));

-- Prevent direct price manipulation
CREATE POLICY "No price updates on submitted orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (
    (OLD.total_amount = NEW.total_amount) OR
    (auth.jwt() ->> 'role' = 'admin')
  );
```

### Additional Security Measures

#### 1. Rate Limiting (Prevent Kiosk Abuse)
```typescript
// middleware.ts (Next.js 16: can use middleware.ts or proxy.ts)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 orders per minute per IP
});

export async function middleware(request: Request) {
  if (request.url.includes('/api/orders/create')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await ratelimit.limit(ip);
    if (!success) return new Response('Too many requests', { status: 429 });
  }
}
```

#### 2. Input Sanitization (XSS Prevention)
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Server Action: sanitize all user-provided text
export async function createOrder(input: OrderInput) {
  const sanitized = {
    ...input,
    special_instructions: DOMPurify.sanitize(input.special_instructions, {
      ALLOWED_TAGS: [], // Strip all HTML
      ALLOWED_ATTR: []
    })
  };
  // ... proceed with sanitized input
}
```

#### 3. CSRF Protection on Server Actions
Next.js 16 Server Actions don't have built-in CSRF tokens. Mitigate with:
- **Origin header validation** (automatic in Next.js)
- **SameSite cookies** for auth tokens
- **Avoid sensitive actions on GET requests**

#### 4. Secrets Management
```bash
# .env.local (NEVER commit to git)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...  # Public, safe in browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...  # NEVER expose to client
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
```

**CRITICAL**: Never import `src/lib/supabase/admin.ts` in client components. Service role key bypasses RLS.

#### 5. SQL Injection Prevention
✅ Using Supabase query builder (parameterized queries) — safe by default
❌ Never use raw SQL with user input: `supabase.rpc('execute_sql', { query: userInput })`

#### 6. Soft Delete Pattern (Preserve Data Integrity)
```sql
-- Never hard-delete menu items (breaks historical order reports)
UPDATE menu_items SET deleted_at = NOW() WHERE id = $1;

-- Filter deleted items in queries
SELECT * FROM menu_items WHERE deleted_at IS NULL;
```

---

## 12. Non-Functional Requirements

- **Performance**:
  - Menu page load < 2s (with images)
  - Order submission < 1s
  - Kitchen display update latency < 500ms (via Realtime)
- **Availability**:
  - 99.9% uptime during operating hours (6am - 11pm)
  - Graceful degradation if payment gateway is down (cash fallback)
- **Scalability**:
  - Handle 200+ concurrent kiosk sessions
  - Support 500+ orders/day
  - Database query response time < 100ms (with proper indexing)
- **Accessibility**:
  - Touch targets ≥ 48px (WCAG 2.1 Level AA)
  - High contrast mode for kitchen display
  - Font size minimum 16px (kiosk), 18px (kitchen)
- **Offline Resilience**:
  - **Scope reduced to graceful degradation** (not full offline mode)
  - Show cached menu when offline, disable ordering
  - Display clear "Connection Lost" message
  - Retry failed requests with exponential backoff
  - **Note**: Full offline support with conflict resolution requires IndexedDB + sync logic — deferred to Phase 5+
- **Data Retention**:
  - Order history retained for 2 years (BIR compliance requirement)
  - Soft delete on menu items (preserve order history)
  - Payment records retained for 7 years (anti-money laundering)
- **Security**:
  - TLS 1.3 for all connections
  - Rate limiting: 10 orders/minute per IP
  - Input sanitization on all user-provided fields
  - Webhook signature verification (HMAC-SHA256)

---

## 13. Success Metrics

| Metric | Target | Tracking Implementation |
|---|---|---|
| Average order time (browse → submit) | < 3 minutes | `order_events` table: `cart_started` → `order_submitted` timestamp diff |
| Order accuracy rate | > 99% | Add "report incorrect order" feature → track `incorrect_orders / total_orders` |
| Kitchen order processing time | < 15 minutes | Calculate `ready_at - paid_at` in analytics dashboard |
| Payment success rate (digital) | > 98% | `payments` table: `SUM(status='success') / SUM(*)` for gcash/card |
| System uptime | > 99.9% | Vercel/Supabase health checks + status page monitoring |
| Cart abandonment rate | < 20% | `order_events`: `cart_started` events without matching `order_submitted` |
| Repeat customer rate | > 30% | Track orders by `guest_phone` — customers with 2+ orders |

### Analytics Dashboard Queries
```sql
-- Average order processing time (last 7 days)
SELECT AVG(EXTRACT(EPOCH FROM (ready_at - paid_at)) / 60) as avg_minutes
FROM orders
WHERE paid_at > NOW() - INTERVAL '7 days'
  AND ready_at IS NOT NULL;

-- Payment success rate by method
SELECT
  payment_method,
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY payment_method;

-- Cart abandonment funnel
WITH funnel AS (
  SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'cart_started') as started,
    COUNT(*) FILTER (WHERE event_type = 'order_submitted') as submitted
  FROM order_events
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT date, started, submitted,
       ((started - submitted) * 100.0 / started) as abandonment_rate
FROM funnel;
```

---

## 14. Milestones (Revised Timeline)

| Phase | Scope | Duration | Key Deliverables |
|---|---|---|---|
| **Phase 1 — Foundation** | Auth, DB schema, menu CRUD, basic kiosk UI | 2 weeks | ✅ Supabase setup with RLS<br>✅ Menu management admin panel<br>✅ Categories & items CRUD<br>✅ Image upload to Supabase Storage<br>✅ Staff authentication (PIN + role)<br>✅ Order number generation (DB sequence) |
| **Phase 2 — Ordering** | Cart, order flow, kitchen display, real-time | 2 weeks | ✅ Kiosk menu browsing + cart<br>✅ Order submission with add-ons<br>✅ Kitchen Display System (KDS)<br>✅ Realtime order updates<br>✅ Order age color coding<br>✅ Touch-optimized UI (≥48px targets) |
| **Phase 3 — Payments** | Cash, GCash, card integration, cashier module | **3 weeks** | ✅ PayMongo GCash integration<br>✅ PayMongo card payments (3DS)<br>✅ Webhook handler with idempotency<br>✅ Cashier POS interface<br>✅ Cash payment + change calculation<br>✅ Unpaid order timeout (15 min)<br>✅ BIR-compliant receipt generation |
| **Phase 4 — Admin & Polish** | Analytics, reports, promo codes, multi-language | 2 weeks | ✅ Real-time dashboard (revenue, orders)<br>✅ Sales reports (date range, category)<br>✅ Promo code management<br>✅ Multi-language (EN, TL)<br>✅ Allergen/nutrition info<br>✅ Audit log |
| **Phase 5 — Testing & Deploy** | E2E testing, load testing, security audit, deployment | **2 weeks** | ✅ Playwright E2E tests (kiosk → kitchen flow)<br>✅ Load testing (200 concurrent users)<br>✅ Security audit (OWASP top 10)<br>✅ Vercel production deployment<br>✅ Monitoring + alerts setup |

**Total Duration**: 11 weeks (previously 8 weeks)

**Risk Buffer**: +1 week for unexpected issues (payment gateway downtime, schema changes)

---

## 15. Risk Assessment Matrix

### 14.1 Risk Categories

| Risk ID | Risk Description | Probability | Impact | Risk Score | Mitigation Strategy | Contingency Plan |
|---------|-----------------|-------------|--------|------------|---------------------|------------------|
| **R-01** | PayMongo API downtime during peak hours | Medium | High | **High** | Monitor PayMongo status page; implement retry with exponential backoff | Enable "Pay at Counter" as automatic fallback; queue digital payments for retry |
| **R-02** | 200+ concurrent kiosk sessions overwhelm database | Low | Critical | **High** | Connection pooling via Supabase; indexed queries; load testing in Phase 5 | Scale Supabase plan; implement request queuing; temporary order throttling |
| **R-03** | Race condition in order number generation | Low | High | **Medium** | Database sequence (implemented); no application-level number generation | Manual order number assignment by cashier |
| **R-04** | Supabase Realtime connection drops | Medium | Medium | **Medium** | Heartbeat monitoring; auto-reconnect logic; visual indicator for staff | Manual page refresh; fallback to polling every 30s |
| **R-05** | Menu image storage quota exceeded | Low | Low | **Low** | Image compression on upload; monitor storage usage | Upgrade Supabase storage plan; archive old images |
| **R-06** | Webhook delivery failure (PayMongo) | Medium | High | **High** | Idempotent webhook handler; verify payment status on order lookup | Manual payment verification via PayMongo dashboard |
| **R-07** | Staff PIN compromise | Medium | Medium | **Medium** | PIN change every 90 days; audit log of all logins; 5 failed attempts = lockout | Admin can reset PIN; investigate suspicious activity |
| **R-08** | Browser crashes mid-payment | Medium | Medium | **Medium** | Payment status persisted before redirect; recovery flow on return | Cashier can verify payment status; complete order manually |
| **R-09** | Incorrect price displayed (stale cache) | Low | High | **Medium** | Server-side price recalculation (implemented); short cache TTL on menu | Refund process; audit log for price discrepancies |
| **R-10** | Kitchen display hardware failure | Low | High | **Medium** | KDS runs on standard browser; any device can access URL | Backup tablet/laptop; temporary paper ticket printing |

### 14.2 Risk Score Matrix

```
                    IMPACT
                Low    Medium    High    Critical
           ┌────────┬─────────┬────────┬──────────┐
    High   │ Medium │  High   │  High  │ Critical │
Probability├────────┼─────────┼────────┼──────────┤
   Medium  │  Low   │ Medium  │  High  │   High   │
           ├────────┼─────────┼────────┼──────────┤
    Low    │  Low   │  Low    │ Medium │   High   │
           └────────┴─────────┴────────┴──────────┘
```

### 14.3 Risk Response Actions

| Risk Score | Response | Review Frequency |
|------------|----------|------------------|
| **Critical** | Immediate mitigation required; escalate to stakeholders | Daily |
| **High** | Mitigation plan must be in place before go-live | Weekly |
| **Medium** | Monitor and mitigate within sprint | Bi-weekly |
| **Low** | Accept risk; monitor periodically | Monthly |

---

## 16. System Scope Clarifications

### 14.1 Single-Tenant or Multi-Tenant?
**Decision**: Single-tenant (single hotel/restaurant installation)
- Schema does NOT include `hotel_id` or `tenant_id`
- If multi-tenant needed in future, major refactor required (add `tenant_id` to all tables + RLS updates)

### 14.2 Room Service Delivery Tracking
**Phase 1-3 Scope**: Orders marked "Ready" in kitchen, no delivery tracking
**Phase 4+ Enhancement**: Add delivery runner assignment
```sql
-- Future: add delivery tracking
ALTER TABLE orders ADD COLUMN runner_id UUID REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN delivery_status TEXT CHECK (delivery_status IN ('pending', 'in_transit', 'delivered'));
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
```

### 14.3 Tax & Service Charge Calculation
**Application Logic**:
```typescript
const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
const taxAmount = subtotal * settings.tax_rate; // 12% VAT on subtotal + addons
const serviceCharge = subtotal * settings.service_charge; // 10% on subtotal only (not on tax)
const totalAmount = subtotal + taxAmount + serviceCharge - discountAmount;
```

**Configurable**: Tax rate and service charge stored in `settings` table
**Edge case**: Some items may be tax-exempt (e.g., senior citizen discount) — handled via promo codes

### 14.4 Promo Code Validation Rules
- **Code uniqueness**: Case-insensitive, alphanumeric only
- **Validation checks**:
  1. Code exists and `is_active = true`
  2. Current date between `valid_from` and `valid_until`
  3. `current_usage_count < max_usage_count` (if limit set)
  4. Order subtotal ≥ `min_order_amount` (if set)
- **Application**: Discount applied BEFORE tax calculation
- **Type handling**:
  - `percentage`: e.g., 20% off → `discount_amount = subtotal * 0.20`
  - `fixed_amount`: e.g., ₱100 off → `discount_amount = 100`

### 14.5 BIR-Compliant Receipt Requirements (Philippines)
Official receipts MUST include:
- Business name, address, TIN (Tax Identification Number)
- Receipt series number (sequential, no gaps)
- Date and time of transaction
- Itemized list with VAT breakdown
- "THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT TO USE"
- BIR accreditation info (permit number, date issued)
- POS machine ID / terminal ID

**Implementation**: Generate PDF receipt via `react-pdf` or use thermal printer with ESC/POS commands

---

## 17. Standardized Error Codes

All errors returned by the system follow a consistent format for easier debugging and user communication.

### 16.1 Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;        // E.g., "E1001"
    message: string;     // User-friendly message
    details?: unknown;   // Additional context (validation errors, etc.)
    timestamp: string;   // ISO 8601 timestamp
    traceId?: string;    // For support ticket reference
  };
}
```

### 16.2 Error Code Registry

#### Authentication Errors (E1xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E1001 | Invalid credentials | 401 | Wrong email/PIN | Re-enter credentials |
| E1002 | Session expired | 401 | JWT token expired | Re-authenticate |
| E1003 | Account locked | 403 | 5 failed login attempts | Contact admin to unlock |
| E1004 | Insufficient permissions | 403 | Role doesn't have access | Contact admin |
| E1005 | Invalid PIN format | 400 | PIN not 4-6 digits | Enter valid PIN |

#### Order Errors (E2xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E2001 | Order not found | 404 | Invalid order ID | Verify order number |
| E2002 | Order already paid | 409 | Duplicate payment attempt | No action needed |
| E2003 | Order expired | 410 | Past 15-min payment window | Create new order |
| E2004 | Order modification not allowed | 403 | Past 5-min grace period | Contact cashier |
| E2005 | Invalid order status transition | 400 | E.g., "served" → "preparing" | Follow status workflow |
| E2006 | Cart is empty | 400 | Checkout with no items | Add items to cart |
| E2007 | Item unavailable | 409 | Menu item out of stock | Remove item from cart |
| E2008 | Invalid table number | 400 | Table doesn't exist | Enter valid table number |
| E2009 | Invalid room number | 400 | Room format invalid | Enter valid room number |

#### Payment Errors (E3xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E3001 | Payment declined | 402 | Card declined by bank | Try different payment method |
| E3002 | Payment gateway unavailable | 503 | PayMongo down | Use cash payment |
| E3003 | Invalid payment amount | 400 | Amount mismatch | Retry payment |
| E3004 | Refund not allowed | 403 | Order status invalid | Contact manager |
| E3005 | Insufficient cash received | 400 | Cash < total | Collect more cash |
| E3006 | Payment timeout | 408 | GCash/card flow timed out | Retry payment |
| E3007 | Duplicate payment detected | 409 | Same payment processed twice | Check payment status |

#### Menu Errors (E4xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E4001 | Menu item not found | 404 | Item deleted or invalid ID | Refresh menu |
| E4002 | Category not found | 404 | Category deleted or invalid ID | Refresh menu |
| E4003 | Required addon not selected | 400 | Missing required customization | Select required options |
| E4004 | Invalid addon selection | 400 | Addon doesn't belong to item | Refresh and retry |
| E4005 | Image upload failed | 500 | Storage error | Retry upload |
| E4006 | Image too large | 400 | File > 5MB | Compress image |
| E4007 | Invalid image format | 400 | Not JPG/PNG | Use supported format |

#### Promo Code Errors (E5xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E5001 | Invalid promo code | 400 | Code doesn't exist | Check code spelling |
| E5002 | Promo code expired | 410 | Past valid_until date | Use different code |
| E5003 | Promo code not yet active | 400 | Before valid_from date | Wait or use different code |
| E5004 | Promo code usage limit reached | 410 | max_usage_count exceeded | Use different code |
| E5005 | Minimum order not met | 400 | Subtotal < min_order_amount | Add more items |
| E5006 | Promo code already applied | 409 | Duplicate application | Continue checkout |

#### System Errors (E9xxx)
| Code | Message | HTTP Status | Cause | Resolution |
|------|---------|-------------|-------|------------|
| E9001 | Internal server error | 500 | Unhandled exception | Retry; contact support |
| E9002 | Database connection failed | 503 | Supabase unavailable | Retry in 30 seconds |
| E9003 | Rate limit exceeded | 429 | Too many requests | Wait 1 minute |
| E9004 | Service temporarily unavailable | 503 | Scheduled maintenance | Check status page |
| E9005 | Request validation failed | 400 | Malformed request body | Check input format |

### 16.3 Error Handling Implementation

```typescript
// src/lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID(),
      },
    };
  }
}

// Usage in Server Action
export async function processPayment(orderId: string, method: PaymentMethod) {
  const order = await getOrder(orderId);

  if (!order) {
    throw new AppError('E2001', 'Order not found', 404);
  }

  if (order.payment_status === 'paid') {
    throw new AppError('E2002', 'Order already paid', 409);
  }

  if (new Date() > new Date(order.expires_at)) {
    throw new AppError('E2003', 'Order expired', 410);
  }

  // ... process payment
}
```

---

## 18. Testing Strategy

### 17.1 Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E (10%) │  ← Playwright: Critical user flows
                    ├─────────────┤
                  ┌─┴─────────────┴─┐
                  │ Integration (30%)│  ← Server Actions + DB
                  ├───────────────────┤
                ┌─┴───────────────────┴─┐
                │     Unit Tests (60%)   │  ← Utils, validators, hooks
                └────────────────────────┘
```

### 17.2 Test Coverage Targets

| Area | Target Coverage | Priority |
|------|----------------|----------|
| Server Actions (`src/services/`) | ≥ 90% | Critical |
| Zod Validators (`src/lib/validators/`) | 100% | Critical |
| Utility Functions (`src/lib/utils/`) | ≥ 95% | High |
| React Hooks (`src/hooks/`) | ≥ 80% | High |
| UI Components (`src/components/`) | ≥ 70% | Medium |
| **Overall** | **≥ 80%** | — |

### 17.3 E2E Test Scenarios (Playwright)

#### Critical Path Tests (Must Pass)

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| E2E-01 | Guest places order (Pay at Counter) | Browse → Add to cart → Checkout → Select "Pay at Counter" | Order created with status "pending_payment" |
| E2E-02 | Guest places order (GCash) | Browse → Add to cart → Checkout → Pay with GCash → Webhook | Order status "paid", appears in kitchen |
| E2E-03 | Kitchen processes order | New order appears → Mark "Preparing" → Mark "Ready" | Order status updates in real-time |
| E2E-04 | Cashier processes cash payment | Find pending order → Enter cash → Complete | Order paid, sent to kitchen |
| E2E-05 | Admin creates menu item | Login → Menu Management → Add Item → Save | Item appears on kiosk |
| E2E-06 | Order timeout | Create unpaid order → Wait 15 min | Order status "cancelled" |

#### Edge Case Tests

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| E2E-07 | Duplicate payment prevention | Submit same payment twice rapidly | Second request returns "already paid" |
| E2E-08 | Cart persistence | Add items → Refresh page | Cart items preserved |
| E2E-09 | Promo code validation | Apply invalid code → Apply valid code | Error then discount applied |
| E2E-10 | Concurrent order numbers | 10 simultaneous order submissions | All receive unique order numbers |
| E2E-11 | Network interruption | Disconnect during checkout → Reconnect | Graceful recovery or clear error |
| E2E-12 | Session timeout | Leave kiosk idle 2+ minutes | Cart cleared, welcome screen shown |

### 17.4 Load Testing Plan

**Tool**: k6 (Grafana) or Artillery

**Test Scenarios**:

| Scenario | Virtual Users | Duration | Success Criteria |
|----------|--------------|----------|------------------|
| Baseline | 50 | 5 min | p95 < 500ms, 0% errors |
| Normal Load | 100 | 15 min | p95 < 1s, < 0.1% errors |
| Peak Load | 200 | 10 min | p95 < 2s, < 1% errors |
| Stress Test | 300 | 5 min | System degrades gracefully |
| Spike Test | 50 → 250 → 50 | 10 min | Recovery within 2 min |

**Key Metrics**:
- Response time (p50, p95, p99)
- Throughput (requests/second)
- Error rate (%)
- Database connection pool usage
- Supabase Realtime message latency

**Load Test Script Example**:
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },  // Peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Simulate kiosk user flow
  const menuRes = http.get(`${__ENV.BASE_URL}/api/menu`);
  check(menuRes, { 'menu loaded': (r) => r.status === 200 });

  sleep(Math.random() * 3 + 2); // Browse time: 2-5 seconds

  const orderRes = http.post(`${__ENV.BASE_URL}/api/orders`, JSON.stringify({
    items: [{ id: 'test-item-1', quantity: 1 }],
    orderType: 'dine_in',
    tableNumber: Math.floor(Math.random() * 50) + 1,
  }));
  check(orderRes, { 'order created': (r) => r.status === 201 });

  sleep(1);
}
```

### 17.5 Security Testing

**OWASP Top 10 Checklist**:

| Vulnerability | Test Method | Tools |
|---------------|-------------|-------|
| A01: Broken Access Control | Attempt unauthorized actions | Manual + Playwright |
| A02: Cryptographic Failures | Check TLS, password storage | SSL Labs, manual review |
| A03: Injection | SQL injection, XSS payloads | OWASP ZAP, manual testing |
| A04: Insecure Design | Architecture review | Manual code review |
| A05: Security Misconfiguration | Check headers, defaults | Mozilla Observatory |
| A06: Vulnerable Components | Dependency audit | `npm audit`, Snyk |
| A07: Auth Failures | Brute force, session hijacking | Manual testing |
| A08: Data Integrity Failures | Tamper with prices, totals | Manual testing |
| A09: Logging Failures | Check audit logs | Manual review |
| A10: SSRF | Internal network access | Manual testing |

---

## 19. Data Migration Strategy

### 18.1 Initial Data Population

#### Phase 1: Required Seed Data

| Table | Data Source | Method | Validation |
|-------|------------|--------|------------|
| `profiles` | Admin creates manually | Admin UI | At least 1 admin user |
| `categories` | Client spreadsheet | CSV import script | Unique slugs, display order |
| `menu_items` | Client spreadsheet + images | CSV import + image upload | Prices > 0, valid category FK |
| `addon_groups` | Part of menu items sheet | CSV import | Valid menu_item FK |
| `addon_options` | Part of menu items sheet | CSV import | Prices ≥ 0 |
| `settings` | Default configuration | SQL seed script | All required keys present |
| `bir_receipt_config` | Client provides | Admin UI | Valid TIN format |

#### Seed Script Structure

```sql
-- supabase/seed.sql (run after migrations)

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '0.12'),
  ('service_charge', '0.10'),
  ('unpaid_order_timeout_minutes', '15'),
  ('order_grace_period_minutes', '5'),
  ('idle_timeout_seconds', '120'),
  ('operating_hours', '{"open": "06:00", "close": "23:00"}')
ON CONFLICT (key) DO NOTHING;

-- Default admin user (password should be changed immediately)
-- Note: In production, create admin via Supabase Auth UI
INSERT INTO profiles (id, full_name, role, pin_code)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Placeholder, link to auth.users
  'System Admin',
  'admin',
  '123456'  -- CHANGE IMMEDIATELY
);
```

### 18.2 CSV Import Format

**menu_items.csv**:
```csv
category_slug,name,description,base_price,preparation_time_minutes,is_available,is_featured,allergens,image_filename
appetizers,Spring Rolls,Crispy vegetable spring rolls with sweet chili sauce,120.00,10,true,false,"gluten",spring-rolls.jpg
main-course,Grilled Salmon,Atlantic salmon with lemon butter sauce,580.00,20,true,true,"fish",grilled-salmon.jpg
```

**Import Script**:
```typescript
// scripts/import-menu.ts
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

async function importMenu(csvPath: string) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  for (const record of records) {
    // 1. Get category ID from slug
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', record.category_slug)
      .single();

    if (!category) {
      console.error(`Category not found: ${record.category_slug}`);
      continue;
    }

    // 2. Upload image if exists
    let imageUrl = null;
    if (record.image_filename) {
      const imagePath = `./import-images/${record.image_filename}`;
      const { data } = await supabase.storage
        .from('menu-images')
        .upload(`items/${record.image_filename}`, fs.readFileSync(imagePath));
      imageUrl = supabase.storage.from('menu-images').getPublicUrl(data!.path).data.publicUrl;
    }

    // 3. Insert menu item
    const { error } = await supabase.from('menu_items').insert({
      category_id: category.id,
      name: record.name,
      slug: slugify(record.name),
      description: record.description,
      base_price: parseFloat(record.base_price),
      preparation_time_minutes: parseInt(record.preparation_time_minutes),
      is_available: record.is_available === 'true',
      is_featured: record.is_featured === 'true',
      allergens: record.allergens ? record.allergens.split(',') : [],
      image_url: imageUrl,
    });

    if (error) console.error(`Failed to import ${record.name}:`, error);
    else console.log(`Imported: ${record.name}`);
  }
}
```

### 18.3 Data Validation Checklist

Before go-live, verify:

- [ ] All categories have at least one visible menu item
- [ ] All menu items have images (no broken image links)
- [ ] All prices are positive numbers
- [ ] All required addon groups have at least one option
- [ ] At least one admin user can log in
- [ ] At least one cashier user can log in
- [ ] At least one kitchen user can log in
- [ ] BIR receipt config is complete and valid
- [ ] Tax rate and service charge are correctly configured
- [ ] Operating hours are set correctly

---

## 20. Disaster Recovery & Rollback Procedures

### 19.1 Backup Strategy

| Data Type | Backup Frequency | Retention | Storage |
|-----------|-----------------|-----------|---------|
| Database (full) | Daily at 2 AM | 30 days | Supabase automatic + manual S3 |
| Database (WAL/incremental) | Continuous | 7 days | Supabase Point-in-Time Recovery |
| Menu images | On upload | Indefinite | Supabase Storage (replicated) |
| Application code | Every deploy | Indefinite | Git + Vercel deployments |

### 19.2 Recovery Time Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|---------------------|-----------------|
| Application crash | < 5 minutes | 0 (stateless) |
| Database corruption | < 1 hour | < 5 minutes (PITR) |
| Complete region failure | < 4 hours | < 1 hour |
| Accidental data deletion | < 30 minutes | < 24 hours (daily backup) |

### 19.3 Rollback Procedures

#### Application Rollback (Vercel)

```bash
# List recent deployments
vercel ls --production

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or via Vercel dashboard:
# Project → Deployments → Click "..." → Promote to Production
```

#### Database Migration Rollback

```sql
-- Each migration file should have rollback comments
-- Example: 015_add_promo_codes.sql

-- MIGRATION (UP)
CREATE TABLE promo_codes (...);

-- ROLLBACK (DOWN) - Run manually if needed
-- DROP TABLE promo_codes;
-- DELETE FROM supabase_migrations.schema_migrations WHERE version = '015';
```

**Rollback Steps**:
1. Identify the problematic migration version
2. Take a database backup before rollback
3. Run the rollback SQL commands
4. Deploy the previous application version
5. Verify system functionality
6. Document incident in post-mortem

#### Emergency Procedures

**Scenario 1: PayMongo Outage**
1. Monitor https://status.paymongo.com
2. Disable GCash/Card options in UI (feature flag in `settings`)
3. Notify cashiers to expect increased cash payments
4. Re-enable when PayMongo recovers
5. Process any queued digital payments

**Scenario 2: Supabase Outage**
1. Monitor https://status.supabase.com
2. System enters read-only mode (cached menu data)
3. Display "System temporarily unavailable" for new orders
4. Kitchen continues with existing orders (local state)
5. Re-sync when Supabase recovers

**Scenario 3: Corrupted Order Data**
1. Identify affected orders via audit log
2. Restore from Point-in-Time Recovery (Supabase dashboard)
3. Reconcile any payments made during corruption window
4. Notify affected guests via phone (if available)

### 19.4 Incident Response Checklist

```markdown
## Incident Report Template

**Incident ID**: INC-YYYY-MM-DD-###
**Severity**: Critical / High / Medium / Low
**Status**: Investigating / Identified / Monitoring / Resolved

### Timeline
- **Detected**: [timestamp]
- **Acknowledged**: [timestamp]
- **Mitigated**: [timestamp]
- **Resolved**: [timestamp]

### Impact
- Users affected: [number]
- Orders impacted: [number]
- Revenue impact: ₱[amount]

### Root Cause
[Description]

### Resolution
[Steps taken]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]

### Participants
- Incident Commander: [name]
- Technical Lead: [name]
```

---

## 21. Accessibility Compliance Plan

### 20.1 WCAG 2.1 Level AA Compliance

OrderFlow commits to WCAG 2.1 Level AA compliance for all modules, with enhanced accessibility for the kiosk (public-facing) interface.

#### Perceivable

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 1.1.1 Non-text Content | All images have alt text | `<Image alt="..." />` for all menu images |
| 1.3.1 Info and Relationships | Semantic HTML structure | Use proper headings, lists, tables |
| 1.4.1 Use of Color | Color not sole indicator | Icons + color for status; labels on all indicators |
| 1.4.3 Contrast (Minimum) | 4.5:1 text, 3:1 UI components | Verified via axe DevTools |
| 1.4.4 Resize Text | 200% zoom without loss | Responsive design, rem units |
| 1.4.11 Non-text Contrast | 3:1 for UI components | Border + background contrast on buttons |

#### Operable

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 2.1.1 Keyboard | All functions keyboard accessible | Tab navigation, Enter/Space activation |
| 2.4.1 Bypass Blocks | Skip navigation link | "Skip to menu" link on kiosk |
| 2.4.3 Focus Order | Logical focus sequence | DOM order matches visual order |
| 2.4.4 Link Purpose | Clear link text | No "click here" links |
| 2.4.7 Focus Visible | Visible focus indicator | Custom focus ring (3px solid) |
| 2.5.5 Target Size | ≥ 44x44px touch targets | Minimum 48px on kiosk (exceeds requirement) |

#### Understandable

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 3.1.1 Language of Page | `lang` attribute | `<html lang="en">` or `lang="tl"` |
| 3.2.1 On Focus | No unexpected changes | No auto-submit on focus |
| 3.3.1 Error Identification | Errors clearly described | Inline error messages with icons |
| 3.3.2 Labels or Instructions | Form fields labeled | `<Label>` for all inputs |

#### Robust

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 4.1.1 Parsing | Valid HTML | ESLint jsx-a11y plugin |
| 4.1.2 Name, Role, Value | ARIA where needed | shadcn/ui components (built-in) |

### 20.2 Module-Specific Requirements

#### Kiosk (Public-Facing)

- **Touch targets**: Minimum 48x48px (56px recommended for primary actions)
- **Font sizes**: Body text ≥ 18px, headings ≥ 24px
- **High contrast mode**: Toggle available in settings
- **Timeout warning**: 30-second audio + visual countdown before session reset
- **Screen reader support**: Full ARIA labels on all interactive elements

#### Kitchen Display System

- **High contrast default**: Dark background, bright text
- **Font sizes**: Minimum 20px for order details, 28px for order numbers
- **Audio alerts**: Configurable volume and tone
- **Color-blind friendly**: Patterns/icons supplement color coding (not just red/yellow/green)

### 20.3 Testing Tools & Process

| Tool | Purpose | Frequency |
|------|---------|-----------|
| axe DevTools (browser) | Automated accessibility audit | Every PR |
| WAVE | Visual accessibility report | Weekly |
| NVDA / VoiceOver | Screen reader testing | Before each release |
| Keyboard-only navigation | Manual testing | Before each release |
| Color contrast analyzer | Verify contrast ratios | When adding new colors |

### 20.4 Accessibility Testing Checklist

Before each release:

- [ ] All pages pass axe DevTools with 0 critical/serious issues
- [ ] Complete user flow navigable via keyboard only
- [ ] Screen reader announces all actions and feedback
- [ ] Error messages announced to screen reader
- [ ] Focus never gets trapped in modals
- [ ] Loading states announced (`aria-busy`, `aria-live`)
- [ ] Touch targets measured and verified ≥ 48px

---

## 22. Open Questions & Future Enhancements

### Phase 6+ (Future Roadmap)
- **Loyalty program**: Points accumulation, rewards redemption
- **Inventory management**: Track ingredient stock, auto-disable out-of-stock items
- **Reservation integration**: Link dine-in orders to table reservations
- **Mobile app**: Native iOS/Android app for room service ordering
- **Multi-location support**: Convert to multi-tenant for hotel chains
- **AI recommendations**: "Customers who ordered X also ordered Y"
- **Voice ordering**: Accessibility feature for visually impaired guests

### Questions for Stakeholders
1. **Table/room validation**: Should system validate table numbers against PMS (Property Management System)?
2. **Kitchen printer integration**: Do we need auto-print order tickets, or is KDS screen sufficient?
3. **Guest accounts**: Optional account creation for order history, or always anonymous with phone number?
4. **Tip handling**: Should cashier module support tip entry (common in US, less common in PH)?
5. **Multiple payment methods**: Support split payment (e.g., ₱500 cash + ₱500 GCash on ₱1000 order)?

---

## 23. Glossary

| Term | Definition |
|------|------------|
| **3DS** | 3D Secure — An authentication protocol for online card payments that adds an extra verification step (e.g., OTP from bank). |
| **Add-on** | Optional customization for a menu item (e.g., extra cheese, size upgrade) that may have an additional price. |
| **BIR** | Bureau of Internal Revenue — The Philippine government agency responsible for tax collection. Official receipts must comply with BIR regulations. |
| **Bump Bar** | A physical input device used in kitchens to advance order status without touching the screen (common in commercial KDS setups). |
| **CSRF** | Cross-Site Request Forgery — A security attack that tricks users into performing unintended actions. Mitigated via SameSite cookies and origin validation. |
| **E2E Test** | End-to-End Test — Automated tests that simulate complete user flows from start to finish (e.g., browse menu → checkout → payment). |
| **GCash** | A popular mobile wallet in the Philippines, integrated via PayMongo API. |
| **HMAC** | Hash-based Message Authentication Code — A cryptographic method used to verify webhook signatures from payment providers. |
| **Idempotency** | The property that performing an operation multiple times has the same effect as performing it once. Critical for payment processing to prevent duplicate charges. |
| **JWT** | JSON Web Token — A compact, URL-safe token format used for authentication. Contains encoded user information and role. |
| **KDS** | Kitchen Display System — A screen-based system that shows incoming orders to kitchen staff, replacing paper tickets. |
| **OWASP** | Open Web Application Security Project — A nonprofit organization that publishes security guidelines and the "OWASP Top 10" list of common vulnerabilities. |
| **PayMongo** | A Philippine payment gateway that processes GCash, credit cards, and other payment methods. |
| **PITR** | Point-in-Time Recovery — Database backup feature that allows restoration to any specific moment in time. |
| **PMS** | Property Management System — Hotel software that manages reservations, room assignments, and guest information. |
| **POS** | Point of Sale — The system where payment transactions occur; in this context, the Cashier module. |
| **QSR** | Quick Service Restaurant — Fast food establishments with self-service ordering (e.g., McDonald's, Jollibee). |
| **RLS** | Row Level Security — Supabase/PostgreSQL feature that restricts which rows users can access based on policies. |
| **RPO** | Recovery Point Objective — Maximum acceptable amount of data loss measured in time (e.g., "< 5 minutes" means at most 5 minutes of data could be lost). |
| **RTO** | Recovery Time Objective — Maximum acceptable downtime before the system must be restored. |
| **Server Action** | Next.js feature allowing server-side code to be called directly from client components without creating API routes. |
| **Soft Delete** | Marking records as deleted (via `deleted_at` timestamp) instead of permanently removing them, preserving data for historical reports. |
| **SSR** | Server-Side Rendering — Generating HTML on the server for each request, providing faster initial page loads and SEO benefits. |
| **Supabase** | An open-source Firebase alternative providing PostgreSQL database, authentication, real-time subscriptions, and file storage. |
| **TIN** | Tax Identification Number — Unique identifier assigned by BIR to businesses and individuals for tax purposes. |
| **Turbopack** | Next.js's Rust-based bundler, faster than Webpack; default in Next.js 16. |
| **VAT** | Value Added Tax — A consumption tax added to products/services. In the Philippines, standard rate is 12%. |
| **WAL** | Write-Ahead Logging — PostgreSQL feature that logs changes before writing to database, enabling point-in-time recovery. |
| **WCAG** | Web Content Accessibility Guidelines — International standards for making web content accessible to people with disabilities. |
| **Webhook** | HTTP callback triggered by an external service (e.g., PayMongo sends payment confirmation to our `/api/webhooks/paymongo` endpoint). |
| **XSS** | Cross-Site Scripting — A security vulnerability where malicious scripts are injected into web pages. Prevented via input sanitization. |
| **Zod** | A TypeScript-first schema validation library used to validate form inputs and API responses. |
| **Zustand** | A lightweight state management library for React applications, used for client-side cart state. |

---

## 24. Version History

### Version 1.2 (February 5, 2026)
**Major Updates — PRD Enhancement**:
- ✅ Added **Section 6: User Stories & Acceptance Criteria** with detailed stories for all modules (Kiosk, Kitchen, Cashier, Admin)
- ✅ Added **Section 15: Risk Assessment Matrix** with 10 identified risks, mitigation strategies, and contingency plans
- ✅ Added **Section 17: Standardized Error Codes** with comprehensive error taxonomy (E1xxx–E9xxx)
- ✅ Added **Section 18: Testing Strategy** including:
  - Testing pyramid with coverage targets
  - E2E test scenarios for Playwright
  - Load testing plan with k6 scripts
  - Security testing checklist (OWASP Top 10)
- ✅ Added **Section 19: Data Migration Strategy** with:
  - Initial data population plan
  - CSV import format and scripts
  - Data validation checklist
- ✅ Added **Section 20: Disaster Recovery & Rollback Procedures** including:
  - Backup strategy and retention
  - RTO/RPO objectives
  - Application and database rollback procedures
  - Emergency procedures for common scenarios
  - Incident response template
- ✅ Added **Section 21: Accessibility Compliance Plan** with:
  - WCAG 2.1 Level AA compliance matrix
  - Module-specific accessibility requirements
  - Testing tools and processes
- ✅ Added **Section 23: Glossary** with 35+ term definitions

### Version 1.1 (February 5, 2026)
**Major Updates**:
- ✅ Added **order number generation via DB sequence** to prevent race conditions (concurrent order creation)
- ✅ Enhanced **payment webhook security** with idempotency checks, HMAC signature verification, amount validation
- ✅ Implemented **server-side price recalculation** to prevent client tampering
- ✅ Added **unpaid order timeout** (15-minute expiration for "Pay at Counter" orders)
- ✅ Clarified **kitchen order age calculation** (client-side timer with 30s refresh interval)
- ✅ Reduced **offline resilience scope** to graceful degradation (not full offline mode with conflict resolution)
- ✅ Added **security measures**: rate limiting, input sanitization, CSRF mitigation, soft delete pattern
- ✅ Expanded **database schema** with:
  - `promo_codes` table (discount management)
  - `order_events` table (analytics tracking for success metrics)
  - `kitchen_stations` table (multi-station order routing)
  - `bir_receipt_config` table (Philippines tax compliance)
  - Performance indexes on high-traffic queries
- ✅ Added **missing features**: multi-language, allergen info, order modification, guest order history
- ✅ Updated **milestones** with realistic timeline (11 weeks vs. original 8 weeks)
- ✅ Added **system scope clarifications**: single-tenant vs. multi-tenant, tax calculation logic, promo code rules, BIR receipt requirements
- ✅ Enhanced **success metrics** with SQL queries for dashboard analytics
- ✅ Documented **open questions** for stakeholder approval

### Version 1.0 (February 2, 2026)
- Initial draft with core requirements

---
