# Agent: Cashier Module
# Scope: /(cashier) route group — Payment processing & POS

> **Version:** 2.2 | **Last Updated:** February 7, 2026 | **Status:** Aligned with PRD v1.3

---

## Quick Reference

### Payment Flow
```
Order arrives (unpaid) → Cashier selects → Process payment → Generate receipt
         │                    │                  │                 │
         ▼                    ▼                  ▼                 ▼
    15-min timer         Cash/GCash/Card    Verify amount     BIR-compliant
    starts               selected            matches order     PDF receipt
```

### Payment Methods
| Method | Processing | Time Target |
|--------|------------|-------------|
| Cash | Enter amount, calculate change | <10 sec |
| GCash | QR scan or redirect | <20 sec |
| Card | PayMongo card form | <20 sec |

### Key Components
| Component | Purpose |
|-----------|---------|
| `pending-orders-list.tsx` | Orders awaiting payment |
| `payment-form.tsx` | Payment method tabs |
| `cash-calculator.tsx` | Amount + change |
| `receipt-preview.tsx` | BIR receipt preview |
| `refund-dialog.tsx` | Process refunds |

### BIR Receipt Requirements
- Sequential receipt numbers (no gaps)
- TIN and business registration
- Itemized with tax breakdown
- Date/time stamp

---

## Mission

You own the cashier point-of-sale interface. Your goal is to make payment
processing fast, accurate, and error-proof. The cashier should be able to
process a cash payment in under 10 seconds and a digital payment in under 20,
with full BIR compliance and promo code validation.

---

## Owned Files

```
src/app/(cashier)/
├── layout.tsx              # Split-panel POS layout
├── payments/page.tsx       # Pending orders + payment processing (ENHANCED)
└── reports/page.tsx        # Shift summary, cash drawer reconciliation

src/components/cashier/
├── pending-orders-list.tsx     # List of orders awaiting payment (ENHANCED with expiration)
├── order-detail-panel.tsx      # Selected order breakdown (ENHANCED)
├── payment-form.tsx            # Payment method tabs + processing
├── cash-calculator.tsx         # Amount tendered + change calculator
├── gcash-payment.tsx           # GCash QR display / redirect
├── card-payment.tsx            # Card payment via PayMongo
├── promo-code-display.tsx      # NEW: Display applied promo code
├── discount-selector.tsx       # Senior/PWD/promo discount application (ENHANCED)
├── receipt-preview.tsx         # Receipt view + print button (ENHANCED for BIR)
├── bir-receipt-generator.tsx   # NEW: BIR-compliant receipt PDF
├── shift-summary.tsx           # End-of-shift cash report
└── refund-dialog.tsx           # Refund processing flow

src/services/payment-service.ts  # Server actions for payment processing (ENHANCED)
src/services/bir-service.ts      # NEW: BIR receipt generation
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
│   │ Table 5 • ₱939   │     │   1× Halo-Halo       ₱120  │
│   │ ⏱ 3min left      │     │                             │
│   └──────────────────┘     │   Subtotal          ₱803.00 │
│   ┌──────────────────┐     │   Promo: SAVE20 -₱160.60   │
│   │ #A024 • Takeout  │     │   VAT (12%)          ₱77.09 │
│   │ ₱450             │     │   Service (10%)      ₱64.24 │
│   │ ⏱ 12min left     │     │   ─────────────────         │
│   └──────────────────┘     │   TOTAL             ₱783.73 │
│   ┌──────────────────┐     │                             │
│   │ #A025 • Room 302 │     │   Guest: +63 917 XXX XXXX  │
│   │ ₱1,250           │     │                             │
│   │ ⏱ EXPIRED        │     │   ┌─────┬───────┬──────┐   │
│   └──────────────────┘     │   │ Cash│ GCash │ Card │   │
│                            │   └─────┴───────┴──────┘   │
│                            │                             │
│                            │   [Print BIR Receipt]       │
└────────────────────────────┴─────────────────────────────┘
```

### Cash Payment Flow
1. Select order from pending list
2. Verify promo code (if applied)
3. Click "Cash" tab
4. Quick amount buttons: ₱20, ₱50, ₱100, ₱500, ₱1000 + custom numpad
5. System shows change due
6. Click "Confirm Payment"
7. BIR-compliant receipt auto-generates
8. Order moves to kitchen queue

