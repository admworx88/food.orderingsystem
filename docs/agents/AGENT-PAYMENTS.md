# Agent: Payments Integration
# Scope: PayMongo integration, payment processing, webhooks

---

## Mission

You own the payment pipeline — from the moment a guest chooses a payment method
to the moment the money is confirmed. Your goal is to ensure every peso is
tracked, every transaction is verified, and no payment is ever lost or duplicated.

---

## Owned Files

```
src/app/api/webhooks/paymongo/route.ts   # Payment webhook handler
src/services/payment-service.ts          # All payment server actions
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
  const supabase = createServerClient();
  
  // 1. Fetch order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('payment_status', 'unpaid')
    .single();
  
  if (!order) throw new Error('Order not found or already paid');
  
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

### Flow 2: GCash Payment

```typescript
'use server'
export async function createGcashPayment(input: {
  orderId: string;
  amount: number;
}) {
  // 1. Create PayMongo Source
  const response = await fetch('https://api.paymongo.com/v1/sources', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
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
        }
      }
    })
  });
  
  const source = await response.json();
  
  // 2. Store source ID as provider_reference
  const supabase = createServerClient();
  await supabase.from('payments').insert({
    order_id: input.orderId,
    method: 'gcash',
    amount: input.amount,
    status: 'pending',
    provider_reference: source.data.id,
  });
  
  // 3. Update order payment status
  await supabase.from('orders').update({
    payment_status: 'processing',
    payment_method: 'gcash',
  }).eq('id', input.orderId);
  
  // 4. Return redirect URL for guest to complete payment
  return {
    checkoutUrl: source.data.attributes.redirect.checkout_url,
    sourceId: source.data.id,
  };
}
```

### Flow 3: Credit/Debit Card Payment

```typescript
'use server'
export async function createCardPaymentIntent(input: {
  orderId: string;
  amount: number;
}) {
  // 1. Create PayMongo Payment Intent
  const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.PAYMONGO_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(input.amount * 100),
          currency: 'PHP',
          payment_method_allowed: ['card'],
          capture_type: 'automatic',
          description: `Order ${input.orderId}`,
        }
      }
    })
  });
  
  const intent = await response.json();
  
  // 2. Store intent ID
  const supabase = createServerClient();
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
  
  // 3. Return client key for the card form
  return {
    clientKey: intent.data.attributes.client_key,
    intentId: intent.data.id,
  };
}
```

---

## Webhook Handler

```typescript
// src/app/api/webhooks/paymongo/route.ts

import { createServiceRoleClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('paymongo-signature');
  
  // 1. Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  const supabase = createServiceRoleClient();
  
  // 2. Handle event types
  switch (event.data.attributes.type) {
    case 'source.chargeable': {
      // GCash: source is now chargeable, create the payment
      const sourceId = event.data.attributes.data.id;
      const amount = event.data.attributes.data.attributes.amount;
      
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
      
      // Idempotency check
      if (payment.status === 'success') {
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

## Refund Processing

```typescript
'use server'
export async function processRefund(input: {
  paymentId: string;
  reason: string;
  adminId: string;
}) {
  const supabase = createServerClient();
  
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

## Key Implementation Notes

1. **PayMongo Test Mode**: Use test API keys during development.
   Test GCash source will auto-complete. Test card: 4343434343434345.

2. **Centavos**: PayMongo amounts are in centavos (smallest unit).
   Always multiply by 100 before sending, divide by 100 when receiving.

3. **Idempotency**: Webhooks may fire multiple times. Always check
   if the payment is already marked 'success' before processing.

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

---

## Dependencies

- `crypto` (Node.js built-in) — HMAC signature verification
- `@supabase/supabase-js` — Database operations
- `zod` — Payment input validation
