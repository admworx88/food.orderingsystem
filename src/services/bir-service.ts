'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { BIRReceiptData, BIRReceiptItem, BIRReceiptConfig } from '@/types/payment';

// Service result types (same pattern as order-service.ts)
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

// ============================================================
// F-C07: Generate BIR Receipt
// ============================================================

/**
 * Generate a BIR-compliant receipt for a paid order.
 * Fetches BIR config, order details, payment info, and cashier name.
 * Calls get_next_bir_receipt_number() RPC for sequential numbering.
 */
export async function generateBIRReceipt(
  orderId: string
): Promise<ServiceResult<BIRReceiptData>> {
  const idResult = uuidSchema.safeParse(orderId);
  if (!idResult.success) {
    return serviceError('E2001', 'Invalid order ID');
  }

  try {
    const supabase = await createServerClient();

    // Fetch BIR config, order with details, and payment in parallel
    const [configResult, orderResult, paymentResult] = await Promise.all([
      supabase.from('bir_receipt_config').select('*').limit(1).single(),
      supabase
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
        .single(),
      supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Validate BIR config exists
    if (configResult.error || !configResult.data) {
      console.error('BIR config not found:', configResult.error);
      return serviceError('E9001', 'BIR receipt configuration not found. Please contact admin.');
    }

    // Validate order exists and is paid
    if (orderResult.error || !orderResult.data) {
      return serviceError('E2001', 'Order not found');
    }

    const order = orderResult.data;
    if (order.payment_status !== 'paid') {
      return serviceError('E3001', 'Cannot generate receipt for unpaid order');
    }

    // Payment record is optional for receipt (cash payments might be immediate)
    const payment = paymentResult.data;

    // Get cashier name from payment processed_by
    let cashierName = 'System';
    if (payment?.processed_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payment.processed_by)
        .single();
      cashierName = profile?.full_name || 'System';
    }

    // Generate sequential receipt number via RPC
    const { data: receiptNumber, error: receiptError } = await supabase.rpc(
      'get_next_bir_receipt_number'
    );

    if (receiptError || !receiptNumber) {
      console.error('Receipt number generation failed:', receiptError);
      return serviceError('E9001', 'Failed to generate receipt number');
    }

    const config = configResult.data;

    // Build receipt items
    const items: BIRReceiptItem[] = (order.order_items || []).map((item) => ({
      name: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      addons: (item.order_item_addons || []).map((addon) => ({
        name: addon.addon_name,
        price: addon.additional_price,
      })),
    }));

    // Determine discount label
    let discountLabel: string | null = null;
    if (order.discount_amount && order.discount_amount > 0) {
      if (order.promo_codes) {
        const promo = order.promo_codes as { code: string; discount_value: number; discount_type: string };
        discountLabel = `Promo: ${promo.code}`;
      } else {
        discountLabel = 'Discount Applied';
      }
    }

    const receiptData: BIRReceiptData = {
      receiptNumber: receiptNumber as string,
      businessName: config.business_name,
      businessAddress: config.business_address,
      tin: config.tin,
      accreditationNumber: config.accreditation_number,
      accreditationDate: config.accreditation_date,
      permitNumber: config.permit_number,
      permitDateIssued: config.permit_date_issued,
      posMachineId: config.pos_machine_id,
      terminalId: config.terminal_id,

      orderNumber: order.order_number,
      orderType: order.order_type,
      tableNumber: order.table_number,
      roomNumber: order.room_number,
      dateTime: order.paid_at || order.created_at || new Date().toISOString(),
      cashierName,

      items,

      subtotal: order.subtotal,
      discountAmount: order.discount_amount || 0,
      discountLabel,
      taxableAmount: order.subtotal - (order.discount_amount || 0),
      vatAmount: order.tax_amount,
      serviceCharge: order.service_charge || 0,
      totalAmount: order.total_amount,

      paymentMethod: order.payment_method || 'cash',
      amountTendered: payment?.cash_received || null,
      changeGiven: payment?.change_given || null,
      providerReference: payment?.provider_reference || null,

      guestPhone: order.guest_phone,
      promoCode: order.promo_codes
        ? (order.promo_codes as { code: string }).code
        : null,
    };

    return { success: true, data: receiptData };
  } catch (error) {
    console.error('generateBIRReceipt unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}

// ============================================================
// Get BIR Config (for admin/settings display)
// ============================================================

/**
 * Fetch the BIR receipt configuration singleton.
 */
export async function getBIRConfig(): Promise<ServiceResult<BIRReceiptConfig>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('bir_receipt_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return serviceError('E9001', 'BIR configuration not found');
    }

    return { success: true, data };
  } catch (error) {
    console.error('getBIRConfig unexpected error:', error);
    return serviceError('E9001', 'An unexpected error occurred');
  }
}
