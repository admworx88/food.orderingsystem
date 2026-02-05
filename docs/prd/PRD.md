# Product Requirements Document (PRD)
# Hotel Restaurant Web Ordering System — "OrderFlow"

**Version:** 1.1
**Date:** February 5, 2026
**Author:** System Architect
**Status:** Updated with Security & Data Integrity Enhancements

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

## 6. Order Lifecycle (Process Flow)

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

## 8. Real-Time Architecture

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

## 9. Payment Integration

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

## 11. Non-Functional Requirements

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

## 12. Success Metrics

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

## 13. Milestones (Revised Timeline)

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

## 14. System Scope Clarifications

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

## 15. Open Questions & Future Enhancements

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

## 16. Version History

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
