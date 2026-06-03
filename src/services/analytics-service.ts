'use server';

import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import type {
  DashboardStats,
  TopSellingItem,
  RevenueDataPoint,
  OrderTypeData,
  DashboardData,
  SalesReportSummary,
  SalesByCategoryItem,
  SalesByMenuItem,
  SalesByPaymentMethodItem,
} from '@/types/dashboard';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get dashboard statistics for today
 * Returns orders count, revenue, avg order value, and active orders
 */
export async function getDashboardStats(): Promise<
  ServiceResult<DashboardStats>
> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();
    const yesterdayStart = startOfDay(subDays(today, 1)).toISOString();
    const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();

    // Get today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (todayError) throw todayError;

    // Get yesterday's orders for comparison
    const { data: yesterdayOrders, error: yesterdayError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .gte('created_at', yesterdayStart)
      .lte('created_at', yesterdayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (yesterdayError) throw yesterdayError;

    // Get active orders (preparing or ready)
    const { count: activeCount, error: activeError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing', 'ready'])
      .is('deleted_at', null);

    if (activeError) throw activeError;

    // Calculate today's stats
    const ordersToday = todayOrders?.length || 0;
    const revenueToday =
      todayOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
      0;
    const avgOrderValue = ordersToday > 0 ? revenueToday / ordersToday : 0;

    // Calculate yesterday's stats
    const ordersYesterday = yesterdayOrders?.length || 0;
    const revenueYesterday =
      yesterdayOrders?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ) || 0;
    const avgOrderYesterday =
      ordersYesterday > 0 ? revenueYesterday / ordersYesterday : 0;

    // Calculate percentage changes
    const ordersChange =
      ordersYesterday > 0
        ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
        : ordersToday > 0
          ? 100
          : 0;

    const revenueChange =
      revenueYesterday > 0
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
        : revenueToday > 0
          ? 100
          : 0;

    const avgOrderChange =
      avgOrderYesterday > 0
        ? ((avgOrderValue - avgOrderYesterday) / avgOrderYesterday) * 100
        : avgOrderValue > 0
          ? 100
          : 0;

    return {
      success: true,
      data: {
        ordersToday,
        revenueToday,
        avgOrderValue,
        activeOrders: activeCount || 0,
        ordersChange: Math.round(ordersChange * 10) / 10,
        revenueChange: Math.round(revenueChange * 10) / 10,
        avgOrderChange: Math.round(avgOrderChange * 10) / 10,
      },
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

/**
 * Get revenue chart data for the last N days
 */
export async function getRevenueChartData(
  days: number = 7
): Promise<ServiceResult<RevenueDataPoint[]>> {
  try {
    const supabase = await createServerClient();

    const now = new Date();
    const startDate = startOfDay(subDays(now, days - 1)).toISOString();
    const endDate = endOfDay(now).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    // Group orders by date
    const dayMap = new Map<string, { revenue: number; count: number }>();
    orders?.forEach((order) => {
      const key = format(new Date(order.created_at!), 'yyyy-MM-dd');
      const existing = dayMap.get(key);
      if (existing) {
        existing.revenue += order.total_amount || 0;
        existing.count++;
      } else {
        dayMap.set(key, { revenue: order.total_amount || 0, count: 1 });
      }
    });

    // Build data points for each day (including days with no orders)
    const dataPoints: RevenueDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const key = format(date, 'yyyy-MM-dd');
      const dayData = dayMap.get(key);
      dataPoints.push({
        date: key,
        label: format(date, 'EEE'),
        revenue: dayData?.revenue || 0,
        orders: dayData?.count || 0,
      });
    }

    return { success: true, data: dataPoints };
  } catch (error) {
    console.error('getRevenueChartData error:', error);
    return { success: false, error: 'Failed to fetch revenue chart data' };
  }
}

/**
 * Get top selling items for today
 */
export async function getTopSellingItems(
  limit: number = 5
): Promise<ServiceResult<TopSellingItem[]>> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    // Get order items from today's paid orders
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(
        `
        menu_item_id,
        quantity,
        unit_price,
        menu_items!inner (
          id,
          name,
          image_url
        ),
        orders!inner (
          created_at,
          payment_status,
          deleted_at
        )
      `
      )
      .gte('orders.created_at', todayStart)
      .lte('orders.created_at', todayEnd)
      .eq('orders.payment_status', 'paid')
      .is('orders.deleted_at', null);

    if (error) throw error;

    // Aggregate by menu item
    const itemMap = new Map<
      string,
      { name: string; orderCount: number; revenue: number; imageUrl: string | null }
    >();

    orderItems?.forEach((item) => {
      const menuItem = item.menu_items as unknown as {
        id: string;
        name: string;
        image_url: string | null;
      };
      const existing = itemMap.get(menuItem.id);

      if (existing) {
        existing.orderCount += item.quantity;
        existing.revenue += item.unit_price * item.quantity;
      } else {
        itemMap.set(menuItem.id, {
          name: menuItem.name,
          orderCount: item.quantity,
          revenue: item.unit_price * item.quantity,
          imageUrl: menuItem.image_url,
        });
      }
    });

    // Sort by order count and take top N
    const topItems: TopSellingItem[] = Array.from(itemMap.entries())
      .sort((a, b) => b[1].orderCount - a[1].orderCount)
      .slice(0, limit)
      .map(([id, data]) => ({
        id,
        name: data.name,
        orderCount: data.orderCount,
        revenue: data.revenue,
        imageUrl: data.imageUrl,
      }));

    return { success: true, data: topItems };
  } catch (error) {
    console.error('getTopSellingItems error:', error);
    return { success: false, error: 'Failed to fetch top selling items' };
  }
}

