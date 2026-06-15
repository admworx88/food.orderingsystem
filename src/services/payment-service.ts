'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
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
import { logAuditEvent } from '@/services/analytics-service';

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
 * Fetch unpaid orders for the cashier pending queue.
 * When kioskLocation is 'ocean_view', only that location's orders are returned.
 * When null/undefined (restaurant cashier), all orders are returned.
 */
export async function getPendingOrders(kioskLocation?: string | null): Promise<ServiceResult<CashierOrder[]>> {
  try {
    const supabase = createAdminClient();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
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
      .gte('created_at', since);

    if (kioskLocation === 'ocean_view') {
      query = query.eq('kiosk_location', 'ocean_view');
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.warn('getPendingOrders failed:', error);
      return serviceError('E9001', 'Failed to fetch pending orders');
    }

    return { success: true, data: (data || []) as CashierOrder[] };
  } catch (error) {
    console.warn('getPendingOrders unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// F-C01b: Get Unpaid Bills (Bill Later Queue)
// ============================================================

/**
 * Fetch bill_later orders that have been served but not yet paid.
 * When kioskLocation is 'ocean_view', only that location's orders are returned.
 * When null/undefined (restaurant cashier), all orders are returned.
 */
export async function getUnpaidBills(kioskLocation?: string | null): Promise<ServiceResult<CashierOrder[]>> {
  try {
    const supabase = createAdminClient();

    let query = supabase
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
      .is('deleted_at', null);

    if (kioskLocation === 'ocean_view') {
      query = query.eq('kiosk_location', 'ocean_view');
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.warn('getUnpaidBills failed:', error);
      return serviceError('E9001', 'Failed to fetch unpaid bills');
    }

    return { success: true, data: (data || []) as CashierOrder[] };
  } catch (error) {
    console.warn('getUnpaidBills unexpected error:', error);
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

  const { orderId, amountTendered, cashierId } = parseResult.data;

  try {
    const admin = createAdminClient();

    // Fetch the order total to calculate change
    const { data: order, error: orderError } = await admin
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
    const { data: paymentId, error: rpcError } = await admin.rpc('process_cash_payment', {
      p_order_id: orderId,
      p_amount: order.total_amount,
      p_cash_received: amountTendered,
      p_change_given: changeGiven,
      p_cashier_id: cashierId,
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
// F-C02b: Process Manual eWallet Payment (GoTyme, Maya, GCash manual)
// ============================================================

const manualEwalletSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  method: z.enum(['gcash', 'gotyme', 'maya', 'other_banks']),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  cashierId: z.string().uuid('Invalid cashier ID'),
});

// Map UI method to DB payment_method enum value
const DB_METHOD_MAP = {
  gcash: 'gcash',
  gotyme: 'ewallet',
  maya: 'ewallet',
  other_banks: 'ewallet',
} as const;

export async function processManualEwalletPayment(
  input: unknown
): Promise<ServiceResult<{ paymentId: string }>> {
  const parseResult = manualEwalletSchema.safeParse(input);
  if (!parseResult.success) {
    return serviceError('E3003', parseResult.error.issues[0]?.message || 'Invalid input');
  }

  const { orderId, method, referenceNumber, cashierId } = parseResult.data;
  const dbMethod = DB_METHOD_MAP[method];

  try {
    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, total_amount, status, payment_status, payment_method, expires_at')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) return serviceError('E2001', 'Order not found');

    const isBillLater = order.payment_method === 'bill_later';
    const validStatus = isBillLater
      ? ['preparing', 'ready', 'served'].includes(order.status)
      : order.status === 'pending_payment';

    if (order.payment_status !== 'unpaid') return serviceError('E3007', 'Order is already paid');
    if (!validStatus) return serviceError('E3007', 'Order is not pending payment');
    if (!isBillLater && order.expires_at && new Date(order.expires_at) < new Date()) {
      return serviceError('E2003', 'Order has expired');
    }

    const nextStatus = isBillLater ? order.status : 'paid';

    // Insert payment record first — if this fails, the order remains unpaid (safe state)
    // provider_reference stores "brand:refNumber" so analytics can distinguish GoTyme vs Maya
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .insert({
        order_id: orderId,
        method: dbMethod,
        amount: order.total_amount,
        status: 'success',
        provider_reference: `${method}:${referenceNumber}`,
        processed_by: cashierId,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      console.error('processManualEwalletPayment payment record failed:', paymentError);
      return serviceError('E3001', 'Payment processing failed. Please try again.');
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: dbMethod,
        status: nextStatus,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('processManualEwalletPayment order update failed:', updateError);
      return serviceError('E3001', 'Payment record created but order status update failed. Please contact support.');
    }

    revalidatePath('/(cashier)/payments', 'page');
    revalidatePath('/(kitchen)/orders', 'page');

    return { success: true, data: { paymentId: payment.id } };
  } catch (error) {
    console.error('processManualEwalletPayment unexpected error:', error);
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
    // Use admin client: cashier staff authenticate via PIN (no Supabase Auth session),
    // so createServerClient() runs as anon and RLS blocks UPDATE on orders.
    const supabase = createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, subtotal, discount_amount, status, payment_status')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    // Allow discount on pending_payment orders AND bill_later (paid + unpaid) orders
    const canApplyDiscount =
      (order.status === 'pending_payment' && order.payment_status === 'unpaid') ||
      (order.payment_status === 'unpaid');
    if (!canApplyDiscount) {
      return serviceError('E3007', 'Cannot apply discount — order is already paid');
    }

    // Fetch configurable rates from settings, fall back to defaults
    const { data: rateRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['pwd_sc_discount_rate', 'tax_rate', 'service_charge']);
    const rateMap = Object.fromEntries((rateRows ?? []).map((r) => [r.key, r.value]));
    const pwdRate = typeof rateMap.pwd_sc_discount_rate === 'number' ? rateMap.pwd_sc_discount_rate : SENIOR_PWD_DISCOUNT_RATE;
    const taxRate = typeof rateMap.tax_rate === 'number' ? rateMap.tax_rate : 0.12;
    const scRate = typeof rateMap.service_charge === 'number' ? rateMap.service_charge : 0.10;

    const discountAmount = Math.round(order.subtotal * pwdRate * 100) / 100;
    const taxableAmount = order.subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
    const serviceCharge = Math.round(taxableAmount * scRate * 100) / 100;
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
        discount_rate: pwdRate,
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

/**
 * Remove an applied discount and recalculate totals at full subtotal.
 */
export async function removeDiscount(
  orderId: string
): Promise<ServiceResult<{ newTotal: number }>> {
  try {
    // Use admin client: same reason as applySeniorPwdDiscount — PIN auth has no session
    const supabase = createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, subtotal, status, payment_status')
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    if (order.payment_status !== 'unpaid') {
      return serviceError('E3007', 'Cannot modify discount — order is already paid');
    }

    const { data: rateRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tax_rate', 'service_charge']);
    const rateMap = Object.fromEntries((rateRows ?? []).map((r) => [r.key, r.value]));
    const taxRate = typeof rateMap.tax_rate === 'number' ? rateMap.tax_rate : 0.12;
    const scRate = typeof rateMap.service_charge === 'number' ? rateMap.service_charge : 0.10;

    const taxAmount = Math.round(order.subtotal * taxRate * 100) / 100;
    const serviceCharge = Math.round(order.subtotal * scRate * 100) / 100;
    const totalAmount = Math.round((order.subtotal + taxAmount + serviceCharge) * 100) / 100;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        discount_amount: 0,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('removeDiscount update failed:', updateError);
      return serviceError('E9001', 'Failed to remove discount');
    }

    revalidatePath('/(cashier)/payments', 'page');
    return { success: true, data: { newTotal: totalAmount } };
  } catch (error) {
    console.error('removeDiscount unexpected error:', error);
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
    const admin = createAdminClient();

    // Fetch payment record
    const { data: payment, error: paymentError } = await admin
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
    const { data: managers, error: managerError } = await admin
      .from('profiles')
      .select('id, pin_hash')
      .in('role', ['admin'])
      .eq('is_active', true);

    if (managerError || !managers || managers.length === 0) {
      return serviceError('E1001', 'No manager accounts configured');
    }

    let pinMatch = false;
    for (const m of managers) {
      if (m.pin_hash && await bcrypt.compare(managerPin, m.pin_hash)) {
        pinMatch = true;
        break;
      }
    }
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

      const { data: items } = await admin
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
    const { data: updatedPayment, error: updateError } = await admin
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
      await admin
        .from('orders')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Log refund event
      await admin.from('order_events').insert({
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

    // Log to audit trail — user context unavailable from kiosk (no Supabase auth session)
    const { data: { user } } = await createServerClient().then(s => s.auth.getUser()).catch(() => ({ data: { user: null } }));
    await admin.from('audit_log').insert({
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
    const admin = createAdminClient();

    const { data, error } = await admin.rpc('cancel_expired_orders');

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
// F-C11: Void Bill (Cashier PIN confirmation)
// ============================================================

export async function voidBill(input: {
  orderId: string;
  cashierPin: string;
  voidReason: string;
  cashierId: string;
  cashierName: string;
}): Promise<ServiceResult<{ orderId: string }>> {
  const { orderId, cashierPin, voidReason, cashierId, cashierName } = input;

  if (!orderId || !cashierPin || !voidReason.trim()) {
    return serviceError('E3005', 'Order ID, PIN, and void reason are required');
  }
  if (!/^\d{4,6}$/.test(cashierPin)) {
    return serviceError('E1001', 'Invalid PIN format');
  }
  if (voidReason.trim().length < 5) {
    return serviceError('E3005', 'Void reason must be at least 5 characters');
  }

  try {
    const admin = createAdminClient();

    // Verify PIN belongs to this cashier — fetch by ID, compare hash in JS
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, full_name, role, pin_hash')
      .eq('id', cashierId)
      .eq('is_active', true)
      .single();

    if (profileError || !profile || !profile.pin_hash || !(await bcrypt.compare(cashierPin, profile.pin_hash))) {
      return serviceError('E1001', 'Incorrect PIN. Please try again.');
    }

    // Fetch order to validate status and capture old_data
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, order_number, status, total_amount, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return serviceError('E2001', 'Order not found');
    }

    if (!['pending_payment', 'paid'].includes(order.status as string)) {
      return serviceError('E3005', `Cannot void an order with status "${order.status}"`);
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      console.error('voidBill update failed:', updateError);
      return serviceError('E3005', 'Failed to void bill');
    }

    await logAuditEvent({
      table_name: 'orders',
      action: 'void_bill',
      record_id: orderId,
      old_data: {
        status: order.status,
        order_number: order.order_number,
        total_amount: order.total_amount,
      },
      new_data: {
        status: 'cancelled',
        void_reason: voidReason.trim(),
        voided_by: cashierName,
        voided_by_id: cashierId,
        voided_at: new Date().toISOString(),
      },
      user_id: cashierId,
    });

    revalidatePath('/(cashier)/payments', 'page');

    return { success: true, data: { orderId } };
  } catch (error) {
    console.error('voidBill unexpected error:', error);
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
  date?: string,
  staffName?: string | null
): Promise<ServiceResult<ShiftSummary>> {
  try {
    const supabase = await createServerClient();

    const targetDate = date || new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).split(' ')[0];
    // Use PHT (UTC+8) boundaries — the business operates in Philippine Standard Time
    const startOfDay = new Date(`${targetDate}T00:00:00+08:00`).toISOString();
    const endOfDay = new Date(`${targetDate}T23:59:59.999+08:00`).toISOString();

    // Prefer staffName passed from kiosk session; fall back to Supabase auth user
    let cashierName = staffName || 'Unknown';
    if (!staffName) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        cashierName = profile?.full_name || 'Unknown';
      }
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
    const ewalletPayments = successPayments.filter((p) => p.method === 'ewallet');
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
      ewalletPayments: { count: ewalletPayments.length, total: sumAmount(ewalletPayments) },
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

// ============================================================
// F-C09: Shift Collection Submission
// ============================================================

/**
 * Check whether the authenticated cashier has submitted their collection for today.
 */
export async function hasSubmittedShiftCollection(): Promise<{
  submitted: boolean;
  submittedAt: string | null;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { submitted: false, submittedAt: null };

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('shift_collections')
      .select('submitted_at')
      .eq('cashier_id', user.id)
      .eq('date', today)
      .maybeSingle();

    return { submitted: !!data, submittedAt: data?.submitted_at ?? null };
  } catch {
    return { submitted: false, submittedAt: null };
  }
}

/**
 * Submit a shift collection — one-shot, atomic via DB function.
 * Closes the shift and snapshots totals into shift_collections.
 */
export async function submitShiftCollection(shiftId: string, overrideCashierId?: string): Promise<ServiceResult<{ submittedAt: string }>> {
  try {
    const idCheck = validateId(shiftId);
    if (!idCheck.valid) return serviceError('E2001', idCheck.error);

    const admin = createAdminClient();
    let cashierId: string;
    if (overrideCashierId) {
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    // Get cashier name
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', cashierId)
      .single();

    // Get current shift details for totals
    const detailsResult = await getShiftDetails(shiftId, overrideCashierId);
    if (!detailsResult.success) return serviceError('E9001', 'Failed to compute shift totals');
    const { totals } = detailsResult.data;

    const { data: submittedAt, error } = await admin.rpc('submit_shift', {
      p_shift_id: shiftId,
      p_cashier_id: cashierId,
      p_cashier_name: profile?.full_name ?? 'Unknown',
      p_gross_total: totals.grossTotal,
      p_cash_total: totals.byMethod.cash.total,
      p_gcash_total: totals.byMethod.gcash.total,
      p_ewallet_total: totals.byMethod.ewallet.total,
      p_card_total: totals.byMethod.card.total,
      p_refunds_total: totals.refundsTotal,
      p_deductions_total: totals.deductionsTotal,
      p_net_cash: totals.netCash,
      p_total_orders: totals.totalOrders,
    });

    if (error) {
      if (error.message?.includes('E3102')) {
        return serviceError('E3102', 'Shift is already closed');
      }
      console.error('submitShiftCollection RPC failed:', error);
      return serviceError('E9001', 'Failed to submit collection');
    }

    await logAuditEvent({
      table_name: 'shift_collections',
      action: 'submit',
      record_id: shiftId,
      new_data: {
        cashier: profile?.full_name,
        grossTotal: totals.grossTotal,
        netCash: totals.netCash,
        deductionsTotal: totals.deductionsTotal,
      },
    });

    revalidatePath('/collections');
    revalidatePath('/payments');
    return { success: true, data: { submittedAt: submittedAt as string } };
  } catch (error) {
    console.error('submitShiftCollection unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// Verify Admin PIN (used by kiosk location reset)
// ============================================================

export async function verifyAdminPin(
  pin: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerClient();
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, pin_hash')
      .in('role', ['admin'])
      .eq('is_active', true);

    if (error || !admins || admins.length === 0) {
      return { success: false };
    }

    for (const a of admins) {
      if (a.pin_hash && await bcrypt.compare(pin, a.pin_hash)) {
        return { success: true };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

// ============================================================
// F-C10: Shift Management (Collections)
// ============================================================

export interface Shift {
  id: string;
  cashier_id: string;
  started_at: string;
  ended_at: string | null;
  submitted_at: string | null;
  status: 'open' | 'closed';
  notes: string | null;
}

export interface ShiftDeduction {
  id: string;
  shift_id: string;
  amount: number;
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface ShiftPaymentRow {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  status: string;
  completed_at: string;
  order_number: string;
}

export interface ShiftTotals {
  grossTotal: number;
  byMethod: {
    cash: { count: number; total: number };
    gcash: { count: number; total: number };
    ewallet: { count: number; total: number };
    card: { count: number; total: number };
    bill_later: { count: number; total: number };
  };
  refundsTotal: number;
  deductionsTotal: number;
  netCash: number;
  totalOrders: number;
}

export interface ShiftDetails {
  shift: Shift;
  cashierName: string;
  payments: ShiftPaymentRow[];
  deductions: ShiftDeduction[];
  totals: ShiftTotals;
}

/**
 * Start a new shift for the authenticated cashier.
 * Fails with E3101 if an open shift already exists (enforced by DB partial unique index).
 */
export async function startShift(overrideCashierId?: string): Promise<ServiceResult<Shift>> {
  try {
    const admin = createAdminClient();
    let cashierId: string;

    if (overrideCashierId) {
      const idCheck = validateId(overrideCashierId);
      if (!idCheck.valid) return serviceError('E1001', 'Invalid cashier ID');
      const { data: profile } = await admin.from('profiles').select('id, role, is_active').eq('id', overrideCashierId).single();
      if (!profile?.is_active || !['cashier', 'admin'].includes(profile.role ?? '')) {
        return serviceError('E1001', 'Cashier account not found or inactive');
      }
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data, error } = await admin
      .from('shifts')
      .insert({ cashier_id: cashierId, status: 'open' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return serviceError('E3101', 'You already have an open shift. Submit it before starting a new one.');
      }
      console.error('startShift failed:', error);
      return serviceError('E9001', 'Failed to start shift');
    }

    await logAuditEvent({
      table_name: 'shifts',
      action: 'start',
      record_id: data.id,
      new_data: { cashier_id: cashierId, started_at: data.started_at },
    });

    revalidatePath('/payments');
    revalidatePath('/collections');
    return { success: true, data: data as Shift };
  } catch (error) {
    console.error('startShift unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Get the currently open shift for the authenticated cashier, or null if none.
 */
export async function getOpenShift(overrideCashierId?: string): Promise<ServiceResult<Shift | null>> {
  try {
    const admin = createAdminClient();
    let cashierId: string;

    if (overrideCashierId) {
      const idCheck = validateId(overrideCashierId);
      if (!idCheck.valid) return serviceError('E1001', 'Invalid cashier ID');
      const { data: profile } = await admin.from('profiles').select('id, role, is_active').eq('id', overrideCashierId).single();
      if (!profile?.is_active || !['cashier', 'admin'].includes(profile.role ?? '')) {
        return serviceError('E1001', 'Cashier account not found or inactive');
      }
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data, error } = await admin
      .from('shifts')
      .select('*')
      .eq('cashier_id', cashierId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      console.error('getOpenShift failed:', error);
      return serviceError('E9001', 'Failed to fetch shift status');
    }

    return { success: true, data: data as Shift | null };
  } catch (error) {
    console.error('getOpenShift unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Get the most recently closed shift for the authenticated cashier (for history display).
 */
export async function getMostRecentClosedShift(overrideCashierId?: string): Promise<ServiceResult<Shift | null>> {
  try {
    const admin = createAdminClient();
    let cashierId: string;

    if (overrideCashierId) {
      const idCheck = validateId(overrideCashierId);
      if (!idCheck.valid) return serviceError('E1001', 'Invalid cashier ID');
      const { data: profile } = await admin.from('profiles').select('id, role, is_active').eq('id', overrideCashierId).single();
      if (!profile?.is_active || !['cashier', 'admin'].includes(profile.role ?? '')) {
        return serviceError('E1001', 'Cashier account not found or inactive');
      }
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data, error } = await admin
      .from('shifts')
      .select('*')
      .eq('cashier_id', cashierId)
      .eq('status', 'closed')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getMostRecentClosedShift failed:', error);
      return serviceError('E9001', 'Failed to fetch shift history');
    }

    return { success: true, data: data as Shift | null };
  } catch (error) {
    console.error('getMostRecentClosedShift unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Get submitted shift_collections for a cashier, newest first (max 50).
 */
export async function getShiftCollections(overrideCashierId?: string): Promise<ServiceResult<import('@/types/payment').ShiftCollectionRecord[]>> {
  try {
    const admin = createAdminClient();
    let cashierId: string;

    if (overrideCashierId) {
      const idCheck = validateId(overrideCashierId);
      if (!idCheck.valid) return serviceError('E1001', 'Invalid cashier ID');
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data, error } = await admin
      .from('shift_collections')
      .select('id, remittance_number, cashier_id, cashier_name, date, submitted_at, shift_started_at, shift_ended_at, total_orders, total_revenue, cash_total, gcash_total, ewallet_total, card_total, refunds_total, deductions_total, net_cash, shift_id')
      .eq('cashier_id', cashierId)
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getShiftCollections failed:', error);
      return serviceError('E9001', 'Failed to fetch collection history');
    }

    return { success: true, data: (data ?? []) as import('@/types/payment').ShiftCollectionRecord[] };
  } catch (error) {
    console.error('getShiftCollections unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Check if the authenticated cashier has an open shift (used for sign-out gate).
 */
export async function hasOpenShift(): Promise<{ hasOpen: boolean; shiftId: string | null }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { hasOpen: false, shiftId: null };

    const { data } = await supabase
      .from('shifts')
      .select('id')
      .eq('cashier_id', user.id)
      .eq('status', 'open')
      .maybeSingle();

    return { hasOpen: !!data, shiftId: data?.id ?? null };
  } catch {
    return { hasOpen: false, shiftId: null };
  }
}

/**
 * Get full shift details including payments (via RPC) and deductions.
 * Computes totals server-side.
 */
export async function getShiftDetails(shiftId: string, overrideCashierId?: string): Promise<ServiceResult<ShiftDetails>> {
  try {
    const idCheck = validateId(shiftId);
    if (!idCheck.valid) return serviceError('E2001', idCheck.error);

    const admin = createAdminClient();
    let callerId: string;

    if (overrideCashierId) {
      const idCheck2 = validateId(overrideCashierId);
      if (!idCheck2.valid) return serviceError('E1001', 'Invalid cashier ID');
      callerId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      callerId = user.id;
    }

    // Fetch shift + cashier name — ownership check uses callerId
    const { data: shift, error: shiftError } = await admin
      .from('shifts')
      .select('*, profiles(full_name)')
      .eq('id', shiftId)
      .eq('cashier_id', callerId)
      .single();

    if (shiftError || !shift) {
      return serviceError('E9001', 'Shift not found or access denied');
    }

    const cashierName = (shift.profiles as { full_name: string } | null)?.full_name ?? 'Unknown';
    const shiftCashierId = (shift as unknown as { cashier_id: string }).cashier_id;

    const shiftStartedAt = new Date((shift as unknown as { started_at: string }).started_at);
    const shiftEndedAt = (shift as unknown as { ended_at: string | null }).ended_at;
    const collectionEndUtc = shiftEndedAt ? new Date(shiftEndedAt) : new Date();

    const [paymentsResult, deductionsResult] = await Promise.all([
      admin
        .from('payments')
        .select('id, order_id, method, amount, status, completed_at, created_at, orders(order_number)')
        .eq('processed_by', shiftCashierId)
        .gte('created_at', shiftStartedAt.toISOString())
        .lte('created_at', collectionEndUtc.toISOString()),
      admin
        .from('shift_deductions')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: true }),
    ]);

    if (paymentsResult.error) {
      console.error('[getShiftDetails] payments query failed:', JSON.stringify(paymentsResult.error));
      return serviceError('E9001', 'Failed to fetch shift payments');
    }
    if (deductionsResult.error) {
      console.error('getShiftDetails deductions failed:', deductionsResult.error);
      return serviceError('E9001', 'Failed to fetch deductions');
    }

    const payments = (paymentsResult.data ?? []).map((p) => ({
      id: p.id,
      order_id: p.order_id,
      method: p.method,
      amount: p.amount,
      status: p.status,
      completed_at: p.completed_at ?? p.created_at,
      order_number: (p.orders as { order_number: string } | null)?.order_number ?? '',
    })) as ShiftPaymentRow[];

    const deductions = deductionsResult.data;

    // Compute totals
    const paymentRows = payments;
    const deductionRows = (deductions ?? []) as ShiftDeduction[];

    const byMethod = {
      cash: { count: 0, total: 0 },
      gcash: { count: 0, total: 0 },
      ewallet: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      bill_later: { count: 0, total: 0 },
    };
    let refundsTotal = 0;

    for (const p of paymentRows) {
      if (p.status === 'refunded') {
        refundsTotal += p.amount;
        continue;
      }
      if (p.status !== 'success') continue;
      const key = p.method as keyof typeof byMethod;
      if (key in byMethod) {
        byMethod[key].count++;
        byMethod[key].total += p.amount;
      }
    }

    const grossTotal = Object.values(byMethod).reduce((s, m) => s + m.total, 0);
    const deductionsTotal = deductionRows.reduce((s, d) => s + Number(d.amount), 0);
    const cashRefunds = paymentRows
      .filter((p) => p.status === 'refunded' && p.method === 'cash')
      .reduce((s, p) => s + p.amount, 0);
    const netCash = byMethod.cash.total - cashRefunds - deductionsTotal;
    const totalOrders = paymentRows.filter((p) => p.status === 'success').length;

    return {
      success: true,
      data: {
        shift: {
          id: shift.id,
          cashier_id: shift.cashier_id,
          started_at: shift.started_at,
          ended_at: shift.ended_at,
          submitted_at: shift.submitted_at,
          status: shift.status as 'open' | 'closed',
          notes: shift.notes,
        },
        cashierName,
        payments: paymentRows,
        deductions: deductionRows,
        totals: { grossTotal, byMethod, refundsTotal, deductionsTotal, netCash, totalOrders },
      },
    };
  } catch (error) {
    console.error('getShiftDetails unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Add a deduction to an open shift.
 */
export async function addDeduction(
  shiftId: string,
  amount: number,
  description: string,
  overrideCashierId?: string
): Promise<ServiceResult<ShiftDeduction>> {
  try {
    const idCheck = validateId(shiftId);
    if (!idCheck.valid) return serviceError('E2001', idCheck.error);
    if (amount <= 0) return serviceError('E2001', 'Amount must be greater than zero');
    if (!description.trim()) return serviceError('E2001', 'Description is required');

    const admin = createAdminClient();
    let cashierId: string;
    if (overrideCashierId) {
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    // Verify shift is open and owned by this cashier
    const { data: shift } = await admin
      .from('shifts')
      .select('id, status')
      .eq('id', shiftId)
      .eq('cashier_id', cashierId)
      .single();

    if (!shift) return serviceError('E9001', 'Shift not found');
    if (shift.status !== 'open') return serviceError('E3102', 'Shift is already closed');

    const { data, error } = await admin
      .from('shift_deductions')
      .insert({
        shift_id: shiftId,
        amount,
        description: description.trim(),
        created_by: cashierId,
      })
      .select()
      .single();

    if (error) {
      console.error('addDeduction failed:', error);
      return serviceError('E9001', 'Failed to add deduction');
    }

    revalidatePath('/collections');
    return { success: true, data: data as ShiftDeduction };
  } catch (error) {
    console.error('addDeduction unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Update an existing deduction (only while shift is open).
 */
export async function updateDeduction(
  id: string,
  amount: number,
  description: string,
  overrideCashierId?: string
): Promise<ServiceResult<ShiftDeduction>> {
  try {
    const idCheck = validateId(id);
    if (!idCheck.valid) return serviceError('E2001', idCheck.error);
    if (amount <= 0) return serviceError('E2001', 'Amount must be greater than zero');
    if (!description.trim()) return serviceError('E2001', 'Description is required');

    const admin = createAdminClient();
    let cashierId: string;
    if (overrideCashierId) {
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data: existing } = await admin
      .from('shift_deductions')
      .select('id, shifts(cashier_id, status)')
      .eq('id', id)
      .single();

    if (!existing) return serviceError('E9001', 'Deduction not found');
    const parentShift = (existing.shifts as { cashier_id: string; status: string } | null);
    if (parentShift?.cashier_id !== cashierId) return serviceError('E1001', 'Access denied');
    if (parentShift?.status !== 'open') return serviceError('E3102', 'Shift is already closed');

    const { data, error } = await admin
      .from('shift_deductions')
      .update({ amount, description: description.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateDeduction failed:', error);
      return serviceError('E9001', 'Failed to update deduction');
    }

    revalidatePath('/collections');
    return { success: true, data: data as ShiftDeduction };
  } catch (error) {
    console.error('updateDeduction unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

/**
 * Delete a deduction (only while shift is open).
 */
export async function deleteDeduction(id: string, overrideCashierId?: string): Promise<ServiceResult<void>> {
  try {
    const idCheck = validateId(id);
    if (!idCheck.valid) return serviceError('E2001', idCheck.error);

    const admin = createAdminClient();
    let cashierId: string;
    if (overrideCashierId) {
      cashierId = overrideCashierId;
    } else {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return serviceError('E1001', 'Not authenticated');
      cashierId = user.id;
    }

    const { data: existing } = await admin
      .from('shift_deductions')
      .select('id, shifts(cashier_id, status)')
      .eq('id', id)
      .single();

    if (!existing) return serviceError('E9001', 'Deduction not found');
    const parentShift = (existing.shifts as { cashier_id: string; status: string } | null);
    if (parentShift?.cashier_id !== cashierId) return serviceError('E1001', 'Access denied');
    if (parentShift?.status !== 'open') return serviceError('E3102', 'Shift is already closed');

    const { error } = await admin
      .from('shift_deductions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteDeduction failed:', error);
      return serviceError('E9001', 'Failed to delete deduction');
    }

    revalidatePath('/collections');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('deleteDeduction unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}
