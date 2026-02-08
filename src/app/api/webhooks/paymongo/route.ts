import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

/**
 * PayMongo Webhook Handler (PRD Section 10)
 *
 * POST only. Uses service-role client (no user session).
 * Handles:
 *   - source.chargeable  → Create payment for GCash
 *   - payment.paid       → Confirm payment, update order
 *   - payment.failed     → Mark payment failed, revert order
 *
 * Security: HMAC-SHA256 signature verification with timing-safe comparison.
 * Idempotency: Checks payment status before processing to prevent duplicates.
 */

export async function POST(request: NextRequest) {
  // Verify PayMongo is configured
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    console.error('PayMongo webhook: Missing configuration');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify HMAC-SHA256 signature
  const signature = request.headers.get('paymongo-signature');
  if (!signature) {
    console.error('PayMongo webhook: Missing signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  // PayMongo signature format: t=timestamp,te=test_signature,li=live_signature
  const signatureParts = signature.split(',');
  const timestamp = signatureParts.find((p) => p.startsWith('t='))?.slice(2);
  const testSig = signatureParts.find((p) => p.startsWith('te='))?.slice(3);
  const liveSig = signatureParts.find((p) => p.startsWith('li='))?.slice(3);

  const signatureToVerify = liveSig || testSig;
  if (!timestamp || !signatureToVerify) {
    console.error('PayMongo webhook: Invalid signature format');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Compute expected signature
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureToVerify, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    if (!isValid) {
      console.error('PayMongo webhook: Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch {
    console.error('PayMongo webhook: Signature verification error');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('PayMongo webhook: Invalid JSON body');
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;
  const eventData = event?.data?.attributes?.data;

  if (!eventType || !eventData) {
    console.error('PayMongo webhook: Missing event type or data');
    return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (eventType) {
      case 'source.chargeable': {
        await handleSourceChargeable(supabase, eventData, secretKey);
        break;
      }

      case 'payment.paid': {
        await handlePaymentPaid(supabase, eventData);
        break;
      }

      case 'payment.failed': {
        await handlePaymentFailed(supabase, eventData);
        break;
      }

      default: {
        console.log(`PayMongo webhook: Unhandled event type: ${eventType}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayMongo webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * Handle source.chargeable: GCash source is ready for payment.
 * Creates a payment via PayMongo Payments API to complete the GCash transaction.
 */
async function handleSourceChargeable(
  supabase: ReturnType<typeof createAdminClient>,
  eventData: Record<string, unknown>,
  secretKey: string
) {
  const sourceId = eventData.id as string;
  const amount = (eventData.attributes as Record<string, unknown>)?.amount as number;

  // Find the payment record by provider_reference (source ID)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, order_id, amount, status')
    .eq('provider_reference', sourceId)
    .single();

  if (paymentError || !payment) {
    console.error('PayMongo webhook: Payment record not found for source:', sourceId);
    return;
  }

  // Idempotency: skip if already processed
  if (payment.status === 'success') {
    console.log('PayMongo webhook: Source already processed:', sourceId);
    return;
  }

  // Create PayMongo payment to complete GCash transaction
  const response = await fetch('https://api.paymongo.com/v1/payments', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount,
          source: { id: sourceId, type: 'source' },
          currency: 'PHP',
          description: `Order payment - ${payment.order_id}`,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PayMongo webhook: Failed to create payment from source:', errorText);

    // Update payment as failed
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', payment.id);

    return;
  }

  const paymentData = await response.json();
  const paymongoPaymentId = paymentData.data.id;

  // Update local payment record with PayMongo payment ID
  await supabase
    .from('payments')
    .update({ provider_reference: paymongoPaymentId })
    .eq('id', payment.id);

  // Log the event
  await supabase.from('order_events').insert({
    order_id: payment.order_id,
    event_type: 'gcash_source_chargeable',
    metadata: { source_id: sourceId, paymongo_payment_id: paymongoPaymentId },
  });
}

/**
 * Handle payment.paid: Payment confirmed by PayMongo.
 * Update payment status, order status, and mark as paid.
 */
async function handlePaymentPaid(
  supabase: ReturnType<typeof createAdminClient>,
  eventData: Record<string, unknown>
) {
  const paymongoPaymentId = eventData.id as string;
  const attributes = eventData.attributes as Record<string, unknown>;
  const amountCentavos = attributes.amount as number;

  // Find payment by provider_reference
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, order_id, amount, status')
    .eq('provider_reference', paymongoPaymentId)
    .single();

  if (paymentError || !payment) {
    console.error('PayMongo webhook: Payment not found for:', paymongoPaymentId);
    return;
  }

  // Idempotency: skip if already processed
  if (payment.status === 'success') {
    console.log('PayMongo webhook: Payment already confirmed:', paymongoPaymentId);
    return;
  }

  // Verify amount matches (PayMongo uses centavos)
  const expectedCentavos = Math.round(payment.amount * 100);
  if (amountCentavos !== expectedCentavos) {
    console.error(
      `PayMongo webhook: Amount mismatch. Expected ${expectedCentavos}, got ${amountCentavos}`
    );
    return;
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'success',
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  // Fetch current order version for optimistic locking consistency
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('version')
    .eq('id', payment.order_id)
    .single();

  // Update order: paid (increment version to match cash RPC behavior)
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: (currentOrder?.version ?? 0) + 1,
    })
    .eq('id', payment.order_id);

  // Log the event
  await supabase.from('order_events').insert({
    order_id: payment.order_id,
    event_type: 'payment_received',
    metadata: {
      payment_id: payment.id,
      paymongo_payment_id: paymongoPaymentId,
      method: 'digital',
      amount: payment.amount,
    },
  });

  console.log('PayMongo webhook: Payment confirmed for order:', payment.order_id);
}

/**
 * Handle payment.failed: Payment was declined or failed.
 * Revert order to unpaid status.
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  eventData: Record<string, unknown>
) {
  const paymongoPaymentId = eventData.id as string;

  // Find payment by provider_reference
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, order_id, status')
    .eq('provider_reference', paymongoPaymentId)
    .single();

  if (paymentError || !payment) {
    console.error('PayMongo webhook: Payment not found for failed:', paymongoPaymentId);
    return;
  }

  // Skip if already in terminal state
  if (payment.status === 'success' || payment.status === 'failed') {
    return;
  }

  // Update payment as failed
  await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('id', payment.id);

  // Revert order to unpaid
  await supabase
    .from('orders')
    .update({
      payment_status: 'unpaid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id);

  // Log the event
  await supabase.from('order_events').insert({
    order_id: payment.order_id,
    event_type: 'payment_failed',
    metadata: {
      payment_id: payment.id,
      paymongo_payment_id: paymongoPaymentId,
    },
  });

  console.log('PayMongo webhook: Payment failed for order:', payment.order_id);
}
