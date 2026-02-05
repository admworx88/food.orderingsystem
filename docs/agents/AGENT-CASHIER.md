# Agent: Cashier Module
# Scope: /(cashier) route group — Payment processing & POS

---

## Mission

You own the cashier point-of-sale interface. Your goal is to make payment
processing fast, accurate, and error-proof. The cashier should be able to
process a cash payment in under 10 seconds and a digital payment in under 20.

---

## Owned Files

```
src/app/(cashier)/
├── layout.tsx              # Split-panel POS layout
├── payments/page.tsx       # Pending orders + payment processing
└── reports/page.tsx        # Shift summary, cash drawer reconciliation

src/components/cashier/
├── pending-orders-list.tsx     # List of orders awaiting payment
├── order-detail-panel.tsx      # Selected order breakdown
├── payment-form.tsx            # Payment method tabs + processing
├── cash-calculator.tsx         # Amount tendered + change calculator
├── gcash-payment.tsx           # GCash QR display / redirect
├── card-payment.tsx            # Card payment via PayMongo
├── discount-selector.tsx       # Senior/PWD/promo discount application
├── receipt-preview.tsx         # Receipt view + print button
├── shift-summary.tsx           # End-of-shift cash report
└── refund-dialog.tsx           # Refund processing flow

src/services/payment-service.ts  # Server actions for payment processing
```

---

## UI/UX Requirements

### Split-Panel Layout
```
┌────────────────────────────┬─────────────────────────────┐
│   PENDING ORDERS           │   ORDER #A023               │
│                            │   ─────────────────         │
│   ┌──────────────────┐     │   2× Chicken Adobo   ₱398  │
│   │ #A023 • Dine-in  │ ←── │   1× Sinigang        ₱285  │
│   │ Table 5 • ₱883   │     │   1× Halo-Halo       ₱120  │
│   └──────────────────┘     │                             │
│   ┌──────────────────┐     │   Subtotal          ₱803.00 │
│   │ #A024 • Takeout  │     │   VAT (12%)          ₱96.36 │
│   │ ₱450             │     │   Service (5%)       ₱40.15 │
│   └──────────────────┘     │   ─────────────────         │
│   ┌──────────────────┐     │   TOTAL             ₱939.51 │
│   │ #A025 • Room 302 │     │                             │
│   │ ₱1,250           │     │   ┌─────┬───────┬──────┐   │
│   └──────────────────┘     │   │ Cash│ GCash │ Card │   │
│                            │   └─────┴───────┴──────┘   │
│                            │                             │
│                            │   [Discount]    [Process]   │
└────────────────────────────┴─────────────────────────────┘
```

### Cash Payment Flow
1. Select order from pending list
2. Click "Cash" tab
3. Quick amount buttons: ₱500, ₱1000, ₱1500, ₱2000 + custom numpad
4. System shows change due
5. Click "Confirm Payment"
6. Receipt auto-generates
7. Order moves to kitchen queue

### GCash Payment Flow
1. Select order → Click "GCash" tab
2. System creates PayMongo GCash source
3. Display QR code on cashier screen (guest scans with phone)
4. OR generate payment link to send to guest
5. Wait for webhook confirmation
6. Show "Payment Confirmed" with green checkmark
7. Auto-print receipt

### Card Payment Flow
1. Select order → Click "Card" tab
2. System creates PayMongo payment intent
3. Show card terminal instructions OR in-browser card form
4. Process 3DS verification if required
5. Webhook confirms payment
6. Auto-print receipt

### Discount Application
- **Senior Citizen**: 20% off (Philippine law, RA 9994)
- **PWD**: 20% off (Philippine law, RA 10754)
- **Promo Code**: Custom percentage or fixed amount
- Discounts applied before tax calculation
- Only one discount type per order

---

## Data Queries

### Pending Orders
```typescript
// Real-time: orders with unpaid status
const { data: pendingOrders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items(*, order_item_addons(*))
  `)
  .eq('payment_status', 'unpaid')
  .order('created_at', { ascending: true });
```

### Process Cash Payment (Server Action)
```typescript
'use server'
async function processCashPayment(input: {
  orderId: string;
  amountTendered: number;
  discountType?: 'senior' | 'pwd' | 'promo';
  discountCode?: string;
}) {
  // 1. Fetch order, verify still unpaid
  // 2. Calculate discount if applicable
  // 3. Verify amountTendered >= total
  // 4. Create payment record
  // 5. Update order: payment_status = 'paid', status = 'paid'
  // 6. Calculate change
  // 7. Return { success, change, receiptData }
}
```

### Process Digital Payment (Server Action)
```typescript
'use server'
async function createPayMongoPayment(input: {
  orderId: string;
  method: 'gcash' | 'card';
}) {
  // 1. Fetch order, verify still unpaid
  // 2. Create PayMongo payment intent/source
  // 3. Update order: payment_status = 'processing'
  // 4. Return { checkoutUrl, sourceId } for GCash
  //    OR { clientKey } for card form
}
```

---

## Payment Webhook Handler

```
src/app/api/webhooks/paymongo/route.ts
```

```typescript
export async function POST(request: Request) {
  // 1. Verify webhook signature (HMAC)
  // 2. Parse event type
  // 3. Handle 'payment.paid' event:
  //    a. Find order by provider_reference
  //    b. Update payment: status = 'success'
  //    c. Update order: payment_status = 'paid', status = 'paid'
  // 4. Handle 'payment.failed':
  //    a. Update payment: status = 'failed'
  //    b. Update order: payment_status = 'unpaid'
  // 5. Return 200 OK
}
```

---

## Receipt Data Structure

```typescript
interface ReceiptData {
  restaurantName: string;
  restaurantAddress: string;
  tin: string;                    // Tax ID
  orderNumber: string;
  orderType: string;
  tableOrRoom: string | null;
  date: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    addons: { name: string; price: number }[];
    totalPrice: number;
  }[];
  subtotal: number;
  discount: { type: string; amount: number } | null;
  vatAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod: string;
  amountTendered?: number;
  change?: number;
  cashier: string;
  transactionId: string;
}
```

---

## Key Implementation Notes

1. **Webhook idempotency**: PayMongo may send duplicate webhooks.
   Use the payment `provider_reference` as an idempotency key.
   Check if payment is already marked 'success' before processing.

2. **HMAC verification**: Always verify the webhook signature
   using your PayMongo webhook secret. Never trust unverified webhooks.

3. **Cash drawer**: Track cash in/cash out per shift. The shift summary
   should show expected vs actual cash in drawer for reconciliation.

4. **Philippine tax rules**: VAT is 12%. Senior/PWD discounts are
   applied to the base price before VAT. This is mandated by law.

5. **Receipt printing**: Use the Web Print API (window.print) with
   a thermal printer-friendly CSS layout (58mm or 80mm width).

6. **Concurrent access**: Multiple cashiers may work simultaneously.
   Use Supabase RLS + optimistic locking to prevent double-processing.

---

## Dependencies

- PayMongo Node.js SDK or direct REST API
- `@supabase/ssr` — Server client for secure mutations
- `zod` — Payment input validation
- shadcn/ui: Tabs, Card, Button, Dialog, Badge, Input
