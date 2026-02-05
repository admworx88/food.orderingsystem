# Agent: Payments Integration
# Scope: PayMongo integration, payment processing, webhooks

> **Version:** 2.1 | **Last Updated:** February 2026 | **Status:** Aligned with PRD v1.2

---

## Quick Reference

### Payment Methods Supported
| Method | Type | Flow |
|--------|------|------|
| Cash | At counter | Cashier processes |
| GCash | E-wallet | QR/redirect via PayMongo |
| Card | Credit/Debit | PayMongo card form |
| Maya | E-wallet | Redirect via PayMongo |

### PayMongo API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /payment_intents` | Create card payment |
| `POST /sources` | Create GCash/Maya source |
| `POST /payments` | Complete GCash/Maya payment |
| `GET /payment_intents/:id` | Check payment status |

### Webhook Events
| Event | Action |
|-------|--------|
| `source.chargeable` | GCash/Maya ready |
| `payment.paid` | Payment confirmed |
| `payment.failed` | Payment failed |

### Security Requirements
- HMAC signature verification on webhooks
- Idempotency check (prevent duplicates)
- Amount verification (match order total)
- Service role client only (never expose keys)

---

## Mission

You own the payment pipeline — from the moment a guest chooses a payment method
to the moment the money is confirmed. Your goal is to ensure every peso is
tracked, every transaction is verified, and no payment is ever lost or duplicated.
Idempotency, amount verification, and order expiration handling are critical.

---

## Owned Files

```
src/app/api/webhooks/paymongo/route.ts   # Payment webhook handler (ENHANCED)
src/services/payment-service.ts          # All payment server actions (ENHANCED)
src/lib/validators/payment.ts            # Zod schemas for payment data
src/lib/constants/payment-methods.ts     # Payment method configs
src/types/payment.ts                     # Payment type definitions
```

---

## PayMongo Integration (Philippines)

### API Overview
PayMongo is the primary payment gateway. It supports:
- **GCash** — via Payment Sources (redirect flow)
- **Credit/Debit Card** — via Payment Intents (card element)
- **Maya (PayMaya)** — via Payment Sources (redirect flow)

### Environment Variables
```env
PAYMONGO_SECRET_KEY=sk_test_...       # Server-side only
PAYMONGO_PUBLIC_KEY=pk_test_...       # Client-side (card form)
PAYMONGO_WEBHOOK_SECRET=whsec_...     # Webhook signature verification
NEXT_PUBLIC_BASE_URL=https://...      # For redirect URLs
```

---

## Payment Flows

### Flow 1: Cash Payment (Cashier-Processed)

```typescript
// src/services/payment-service.ts

'use server'
export async function processCashPayment(input: {
  orderId: string;
  amountTendered: number;
  cashierId: string;
  discountType?: 'senior' | 'pwd' | 'promo';
  promoCode?: string;
}) {
  const supabase = await createServerClient();

  // 1. Fetch order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('payment_status', 'unpaid')
    .is('deleted_at', null)  // NEW: Check soft delete
    .single();

  if (!order) throw new Error('Order not found or already paid');

  // NEW: Check expiration
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    throw new Error('Order expired. Cannot process payment.');
  }

  // 2. Apply discount if needed
  let discountAmount = 0;
  let finalTotal = order.total_amount;

  if (input.discountType === 'senior' || input.discountType === 'pwd') {
    // Philippine law: 20% discount on base price, applied before VAT
    discountAmount = order.subtotal * 0.20;
    // Recalculate: discounted subtotal + VAT on discounted amount
    const discountedSubtotal = order.subtotal - discountAmount;
    const newTax = discountedSubtotal * 0.12;
    finalTotal = discountedSubtotal + newTax + order.service_charge;
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
    p_discount_type: input.discountType || null,
    p_discount_amount: discountAmount,
  });

  if (error) throw error;

  return {
    success: true,
    change,
    finalTotal,
    discountAmount,
  };
}
```

### Flow 2: GCash Payment (ENHANCED)