### GCash Payment Flow
1. Select order → Click "GCash" tab
2. System creates PayMongo GCash source with idempotency_key = order_id
3. Display QR code on cashier screen (guest scans with phone)
4. OR generate payment link to send to guest
5. Wait for webhook confirmation
6. Show "Payment Confirmed" with green checkmark
7. Auto-print BIR receipt

### Card Payment Flow
1. Select order → Click "Card" tab
2. System creates PayMongo payment intent with idempotency_key = order_id
3. Show card terminal instructions OR in-browser card form
4. Process 3DS verification if required
5. Webhook confirms payment
6. Auto-print BIR receipt

### Discount Application (ENHANCED)
- **Senior Citizen**: 20% off (Philippine law, RA 9994)
- **PWD**: 20% off (Philippine law, RA 10754)
- **Promo Code**: Read from order.promo_code_id (validate on server)
- Discounts applied before tax calculation
- Only one discount type per order

---

## Data Queries (ENHANCED)

### Pending Orders (with Expiration)
```typescript
// Real-time: orders with unpaid status (filter expired)
const { data: pendingOrders } = await supabase
  .from('orders')
  .select(`
    *,
    promo_codes(code, discount_value, discount_type),
    order_items(*, order_item_addons(*))
  `)
  .eq('payment_status', 'unpaid')
  .is('deleted_at', null)
  .order('created_at', { ascending: true });

// Client-side: filter out expired orders or show separately
const activeOrders = pendingOrders.filter(o =>
  !o.expires_at || new Date(o.expires_at) > new Date()
);

const expiredOrders = pendingOrders.filter(o =>
  o.expires_at && new Date(o.expires_at) <= new Date()
);
```

### Process Cash Payment (Server Action - ENHANCED)
```typescript
'use server'
async function processCashPayment(input: {
  orderId: string;
  amountTendered: number;
  discountType?: 'senior' | 'pwd' | 'promo';
  discountCode?: string;
  cashierId: string;
}) {
  const supabase = await createServerClient();

  // 1. Fetch order, verify still unpaid and not expired
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('payment_status', 'unpaid')
    .is('deleted_at', null)
    .single();

  if (!order) throw new Error('Order not found or already paid');

  // Check expiration
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    throw new Error('Order expired. Cannot process payment.');
  }

  // 2. Re-validate promo code if applied (idempotency check)
  let finalTotal = order.total_amount;
  if (order.promo_code_id) {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', order.promo_code_id)
      .single();

    // Promo already applied in order creation, just verify
    if (!promo || !promo.is_active) {
      throw new Error('Promo code no longer valid');
    }
  }

  // 3. Verify sufficient payment
  if (input.amountTendered < finalTotal) {
    throw new Error('Insufficient payment amount');
  }

  const change = input.amountTendered - finalTotal;

  // 4. Create payment record + update order in transaction
  const { error } = await supabase.rpc('process_cash_payment', {
    p_order_id: input.orderId,
    p_amount: finalTotal,
    p_cash_received: input.amountTendered,
    p_change_given: change,
    p_cashier_id: input.cashierId,
  });

  if (error) throw error;

  // 5. Get next BIR receipt number
  const receiptNumber = await getNextBIRReceiptNumber();

  return {
    success: true,
    change,
    finalTotal,
    receiptNumber,
  };
}
```

### Process Digital Payment (Server Action - ENHANCED)
```typescript
'use server'
async function createPayMongoPayment(input: {
  orderId: string;
  method: 'gcash' | 'card';
}) {
  const supabase = await createServerClient();

  // 1. Fetch order, verify still unpaid
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('payment_status', 'unpaid')
    .is('deleted_at', null)
    .single();

  if (!order) throw new Error('Order not found');

  // Check expiration
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    throw new Error('Order expired');
  }

  // 2. Create PayMongo payment intent/source with idempotency_key
  const idempotencyKey = `order-${order.id}`;  // Prevent duplicate charges

  if (input.method === 'gcash') {
    const source = await createPayMongoGCashSource(
      order.total_amount,
      order.id,
      idempotencyKey
    );
    return { checkoutUrl: source.checkout_url, sourceId: source.id };
  } else {
    const intent = await createPayMongoPaymentIntent(
      order.total_amount,
      order.id,
      idempotencyKey
    );
    return { clientKey: intent.client_key };
  }
}
```

---

## BIR-Compliant Receipt Generation (NEW)

