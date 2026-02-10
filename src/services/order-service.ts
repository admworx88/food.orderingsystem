'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/types';
import { orderInputSchema, promoCodeInputSchema, type OrderInput } from '@/lib/validators/order';

// Type definitions
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderEvent = Database['public']['Tables']['order_events']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

type OrderWithItems = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
};

type OrderWithDetails = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
  order_events: OrderEvent[];
};

// Filter types
export interface OrderFilters {
  search?: string;
  status?: string;
  orderType?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  orders: OrderWithItems[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Standardized error structure (PRD Section 17)
interface ServiceErrorDetail {
  code: string;       // E.g., "E2001", "E5002"
  message: string;    // User-friendly message
  details?: unknown;  // Validation errors, additional context
}

// Service result types
type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceError = {
  success: false;
  error: string;             // User-friendly message (backwards-compatible)
  errorDetail?: ServiceErrorDetail; // Structured error code for programmatic handling
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// Error code helpers
function serviceError(code: string, message: string, details?: unknown): ServiceError {
  return { success: false, error: message, errorDetail: { code, message, details } };
}

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Sanitize user input for use in PostgREST LIKE/ILIKE patterns.
 * Escapes SQL wildcards (%, _) and PostgREST filter special characters (,, ., (, )).
 */
function sanitizeForLike(str: string): string {
  return str
    .replace(/[%_]/g, '\\$&')       // Escape SQL LIKE wildcards
    .replace(/[,.()"']/g, '')        // Strip PostgREST filter special chars
    .replace(/[\s\-\(\)]/g, '');     // Strip whitespace and common separators
}

function validateId(id: string): { valid: true } | { valid: false; error: string } {
  const result = uuidSchema.safeParse(id);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'Invalid ID' };
}

/**
 * Get orders by guest phone number
 */
export async function getOrdersByPhone(phone: string): Promise<ServiceResult<OrderWithItems[]>> {
  if (!phone || phone.trim().length < 3) {
    return { success: false, error: 'Please enter at least 3 characters to search' };
  }

  const supabase = await createServerClient();

  // Clean and sanitize phone number for safe LIKE pattern
  const cleanPhone = sanitizeForLike(phone);

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `)
    .ilike('guest_phone', `%${cleanPhone}%`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getOrdersByPhone failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as OrderWithItems[] };
}

/**
 * Get paginated and filtered orders
 */
export async function getOrders(filters: OrderFilters = {}): Promise<ServiceResult<PaginatedOrders>> {
  const {
    search,
    status,
    orderType,
    paymentStatus,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
  } = filters;

  const supabase = await createServerClient();

  // Build the query
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `, { count: 'exact' })
    .is('deleted_at', null);

  // Apply filters
  if (search) {
    // Sanitize search input to prevent PostgREST filter injection
    const cleanSearch = sanitizeForLike(search);
    query = query.or(`order_number.ilike.%${cleanSearch}%,guest_phone.ilike.%${cleanSearch}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status as Database['public']['Enums']['order_status']);
  }

  if (orderType && orderType !== 'all') {
    query = query.eq('order_type', orderType as Database['public']['Enums']['order_type']);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus as Database['public']['Enums']['payment_status']);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    // Add 1 day to include the entire end date
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('created_at', endDate.toISOString());
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('getOrders failed:', error);
    return { success: false, error: error.message };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    success: true,
    data: {
      orders: (data || []) as OrderWithItems[],
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

/**
 * Get full order details including events
 */
export async function getOrderDetails(id: string): Promise<ServiceResult<OrderWithDetails>> {
  const idValidation = validateId(id);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      ),
      order_events(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return serviceError('E2001', 'Order not found');
    }
    console.error('getOrderDetails failed:', error);
    return serviceError('E9001', error.message);
  }

  return { success: true, data: data as OrderWithDetails };
}

/**
 * Export orders to CSV format
 */
export async function exportOrdersCSV(filters: OrderFilters = {}): Promise<ServiceResult<string>> {
  const { search, status, orderType, paymentStatus, dateFrom, dateTo } = filters;

  const supabase = await createServerClient();

  // Build the query
  let query = supabase
    .from('orders')
    .select(`
      order_number,
      order_type,
      status,
      payment_status,
      payment_method,
      guest_phone,
      table_number,
      room_number,
      subtotal,
      tax_amount,
      service_charge,
      discount_amount,
      total_amount,
      special_instructions,
      created_at,
      paid_at,
      ready_at,
      served_at
    `)
    .is('deleted_at', null);

  // Apply filters
  if (search) {
    const cleanSearch = sanitizeForLike(search);
    query = query.or(`order_number.ilike.%${cleanSearch}%,guest_phone.ilike.%${cleanSearch}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status as Database['public']['Enums']['order_status']);
  }

  if (orderType && orderType !== 'all') {
    query = query.eq('order_type', orderType as Database['public']['Enums']['order_type']);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus as Database['public']['Enums']['payment_status']);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('created_at', endDate.toISOString());
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  // Limit to 5000 records for CSV export
  query = query.limit(5000);

  const { data, error } = await query;

  if (error) {
    console.error('exportOrdersCSV failed:', error);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'No orders found matching the filters' };
  }

  // Generate CSV
  const headers = [
    'Order Number',
    'Order Type',
    'Status',
    'Payment Status',
    'Payment Method',
    'Guest Phone',
    'Table Number',
    'Room Number',
    'Subtotal',
    'Tax',
    'Service Charge',
    'Discount',
    'Total',
    'Special Instructions',
    'Created At',
    'Paid At',
    'Ready At',
    'Served At',
  ];

  const formatOrderType = (type: string) => {
    switch (type) {
      case 'dine_in': return 'Dine In';
      case 'room_service': return 'Room Service';
      case 'takeout': return 'Takeout';
      default: return type;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const escapeCSV = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((order) => [
    escapeCSV(order.order_number),
    escapeCSV(formatOrderType(order.order_type)),
    escapeCSV(formatStatus(order.status)),
    escapeCSV(formatStatus(order.payment_status)),
    escapeCSV(order.payment_method || ''),
    escapeCSV(order.guest_phone || ''),
    escapeCSV(order.table_number || ''),
    escapeCSV(order.room_number || ''),
    escapeCSV(order.subtotal?.toFixed(2) || '0.00'),
    escapeCSV(order.tax_amount?.toFixed(2) || '0.00'),
    escapeCSV(order.service_charge?.toFixed(2) || '0.00'),
    escapeCSV(order.discount_amount?.toFixed(2) || '0.00'),
    escapeCSV(order.total_amount?.toFixed(2) || '0.00'),
    escapeCSV(order.special_instructions || ''),
    escapeCSV(formatDate(order.created_at)),
    escapeCSV(formatDate(order.paid_at)),
    escapeCSV(formatDate(order.ready_at)),
    escapeCSV(formatDate(order.served_at)),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return { success: true, data: csv };
}

/**
 * Get order count by status (for dashboard stats).
 * Uses DB-level head-only count queries instead of fetching all rows.
 */
export async function getOrderCountByStatus(): Promise<
  ServiceResult<Record<string, number>>
> {
  const supabase = await createServerClient();
  const statuses = ['pending_payment', 'paid', 'preparing', 'ready', 'served', 'cancelled'] as const;

  try {
    const results = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
          .is('deleted_at', null);

        if (error) throw error;
        return [status, count ?? 0] as const;
      })
    );

    const counts: Record<string, number> = {};
    for (const [status, count] of results) {
      counts[status] = count;
    }

    return { success: true, data: counts };
  } catch (error) {
    console.error('getOrderCountByStatus failed:', error);
    return serviceError('E9001', 'Failed to fetch order counts');
  }
}

// ==========================================
// Phase 2: Order Submission & Promo Codes
// ==========================================

/**
 * Validate a promo code and return discount amount
 */
export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<ServiceResult<{ promoId: string; discountAmount: number; code: string; description: string | null }>> {
  const parseResult = promoCodeInputSchema.safeParse({ code, subtotal });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' };
  }

  const { code: cleanCode, subtotal: validSubtotal } = parseResult.data;
  const supabase = await createServerClient();

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .ilike('code', cleanCode)
    .eq('is_active', true)
    .single();

  if (error || !promo) {
    return serviceError('E5001', 'Invalid promo code');
  }

  // Check date range
  const now = new Date();
  if (new Date(promo.valid_from) > now) {
    return serviceError('E5003', 'This promo code is not yet active');
  }
  if (new Date(promo.valid_until) < now) {
    return serviceError('E5002', 'This promo code has expired');
  }

  // Check usage limit
  if (promo.max_usage_count !== null && (promo.current_usage_count ?? 0) >= promo.max_usage_count) {
    return serviceError('E5004', 'This promo code has reached its usage limit');
  }

  // Check minimum order amount
  if (promo.min_order_amount !== null && validSubtotal < promo.min_order_amount) {
    return serviceError('E5005', `Minimum order of ₱${promo.min_order_amount.toFixed(2)} required for this promo`);
  }

  // Calculate discount (capped at subtotal — discount cannot exceed order value)
  let discountAmount: number;
  if (promo.discount_type === 'percentage') {
    discountAmount = Math.min(validSubtotal * (promo.discount_value / 100), validSubtotal);
  } else {
    discountAmount = Math.min(promo.discount_value, validSubtotal);
  }

  return {
    success: true,
    data: {
      promoId: promo.id,
      discountAmount: Math.round(discountAmount * 100) / 100,
      code: promo.code,
      description: promo.description,
    },
  };
}

/**
 * Create a new order from cart data.
 * Server-side price recalculation ensures integrity.
 */
export async function createOrder(
  input: OrderInput
): Promise<ServiceResult<{ orderId: string; orderNumber: string; totalAmount: number; expiresAt: string | null }>> {
  // 1. Validate input
  const parseResult = orderInputSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return { success: false, error: firstError?.message || 'Invalid order data' };
  }
  const validated = parseResult.data;

  const supabase = await createServerClient();

  try {
    // 2. Re-fetch menu item prices from DB (NEVER trust client prices)
    const menuItemIds = validated.items.map((item) => item.menuItemId);
    const { data: dbMenuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, base_price, name, is_available, deleted_at')
      .in('id', menuItemIds);

    if (menuError) {
      console.error('createOrder: Failed to fetch menu items:', menuError);
      return { success: false, error: 'Failed to verify menu items' };
    }

    if (!dbMenuItems || dbMenuItems.length === 0) {
      return serviceError('E4001', 'No valid menu items found');
    }

    // Build a map for quick lookup
    const menuItemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

    // 3. Verify all items exist and are available
    for (const cartItem of validated.items) {
      const dbItem = menuItemMap.get(cartItem.menuItemId);
      if (!dbItem) {
        return serviceError('E4001', `Menu item "${cartItem.name}" not found`);
      }
      if (!dbItem.is_available || dbItem.deleted_at) {
        return serviceError('E4002', `"${dbItem.name}" is no longer available`);
      }
    }

    // 4. Fetch addon prices from DB if any addons are selected
    const allAddonIds = validated.items.flatMap((item) => item.addons.map((a) => a.id));
    const addonPriceMap = new Map<string, { price: number; name: string }>();

    if (allAddonIds.length > 0) {
      const { data: dbAddons, error: addonError } = await supabase
        .from('addon_options')
        .select('id, additional_price, name, is_available')
        .in('id', allAddonIds);

      if (addonError) {
        console.error('createOrder: Failed to fetch addon options:', addonError);
        return { success: false, error: 'Failed to verify addon options' };
      }

      for (const addon of dbAddons || []) {
        if (!addon.is_available) {
          return { success: false, error: `Addon "${addon.name}" is no longer available` };
        }
        addonPriceMap.set(addon.id, { price: addon.additional_price, name: addon.name });
      }
    }

    // 5. Recalculate subtotal server-side
    let calculatedSubtotal = 0;
    const orderItemsData: Array<{
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      specialInstructions: string | null;
      addons: Array<{ addonOptionId: string; addonName: string; additionalPrice: number }>;
    }> = [];

    for (const cartItem of validated.items) {
      const dbItem = menuItemMap.get(cartItem.menuItemId)!;
      const basePrice = Number(dbItem.base_price);

      let addonsTotal = 0;
      const itemAddons: Array<{ addonOptionId: string; addonName: string; additionalPrice: number }> = [];

      for (const addon of cartItem.addons) {
        const dbAddon = addonPriceMap.get(addon.id);
        if (dbAddon) {
          addonsTotal += dbAddon.price;
          itemAddons.push({
            addonOptionId: addon.id,
            addonName: dbAddon.name,
            additionalPrice: dbAddon.price,
          });
        }
      }

      const unitPrice = basePrice + addonsTotal;
      const totalPrice = unitPrice * cartItem.quantity;
      calculatedSubtotal += totalPrice;

      orderItemsData.push({
        menuItemId: cartItem.menuItemId,
        itemName: dbItem.name,
        quantity: cartItem.quantity,
        unitPrice,
        totalPrice,
        specialInstructions: cartItem.specialInstructions || null,
        addons: itemAddons,
      });
    }

    // 6. Re-validate promo code if provided
    let discountAmount = 0;
    let promoCodeId: string | null = null;

    if (validated.promoCodeId && validated.promoCode) {
      const promoResult = await validatePromoCode(validated.promoCode, calculatedSubtotal);
      if (promoResult.success) {
        discountAmount = promoResult.data.discountAmount;
        promoCodeId = promoResult.data.promoId;
      }
      // If promo validation fails, we proceed without discount (don't block the order)
    }

    // 7. Calculate tax and service charge on discounted subtotal
    const discountedSubtotal = calculatedSubtotal - discountAmount;
    const taxAmount = Math.round(discountedSubtotal * 0.12 * 100) / 100; // 12% VAT
    const serviceCharge = Math.round(discountedSubtotal * 0.10 * 100) / 100; // 10%
    const totalAmount = Math.round((discountedSubtotal + taxAmount + serviceCharge) * 100) / 100;

    // 8. Order status depends on payment method:
    // - bill_later: Goes directly to kitchen (status: 'paid', payment_status: 'unpaid')
    // - Other methods: Waits for payment (status: 'pending_payment', payment_status: 'unpaid')
    const isBillLater = validated.paymentMethod === 'bill_later';
    const orderStatus = isBillLater ? 'paid' : 'pending_payment';
    const paymentStatus = 'unpaid';
    const expiresAt = isBillLater ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const paidAt = isBillLater ? new Date().toISOString() : null; // bill_later skips payment step

    // 9. Insert the order (order_number auto-generated by DB sequence)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_type: validated.orderType,
        table_number: validated.tableNumber || null,
        room_number: validated.roomNumber || null,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: validated.paymentMethod,
        subtotal: calculatedSubtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
        promo_code_id: promoCodeId,
        guest_phone: validated.guestPhone || null,
        special_instructions: validated.specialInstructions || null,
        expires_at: expiresAt,
        paid_at: paidAt,
        estimated_ready_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id, order_number, total_amount, expires_at')
      .single();

    if (orderError || !order) {
      console.error('createOrder: Failed to insert order:', orderError);
      return serviceError('E2002', 'Failed to create order. Please try again.');
    }

    // 10. Insert order items (batch insert for atomicity)
    const orderItemInserts = orderItemsData.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      item_name: item.itemName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      special_instructions: item.specialInstructions,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemInserts)
      .select('id');

    if (itemsError || !insertedItems || insertedItems.length !== orderItemsData.length) {
      console.error('createOrder: Failed to insert order items:', itemsError);
      // Rollback: delete the order since items failed
      await supabase.from('orders').delete().eq('id', order.id);
      return { success: false, error: 'Failed to create order items. Please try again.' };
    }

    // 11. Insert order item addons (batch insert)
    const allAddonInserts: Array<{
      order_item_id: string;
      addon_option_id: string;
      addon_name: string;
      additional_price: number;
    }> = [];

    for (let i = 0; i < orderItemsData.length; i++) {
      const item = orderItemsData[i];
      const orderItemId = insertedItems[i].id;

      for (const addon of item.addons) {
        allAddonInserts.push({
          order_item_id: orderItemId,
          addon_option_id: addon.addonOptionId,
          addon_name: addon.addonName,
          additional_price: addon.additionalPrice,
        });
      }
    }

    if (allAddonInserts.length > 0) {
      const { error: addonError } = await supabase
        .from('order_item_addons')
        .insert(allAddonInserts);

      if (addonError) {
        console.error('createOrder: Failed to insert addons:', addonError);
        // Rollback: delete the order (cascade will delete items)
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: 'Failed to create order addons. Please try again.' };
      }
    }

    // 12. Log order event for analytics (non-critical but logged on failure)
    const { error: eventError } = await supabase.from('order_events').insert({
      order_id: order.id,
      event_type: 'order_submitted',
      metadata: {
        item_count: validated.items.length,
        total_amount: totalAmount,
        payment_method: validated.paymentMethod,
        order_type: validated.orderType,
      },
    });
    if (eventError) {
      console.error('createOrder: Failed to log order event:', eventError);
      // Non-critical — order is created, event logging failure is acceptable
    }

    // 13. Increment promo code usage count (atomic operation via RPC)
    // Uses database function to prevent race conditions with concurrent orders
    if (promoCodeId) {
      const { error: incrementError } = await supabase.rpc('increment_promo_usage', {
        promo_id: promoCodeId,
      });

      if (incrementError) {
        console.error('createOrder: Failed to increment promo usage:', incrementError);
        // Non-critical error - order is already created, just log it
      }
    }

    revalidatePath('/admin/order-history');

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        expiresAt: order.expires_at,
      },
    };
  } catch (error) {
    console.error('createOrder failed:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

// ==========================================
// Phase 2: Kitchen Display System
// ==========================================

/**
 * Get active orders for the Kitchen Display System
 */
export async function getActiveKitchenOrders(): Promise<ServiceResult<OrderWithItems[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `)
    .in('status', ['paid', 'preparing', 'ready'])
    .is('deleted_at', null)
    .order('paid_at', { ascending: true });

  if (error) {
    console.error('getActiveKitchenOrders failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as OrderWithItems[] };
}

/**
 * Update order status (Kitchen workflow: paid → preparing → ready → served)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: Database['public']['Enums']['order_status'],
  currentVersion?: number
): Promise<ServiceResult<{ status: string; version: number }>> {
  const idValidation = validateId(orderId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    paid: ['preparing'],
    preparing: ['ready'],
    ready: ['served'],
    pending_payment: ['paid', 'cancelled'],
  };

  const supabase = await createServerClient();

  // Fetch current order
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('status, version')
    .eq('id', orderId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !currentOrder) {
    return serviceError('E2001', 'Order not found');
  }

  const allowedNext = validTransitions[currentOrder.status];
  if (!allowedNext || !allowedNext.includes(newStatus)) {
    return serviceError('E2004', `Cannot transition from "${currentOrder.status}" to "${newStatus}"`);
  }

  // Optimistic locking: check version matches
  if (currentVersion !== undefined && currentOrder.version !== currentVersion) {
    return serviceError('E2005', 'Order was modified by another user. Please refresh.');
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    status: newStatus,
    version: (currentOrder.version ?? 0) + 1,
  };

  if (newStatus === 'paid') {
    updateData.paid_at = new Date().toISOString();
    updateData.payment_status = 'paid';
  }
  if (newStatus === 'ready') {
    updateData.ready_at = new Date().toISOString();
  }
  if (newStatus === 'served') {
    updateData.served_at = new Date().toISOString();
  }
  if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }

  let query = supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  // Apply version check if provided
  if (currentVersion !== undefined) {
    query = query.eq('version', currentVersion);
  }

  const { data, error: updateError } = await query
    .select('status, version')
    .single();

  if (updateError || !data) {
    console.error('updateOrderStatus failed:', updateError);
    return { success: false, error: 'Failed to update order status' };
  }

  // Log status change event
  await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: `status_${newStatus}`,
    metadata: {
      previous_status: currentOrder.status,
      new_status: newStatus,
    },
  });

  revalidatePath('/admin/order-history');

  return {
    success: true,
    data: { status: data.status, version: data.version ?? 0 },
  };
}

/**
 * Get menu item addon groups and options for the item detail sheet
 */
export async function getMenuItemAddons(menuItemId: string): Promise<
  ServiceResult<Array<{
    id: string;
    name: string;
    is_required: boolean | null;
    min_selections: number | null;
    max_selections: number | null;
    display_order: number | null;
    addon_options: Array<{
      id: string;
      name: string;
      additional_price: number;
      is_available: boolean | null;
      display_order: number | null;
    }>;
  }>>
> {
  const idValidation = validateId(menuItemId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('addon_groups')
    .select(`
      id, name, is_required, min_selections, max_selections, display_order,
      addon_options(id, name, additional_price, is_available, display_order)
    `)
    .eq('menu_item_id', menuItemId)
    .order('display_order');

  if (error) {
    console.error('getMenuItemAddons failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

// ==========================================
// Phase 2.5: Waiter Module - Item-Level Status
// ==========================================

/**
 * Item with status for waiter/kitchen display
 */
export type OrderItemWithStatus = OrderItem & {
  order_item_addons: OrderItemAddon[];
};

/**
 * Order with items for waiter view
 */
export type WaiterOrder = Order & {
  order_items: OrderItemWithStatus[];
  readyCount: number;
  servedCount: number;
  totalCount: number;
  preparingCount: number;
};

/**
 * Get active orders for the Waiter Display
 * Returns orders with item-level status counts
 */
export async function getWaiterOrders(): Promise<ServiceResult<WaiterOrder[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `)
    .in('status', ['preparing', 'ready'])
    .is('deleted_at', null)
    .order('paid_at', { ascending: true });

  if (error) {
    console.error('getWaiterOrders failed:', error);
    return { success: false, error: error.message };
  }

  // Calculate item-level counts for each order
  const ordersWithCounts: WaiterOrder[] = (data || []).map((order) => {
    const items = order.order_items || [];
    return {
      ...order,
      readyCount: items.filter((item: OrderItemWithStatus) => item.status === 'ready').length,
      servedCount: items.filter((item: OrderItemWithStatus) => item.status === 'served').length,
      totalCount: items.length,
      preparingCount: items.filter((item: OrderItemWithStatus) => item.status === 'preparing').length,
    } as WaiterOrder;
  });

  return { success: true, data: ordersWithCounts };
}

/**
 * Mark an individual item as ready (Kitchen)
 * Used when kitchen marks items ready one at a time
 */
export async function updateItemToReady(
  itemId: string,
  _currentVersion?: number
): Promise<ServiceResult<{ status: string; orderAutoUpdated: boolean }>> {
  const idValidation = validateId(itemId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  // Fetch item and its order
  const { data: item, error: fetchError } = await supabase
    .from('order_items')
    .select('id, status, order_id')
    .eq('id', itemId)
    .single();

  if (fetchError || !item) {
    return serviceError('E2001', 'Order item not found');
  }

  // Validate transition: can only go to 'ready' from 'pending' or 'preparing'
  if (!['pending', 'preparing'].includes(item.status)) {
    return serviceError('E2004', `Cannot mark item as ready from "${item.status}" status`);
  }

  // Update item status
  const { data: updatedItem, error: updateError } = await supabase
    .from('order_items')
    .update({
      status: 'ready' as Database['public']['Enums']['order_item_status'],
      ready_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('status')
    .single();

  if (updateError || !updatedItem) {
    console.error('updateItemToReady failed:', updateError);
    return { success: false, error: 'Failed to update item status' };
  }

  // Check if order was auto-updated by the trigger
  const { data: orderAfter } = await supabase
    .from('orders')
    .select('status')
    .eq('id', item.order_id)
    .single();

  const orderAutoUpdated = orderAfter?.status === 'ready';

  revalidatePath('/kitchen/orders');
  revalidatePath('/waiter/orders');

  return {
    success: true,
    data: { status: updatedItem.status, orderAutoUpdated },
  };
}

/**
 * Mark an individual item as served (Waiter)
 */
export async function updateItemToServed(
  itemId: string
): Promise<ServiceResult<{ status: string; orderCompleted: boolean }>> {
  const idValidation = validateId(itemId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  // Get current user for audit trail
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch item and its order
  const { data: item, error: fetchError } = await supabase
    .from('order_items')
    .select('id, status, order_id')
    .eq('id', itemId)
    .single();

  if (fetchError || !item) {
    return serviceError('E2001', 'Order item not found');
  }

  // Validate transition: can only go to 'served' from 'ready'
  if (item.status !== 'ready') {
    return serviceError('E2004', `Cannot mark item as served from "${item.status}" status`);
  }

  // Update item status
  const { data: updatedItem, error: updateError } = await supabase
    .from('order_items')
    .update({
      status: 'served' as Database['public']['Enums']['order_item_status'],
      served_at: new Date().toISOString(),
      served_by: user?.id || null,
    })
    .eq('id', itemId)
    .select('status')
    .single();

  if (updateError || !updatedItem) {
    console.error('updateItemToServed failed:', updateError);
    return { success: false, error: 'Failed to update item status' };
  }

  // Check if order was auto-completed by the trigger
  const { data: orderAfter } = await supabase
    .from('orders')
    .select('status')
    .eq('id', item.order_id)
    .single();

  const orderCompleted = orderAfter?.status === 'served';

  revalidatePath('/kitchen/orders');
  revalidatePath('/waiter/orders');

  return {
    success: true,
    data: { status: updatedItem.status, orderCompleted },
  };
}

/**
 * Mark all items in an order as ready (Kitchen bulk action)
 * Used when kitchen bumps entire order to ready
 */
export async function markAllItemsReady(
  orderId: string
): Promise<ServiceResult<{ updatedCount: number; orderAutoUpdated: boolean }>> {
  const idValidation = validateId(orderId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  // Update all items that are not already ready or served
  const { data: updatedItems, error: updateError } = await supabase
    .from('order_items')
    .update({
      status: 'ready' as Database['public']['Enums']['order_item_status'],
      ready_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .in('status', ['pending', 'preparing'])
    .select('id');

  if (updateError) {
    console.error('markAllItemsReady failed:', updateError);
    return { success: false, error: 'Failed to update item statuses' };
  }

  // Check if order was auto-updated by the trigger
  const { data: orderAfter } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  const orderAutoUpdated = orderAfter?.status === 'ready';

  revalidatePath('/kitchen/orders');
  revalidatePath('/waiter/orders');

  return {
    success: true,
    data: { updatedCount: updatedItems?.length || 0, orderAutoUpdated },
  };
}

/**
 * Get item-level status counts for an order
 */
export async function getOrderItemStatusCounts(
  orderId: string
): Promise<ServiceResult<{ pending: number; preparing: number; ready: number; served: number; total: number }>> {
  const idValidation = validateId(orderId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  const supabase = await createServerClient();

  const { data: items, error } = await supabase
    .from('order_items')
    .select('status')
    .eq('order_id', orderId);

  if (error) {
    console.error('getOrderItemStatusCounts failed:', error);
    return { success: false, error: error.message };
  }

  const counts = {
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    total: items?.length || 0,
  };

  for (const item of items || []) {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts]++;
    }
  }

  return { success: true, data: counts };
}
