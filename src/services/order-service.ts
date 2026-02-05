'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';

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

// Service result types
type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceError = {
  success: false;
  error: string;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid ID format');

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

  // Clean phone number - remove spaces, dashes, etc.
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

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
    // Search by order number or phone
    const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
    query = query.or(`order_number.ilike.%${search}%,guest_phone.ilike.%${cleanSearch}%`);
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
      return { success: false, error: 'Order not found' };
    }
    console.error('getOrderDetails failed:', error);
    return { success: false, error: error.message };
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
    const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
    query = query.or(`order_number.ilike.%${search}%,guest_phone.ilike.%${cleanSearch}%`);
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
 * Get order count by status (for dashboard stats)
 */
export async function getOrderCountByStatus(): Promise<
  ServiceResult<Record<string, number>>
> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .is('deleted_at', null);

  if (error) {
    console.error('getOrderCountByStatus failed:', error);
    return { success: false, error: error.message };
  }

  const counts: Record<string, number> = {};
  for (const order of data || []) {
    counts[order.status] = (counts[order.status] || 0) + 1;
  }

  return { success: true, data: counts };
}