### Receipt Data Structure
```typescript
interface BIRReceiptData {
  // Business Info (from bir_receipt_config)
  tin: string;                    // Tax ID
  businessName: string;
  businessAddress: string;
  permitNumber: string;
  permitDateIssued: string;
  accreditationNumber: string;
  accreditationDate: string;
  posMachineId: string;
  terminalId: string;
  receiptSeriesNumber: number;    // Sequential, no gaps

  // Order Info
  orderNumber: string;
  orderType: string;
  tableOrRoom: string | null;
  date: string;
  time: string;

  // Items
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    addons: { name: string; price: number }[];
    totalPrice: number;
  }[];

  // Totals
  subtotal: number;
  discount: { type: string; amount: number } | null;
  vatableSales: number;           // Subtotal - discount
  vatAmount: number;               // 12% of vatable sales
  vatExemptSales: number;          // For senior/PWD (if applicable)
  serviceCharge: number;
  totalAmount: number;

  // Payment
  paymentMethod: string;
  amountTendered?: number;
  change?: number;

  // Staff
  cashier: string;
  transactionId: string;

  // Footer
  footerText: string;             // "THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS..."
}
```

### BIR Receipt Generator
```typescript
'use server'
async function generateBIRReceipt(orderId: string): Promise<BIRReceiptData> {
  const supabase = await createServerClient();

  // Fetch BIR config
  const { data: birConfig } = await supabase
    .from('bir_receipt_config')
    .select('*')
    .single();

  if (!birConfig) throw new Error('BIR configuration not set up');

  // Fetch order with all details
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*, order_item_addons(*)),
      promo_codes(code, discount_type, discount_value),
      profiles!processed_by(full_name)
    `)
    .eq('id', orderId)
    .single();

  // Get next receipt number
  const receiptNumber = await getNextBIRReceiptNumber();

  // Calculate VAT breakdown (per BIR requirements)
  const vatableSales = order.subtotal - order.discount_amount;
  const vatAmount = vatableSales * 0.12;

  return {
    // Business info
    tin: birConfig.tin,
    businessName: birConfig.business_name,
    businessAddress: birConfig.business_address,
    permitNumber: birConfig.permit_number,
    permitDateIssued: birConfig.permit_date_issued,
    accreditationNumber: birConfig.accreditation_number,
    accreditation_date: birConfig.accreditation_date,
    posMachineId: birConfig.pos_machine_id,
    terminalId: birConfig.terminal_id,
    receiptSeriesNumber: receiptNumber,

    // Order details
    orderNumber: order.order_number,
    orderType: order.order_type,
    tableOrRoom: order.table_number || order.room_number || null,
    date: new Date(order.paid_at).toLocaleDateString('en-PH'),
    time: new Date(order.paid_at).toLocaleTimeString('en-PH'),

    // Items
    items: order.order_items.map(item => ({
      name: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      addons: item.order_item_addons.map(addon => ({
        name: addon.addon_name,
        price: addon.additional_price
      })),
      totalPrice: item.total_price
    })),

    // Totals
    subtotal: order.subtotal,
    discount: order.promo_codes ? {
      type: order.promo_codes.code,
      amount: order.discount_amount
    } : null,
    vatableSales,
    vatAmount,
    vatExemptSales: 0,  // TODO: Handle senior/PWD exemptions
    serviceCharge: order.service_charge,
    totalAmount: order.total_amount,

    // Payment
    paymentMethod: order.payment_method,
    cashier: order.profiles?.full_name || 'System',
    transactionId: order.id,

    // Footer
    footerText: 'THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT TO USE'
  };
}
```

---

## Order Expiration Handling (NEW)

### Display Expired Orders Separately
```typescript
// In pending orders list
<div className="space-y-4">
  <div>
    <h2 className="text-lg font-bold">Active Orders</h2>
    {activeOrders.map(order => (
      <OrderCard key={order.id} order={order} />
    ))}
  </div>

  {expiredOrders.length > 0 && (
    <div className="opacity-50">
      <h2 className="text-lg font-bold text-red-600">Expired Orders</h2>
      {expiredOrders.map(order => (
        <div key={order.id} className="border-red-500">
          <span className="bg-red-600 text-white px-2 py-1 rounded">EXPIRED</span>
          <OrderCard order={order} disabled />
        </div>
      ))}
    </div>
  )}