/**
 * Get order type breakdown for today
 */
export async function getOrderTypeBreakdown(): Promise<
  ServiceResult<OrderTypeData[]>
> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_type')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    const counts = {
      dine_in: 0,
      room_service: 0,
      takeout: 0,
      ocean_view: 0,
    };

    orders?.forEach((order) => {
      if (order.order_type in counts) {
        counts[order.order_type as keyof typeof counts]++;
      }
    });

    const total = orders?.length || 1; // Avoid division by zero

    const breakdown: OrderTypeData[] = [
      {
        type: 'dine_in',
        label: 'Dine-in',
        count: counts.dine_in,
        percentage: Math.round((counts.dine_in / total) * 100),
        color: '#f59e0b', // Amber
      },
      {
        type: 'room_service',
        label: 'Room Service',
        count: counts.room_service,
        percentage: Math.round((counts.room_service / total) * 100),
        color: '#10b981', // Emerald
      },
      {
        type: 'takeout',
        label: 'Takeout',
        count: counts.takeout,
        percentage: Math.round((counts.takeout / total) * 100),
        color: '#334155', // Slate
      },
      {
        type: 'ocean_view',
        label: 'Ocean View',
        count: counts.ocean_view,
        percentage: Math.round((counts.ocean_view / total) * 100),
        color: '#0ea5e9', // Sky blue
      },
    ];

    return { success: true, data: breakdown };
  } catch (error) {
    console.error('getOrderTypeBreakdown error:', error);
    return { success: false, error: 'Failed to fetch order type breakdown' };
  }
}

/**
 * Get all dashboard data in one call
 */
export async function getDashboardData(): Promise<ServiceResult<DashboardData>> {
  try {
    const currentYear = new Date().getFullYear();
    const [statsResult, chartResult, topItemsResult, breakdownResult, monthlyResult] =
      await Promise.all([
        getDashboardStats(),
        getRevenueChartData(7),
        getTopSellingItems(5),
        getOrderTypeBreakdown(),
        getMonthlyRevenueData(currentYear),
      ]);

    if (!statsResult.success) return { success: false, error: statsResult.error };
    if (!chartResult.success) return { success: false, error: chartResult.error };
    if (!topItemsResult.success) return { success: false, error: topItemsResult.error };
    if (!breakdownResult.success) return { success: false, error: breakdownResult.error };
    if (!monthlyResult.success) return { success: false, error: monthlyResult.error };

    return {
      success: true,
      data: {
        stats: statsResult.data,
        revenueChart: chartResult.data,
        topItems: topItemsResult.data,
        orderTypeBreakdown: breakdownResult.data,
        monthlyRevenue: monthlyResult.data,
      },
    };
  } catch (error) {
    console.error('getDashboardData error:', error);
    return { success: false, error: 'Failed to fetch dashboard data' };
  }
}