```typescript
'use server'
export async function createGcashPayment(input: {
  orderId: string;
  amount: number;
}) {
  const supabase = await createServerClient();

  // 1. Verify order exists and is unpaid
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('payment_status', 'unpaid')
    .is('deleted_at', null)
    .single();

  if (!order) throw new Error('Order not found');

  // NEW: Check expiration
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    throw new Error('Order expired');
  }

  // NEW: Use order ID as idempotency key (prevent duplicate charges)
  const idempotencyKey = `order-${input.orderId}`;

  // 2. Create PayMongo Source with idempotency key
  const response = await fetch('https://api.paymongo.com/v1/sources', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,  // NEW: Prevents duplicates
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(input.amount * 100),  // PayMongo uses centavos
          currency: 'PHP',
          type: 'gcash',
          redirect: {
            success: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?order=${input.orderId}`,
            failed: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/failed?order=${input.orderId}`,
          },
          billing: {
            name: 'Hotel Guest',
          },
          metadata: {
            order_id: input.orderId,  // NEW: Include order ID in metadata
          }
        }
      }
    })
  });

  const source = await response.json();

  // 3. Store source ID as provider_reference
  await supabase.from('payments').insert({
    order_id: input.orderId,
    method: 'gcash',
    amount: input.amount,
    status: 'pending',
    provider_reference: source.data.id,
  });

  // 4. Update order payment status
  await supabase.from('orders').update({
    payment_status: 'processing',
    payment_method: 'gcash',
  }).eq('id', input.orderId);

  // 5. Return redirect URL for guest to complete payment
  return {
    checkoutUrl: source.data.attributes.redirect.checkout_url,
    sourceId: source.data.id,
  };
}
```

### Flow 3: Credit/Debit Card Payment (ENHANCED)

```typescript
'use server'
export async function createCardPaymentIntent(input: {
  orderId: string;
  amount: number;
}) {
  const supabase = await createServerClient();

  // 1. Verify order
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

  // NEW: Use order ID as idempotency key
  const idempotencyKey = `order-${input.orderId}`;

  // 2. Create PayMongo Payment Intent with idempotency key
  const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,  // NEW: Prevents duplicates
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(input.amount * 100),
          currency: 'PHP',
          payment_method_allowed: ['card'],
          capture_type: 'automatic',
          description: `Order ${input.orderId}`,
          metadata: {
            order_id: input.orderId,  // NEW: Include order ID
          }
        }
      }
    })
  });

  const intent = await response.json();

  // 3. Store intent ID
  await supabase.from('payments').insert({
    order_id: input.orderId,
    method: 'card',
    amount: input.amount,
    status: 'pending',
    provider_reference: intent.data.id,
  });

  await supabase.from('orders').update({
    payment_status: 'processing',
    payment_method: 'card',
  }).eq('id', input.orderId);

  // 4. Return client key for the card form
  return {
    clientKey: intent.data.attributes.client_key,
    intentId: intent.data.id,
  };
}
```

---

## Webhook Handler (ENHANCED)

