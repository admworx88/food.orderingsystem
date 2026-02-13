'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/types';
import {
  cashPaymentSchema,
  digitalPaymentSchema,
  refundSchema,
  discountSchema,
} from '@/lib/validators/payment';
import type { CashierOrder, RecentOrder, ShiftSummary } from '@/types/payment';
import { SENIOR_PWD_DISCOUNT_RATE } from '@/lib/constants/payment-methods';

// Database row types
type Order = Database['public']['Tables']['orders']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

// Standardized error structure (PRD Section 17 — E3xxx for payments)
interface ServiceErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

type ServiceSuccess<T> = { success: true; data: T };
type ServiceError = {
  success: false;
  error: string;
  errorDetail?: ServiceErrorDetail;
};
type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

function serviceError(code: string, message: string, details?: unknown): ServiceError {
  return { success: false, error: message, errorDetail: { code, message, details } };
}

const uuidSchema = z.string().uuid('Invalid ID format');

function validateId(id: string): { valid: true } | { valid: false; error: string } {
  const result = uuidSchema.safeParse(id);
  if (result.success) return { valid: true };
  return { valid: false, error: result.error.issues[0]?.message || 'Invalid ID' };
}

// ============================================================
// F-C01: Get Pending Orders (Cashier Queue)
// ============================================================

/**
 * Fetch all unpaid orders for the cashier pending queue.
 * Sorted by created_at ASC (oldest first).
 * These are orders where customers chose "Pay at Counter".
 */