/**
 * Refresh dashboard data — callable from client via Server Action
 */
export async function refreshDashboardData(): Promise<ServiceResult<DashboardData>> {
  return getDashboardData();
}

/**
 * Get monthly revenue for a given year (12 data points, Jan–Dec)
 */
export async function getMonthlyRevenueData(
  year: number
): Promise<ServiceResult<RevenueDataPoint[]>> {
  try {
    const supabase = await createServerClient();

    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    const monthMap = new Map<number, { revenue: number; count: number }>();
    orders?.forEach((order) => {
      const month = new Date(order.created_at!).getMonth();
      const existing = monthMap.get(month);
      if (existing) {
        existing.revenue += order.total_amount || 0;
        existing.count++;
      } else {
        monthMap.set(month, { revenue: order.total_amount || 0, count: 1 });
      }
    });

    const MONTH_LABELS = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const dataPoints: RevenueDataPoint[] = MONTH_LABELS.map((label, i) => {
      const data = monthMap.get(i);
      return {
        date: `${year}-${String(i + 1).padStart(2, '0')}`,
        label,
        revenue: data?.revenue || 0,
        orders: data?.count || 0,
      };
    });

    return { success: true, data: dataPoints };
  } catch (error) {
    console.error('getMonthlyRevenueData error:', error);
    return { success: false, error: 'Failed to fetch monthly revenue data' };
  }
}

// ============================================================
// Audit Log Functions
// ============================================================

export interface AuditLogFilters {
  action?: string;
  table_name?: string;
  user_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  action: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string | null;
  user_name: string | null;
}

export interface AuditLogResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get paginated audit logs with optional filters
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<ServiceResult<AuditLogResult>> {
  try {
    const supabase = await createServerClient();
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Build base query for count
    let countQuery = supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true });

    // Build data query — join profiles for user name
    let dataQuery = supabase
      .from('audit_log')
      .select('*, profiles:user_id(full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (filters.action && filters.action !== 'all') {
      countQuery = countQuery.eq('action', filters.action);
      dataQuery = dataQuery.eq('action', filters.action);
    }
    if (filters.table_name && filters.table_name !== 'all') {
      countQuery = countQuery.eq('table_name', filters.table_name);
      dataQuery = dataQuery.eq('table_name', filters.table_name);
    }
    if (filters.user_id) {
      countQuery = countQuery.eq('user_id', filters.user_id);
      dataQuery = dataQuery.eq('user_id', filters.user_id);
    }
    if (filters.dateFrom) {
      countQuery = countQuery.gte('created_at', filters.dateFrom);
      dataQuery = dataQuery.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();
      countQuery = countQuery.lte('created_at', toISO);
      dataQuery = dataQuery.lte('created_at', toISO);
    }

    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countResult.error) throw countResult.error;
    if (dataResult.error) throw dataResult.error;

    const total = countResult.count || 0;
    const logs: AuditLogEntry[] = (dataResult.data || []).map((row) => {
      const profile = row.profiles as unknown as { full_name: string } | null;
      return {
        id: row.id,
        table_name: row.table_name,
        action: row.action,
        record_id: row.record_id,
        old_data: row.old_data as Record<string, unknown> | null,
        new_data: row.new_data as Record<string, unknown> | null,
        user_id: row.user_id,
        created_at: row.created_at,
        user_name: profile?.full_name || null,
      };
    });

    return {
      success: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return { success: false, error: 'Failed to fetch audit logs' };
  }
}