```typescript
// src/app/api/webhooks/paymongo/route.ts

import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('paymongo-signature');

  // 1. Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    console.error('Invalid webhook signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createAdminClient();

  // 2. Handle event types
  switch (event.data.attributes.type) {
    case 'source.chargeable': {
      // GCash: source is now chargeable, create the payment
      const sourceId = event.data.attributes.data.id;
      const amount = event.data.attributes.data.attributes.amount;

      // NEW: Idempotency check - prevent duplicate charges
      const { data: existingCharge } = await supabase
        .from('payments')
        .select('*')
        .eq('provider_reference', sourceId)
        .eq('status', 'success')
        .single();

      if (existingCharge) {
        console.log('Payment already charged:', sourceId);
        return Response.json({ received: true }, { status: 200 });
      }

      await fetch('https://api.paymongo.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              source: { id: sourceId, type: 'source' },
            }
          }
        })
      });
      break;
    }

    case 'payment.paid': {
      // Payment confirmed — update our records
      const paymentId = event.data.attributes.data.id;
      const sourceId = event.data.attributes.data.attributes.source?.id
        || event.data.attributes.data.attributes.payment_intent_id;

      // NEW: Verify payment amount matches order total
      const paymentAmount = event.data.attributes.data.attributes.amount;

      // Find our payment record by provider reference
      const { data: payment } = await supabase
        .from('payments')
        .select('*, orders(*)')
        .or(`provider_reference.eq.${sourceId},provider_reference.eq.${paymentId}`)
        .single();

      if (!payment) {
        console.error('Payment record not found for:', sourceId);
        return Response.json({ received: true }, { status: 200 });
      }

      // NEW: Verify amount matches order total (prevent tampering)
      const expectedAmount = Math.round(payment.orders.total_amount * 100);
      if (paymentAmount !== expectedAmount) {
        console.error('Payment amount mismatch', {
          expected: expectedAmount,
          received: paymentAmount,
          orderId: payment.order_id
        });
        return Response.json({ error: 'Amount mismatch' }, { status: 400 });
      }

      // Idempotency check
      if (payment.status === 'success') {
        console.log('Payment already processed:', payment.id);
        return Response.json({ received: true }, { status: 200 });
      }

      // Update payment + order
      await supabase.from('payments').update({
        status: 'success',
        completed_at: new Date().toISOString(),
      }).eq('id', payment.id);

      await supabase.from('orders').update({
        payment_status: 'paid',
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', payment.order_id);

      // NEW: Track payment completion event
      await supabase.from('order_events').insert({
        order_id: payment.order_id,
        event_type: 'payment_completed',
        metadata: {
          method: payment.method,
          amount: payment.amount,
          provider_reference: payment.provider_reference,
        }
      });

      break;
    }

    case 'payment.failed': {
      const sourceId = event.data.attributes.data.attributes.source?.id;

      await supabase.from('payments').update({
        status: 'failed',
      }).match({ provider_reference: sourceId });

      // Revert order to unpaid so guest can retry
      const { data: payment } = await supabase
        .from('payments')
        .select('order_id')
        .eq('provider_reference', sourceId)
        .single();

      if (payment) {
        await supabase.from('orders').update({
          payment_status: 'unpaid',
          payment_method: null,
        }).eq('id', payment.order_id);
      }
      break;
    }
  }

  return Response.json({ received: true }, { status: 200 });
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const testSignature = parts.find(p => p.startsWith('te='))?.split('=')[1]
    || parts.find(p => p.startsWith('li='))?.split('=')[1];

  if (!timestamp || !testSignature) return false;

  const payload = `${timestamp}.${body}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(testSignature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Refund Processing (ENHANCED)

```typescript
'use server'
export async function processRefund(input: {
  paymentId: string;
  reason: string;
  adminId: string;
}) {
  const supabase = await createServerClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', input.paymentId)
    .eq('status', 'success')
    .single();

  if (!payment) throw new Error('Payment not found');

  if (payment.method === 'cash') {
    // Cash refund: just update records
    await supabase.from('payments').update({
      status: 'refunded'
    }).eq('id', payment.id);
  } else {
    // Digital refund: call PayMongo refund API
    await fetch('https://api.paymongo.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(payment.amount * 100),
            payment_id: payment.provider_reference,
            reason: 'requested_by_customer',
          }
        }
      })
    });

    await supabase.from('payments').update({
      status: 'refunded'
    }).eq('id', payment.id);
  }

  // Update order
  await supabase.from('orders').update({
    payment_status: 'refunded',
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('id', payment.order_id);

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: input.adminId,
    action: 'refund',
    table_name: 'payments',
    record_id: payment.id,
    new_data: { reason: input.reason },
  });
}
```

---

## Auto-Cancel Expired Orders (NEW)

### Scheduled Job (Supabase Edge Function)
```typescript
// Run this every 5 minutes via Supabase cron
import { createAdminClient } from '@/lib/supabase/admin';

export async function cancelExpiredOrders() {
  const supabase = createAdminClient();

  const { data: expiredOrders } = await supabase
    .from('orders')
    .select('id, order_number, expires_at')
    .eq('payment_status', 'unpaid')
    .eq('status', 'pending_payment')
    .lt('expires_at', new Date().toISOString())
    .is('deleted_at', null);

  if (!expiredOrders || expiredOrders.length === 0) return;

  console.log(`Cancelling ${expiredOrders.length} expired orders`);

  // Bulk update expired orders
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'expired',
      cancelled_at: new Date().toISOString(),
    })
    .in('id', expiredOrders.map(o => o.id));

  // Track cancellation events
  const events = expiredOrders.map(order => ({
    order_id: order.id,
    event_type: 'order_expired',
    metadata: {
      expired_at: order.expires_at,
      order_number: order.order_number,
    }
  }));

  await supabase.from('order_events').insert(events);
}
```

---

## Key Implementation Notes

1. **PayMongo Test Mode**: Use test API keys during development.
   Test GCash source will auto-complete. Test card: 4343434343434345.

2. **Centavos**: PayMongo amounts are in centavos (smallest unit).
   Always multiply by 100 before sending, divide by 100 when receiving.

3. **Idempotency**:
   - **NEW**: Always use `Idempotency-Key` header with `order-{order_id}` format
   - Prevents duplicate charges if request is retried
   - PayMongo deduplicates based on idempotency key
   - Webhooks may fire multiple times — always check if payment is already marked 'success'

4. **Timing-safe comparison**: Use crypto.timingSafeEqual for
   webhook signature verification to prevent timing attacks.

5. **Service role**: The webhook handler MUST use the Supabase service
   role client (not the user's session) since webhooks are server-to-server.

6. **Error logging**: Log all webhook events (success and failure) to
   a dedicated table or external logging service. Payment issues need
   full audit trails.

7. **Philippine regulations**: Per BSP (Bangko Sentral ng Pilipinas),
   digital receipts must include the amount, date, and merchant info.
   Ensure receipt data is complete.

8. **Amount verification** (NEW):
   - Always verify webhook payment amount matches order total
   - Prevents price tampering attacks
   - Log mismatches for investigation
   - Return 400 status on mismatch

9. **Order expiration handling** (NEW):
   - Check expiration before creating payments
   - Prevent payment of expired orders
   - Scheduled job cancels expired unpaid orders every 5 min
   - Track expiration events in order_events table

10. **Promo code integration** (NEW):
    - Promo codes applied during order creation
    - Discount already included in order.total_amount
    - No need to recalculate in payment flow
    - Store promo_code_id reference in orders table

---

## Dependencies

- `crypto` (Node.js built-in) — HMAC signature verification
- `@supabase/supabase-js` — Database operations
- `zod` — Payment input validation

---

## Troubleshooting

### Common Payment Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook returns 401 | Invalid signature | Verify PAYMONGO_WEBHOOK_SECRET |
| Duplicate charges | Missing idempotency key | Always use `order-{id}` header |
| Amount mismatch | Centavos vs pesos | Multiply/divide by 100 correctly |
| Payment stuck processing | Webhook not received | Check webhook URL is accessible |
| Order already cancelled | 15-min timeout | Check expires_at before payment |

### Webhook Debugging

```bash
# Test webhook locally with ngrok
ngrok http 3000

# Verify webhook URL is accessible
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/paymongo \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### PayMongo Test Data

| Test Case | Card Number |
|-----------|-------------|
| Success | 4343 4343 4343 4345 |
| Declined | 4571 7360 0000 0006 |
| 3D Secure | 4120 0000 0000 0007 |

### Testing Checklist

- [ ] Webhook signature verification works
- [ ] GCash payment flow completes
- [ ] Card payment processes
- [ ] Duplicate webhooks handled (idempotency)
- [ ] Amount verification rejects mismatches
- [ ] Expired orders cannot be paid
- [ ] Payment record created in DB
- [ ] Order status updated to 'paid'

---

## Version History

### Version 2.1 (February 2026)
**Changes**:
- Added Quick Reference with API endpoints
- Added Troubleshooting section with test data
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- Added idempotency_key requirement
- Added amount verification in webhook handler
- Added order expiration handling
- Added auto-cancel expired orders job
- Added order events tracking

### Version 1.0 (February 2, 2026)
- Initial payments integration specification

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.1
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.0
- **[AGENT-DATABASE.md](./AGENT-DATABASE.md)** — Database schema v2.0
- **[AGENT-CASHIER.md](./AGENT-CASHIER.md)** — Cashier POS module