export async function getPendingOrders(): Promise<ServiceResult<CashierOrder[]>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        ),
        promo_codes(code, discount_value, discount_type)
      `)
      .eq('payment_status', 'unpaid')
      .eq('status', 'pending_payment')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getPendingOrders failed:', error);
      return serviceError('E9001', 'Failed to fetch pending orders');
    }

    return { success: true, data: (data || []) as CashierOrder[] };
  } catch (error) {
    console.error('getPendingOrders unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C01b: Get Unpaid Bills (Bill Later Queue)
// ============================================================

/**
 * Fetch all bill_later orders that have been served but not yet paid.
 * These are dine-in orders where customers chose "Pay After Meal".
 * Sorted by created_at ASC (oldest first).
 */
export async function getUnpaidBills(): Promise<ServiceResult<CashierOrder[]>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        ),
        promo_codes(code, discount_value, discount_type)
      `)
      .eq('payment_status', 'unpaid')
      .eq('payment_method', 'bill_later')
      .in('status', ['preparing', 'ready', 'served'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getUnpaidBills failed:', error);
      return serviceError('E9001', 'Failed to fetch unpaid bills');
    }

    return { success: true, data: (data || []) as CashierOrder[] };
  } catch (error) {
    console.error('getUnpaidBills unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C01: Get Order Payment Details
// ============================================================

/**
 * Fetch full order details for the selected order in cashier view.
 */
export async function getOrderPaymentDetails(
  orderId: string
): Promise<ServiceResult<CashierOrder>> {
  const idCheck = validateId(orderId);
  if (!idCheck.valid) {
    return serviceError('E2001', idCheck.error);
  }

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        ),
        promo_codes(code, discount_value, discount_type)
      `)
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      console.error('getOrderPaymentDetails failed:', error);
      return serviceError('E2001', 'Order not found');
    }

    return { success: true, data: data as CashierOrder };
  } catch (error) {
    console.error('getOrderPaymentDetails unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C02: Process Cash Payment
// ============================================================

/**
 * Process a cash payment using the atomic RPC function.
 * Validates input, calls process_cash_payment RPC, revalidates paths.
 */
export async function processCashPayment(
  input: unknown
): Promise<ServiceResult<{ paymentId: string; changeGiven: number }>> {
  // Validate input
  const parseResult = cashPaymentSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3003', parseResult.error.issues[0]?.message || 'Invalid payment input');
  }

  const { orderId, amountTendered, cashierId, cashierName } = parseResult.data;

  try {
    const supabase = await createServerClient();

    // Fetch the order total to calculate change
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, status, payment_status, payment_method, expires_at')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    // Client-side validation before RPC call
    // Bill later orders can be in preparing/ready/served status
    const isBillLater = order.payment_method === 'bill_later';
    const validBillLaterStatus = ['preparing', 'ready', 'served'].includes(order.status);
    const validPendingStatus = order.status === 'pending_payment';

    if (order.payment_status !== 'unpaid') {
      return serviceError('E3007', 'Order is already paid');
    }

    if (!isBillLater && !validPendingStatus) {
      return serviceError('E3007', 'Order is not pending payment');
    }

    if (isBillLater && !validBillLaterStatus) {
      return serviceError('E3007', 'Bill later order is not ready for payment');
    }

    // Only check expiration for non-bill-later orders
    if (!isBillLater && order.expires_at && new Date(order.expires_at) < new Date()) {
      return serviceError('E2003', 'Order has expired');
    }

    if (amountTendered < order.total_amount) {
      return serviceError('E3005', 'Insufficient cash tendered');
    }

    const changeGiven = Math.round((amountTendered - order.total_amount) * 100) / 100;

    // Call atomic RPC function
    const { data: paymentId, error: rpcError } = await supabase.rpc('process_cash_payment', {
      p_order_id: orderId,
      p_amount: order.total_amount,
      p_cash_received: amountTendered,
      p_change_given: changeGiven,
      p_cashier_id: cashierId,
      p_cashier_name: cashierName,
    });

    if (rpcError) {
      console.error('processCashPayment RPC failed:', rpcError);

      // Parse error codes from RPC
      const errorMessage = rpcError.message || '';
      if (errorMessage.includes('E2001')) {
        return serviceError('E2001', 'Order not found');
      }
      if (errorMessage.includes('E2003')) {
        return serviceError('E2003', 'Order has expired');
      }
      if (errorMessage.includes('E3005')) {
        return serviceError('E3005', 'Insufficient cash tendered');
      }
      if (errorMessage.includes('E3007')) {
        return serviceError('E3007', 'Order is not pending payment');
      }

      return serviceError('E3001', 'Payment processing failed. Please try again.');
    }

    revalidatePath('/(cashier)/payments', 'page');
    revalidatePath('/(kitchen)/orders', 'page');

    return {
      success: true,
      data: { paymentId: paymentId as string, changeGiven },
    };
  } catch (error) {
    console.error('processCashPayment unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C03: Create GCash Payment (Stubbed — PayMongo)
// ============================================================

/**
 * Initiate a GCash payment via PayMongo.
 * Stubbed until PAYMONGO_SECRET_KEY is configured.
 */
export async function createGcashPayment(
  input: unknown
): Promise<ServiceResult<{ checkoutUrl: string; sourceId: string }>> {
  const parseResult = digitalPaymentSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3003', parseResult.error.issues[0]?.message || 'Invalid payment input');
  }

  const { orderId } = parseResult.data;

  // Feature flag: check if PayMongo is configured
  if (!process.env.PAYMONGO_SECRET_KEY) {
    return serviceError('E3002', 'Digital payments are not configured. Please use cash payment.');
  }

  try {
    const supabase = await createServerClient();

    // Validate order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, expires_at')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    if (order.status !== 'pending_payment' || order.payment_status !== 'unpaid') {
      return serviceError('E3007', 'Order is not pending payment');
    }

    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return serviceError('E2003', 'Order has expired');
    }

    const amountCentavos = Math.round(order.total_amount * 100);

    // Create PayMongo GCash source
    const response = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            redirect: {
              success: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/paymongo/redirect?status=success&order_id=${orderId}`,
              failed: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/paymongo/redirect?status=failed&order_id=${orderId}`,
            },
            type: 'gcash',
            currency: 'PHP',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('PayMongo GCash source creation failed:', await response.text());
      return serviceError('E3002', 'Failed to initiate GCash payment. Please try again.');
    }

    const sourceData = await response.json();
    const sourceId = sourceData.data.id;
    const checkoutUrl = sourceData.data.attributes.redirect.checkout_url;

    // Insert pending payment record
    await supabase.from('payments').insert({
      order_id: orderId,
      method: 'gcash',
      amount: order.total_amount,
      status: 'pending',
      provider_reference: sourceId,
    });

    // Update order payment_status to processing
    await supabase
      .from('orders')
      .update({ payment_status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return {
      success: true,
      data: { checkoutUrl, sourceId },
    };
  } catch (error) {
    console.error('createGcashPayment unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C04: Create Card Payment Intent (Stubbed — PayMongo)
// ============================================================

/**
 * Create a card payment intent via PayMongo.
 * Stubbed until PAYMONGO_SECRET_KEY is configured.
 */
export async function createCardPaymentIntent(
  input: unknown
): Promise<ServiceResult<{ clientKey: string; paymentIntentId: string }>> {
  const parseResult = digitalPaymentSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3003', parseResult.error.issues[0]?.message || 'Invalid payment input');
  }

  const { orderId } = parseResult.data;

  if (!process.env.PAYMONGO_SECRET_KEY) {
    return serviceError('E3002', 'Digital payments are not configured. Please use cash payment.');
  }

  try {
    const supabase = await createServerClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, expires_at')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    if (order.status !== 'pending_payment' || order.payment_status !== 'unpaid') {
      return serviceError('E3007', 'Order is not pending payment');
    }

    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return serviceError('E2003', 'Order has expired');
    }

    const amountCentavos = Math.round(order.total_amount * 100);

    // Create PayMongo payment intent
    const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            payment_method_allowed: ['card'],
            payment_method_options: { card: { request_three_d_secure: 'any' } },
            currency: 'PHP',
            description: `Order ${orderId}`,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('PayMongo payment intent creation failed:', await response.text());
      return serviceError('E3002', 'Failed to initiate card payment. Please try again.');
    }

    const intentData = await response.json();
    const paymentIntentId = intentData.data.id;
    const clientKey = intentData.data.attributes.client_key;

    // Insert pending payment record
    await supabase.from('payments').insert({
      order_id: orderId,
      method: 'card',
      amount: order.total_amount,
      status: 'pending',
      provider_reference: paymentIntentId,
    });

    // Update order payment_status to processing
    await supabase
      .from('orders')
      .update({ payment_status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return {
      success: true,
      data: { clientKey, paymentIntentId },
    };
  } catch (error) {
    console.error('createCardPaymentIntent unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C06: Apply Senior/PWD Discount
// ============================================================

/**
 * Apply 20% senior/PWD discount (pre-tax, per RA 9994/10754).
 * Recalculates tax, service charge, and total.
 */
export async function applySeniorPwdDiscount(
  input: unknown
): Promise<ServiceResult<{ discountAmount: number; newTotal: number }>> {
  const parseResult = discountSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3003', parseResult.error.issues[0]?.message || 'Invalid discount input');
  }

  const { orderId, discountType, idNumber } = parseResult.data;

  try {
    const supabase = await createServerClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, subtotal, discount_amount, status, payment_status')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    if (order.status !== 'pending_payment' || order.payment_status !== 'unpaid') {
      return serviceError('E3007', 'Cannot apply discount — order is not pending payment');
    }

    // Calculate 20% discount on subtotal (pre-tax)
    const discountAmount = Math.round(order.subtotal * SENIOR_PWD_DISCOUNT_RATE * 100) / 100;
    const taxableAmount = order.subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * 0.12 * 100) / 100;
    const serviceCharge = Math.round(taxableAmount * 0.10 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount + serviceCharge) * 100) / 100;

    // Update order with new discount and recalculated amounts
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('applySeniorPwdDiscount update failed:', updateError);
      return serviceError('E9001', 'Failed to apply discount');
    }

    // Log the discount event
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'discount_applied',
      metadata: {
        discount_type: discountType,
        id_number: idNumber,
        discount_rate: SENIOR_PWD_DISCOUNT_RATE,
        discount_amount: discountAmount,
      },
    });

    revalidatePath('/(cashier)/payments', 'page');

    return {
      success: true,
      data: { discountAmount, newTotal: totalAmount },
    };
  } catch (error) {
    console.error('applySeniorPwdDiscount unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C07: Get Payment By Order ID
// ============================================================

/**
 * Fetch the payment record for an order (for receipt generation).
 */
export async function getPaymentByOrderId(
  orderId: string
): Promise<ServiceResult<Payment>> {
  const idCheck = validateId(orderId);
  if (!idCheck.valid) {
    return serviceError('E2001', idCheck.error);
  }

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return serviceError('E3001', 'Payment record not found for this order');
    }

    return { success: true, data };
  } catch (error) {
    console.error('getPaymentByOrderId unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C08: Process Refund
// ============================================================

/**
 * Process a full or partial refund.
 * Requires manager PIN verification.
 * Logs to audit_log with refund reason.
 */
export async function processRefund(
  input: unknown
): Promise<ServiceResult<{ refundId: string }>> {
  const parseResult = refundSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3004', parseResult.error.issues[0]?.message || 'Invalid refund input');
  }

  const { paymentId, reason, reasonText, managerPin, isPartial, itemIds } = parseResult.data;

  try {
    const supabase = await createServerClient();

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, orders(id, total_amount, status, payment_status)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return serviceError('E3001', 'Payment not found');
    }

    if (payment.status !== 'success') {
      return serviceError('E3004', 'Only successful payments can be refunded');
    }

    // Verify manager PIN
    // Find any admin/manager user with matching pin_hash
    const { data: managers, error: managerError } = await supabase
      .from('profiles')
      .select('id, pin_hash')
      .in('role', ['admin'])
      .eq('is_active', true);

    if (managerError || !managers || managers.length === 0) {
      return serviceError('E1001', 'No manager accounts configured');
    }

    // Simple PIN comparison (in production, use bcrypt hash comparison)
    const pinMatch = managers.some((m) => m.pin_hash === managerPin);
    if (!pinMatch) {
      return serviceError('E1001', 'Invalid manager PIN');
    }

    // Calculate refund amount
    let refundAmount = payment.amount;
    if (isPartial && itemIds && itemIds.length > 0) {
      // Fetch items to calculate partial refund
      const orderId = (payment as Payment & { orders: Order }).orders?.id;
      if (!orderId) {
        return serviceError('E2001', 'Associated order not found');
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('id, total_price')
        .eq('order_id', orderId)
        .in('id', itemIds);

      if (!items || items.length === 0) {
        return serviceError('E3004', 'No valid items found for partial refund');
      }

      refundAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      refundAmount = Math.round(refundAmount * 100) / 100;
    }

    // Update payment status (atomic: only if still 'success' to prevent concurrent refund race)
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
      })
      .eq('id', paymentId)
      .eq('status', 'success')
      .select('id')
      .single();

    if (updateError || !updatedPayment) {
      console.error('processRefund update failed:', updateError);
      return serviceError('E3004', 'Refund already processed or payment status changed');
    }

    // Update order payment_status
    const orderId = (payment as Payment & { orders: Order }).orders?.id;
    if (orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Log refund event
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'refund_processed',
        metadata: {
          payment_id: paymentId,
          reason,
          reason_text: reasonText || null,
          is_partial: isPartial,
          refund_amount: refundAmount,
          item_ids: itemIds || null,
        },
      });
    }

    // Log to audit trail
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      action: 'refund',
      table_name: 'payments',
      record_id: paymentId,
      user_id: user?.id || null,
      old_data: { status: 'success', amount: payment.amount },
      new_data: {
        status: 'refunded',
        refund_amount: refundAmount,
        reason,
        reason_text: reasonText || null,
        is_partial: isPartial,
      },
    });

    // If PayMongo payment, initiate refund via API
    if (payment.method !== 'cash' && payment.provider_reference && process.env.PAYMONGO_SECRET_KEY) {
      try {
        await fetch(`https://api.paymongo.com/v1/refunds`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                amount: Math.round(refundAmount * 100),
                payment_id: payment.provider_reference,
                reason: 'requested_by_customer',
              },
            },
          }),
        });
      } catch (paymongoError) {
        console.error('PayMongo refund API failed:', paymongoError);
        // Refund is already recorded locally — PayMongo sync can be retried
      }
    }

    revalidatePath('/(cashier)/payments', 'page');

    return {
      success: true,
      data: { refundId: paymentId },
    };
  } catch (error) {
    console.error('processRefund unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// Cancel Expired Orders (Client-side polling target)
// ============================================================

/**
 * Cancel all expired unpaid orders via RPC.
 * Called by cashier UI every 60 seconds.
 */
export async function cancelExpiredOrders(): Promise<ServiceResult<{ cancelledCount: number }>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('cancel_expired_orders');

    if (error) {
      console.error('cancelExpiredOrders RPC failed:', error);
      return serviceError('E9001', 'Failed to cancel expired orders');
    }

    const cancelledCount = (data as number) || 0;

    if (cancelledCount > 0) {
      revalidatePath('/(cashier)/payments', 'page');
    }

    return { success: true, data: { cancelledCount } };
  } catch (error) {
    console.error('cancelExpiredOrders unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C10: Get Recent Completed Orders
// ============================================================

/**
 * Fetch recent completed/served orders from the last 24 hours.
 * Includes order items, addons, promo code, and payment records.
 * Sorted by most recent first.
 */
export async function getRecentCompletedOrders(): Promise<ServiceResult<RecentOrder[]>> {
  try {
    const supabase = await createServerClient();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        ),
        promo_codes(code, discount_value, discount_type),
        payments(*)
      `)
      .in('payment_status', ['paid', 'refunded'])
      .gte('paid_at', twentyFourHoursAgo)
      .is('deleted_at', null)
      .order('paid_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getRecentCompletedOrders failed:', error);
      return serviceError('E9001', 'Failed to fetch recent orders');
    }

    return { success: true, data: (data || []) as RecentOrder[] };
  } catch (error) {
    console.error('getRecentCompletedOrders unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C09: Shift Summary / Reconciliation
// ============================================================

/**
 * Generate a shift summary for the current day.
 */
export async function getShiftSummary(
  date?: string
): Promise<ServiceResult<ShiftSummary>> {
  try {
    const supabase = await createServerClient();

    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    let cashierName = 'Unknown';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      cashierName = profile?.full_name || 'Unknown';
    }

    // Fetch all payments for the day
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('method, amount, status')
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);

    if (paymentsError) {
      console.error('getShiftSummary payments fetch failed:', paymentsError);
      return serviceError('E9001', 'Failed to fetch payment data');
    }

    // Fetch order counts
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, payment_status')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .is('deleted_at', null);

    if (ordersError) {
      console.error('getShiftSummary orders fetch failed:', ordersError);
      return serviceError('E9001', 'Failed to fetch order data');
    }

    const successPayments = (payments || []).filter((p) => p.status === 'success');
    const refundedPayments = (payments || []).filter((p) => p.status === 'refunded');

    const cashPayments = successPayments.filter((p) => p.method === 'cash');
    const gcashPayments = successPayments.filter((p) => p.method === 'gcash');
    const cardPayments = successPayments.filter((p) => p.method === 'card');

    const sumAmount = (arr: typeof successPayments) =>
      Math.round(arr.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    const cancelledOrders = (orders || []).filter(
      (o) => o.status === 'cancelled' && o.payment_status !== 'expired'
    ).length;

    const expiredOrders = (orders || []).filter(
      (o) => o.payment_status === 'expired'
    ).length;

    const summary: ShiftSummary = {
      date: targetDate,
      cashierName,
      totalOrders: successPayments.length,
      totalRevenue: sumAmount(successPayments),
      cashPayments: { count: cashPayments.length, total: sumAmount(cashPayments) },
      gcashPayments: { count: gcashPayments.length, total: sumAmount(gcashPayments) },
      cardPayments: { count: cardPayments.length, total: sumAmount(cardPayments) },
      refunds: { count: refundedPayments.length, total: sumAmount(refundedPayments) },
      cancelledOrders,
      expiredOrders,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('getShiftSummary unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}