/**
 * Insert an audit log entry.
 * Designed to never throw — audit logging should not break the main operation.
 */
export async function logAuditEvent(params: {
  table_name: string;
  action: string;
  record_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  user_id?: string | null;
}): Promise<void> {
  try {
    const supabase = await createServerClient();
    const insertData: Database['public']['Tables']['audit_log']['Insert'] = {
      table_name: params.table_name,
      action: params.action,
      record_id: params.record_id,
      old_data: (params.old_data || null) as Database['public']['Tables']['audit_log']['Insert']['old_data'],
      new_data: (params.new_data || null) as Database['public']['Tables']['audit_log']['Insert']['new_data'],
      user_id: params.user_id || null,
    };
    const { error } = await supabase.from('audit_log').insert(insertData);

    if (error) {
      console.error('logAuditEvent insert error:', error);
    }
  } catch (error) {
    console.error('logAuditEvent error:', error);
  }
}

/**
 * Get distinct table names from audit log for filter dropdown
 */
export async function getAuditLogTableNames(): Promise<ServiceResult<string[]>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('audit_log')
      .select('table_name')
      .order('table_name');

    if (error) throw error;

    const uniqueNames = [...new Set((data || []).map((r) => r.table_name))];
    return { success: true, data: uniqueNames };
  } catch (error) {
    console.error('getAuditLogTableNames error:', error);
    return { success: false, error: 'Failed to fetch table names' };
  }
}

// ============================================================
// Sales Report Functions
// ============================================================

/**
 * Get sales report summary KPIs for a date range
 */