</div>
```

---

## Payment Webhook Handler (SEE AGENT-PAYMENTS.md)

Webhook handling is owned by AGENT-PAYMENTS.md. This module consumes
webhook results by polling order status or receiving realtime updates.

---

## Key Implementation Notes

1. **Webhook idempotency**: PayMongo may send duplicate webhooks.
   Use the order ID as idempotency_key when creating payments.
   Check if payment is already marked 'success' before processing.

2. **HMAC verification**: Always verify the webhook signature
   using your PayMongo webhook secret. Never trust unverified webhooks.
   (Handled in AGENT-PAYMENTS.md)

3. **Cash drawer**: Track cash in/cash out per shift. The shift summary
   should show expected vs actual cash in drawer for reconciliation.

4. **Philippine tax rules**: VAT is 12%. Senior/PWD discounts are
   applied to the base price before VAT. This is mandated by law.

5. **Receipt printing**: Use the Web Print API (window.print) with
   a thermal printer-friendly CSS layout (58mm or 80mm width).
   Generate PDF for email receipts.

6. **Concurrent access**: Multiple cashiers may work simultaneously.
   Use Supabase RLS + optimistic locking to prevent double-processing.

7. **BIR compliance**:
   - Receipt numbers must be sequential with NO GAPS
   - Store receipt series in bir_receipt_config table
   - Update current number after each receipt
   - Backup receipt data daily
   - Include all required BIR fields

8. **Promo code handling**:
   - Promo codes are applied during order creation (kiosk)
   - Cashier just validates the promo is still active
   - Discount already calculated in order.total_amount
   - Display promo code prominently on receipt

9. **Order expiration**:
   - Orders unpaid after 15 minutes are auto-cancelled
   - Show expiration countdown on pending orders
   - Prevent payment of expired orders (server-side check)
   - Auto-remove expired orders from queue

10. **Idempotency keys**:
    - Use `order-{order_id}` format for PayMongo requests
    - Prevents duplicate charges if request is retried
    - PayMongo deduplicates based on idempotency key

---

## Dependencies

- PayMongo Node.js SDK or direct REST API
- `@supabase/ssr` — Server client for secure mutations
- `zod` — Payment input validation
- `react-pdf` or `jspdf` — BIR receipt PDF generation (NEW)
- shadcn/ui: Tabs, Card, Button, Dialog, Badge, Input

---

## Troubleshooting

### Common Cashier Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Payment fails | Amount mismatch | Verify order total matches payment |
| Receipt number gap | Transaction rolled back | Check BIR config for next number |
| Duplicate payment | No idempotency key | Always use `order-{id}` key |
| Order expired | 15-min timeout | Order auto-cancelled, inform guest |
| Change calculation wrong | Floating point math | Use integer centavos |

### BIR Receipt Checklist

- [ ] Sequential receipt number
- [ ] TIN and business name
- [ ] Business address
- [ ] Date and time
- [ ] Itemized list with VAT breakdown
- [ ] Total amount
- [ ] Change amount (for cash)
- [ ] Cashier name/ID

### Testing Checklist

- [ ] Cash payment works, change calculated correctly
- [ ] GCash payment redirects and confirms
- [ ] Card payment processes
- [ ] Receipt generates with all BIR fields
- [ ] Expired orders cannot be paid
- [ ] Refund dialog processes refund
- [ ] Shift summary shows correct totals

---

## Version History

### Version 2.2 (February 7, 2026)
**Changes**:
- Fixed service charge in wireframe: 10% (aligned with PRD/CLAUDE.md) — was showing 5%
- Fixed cash quick-select buttons: ₱20, ₱50, ₱100, ₱500, ₱1000 (aligned with PRD) — was ₱500, ₱1000, ₱1500, ₱2000
- Updated all version references to PRD v1.3 and Architecture v2.3

### Version 2.1 (February 2026)
**Changes**:
- Added Quick Reference with payment flow
- Added Troubleshooting section
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- Added promo code display and validation
- Added order expiration handling
- Added BIR-compliant receipt generation
- Added idempotency key for PayMongo requests
- Added soft delete filtering in queries

### Version 1.0 (February 2, 2026)
- Initial cashier module specification

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.3
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.3
- **[AGENT-DATABASE.md](./AGENT-DATABASE.md)** — Database schema v2.2
- **[AGENT-PAYMENTS.md](./AGENT-PAYMENTS.md)** — PayMongo webhook handling v2.2