export async function getSalesReport(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<SalesReportSummary>> {
  try {
    const supabase = await createServerClient();
    const from = startOfDay(new Date(dateFrom)).toISOString();
    const to = endOfDay(new Date(dateTo)).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, order_items(menu_item_id, quantity, unit_price, menu_items(category_id, categories(name)))')
      .gte('created_at', from)
      .lte('created_at', to)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Find top category by revenue
    const categoryRevenue = new Map<string, number>();
    orders?.forEach((order) => {
      const items = order.order_items as unknown as Array<{
        quantity: number;
        unit_price: number;
        menu_items: { category_id: string; categories: { name: string } | null } | null;
      }>;
      items?.forEach((item) => {
        const catName = item.menu_items?.categories?.name;
        if (catName) {
          categoryRevenue.set(catName, (categoryRevenue.get(catName) || 0) + (item.unit_price * item.quantity));
        }
      });
    });

    let topCategory: string | null = null;
    let maxRevenue = 0;
    categoryRevenue.forEach((revenue, name) => {
      if (revenue > maxRevenue) {
        maxRevenue = revenue;
        topCategory = name;
      }
    });

    return {
      success: true,
      data: { totalRevenue, totalOrders, avgOrderValue, topCategory },
    };
  } catch (error) {
    console.error('getSalesReport error:', error);
    return { success: false, error: 'Failed to fetch sales report' };
  }
}

/**
 * Get revenue grouped by category for a date range
 */
export async function getSalesByCategory(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<SalesByCategoryItem[]>> {
  try {
    const supabase = await createServerClient();
    const from = startOfDay(new Date(dateFrom)).toISOString();
    const to = endOfDay(new Date(dateTo)).toISOString();

    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        order_id,
        quantity,
        unit_price,
        menu_items!inner(category_id, categories!inner(id, name)),
        orders!inner(created_at, payment_status, deleted_at)
      `)
      .gte('orders.created_at', from)
      .lte('orders.created_at', to)
      .in('orders.payment_status', ['paid', 'refunded'])
      .is('orders.deleted_at', null);

    if (error) throw error;

    const categoryMap = new Map<string, { name: string; revenue: number; orderIds: Set<string> }>();

    items?.forEach((item) => {
      const menuItem = item.menu_items as unknown as {
        category_id: string;
        categories: { id: string; name: string };
      };
      const catId = menuItem.categories.id;
      const catName = menuItem.categories.name;
      const revenue = item.unit_price * item.quantity;

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.revenue += revenue;
        existing.orderIds.add(item.order_id);
      } else {
        categoryMap.set(catId, {
          name: catName,
          revenue,
          orderIds: new Set([item.order_id]),
        });
      }
    });

    const result: SalesByCategoryItem[] = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        revenue: data.revenue,
        orderCount: data.orderIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { success: true, data: result };
  } catch (error) {
    console.error('getSalesByCategory error:', error);
    return { success: false, error: 'Failed to fetch sales by category' };
  }
}

/**
 * Get item performance with quantity and revenue for a date range
 */
export async function getSalesByItem(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<SalesByMenuItem[]>> {
  try {
    const supabase = await createServerClient();
    const from = startOfDay(new Date(dateFrom)).toISOString();
    const to = endOfDay(new Date(dateTo)).toISOString();

    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        menu_item_id,
        quantity,
        unit_price,
        menu_items!inner(id, name),
        orders!inner(created_at, payment_status, deleted_at)
      `)
      .gte('orders.created_at', from)
      .lte('orders.created_at', to)
      .in('orders.payment_status', ['paid', 'refunded'])
      .is('orders.deleted_at', null);

    if (error) throw error;

    const itemMap = new Map<string, { name: string; qtySold: number; revenue: number }>();

    items?.forEach((item) => {
      const menuItem = item.menu_items as unknown as { id: string; name: string };
      const existing = itemMap.get(menuItem.id);
      const revenue = item.unit_price * item.quantity;

      if (existing) {
        existing.qtySold += item.quantity;
        existing.revenue += revenue;
      } else {
        itemMap.set(menuItem.id, {
          name: menuItem.name,
          qtySold: item.quantity,
          revenue,
        });
      }
    });

    const result: SalesByMenuItem[] = Array.from(itemMap.entries())
      .map(([menuItemId, data]) => ({
        menuItemId,
        name: data.name,
        qtySold: data.qtySold,
        revenue: data.revenue,
        avgPrice: data.qtySold > 0 ? data.revenue / data.qtySold : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { success: true, data: result };
  } catch (error) {
    console.error('getSalesByItem error:', error);
    return { success: false, error: 'Failed to fetch sales by item' };
  }
}

/**
 * Get payment method breakdown for a date range
 */
export async function getSalesByPaymentMethod(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<SalesByPaymentMethodItem[]>> {
  try {
    const supabase = await createServerClient();
    const from = startOfDay(new Date(dateFrom)).toISOString();
    const to = endOfDay(new Date(dateTo)).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('payment_method, total_amount')
      .gte('created_at', from)
      .lte('created_at', to)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    const methodMap = new Map<string, { count: number; revenue: number }>();

    orders?.forEach((order) => {
      const method = order.payment_method || 'unknown';
      const existing = methodMap.get(method);
      if (existing) {
        existing.count++;
        existing.revenue += order.total_amount || 0;
      } else {
        methodMap.set(method, { count: 1, revenue: order.total_amount || 0 });
      }
    });

    const METHOD_LABELS: Record<string, { label: string; color: string }> = {
      cash: { label: 'Cash', color: '#f59e0b' },
      gcash: { label: 'GCash', color: '#3b82f6' },
      card: { label: 'Card', color: '#8b5cf6' },
      maya: { label: 'Maya', color: '#10b981' },
      bill_later: { label: 'Bill Later', color: '#64748b' },
      unknown: { label: 'Unknown', color: '#94a3b8' },
    };

    const result: SalesByPaymentMethodItem[] = Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        label: METHOD_LABELS[method]?.label || method,
        count: data.count,
        revenue: data.revenue,
        color: METHOD_LABELS[method]?.color || '#94a3b8',
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { success: true, data: result };
  } catch (error) {
    console.error('getSalesByPaymentMethod error:', error);
    return { success: false, error: 'Failed to fetch sales by payment method' };
  }
}
